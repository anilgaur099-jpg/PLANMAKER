import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, Container, ContainerPreset, PlannedContainer, AppUserAccess, AccessControlConfig } from '../types';
import { initDatabase, db, getAllContainersWithVehicles, addContainerWithVehicles, upsertContainerByNo, bulkSaveContainers } from '../db/db';

import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, testConnection, loginWithGoogle, logoutUser } from '../firebase/config';
import {
  saveContainerToFirestore,
  deleteContainerFromFirestore,
  getContainersFromFirestore,
  syncContainersToFirestore,
  subscribeToContainers,
} from '../firebase/firestoreService';
import {
  fetchAccessConfig,
  saveAccessConfig,
  fetchUsersList,
  saveUserRecord,
  removeUserRecord,
} from '../firebase/adminService';
import { PasswordModal, DEFAULT_MASTER_PASSWORD } from '../components/PasswordModal';

export const CONTAINER_PRESETS: ContainerPreset[] = [
  {
    id: '40hc',
    name: '40ft High Cube (40HC)',
    description: 'Standard export container for 4 commercial/passenger vehicles',
    maxVehicles: 4,
    maxCbm: 76.0,
    maxWeightKg: 26500,
    maxLengthCm: 2400,
  },
  {
    id: '40gp',
    name: '40ft Standard (40GP)',
    description: 'Standard height 40ft container',
    maxVehicles: 4,
    maxCbm: 67.0,
    maxWeightKg: 26000,
    maxLengthCm: 2400,
  },
  {
    id: '20gp',
    name: '20ft Standard (20GP)',
    description: 'Smaller container for 1-2 vehicles or heavy machinery',
    maxVehicles: 2,
    maxCbm: 33.0,
    maxWeightKg: 21500,
    maxLengthCm: 1200,
  },
];

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

export type AppPage = 'dashboard' | 'library' | 'search' | 'builder' | 'settings' | 'admin';

interface AppContextType {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  containers: Container[];
  isLoadingContainers: boolean;
  refreshContainers: () => Promise<void>;
  // Cross-page transfers
  builderDraftVehicles: Array<{ model: string; chassisPrefix?: string; qty: number }>;
  setBuilderDraftVehicles: React.Dispatch<React.SetStateAction<Array<{ model: string; chassisPrefix?: string; qty: number }>>>;
  transferContainerToBuilder: (container: Container | PlannedContainer) => void;
  // Printing / Modal
  printContainerData: Container | PlannedContainer | null;
  setPrintContainerData: (c: Container | PlannedContainer | null) => void;
  // Firebase Cloud Persistence & Auth
  isCloudConnected: boolean;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  currentUser: User | null;
  syncToCloud: () => Promise<{ success: number; failed: number }>;
  syncFromCloud: () => Promise<number>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  // Admin & User Access Control (Made by Anil Gaur)
  sessionUser: AppUserAccess | null;
  loginWithCredentials: (id: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginAsGuestViewer: () => void;
  logoutSessionUser: () => void;
  updateMasterPassword: (newPass: string) => Promise<void>;
  isAdmin: boolean;
  adminUnlockedWithPin: boolean;
  unlockAdminWithPin: (pin: string) => boolean;
  lockAdmin: () => void;
  accessConfig: AccessControlConfig;
  usersList: AppUserAccess[];
  blockUser: (email: string, reason?: string) => Promise<void>;
  unblockUser: (email: string) => Promise<void>;
  addUserAccess: (user: AppUserAccess) => Promise<void>;
  removeUserAccess: (email: string) => Promise<void>;
  updateAccessConfig: (cfg: Partial<AccessControlConfig>) => Promise<void>;
  isUserBlocked: boolean;
  // Password Protected Actions
  requestPasswordProtectedAction: (action: () => void, title?: string, description?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = 'cpm_app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'dark', // Modern dark mode default for enterprise logistics
  activePresetId: '40hc',
  maxVehicles: 4,
  maxCbm: 76.0,
  maxWeightKg: 26500,
  maxLengthCm: 2400,
  autoSaveNewModels: true,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [builderDraftVehicles, setBuilderDraftVehicles] = useState<Array<{ model: string; chassisPrefix?: string; qty: number }>>([]);
  const [printContainerData, setPrintContainerData] = useState<Container | PlannedContainer | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          language: 'en',
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Save settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
      return updated;
    });
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || (toast.undoAction ? 6000 : 3500);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshContainers = async () => {
    try {
      setIsLoadingContainers(true);
      const cloudContainers = await getContainersFromFirestore().catch(() => []);
      if (cloudContainers && cloudContainers.length > 0) {
        setContainers(cloudContainers);
        setIsCloudConnected(true);
        setCloudSyncStatus('synced');
        bulkSaveContainers(cloudContainers).catch(() => {});
      } else {
        const local = await getAllContainersWithVehicles();
        setContainers(local);
      }
    } catch (err) {
      console.error('Error refreshing containers from database', err);
      addToast({
        type: 'error',
        title: 'Database Load Error',
        description: 'Failed to refresh records from database.',
      });
    } finally {
      setIsLoadingContainers(false);
    }
  };

  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initial load & real-time sync: ensures zero data loss and instant display across all shared devices
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await initDatabase();
        // 1. Read existing local storage immediately so existing devices show cached data instantly
        const local = await getAllContainersWithVehicles();
        if (isMounted && local.length > 0) {
          setContainers(local);
          setIsLoadingContainers(false);
        }

