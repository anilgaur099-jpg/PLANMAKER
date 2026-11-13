import { desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { accessSettings, containers, portalUsers, vehicles } from './schema.ts';
import type { AccessControlConfig, AppUserAccess, Container, Vehicle } from '../types/index.ts';

function computeCbm(l: number, w: number, h: number): number {
  if (!l || !w || !h) return 0;
  return Math.round(((l * w * h) / 1000000) * 1000) / 1000;
}

function extractPrefix(chassisNo: string): string {
  const clean = (chassisNo || '').trim().toUpperCase();
  if (!clean) return '';
  if (clean.includes('-')) return clean.split('-')[0];
  const m = clean.match(/^([A-Z0-9]{4,7})/);
  return m ? m[1] : clean.slice(0, 6);
}

function normalizeContainerInput(c: Container) {
  const cleanNo = (c.containerNo || '').trim().toUpperCase();
  const modelsSet = new Set<string>();
  const prefixesSet = new Set<string>();
  let totalCbm = 0;
  let totalWeight = 0;
  let totalPrice = 0;

  const rawVehicles = Array.isArray(c.vehicles) ? c.vehicles : [];
  const normalizedVehicles = rawVehicles.map((v, idx) => {
    const length = Number(v.length) || 0;
    const width = Number(v.width) || 0;
    const height = Number(v.height) || 0;
    const calcCbm = computeCbm(length, width, height);
    const cbm = Number(v.cbm) || calcCbm;
    const weight = Number(v.weight) || 0;
    const price = Number(v.price) || 0;
    const model = (v.model || '').trim();
    const chassisNo = (v.chassisNo || '').trim();
    const chassisPrefix = (v.chassisPrefix || extractPrefix(chassisNo)).trim().toUpperCase();

    totalCbm += cbm;
    totalWeight += weight;
    totalPrice += price;
    if (model) modelsSet.add(model.toUpperCase());
    if (chassisPrefix) prefixesSet.add(chassisPrefix);

    const safeSuffix = String(v.id || idx + 1)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(-20);

    return {
      id: `${cleanNo}__${idx + 1}__${safeSuffix || idx + 1}`,
      containerNo: cleanNo,
      serialNo: Number(v.serialNo) || idx + 1,
      make: (v.make || '').trim(),
      model,
      engineCC: Math.round(Number(v.engineCC) || 0),
      fuel: (v.fuel || 'D').trim(),
      year: Math.round(Number(v.year) || 0),
      vehicleIdNo: String(v.vehicleIdNo || ''),
      chassisNo,
      chassisPrefix,
      length,
      width,
      height,
      qty: Math.round(Number(v.qty) || 1),
      price,
      weight,
      cbm,
      calculatedCbm: calcCbm,
      cbmMismatch: Math.abs(cbm - calcCbm) > 0.5 && calcCbm > 0,
      remark: String(v.remark || ''),
    };
  });

  const roundedCbm = Math.round(totalCbm * 1000) / 1000;
  const now = Date.now();

  return {
    containerRow: {
      containerNo: cleanNo,
      sealOrBlNo: String(c.sealOrBlNo || ''),
      extraValue: String(c.extraValue ?? '4000'),
      totalCbm: roundedCbm > 0 ? roundedCbm : Number(c.totalCbm) || 0,
      totalWeight: totalWeight > 0 ? totalWeight : Number(c.totalWeight) || 0,
      totalPrice: totalPrice > 0 ? totalPrice : Number(c.totalPrice) || 0,
      vehicleCount: normalizedVehicles.length || Number(c.vehicleCount) || 0,
      models: Array.from(modelsSet),
      chassisPrefixes: Array.from(prefixesSet),
      notes: String(c.notes || ''),
      remark: String(c.remark || c.notes || ''),
      matchedFromContainerNo: String(c.matchedFromContainerNo || ''),
      createdAtMs: Number(c.createdAt) || now,
      updatedAtMs: Number(c.updatedAt) || now,
    },
    vehicleRows: normalizedVehicles,
  };
}

export async function getAllContainers(): Promise<Container[]> {
  try {
    const [containerRows, vehicleRows] = await Promise.all([
      db.select().from(containers).orderBy(desc(containers.createdAtMs)),
      db.select().from(vehicles),
    ]);

    const vehiclesByContainerId = new Map<number, Vehicle[]>();
    for (const v of vehicleRows) {
      const list = vehiclesByContainerId.get(v.containerId);
      const item: Vehicle = {
        id: v.id,
        containerId: v.containerId,
        containerNo: v.containerNo,
        serialNo: v.serialNo,
        make: v.make,
        model: v.model,
        engineCC: v.engineCC,
        fuel: v.fuel,
        year: v.year,
        vehicleIdNo: v.vehicleIdNo,
        chassisNo: v.chassisNo,
        chassisPrefix: v.chassisPrefix,
        length: v.length,
        width: v.width,
        height: v.height,
        qty: v.qty,
        price: v.price,
        weight: v.weight,
        cbm: v.cbm,
        calculatedCbm: v.calculatedCbm,
        cbmMismatch: v.cbmMismatch,
        remark: v.remark || undefined,
      };
      if (list) {
        list.push(item);
      } else {
        vehiclesByContainerId.set(v.containerId, [item]);
      }
    }

    return containerRows.map((row) => {
      const cVehicles = (vehiclesByContainerId.get(row.id) || []).sort(
        (a, b) => a.serialNo - b.serialNo
      );
      return {
        id: row.id,
        containerNo: row.containerNo,
        sealOrBlNo: row.sealOrBlNo,
        extraValue: row.extraValue,
        vehicles: cVehicles,
        totalCbm: row.totalCbm,
        totalWeight: row.totalWeight,
        totalPrice: row.totalPrice,
        vehicleCount: row.vehicleCount,
        models: row.models || [],
        chassisPrefixes: row.chassisPrefixes || [],
        createdAt: Number(row.createdAtMs),
        updatedAt: Number(row.updatedAtMs),
        notes: row.notes || undefined,
        remark: row.remark || undefined,
        matchedFromContainerNo: row.matchedFromContainerNo || undefined,
      };
    });
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertContainer(container: Container, previousContainerNo?: string): Promise<Container> {
  try {
    const { containerRow, vehicleRows } = normalizeContainerInput(container);
    if (!containerRow.containerNo) {
      throw new Error('Container number is required.');
    }

    return await db.transaction(async (tx) => {
      if (
        previousContainerNo &&
        previousContainerNo.trim().toUpperCase() !== containerRow.containerNo
      ) {
        await tx
          .delete(containers)
          .where(eq(containers.containerNo, previousContainerNo.trim().toUpperCase()));
      }

      const [saved] = await tx
        .insert(containers)
        .values(containerRow)
        .onConflictDoUpdate({
          target: containers.containerNo,
          set: {
            sealOrBlNo: containerRow.sealOrBlNo,
            extraValue: containerRow.extraValue,
            totalCbm: containerRow.totalCbm,
            totalWeight: containerRow.totalWeight,
            totalPrice: containerRow.totalPrice,
            vehicleCount: containerRow.vehicleCount,
            models: containerRow.models,
            chassisPrefixes: containerRow.chassisPrefixes,
            notes: containerRow.notes,
            remark: containerRow.remark,
            matchedFromContainerNo: containerRow.matchedFromContainerNo,
            updatedAtMs: Date.now(),
          },
        })
        .returning();

      await tx.delete(vehicles).where(eq(vehicles.containerId, saved.id));

      if (vehicleRows.length > 0) {
        await tx.insert(vehicles).values(
          vehicleRows.map((v) => ({
            ...v,
            containerId: saved.id,
          }))
        );
      }

      return {
        ...container,
        id: saved.id,
        containerNo: saved.containerNo,
        createdAt: Number(saved.createdAtMs),
        updatedAt: Number(saved.updatedAtMs),
      };
    });
  } catch (error) {
    console.error('Database upsertContainer failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function bulkUpsertContainers(containersList: Container[]): Promise<{ savedCount: number }> {
  try {
    if (!containersList || containersList.length === 0) {
      return { savedCount: 0 };
    }

    // Deduplicate by containerNo within the incoming batch (latest wins)
    const dedupMap = new Map<string, Container>();
    for (const c of containersList) {
      const cleanNo = (c.containerNo || '').trim().toUpperCase();
      if (cleanNo) dedupMap.set(cleanNo, c);
    }
    const uniqueList = Array.from(dedupMap.values());

    let savedCount = 0;
    const chunkSize = 100;

    for (let i = 0; i < uniqueList.length; i += chunkSize) {
      const chunk = uniqueList.slice(i, i + chunkSize);
      const prepared = chunk.map((c) => normalizeContainerInput(c));

      await db.transaction(async (tx) => {
        const upsertedIds: number[] = [];
        const containerIdByNo = new Map<string, number>();

        for (const item of prepared) {
          const [saved] = await tx
            .insert(containers)
            .values(item.containerRow)
            .onConflictDoUpdate({
              target: containers.containerNo,
              set: {
                sealOrBlNo: item.containerRow.sealOrBlNo,
                extraValue: item.containerRow.extraValue,
                totalCbm: item.containerRow.totalCbm,
                totalWeight: item.containerRow.totalWeight,
                totalPrice: item.containerRow.totalPrice,
                vehicleCount: item.containerRow.vehicleCount,
                models: item.containerRow.models,
                chassisPrefixes: item.containerRow.chassisPrefixes,
                notes: item.containerRow.notes,
                remark: item.containerRow.remark,
                matchedFromContainerNo: item.containerRow.matchedFromContainerNo,
                updatedAtMs: item.containerRow.updatedAtMs,
              },
            })
            .returning({ id: containers.id, containerNo: containers.containerNo });

          upsertedIds.push(saved.id);
          containerIdByNo.set(saved.containerNo, saved.id);
        }

        if (upsertedIds.length > 0) {
          await tx.delete(vehicles).where(inArray(vehicles.containerId, upsertedIds));
        }

        const allVehicleRows: Array<typeof vehicles.$inferInsert> = [];
        for (const item of prepared) {
          const cid = containerIdByNo.get(item.containerRow.containerNo);
          if (!cid) continue;
          for (const v of item.vehicleRows) {
            allVehicleRows.push({
              ...v,
              containerId: cid,
            });
          }
        }

        if (allVehicleRows.length > 0) {
          await tx.insert(vehicles).values(allVehicleRows).onConflictDoNothing();
        }
      });

      savedCount += chunk.length;
    }

    return { savedCount };
  } catch (error) {
    console.error('Database bulkUpsertContainers failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteContainerByNo(containerNo: string): Promise<boolean> {
  try {
    const cleanNo = containerNo.trim().toUpperCase();
    const deleted = await db
      .delete(containers)
      .where(eq(containers.containerNo, cleanNo))
      .returning({ id: containers.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database deleteContainerByNo failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function clearAllContainers(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(vehicles);
      await tx.delete(containers);
    });
  } catch (error) {
    console.error('Database clearAllContainers failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// --- Access Control & Portal Users ---

const DEFAULT_ACCESS_CONFIG: AccessControlConfig = {
  requireApproval: false,
  requireWebLogin: false,
  adminEmail: 'admin@cpm.internal',
  masterPassword: '8076910181',
  blockedEmails: [],
};

export async function getAccessConfigFromDb(): Promise<AccessControlConfig> {
  try {
    const rows = await db
      .select()
      .from(accessSettings)
      .where(eq(accessSettings.key, 'global_settings'));

    if (rows.length === 0) {
      return DEFAULT_ACCESS_CONFIG;
    }

    const r = rows[0];
    return {
      requireApproval: r.requireApproval,
      requireWebLogin: r.requireWebLogin,
      adminEmail: r.adminEmail,
      masterPassword: r.masterPassword,
      blockedEmails: r.blockedEmails || [],
    };
  } catch (error) {
    console.error('Database getAccessConfigFromDb failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveAccessConfigToDb(cfg: AccessControlConfig): Promise<AccessControlConfig> {
  try {
    await db
      .insert(accessSettings)
      .values({
        key: 'global_settings',
        requireApproval: Boolean(cfg.requireApproval),
        requireWebLogin: Boolean(cfg.requireWebLogin),
        adminEmail: cfg.adminEmail || 'admin@cpm.internal',
        masterPassword: cfg.masterPassword || '8076910181',
        blockedEmails: cfg.blockedEmails || [],
      })
      .onConflictDoUpdate({
        target: accessSettings.key,
        set: {
          requireApproval: Boolean(cfg.requireApproval),
          requireWebLogin: Boolean(cfg.requireWebLogin),
          adminEmail: cfg.adminEmail || 'admin@cpm.internal',
          masterPassword: cfg.masterPassword || '8076910181',
          blockedEmails: cfg.blockedEmails || [],
        },
      });
    return cfg;
  } catch (error) {
    console.error('Database saveAccessConfigToDb failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getPortalUsersFromDb(): Promise<AppUserAccess[]> {
  try {
    const rows = await db.select().from(portalUsers);
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      password: r.password,
      displayName: r.displayName,
      role: (r.role as AppUserAccess['role']) || 'staff',
      status: (r.status as AppUserAccess['status']) || 'active',
      blockedReason: r.blockedReason || undefined,
      createdAt: Number(r.createdAtMs),
      lastActive: r.lastActiveMs ? Number(r.lastActiveMs) : undefined,
    }));
  } catch (error) {
    console.error('Database getPortalUsersFromDb failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function savePortalUserToDb(user: AppUserAccess): Promise<AppUserAccess> {
  try {
    const cleanEmail = user.email.toLowerCase().trim();
    await db
      .insert(portalUsers)
      .values({
        id: user.id || `user-${Date.now()}`,
        email: cleanEmail,
        username: user.username || cleanEmail.split('@')[0],
        password: user.password || '',
        displayName: user.displayName || user.username || cleanEmail,
        role: user.role || 'staff',
        status: user.status || 'active',
        blockedReason: user.blockedReason || null,
        createdAtMs: Number(user.createdAt) || Date.now(),
        lastActiveMs: user.lastActive ? Number(user.lastActive) : Date.now(),
      })
      .onConflictDoUpdate({
        target: portalUsers.email,
        set: {
          username: user.username || cleanEmail.split('@')[0],
          password: user.password || '',
          displayName: user.displayName || user.username || cleanEmail,
          role: user.role || 'staff',
          status: user.status || 'active',
          blockedReason: user.blockedReason || null,
          lastActiveMs: user.lastActive ? Number(user.lastActive) : Date.now(),
        },
      });
    return user;
  } catch (error) {
    console.error('Database savePortalUserToDb failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deletePortalUserFromDb(email: string): Promise<void> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    await db.delete(portalUsers).where(eq(portalUsers.email, cleanEmail));
  } catch (error) {
    console.error('Database deletePortalUserFromDb failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
