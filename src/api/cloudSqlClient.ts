import type { AccessControlConfig, AppUserAccess, Container } from '../types';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch {
      // ignore json parse failure on error body
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

export async function fetchContainersFromApi(): Promise<Container[]> {
  const res = await fetch('/api/containers', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await parseJsonResponse<{ containers: Container[] }>(res);
  return Array.isArray(data.containers) ? data.containers : [];
}

export async function saveContainerToApi(
  container: Container,
  previousContainerNo?: string
): Promise<Container> {
  const res = await fetch('/api/containers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ container, previousContainerNo }),
  });
  const data = await parseJsonResponse<{ container: Container }>(res);
  return data.container;
}

export async function bulkSaveContainersToApi(
  containers: Container[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  if (!containers || containers.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  const chunkSize = 200;

  for (let i = 0; i < containers.length; i += chunkSize) {
    const chunk = containers.slice(i, i + chunkSize);
    try {
      const res = await fetch('/api/containers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containers: chunk }),
      });
      const data = await parseJsonResponse<{ savedCount: number }>(res);
      success += Number(data.savedCount) || chunk.length;
    } catch (err) {
      console.error('Bulk container upload chunk error:', err);
      failed += chunk.length;
    }

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, containers.length), containers.length);
    }
  }

  return { success, failed };
}

export async function deleteContainerFromApi(containerNo: string): Promise<void> {
  const res = await fetch(`/api/containers/${encodeURIComponent(containerNo)}`, {
    method: 'DELETE',
  });
  await parseJsonResponse<{ deleted: boolean }>(res);
}

export async function clearContainersFromApi(): Promise<void> {
  const res = await fetch('/api/containers', {
    method: 'DELETE',
  });
  await parseJsonResponse<{ cleared: boolean }>(res);
}

export async function fetchAccessConfigFromApi(): Promise<AccessControlConfig> {
  const res = await fetch('/api/access-config', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await parseJsonResponse<{ config: AccessControlConfig }>(res);
  return data.config;
}

export async function saveAccessConfigToApi(
  config: AccessControlConfig
): Promise<AccessControlConfig> {
  const res = await fetch('/api/access-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  const data = await parseJsonResponse<{ config: AccessControlConfig }>(res);
  return data.config;
}

export async function fetchPortalUsersFromApi(): Promise<AppUserAccess[]> {
  const res = await fetch('/api/portal-users', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await parseJsonResponse<{ users: AppUserAccess[] }>(res);
  return Array.isArray(data.users) ? data.users : [];
}

export async function savePortalUserToApi(user: AppUserAccess): Promise<AppUserAccess> {
  const res = await fetch('/api/portal-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  const data = await parseJsonResponse<{ user: AppUserAccess }>(res);
  return data.user;
}

export async function deletePortalUserFromApi(email: string): Promise<void> {
  const res = await fetch(`/api/portal-users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  await parseJsonResponse<{ removed: boolean }>(res);
}

export async function syncAuthUserToApi(idToken: string): Promise<any> {
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });
  return parseJsonResponse(res);
}
