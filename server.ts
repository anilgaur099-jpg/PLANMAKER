import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';
import {
  getAllContainers,
  upsertContainer,
  bulkUpsertContainers,
  deleteContainerByNo,
  clearAllContainers,
  getAccessConfigFromDb,
  saveAccessConfigToDb,
  getPortalUsersFromDb,
  savePortalUserToDb,
  deletePortalUserFromDb,
} from './src/db/containers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- Firebase Auth Protected Routes ---
  app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const list = await getUsers();
      res.json(list);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@firebase.user`;
      const displayName = req.user!.name || undefined;
      const user = await getOrCreateUser(uid, email, displayName);
      res.json(user);
    } catch (error: any) {
      console.error('Failed to sync authenticated user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // --- Container Loading Plans API (Cloud SQL PostgreSQL) ---
  app.get('/api/containers', async (_req, res) => {
    try {
      const list = await getAllContainers();
      res.json({ containers: list });
    } catch (error: any) {
      console.error('Failed to fetch containers:', error);
      res.status(500).json({ error: error.message || 'Failed to load containers' });
    }
  });

  app.post('/api/containers', async (req, res) => {
    try {
      const container = req.body?.container;
      if (!container || !container.containerNo) {
        return res.status(400).json({ error: 'Container data with containerNo is required' });
      }
      const saved = await upsertContainer(container, req.body?.previousContainerNo);
      res.json({ container: saved });
    } catch (error: any) {
      console.error('Failed to save container:', error);
      res.status(500).json({ error: error.message || 'Failed to save container' });
    }
  });

  app.put('/api/containers/:containerNo', async (req, res) => {
    try {
      const prevNo = decodeURIComponent(req.params.containerNo);
      const container = req.body?.container;
      if (!container || !container.containerNo) {
        return res.status(400).json({ error: 'Container data with containerNo is required' });
      }
      const saved = await upsertContainer(container, prevNo);
      res.json({ container: saved });
    } catch (error: any) {
      console.error('Failed to update container:', error);
      res.status(500).json({ error: error.message || 'Failed to update container' });
    }
  });

  app.post('/api/containers/bulk', async (req, res) => {
    try {
      const list = req.body?.containers;
      if (!Array.isArray(list)) {
        return res.status(400).json({ error: 'containers array is required' });
      }
      const result = await bulkUpsertContainers(list);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to bulk save containers:', error);
      res.status(500).json({ error: error.message || 'Failed to save containers' });
    }
  });

  app.delete('/api/containers/:containerNo', async (req, res) => {
    try {
      const containerNo = decodeURIComponent(req.params.containerNo);
      const deleted = await deleteContainerByNo(containerNo);
      res.json({ deleted });
    } catch (error: any) {
      console.error('Failed to delete container:', error);
      res.status(500).json({ error: error.message || 'Failed to delete container' });
    }
  });

  app.delete('/api/containers', async (_req, res) => {
    try {
      await clearAllContainers();
      res.json({ cleared: true });
    } catch (error: any) {
      console.error('Failed to clear containers:', error);
      res.status(500).json({ error: error.message || 'Failed to clear containers' });
    }
  });

  // --- Admin Access Control & Portal Users API ---
  app.get('/api/access-config', async (_req, res) => {
    try {
      const config = await getAccessConfigFromDb();
      res.json({ config });
    } catch (error: any) {
      console.error('Failed to fetch access config:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch access config' });
    }
  });

  app.put('/api/access-config', async (req, res) => {
    try {
      const cfg = req.body?.config;
      if (!cfg) {
        return res.status(400).json({ error: 'config object is required' });
      }
      const saved = await saveAccessConfigToDb(cfg);
      res.json({ config: saved });
    } catch (error: any) {
      console.error('Failed to update access config:', error);
      res.status(500).json({ error: error.message || 'Failed to update access config' });
    }
  });

  app.get('/api/portal-users', async (_req, res) => {
    try {
      const usersList = await getPortalUsersFromDb();
      res.json({ users: usersList });
    } catch (error: any) {
      console.error('Failed to fetch portal users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch portal users' });
    }
  });

  app.post('/api/portal-users', async (req, res) => {
    try {
      const user = req.body?.user;
      if (!user || !user.email) {
        return res.status(400).json({ error: 'user object with email is required' });
      }
      const saved = await savePortalUserToDb(user);
      res.json({ user: saved });
    } catch (error: any) {
      console.error('Failed to save portal user:', error);
      res.status(500).json({ error: error.message || 'Failed to save portal user' });
    }
  });

  app.delete('/api/portal-users/:email', async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      await deletePortalUserFromDb(email);
      res.json({ removed: true });
    } catch (error: any) {
      console.error('Failed to remove portal user:', error);
      res.status(500).json({ error: error.message || 'Failed to remove portal user' });
    }
  });

  // Vite middleware for development / static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