        // 2. Fetch all cloud containers from Firestore (master cloud source)
        const cloudContainers = await getContainersFromFirestore();
        if (cloudContainers && cloudContainers.length > 0) {
          if (isMounted) {
            // Set state immediately so friend / new device sees all updated containers instantly
            setContainers(cloudContainers);
            setIsCloudConnected(true);
            setCloudSyncStatus('synced');
            setIsLoadingContainers(false);
          }
          // Fast bulk cache into IndexedDB in background without blocking UI
          bulkSaveContainers(cloudContainers).catch((e) =>
            console.warn('Background IndexedDB cache note:', e)
          );
        } else if (isMounted && (!local || local.length === 0)) {
          setIsLoadingContainers(false);
        }
      } catch (err) {
        console.error('Database initialization note:', err);
        if (isMounted) setIsLoadingContainers(false);
      }
    };

    init();

    // Real-time Firestore subscription: updates friend's screen the second Anil Gaur updates any plan
    const unsubscribeSnapshot = subscribeToContainers(
      (liveCloudContainers) => {
        if (!isMounted) return;
        try {
          if (liveCloudContainers && liveCloudContainers.length > 0) {
            setIsCloudConnected(true);
            setCloudSyncStatus('synced');
            // Update state immediately across all shared browser sessions
            setContainers(liveCloudContainers);
            setIsLoadingContainers(false);

            // Bulk save to local IndexedDB in background
            bulkSaveContainers(liveCloudContainers).catch((e) =>
              console.warn('Real-time background cache note:', e)
            );
          }
        } catch (subErr) {
          console.warn('Real-time sync merge note:', subErr);
        }
      },
      (err) => {
        console.warn('Real-time Firestore listener note:', err);
      }
    );

    // Verify Firestore connection
    testConnection().then((connected) => {
      if (isMounted) setIsCloudConnected(connected);
    });

    return () => {
      isMounted = false;
      unsubscribeSnapshot();
    };
  }, []);

  // Monitor Firebase Auth state if needed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const syncToCloud = async (): Promise<{ success: number; failed: number }> => {
    try {
      setCloudSyncStatus('syncing');
      const latest = await getAllContainersWithVehicles();
      const res = await syncContainersToFirestore(latest);
      setCloudSyncStatus('synced');
      addToast({
        type: 'success',
        title: 'Firebase Cloud Synced',
        description: `Successfully uploaded ${res.success} container plans to Google Firestore.`,
      });
      return res;
    } catch (err: any) {
      setCloudSyncStatus('error');
      addToast({
        type: 'error',
        title: 'Cloud Sync Failed',
        description: err.message || 'Could not write to Firebase Firestore.',
      });
      return { success: 0, failed: containers.length };
    }
  };

  const syncFromCloud = async (): Promise<number> => {
    try {
      setCloudSyncStatus('syncing');
      const cloudContainers = await getContainersFromFirestore();
      if (!cloudContainers || cloudContainers.length === 0) {
        setCloudSyncStatus('synced');
        addToast({
          type: 'info',
          title: 'Cloud Storage Empty',
          description: 'No container plans found in Firebase Firestore yet.',
        });
        return 0;
      }

      // Check existing in Dexie
      const existing = await getAllContainersWithVehicles();
      const existingNos = new Set(existing.map((c) => c.containerNo.toUpperCase()));
      const toAdd = cloudContainers.filter((c) => !existingNos.has(c.containerNo.toUpperCase()));

      for (const c of toAdd) {
        await addContainerWithVehicles(c);
      }

      await refreshContainers();
      setCloudSyncStatus('synced');
      addToast({
        type: 'success',
        title: 'Cloud Records Restored',
        description: `Downloaded ${cloudContainers.length} containers (${toAdd.length} new added to local storage).`,
      });
      return cloudContainers.length;
    } catch (err: any) {
      setCloudSyncStatus('error');
      addToast({
        type: 'error',
        title: 'Cloud Fetch Error',
        description: err.message || 'Could not read from Firebase Firestore.',
      });
      return 0;
    }
  };

  const signInWithGoogle = async () => {
    // Google popup sign-in disabled as requested: Access is exclusively managed via Admin usernames & passwords.
    addToast({
      type: 'info',
      title: 'Portal Authentication',
      description: 'Please sign in using your username and password assigned by Anil Gaur.',
    });
  };

  const signOutUser = async () => {
    logoutSessionUser();
  };

  const SESSION_USER_KEY = 'cpm_session_user_v1';

  const [sessionUser, setSessionUser] = useState<AppUserAccess | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [adminUnlockedWithPin, setAdminUnlockedWithPin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cpm_admin_pin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [accessConfig, setAccessConfig] = useState<AccessControlConfig>({
    requireApproval: false,
    requireWebLogin: true,
    adminEmail: 'admin@cpm.internal',
    masterPassword: '8076910181',
    blockedEmails: [],
  });

  const [usersList, setUsersList] = useState<AppUserAccess[]>([]);

  // Password Protection for Excel Download
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('Authorization Required');
  const [passwordModalDesc, setPasswordModalDesc] = useState('');

  // Initial load of access configuration and users
  useEffect(() => {
    fetchAccessConfig().then((cfg) => {
      setAccessConfig(cfg);
    });
    fetchUsersList().then((list) => {
      setUsersList(list);
    });
  }, []);

  // Check if current user is an admin
  const isAdmin = Boolean(
    currentUser?.email?.toLowerCase() === 'anilgaur099@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'anilgaurjaaflogi@gmail.com' ||
    sessionUser?.role === 'admin' ||
    sessionUser?.username?.toLowerCase() === 'anil' ||
    adminUnlockedWithPin
  );

  // Check if current user is blocked
  const isUserBlocked = Boolean(
    (currentUser?.email && accessConfig.blockedEmails.some((e) => e.toLowerCase() === currentUser.email?.toLowerCase())) ||
    (sessionUser?.email && accessConfig.blockedEmails.some((e) => e.toLowerCase() === sessionUser.email?.toLowerCase())) ||
    sessionUser?.status === 'blocked'
  );

  const loginWithCredentials = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();
    const currentMasterPass = accessConfig.masterPassword || '8076910181';

    // 1. Direct Master Admin Login check
    if (
      (cleanId === 'anil' || cleanId === 'admin' || cleanId === 'anilgaurjaaflogi@gmail.com' || cleanId === 'anilgaur099@gmail.com') &&
      cleanPass === currentMasterPass
    ) {
      const adminUser: AppUserAccess = {
        id: 'admin-anil',
        email: 'admin@cpm.internal',
        username: 'anil',
        displayName: 'Anil Gaur',
        role: 'admin',
        status: 'active',
        createdAt: Date.now(),
        lastActive: Date.now(),
      };
      setSessionUser(adminUser);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(adminUser));
      setAdminUnlockedWithPin(true);
      try {
        sessionStorage.setItem('cpm_admin_pin_unlocked', 'true');
      } catch {}
      return { success: true };
    }

    // 2. Fetch fresh users list from DB
    const latestUsers = await fetchUsersList();
    setUsersList(latestUsers);

    // 3. Find matching user by email or username
    const found = latestUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.username && u.username.toLowerCase() === cleanId)
    );

    if (!found) {
      return {
        success: false,
        message: 'Account not found! Access is restricted to users created by Anil Gaur.',
      };
    }

    // 4. Check if blocked
    if (
      found.status === 'blocked' ||
      accessConfig.blockedEmails.some((b) => b.toLowerCase() === found.email.toLowerCase())
    ) {
      return {
        success: false,
        message: 'Your access has been blocked / revoked by administrator Anil Gaur.',
      };
    }

    // 5. Password verification
    if (found.password && found.password !== cleanPass) {
      return {
        success: false,
        message: 'Incorrect password! Please check credentials provided by Anil Gaur.',
      };
    }

    // Success: Establish session
    const activeUser: AppUserAccess = {
      ...found,
      lastActive: Date.now(),
    };
    setSessionUser(activeUser);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(activeUser));

    if (activeUser.role === 'admin') {
      setAdminUnlockedWithPin(true);
    }

    // Update lastActive timestamp
    saveUserRecord(activeUser).catch(() => {});

    return { success: true };
  };

  const logoutSessionUser = () => {
    setSessionUser(null);
    localStorage.removeItem(SESSION_USER_KEY);
    setAdminUnlockedWithPin(false);
    try {
      sessionStorage.removeItem('cpm_admin_pin_unlocked');
    } catch {}
  };

  const loginAsGuestViewer = () => {
    const viewerUser: AppUserAccess = {
      id: 'guest-viewer',
      email: 'viewer@cpm.internal',
      username: 'viewer',
      displayName: 'Authorized Viewer',
      role: 'viewer',
      status: 'active',
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    setSessionUser(viewerUser);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(viewerUser));
    addToast({
      type: 'info',
      title: 'Viewer Access Granted',
      description: 'Viewing real-time container plans and vehicle specifications.',
    });
  };

  const updateMasterPassword = async (newPass: string) => {
    const updatedCfg = { ...accessConfig, masterPassword: newPass.trim() };
    setAccessConfig(updatedCfg);
    await saveAccessConfig(updatedCfg);
  };

  const unlockAdminWithPin = (pin: string): boolean => {
    const valid = accessConfig.masterPassword || '8076910181';
    if (pin.trim() === valid.trim()) {
      setAdminUnlockedWithPin(true);
      try {
        sessionStorage.setItem('cpm_admin_pin_unlocked', 'true');
      } catch {}
      return true;
    }
    return false;
  };

  const lockAdmin = () => {
    setAdminUnlockedWithPin(false);
    try {
      sessionStorage.removeItem('cpm_admin_pin_unlocked');
    } catch {}
  };

  const blockUser = async (email: string, reason = 'Kicked out by Anil Gaur') => {
    const clean = email.toLowerCase().trim();
    const updatedUsers = usersList.map((u) =>
      u.email.toLowerCase() === clean ? { ...u, status: 'blocked' as const, blockedReason: reason } : u
    );
    setUsersList(updatedUsers);

    const updatedBlocked = Array.from(new Set([...accessConfig.blockedEmails, clean]));
    const newCfg = { ...accessConfig, blockedEmails: updatedBlocked };
    setAccessConfig(newCfg);
    await saveAccessConfig(newCfg);

    const target = updatedUsers.find((u) => u.email.toLowerCase() === clean);
    if (target) {
      await saveUserRecord(target);
    }
    addToast({
      type: 'warning',
      title: 'User Blocked / Kicked Out',
      description: `${clean} has been kicked out and cannot access the app.`,
    });
  };

  const unblockUser = async (email: string) => {
    const clean = email.toLowerCase().trim();
    const updatedUsers = usersList.map((u) =>
      u.email.toLowerCase() === clean ? { ...u, status: 'active' as const, blockedReason: undefined } : u
    );
    setUsersList(updatedUsers);

    const updatedBlocked = accessConfig.blockedEmails.filter((e) => e.toLowerCase() !== clean);
    const newCfg = { ...accessConfig, blockedEmails: updatedBlocked };
    setAccessConfig(newCfg);
    await saveAccessConfig(newCfg);

    const target = updatedUsers.find((u) => u.email.toLowerCase() === clean);
    if (target) {
      await saveUserRecord(target);
    }
    addToast({
      type: 'success',
      title: 'User Access Restored',
      description: `${clean} has been unblocked.`,
    });
  };

  const addUserAccess = async (user: AppUserAccess) => {
    await saveUserRecord(user);
    const updated = await fetchUsersList();
    setUsersList(updated);
  };

  const removeUserAccess = async (email: string) => {
    await removeUserRecord(email);
    const updated = await fetchUsersList();
    setUsersList(updated);
    addToast({
      type: 'info',
      title: 'User Removed',
      description: `Record for ${email} has been removed.`,
    });
  };

  const updateAccessConfig = async (cfg: Partial<AccessControlConfig>) => {
    const updated = { ...accessConfig, ...cfg };
    setAccessConfig(updated);
    await saveAccessConfig(updated);
    addToast({
      type: 'success',
      title: 'Security Policy Updated',
      description: 'Access control configuration saved to cloud.',
    });
  };

  const requestPasswordProtectedAction = (
    action: () => void,
    title = 'Authorization Required for Protected Action',
    description = 'Container plans and operations are restricted. Enter authorization password to proceed.'
  ) => {
    setPendingProtectedAction(() => action);
    setPasswordModalTitle(title);
    setPasswordModalDesc(description);
    setPasswordModalOpen(true);
  };

  const transferContainerToBuilder = (container: Container | PlannedContainer) => {
    const draft = container.vehicles.map((v) => ({
      model: v.model,
      chassisPrefix: v.chassisPrefix,
      qty: 1,
    }));
    setBuilderDraftVehicles(draft);
    setActivePage('builder');
    addToast({
      type: 'info',
      title: 'Transferred to Plan Builder',
      description: `Loaded ${container.vehicles.length} vehicles from Container ${container.containerNo || ''}.`,
    });
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        settings,
        updateSettings,
        toasts,
        addToast,
        removeToast,
        containers,
        isLoadingContainers,
        refreshContainers,
        builderDraftVehicles,
        setBuilderDraftVehicles,
        transferContainerToBuilder,
        printContainerData,
        setPrintContainerData,
        isCloudConnected,
        cloudSyncStatus,
        currentUser,
        syncToCloud,
        syncFromCloud,
        signInWithGoogle,
        signOutUser,
        sessionUser,
        loginWithCredentials,
        loginAsGuestViewer,
        logoutSessionUser,
        updateMasterPassword,
        isAdmin,
        adminUnlockedWithPin,
        unlockAdminWithPin,
        lockAdmin,
        accessConfig,
        usersList,
        blockUser,
        unblockUser,
        addUserAccess,
        removeUserAccess,
        updateAccessConfig,
        isUserBlocked,
        requestPasswordProtectedAction,
      }}
    >
      {children}
      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingProtectedAction(null);
        }}
        onSuccess={() => {
          if (pendingProtectedAction) {
            pendingProtectedAction();
            setPendingProtectedAction(null);
          }
        }}
        title={passwordModalTitle}
        description={passwordModalDesc}
        customMasterPassword={accessConfig.masterPassword}
      />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
