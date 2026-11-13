import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Firebase Auth linked users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Container loading plans table
export const containers = pgTable('containers', {
  id: serial('id').primaryKey(),
  containerNo: text('container_no').notNull().unique(),
  sealOrBlNo: text('seal_or_bl_no').default('').notNull(),
  extraValue: text('extra_value').default('4000').notNull(),
  totalCbm: doublePrecision('total_cbm').default(0).notNull(),
  totalWeight: doublePrecision('total_weight').default(0).notNull(),
  totalPrice: doublePrecision('total_price').default(0).notNull(),
  vehicleCount: integer('vehicle_count').default(0).notNull(),
  models: jsonb('models').$type<string[]>().default([]).notNull(),
  chassisPrefixes: jsonb('chassis_prefixes').$type<string[]>().default([]).notNull(),
  notes: text('notes').default('').notNull(),
  remark: text('remark').default('').notNull(),
  matchedFromContainerNo: text('matched_from_container_no').default('').notNull(),
  createdAtMs: bigint('created_at_ms', { mode: 'number' }).notNull(),
  updatedAtMs: bigint('updated_at_ms', { mode: 'number' }).notNull(),
});

// Child vehicles loaded inside containers
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  containerId: integer('container_id')
    .references(() => containers.id, { onDelete: 'cascade' })
    .notNull(),
  containerNo: text('container_no').notNull(),
  serialNo: integer('serial_no').default(1).notNull(),
  make: text('make').default('').notNull(),
  model: text('model').default('').notNull(),
  engineCC: integer('engine_cc').default(0).notNull(),
  fuel: text('fuel').default('D').notNull(),
  year: integer('year').default(0).notNull(),
  vehicleIdNo: text('vehicle_id_no').default('').notNull(),
  chassisNo: text('chassis_no').default('').notNull(),
  chassisPrefix: text('chassis_prefix').default('').notNull(),
  length: doublePrecision('length').default(0).notNull(),
  width: doublePrecision('width').default(0).notNull(),
  height: doublePrecision('height').default(0).notNull(),
  qty: integer('qty').default(1).notNull(),
  price: doublePrecision('price').default(0).notNull(),
  weight: doublePrecision('weight').default(0).notNull(),
  cbm: doublePrecision('cbm').default(0).notNull(),
  calculatedCbm: doublePrecision('calculated_cbm').default(0).notNull(),
  cbmMismatch: boolean('cbm_mismatch').default(false).notNull(),
  remark: text('remark').default('').notNull(),
});

// Portal team access users managed by Admin
export const portalUsers = pgTable('portal_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').default('').notNull(),
  password: text('password').default('').notNull(),
  displayName: text('display_name').default('').notNull(),
  role: text('role').default('staff').notNull(),
  status: text('status').default('active').notNull(),
  blockedReason: text('blocked_reason'),
  createdAtMs: bigint('created_at_ms', { mode: 'number' }).notNull(),
  lastActiveMs: bigint('last_active_ms', { mode: 'number' }),
});

// Global access control configuration
export const accessSettings = pgTable('access_settings', {
  key: text('key').primaryKey(),
  requireApproval: boolean('require_approval').default(false).notNull(),
  requireWebLogin: boolean('require_web_login').default(false).notNull(),
  adminEmail: text('admin_email').default('admin@cpm.internal').notNull(),
  masterPassword: text('master_password').default('8076910181').notNull(),
  blockedEmails: jsonb('blocked_emails').$type<string[]>().default([]).notNull(),
});

// Drizzle Relations
export const containersRelations = relations(containers, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  container: one(containers, {
    fields: [vehicles.containerId],
    references: [containers.id],
  }),
}));
