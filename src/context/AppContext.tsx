import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  Container,
  ContainerPreset,
  PlannedContainer,
  AppUserAccess,
  AccessControlConfig,
} from '../types';
import { initDatabase, getAllContainersWithVehicles, bulkSaveContainers } from '../db/db';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  fetchContainersFromApi,
  bulkSaveContainersToApi,
  fetchAccessConfigFromApi,
  saveAccessConfigToApi,
  fetchPortalUsersFromApi,
  savePortalUserToApi,
  deletePortalUserFromApi,
  syncAuthUserToApi,
} from '../api/cloudSqlClient';
import { PasswordModal } from '../components/PasswordModal';

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
  setBuilderDraftVehicles: React.Dispatch<
    React.SetStateAction<Array<{ model: string; chassisPrefix?: string; qty: number }>>
  >;
  transferContainerToBuilder: (container: Container | PlannedContainer) => void;
  // Printing / Modal
  printContainerData: Container | PlannedContainer | null;
  setPrintContainerData: (c: Container | PlannedContainer | null) => void;
  // Firebase Auth
  currentUser: User | null;
  idToken: string | null;
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
const SESSION_USER_KEY = 'cpm_session_user_v1';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'dark',
  activePresetId: '40hc',
  maxVehicles: 4,
  maxCbm: 76.0,
  maxWeightKg: 26500,
  maxLengthCm: 2400,
  autoSaveNewModels: true,
};

const DEFAULT_ADMIN_USER: AppUserAccess = {
  id: 'admin-anil',
  email: 'admin@cpm.internal',
  username: 'anil',
  password: '',
  displayName: 'Anil Gaur',
  role: 'admin',
  status: 'active',
  createdAt: Date.now() - 30 * 86400000,
  lastActive: Date.now(),
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [builderDraftVehicles, setBuilderDraftVehicles] = useState<
    Array<{ model: string; chassisPrefix?: string; qty: number }>
  >([]);
  const [printContainerData, setPrintContainerData] = useState<Container | PlannedContainer | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

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

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

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
      const serverContainers = await fetchContainersFromApi();
      setContainers(serverContainers);
      if (serverContainers.length > 0) {
        setTimeout(() => {
          bulkSaveContainers(serverContainers).catch(() => {});
        }, 500);
      }
    } catch (err) {
      console.error('Error refreshing containers:', err);
      addToast({
        type: 'error',
        title: 'Load Error',
        description: 'Failed to refresh container plans.',
      });
    } finally {
      setIsLoadingContainers(false);
    }
  };

  // Initial load: load authoritative plans from server API + silently upload any missing local-only plans
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await initDatabase().catch((e) => console.warn('Local cache open note:', e));

        // 1. Read any browser-cached plans with a 1.2s timeout for fast initial paint
        const local = await Promise.race([
          getAllContainersWithVehicles().catch(() => []),
          new Promise<Container[]>((resolve) => setTimeout(() => resolve([]), 1200)),
        ]);

        if (isMounted && local.length > 0) {
          setContainers(local);
          setIsLoadingContainers(false);
        }

        // 2. Fetch authoritative container plans from server API
        let serverContainers: Container[] | null = null;
        try {
          serverContainers = await fetchContainersFromApi();
        } catch (err) {
          console.warn('Initial API fetch error:', err);
        }

        if (serverContainers !== null) {
          const map = new Map<string, Container>();
          for (const c of serverContainers) {
            const key = c.containerNo.trim().toUpperCase();
            if (key) map.set(key, c);
          }

          // Identify any plans present in this browser's local cache that are missing from server
          const missingFromServer: Container[] = [];
          for (const loc of local) {
            const key = loc.containerNo.trim().toUpperCase();
            if (key && !map.has(key)) {
              map.set(key, loc);
              missingFromServer.push(loc);
            }
          }

          const mergedUnion = Array.from(map.values());
          if (isMounted) {
            setContainers(mergedUnion);
            setIsLoadingContainers(false);
          }

          if (mergedUnion.length > 0) {
            setTimeout(() => {
              bulkSaveContainers(mergedUnion).catch(() => {});
            }, 1500);
          }

          // Auto-upload any missing local plans silently so all browsers see the complete fleet
          if (missingFromServer.length > 0) {
            try {
              const res = await bulkSaveContainersToApi(missingFromServer);
              if (res.success > 0 && isMounted) {
                const refreshed = await fetchContainersFromApi().catch(() => mergedUnion);
                if (isMounted) {
                  setContainers(refreshed);
                  addToast({
                    type: 'success',
                    title: 'Plans Updated',
                    description: `Uploaded ${res.success} local plans. All ${refreshed.length} plans are now shared across all browsers.`,
                    duration: 5000,
                  });
                }
              }
            } catch (uploadErr) {
              console.warn('Auto upload missing local plans note:', uploadErr);
            }
          }
        } else if (isMounted) {
          setIsLoadingContainers(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) setIsLoadingContainers(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor Firebase Auth state and keep ID token in React memory only
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await syncAuthUserToApi(token);
      addToast({
        type: 'success',
        title: 'Signed In',
        description: `Signed in as ${result.user.email || result.user.displayName || 'Authorized User'}.`,
      });
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        description: err.message || 'Could not complete Google Sign-In.',
      });
    }
  };

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
    requireWebLogin: false,
    adminEmail: 'admin@cpm.internal',
    masterPassword: '8076910181',
    blockedEmails: [],
  });

  const [usersList, setUsersList] = useState<AppUserAccess[]>([DEFAULT_ADMIN_USER]);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('Authorization Required');
  const [passwordModalDesc, setPasswordModalDesc] = useState('');

  useEffect(() => {
    fetchAccessConfigFromApi()
      .then((cfg) => {
        if (cfg) setAccessConfig(cfg);
      })
      .catch(() => {});

    fetchPortalUsersFromApi()
      .then((list) => {
        if (list && list.length > 0) {
          setUsersList(list);
        } else {
          setUsersList([DEFAULT_ADMIN_USER]);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = Boolean(
    currentUser?.email?.toLowerCase() === 'anilgaur099@gmail.com' ||
      currentUser?.email?.toLowerCase() === 'anilgaurjaaflogi@gmail.com' ||
      sessionUser?.role === 'admin' ||
      sessionUser?.username?.toLowerCase() === 'anil' ||
      adminUnlockedWithPin
  );

  const isUserBlocked = Boolean(
    (currentUser?.email &&
      (accessConfig.blockedEmails || []).some(
        (e) => e.toLowerCase() === currentUser.email?.toLowerCase()
      )) ||
      (sessionUser?.email &&
        (accessConfig.blockedEmails || []).some(
          (e) => e.toLowerCase() === sessionUser.email?.toLowerCase()
        )) ||
      sessionUser?.status === 'blocked'
  );

  const loginWithCredentials = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();
    const currentMasterPass = accessConfig.masterPassword || '8076910181';

    if (
      (cleanId === 'anil' ||
        cleanId === 'admin' ||
        cleanId === 'anilgaurjaaflogi@gmail.com' ||
        cleanId === 'anilgaur099@gmail.com') &&
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

    const latestUsers = await fetchPortalUsersFromApi().catch(() => usersList);
    if (latestUsers.length > 0) setUsersList(latestUsers);

    const found = latestUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanId || (u.username && u.username.toLowerCase() === cleanId)
    );

    if (!found) {
      return {
        success: false,
        message: 'Account not found! Access is restricted to users created by Anil Gaur.',
      };
    }

    if (
      found.status === 'blocked' ||
      accessConfig.blockedEmails.some((b) => b.toLowerCase() === found.email.toLowerCase())
    ) {
      return {
        success: false,
        message: 'Your access has been blocked / revoked by administrator Anil Gaur.',
      };
    }

    if (found.password && found.password !== cleanPass) {
      return {
        success: false,
        message: 'Incorrect password! Please check credentials provided by Anil Gaur.',
      };
    }

    const activeUser: AppUserAccess = {
      ...found,
      lastActive: Date.now(),
    };
    setSessionUser(activeUser);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(activeUser));

    if (activeUser.role === 'admin') {
      setAdminUnlockedWithPin(true);
    }

    savePortalUserToApi(activeUser).catch(() => {});
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

  const signOutUser = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {}
    setIdToken(null);
    logoutSessionUser();
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
      description: 'Viewing container plans and vehicle specifications.',
    });
  };

  const updateMasterPassword = async (newPass: string) => {
    const updatedCfg = { ...accessConfig, masterPassword: newPass.trim() };
    setAccessConfig(updatedCfg);
    await saveAccessConfigToApi(updatedCfg);
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
    await saveAccessConfigToApi(newCfg);

    const target = updatedUsers.find((u) => u.email.toLowerCase() === clean);
    if (target) {
      await savePortalUserToApi(target);
    }
    addToast({
      type: 'warning',
      title: 'User Blocked / Kicked Out',
      description: `${clean} has been blocked.`,
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
    await saveAccessConfigToApi(newCfg);

    const target = updatedUsers.find((u) => u.email.toLowerCase() === clean);
    if (target) {
      await savePortalUserToApi(target);
    }
    addToast({
      type: 'success',
      title: 'User Access Restored',
      description: `${clean} has been unblocked.`,
    });
  };

  const addUserAccess = async (user: AppUserAccess) => {
    await savePortalUserToApi(user);
    const updated = await fetchPortalUsersFromApi();
    setUsersList(updated.length > 0 ? updated : [DEFAULT_ADMIN_USER]);
  };

  const removeUserAccess = async (email: string) => {
    await deletePortalUserFromApi(email);
    const updated = await fetchPortalUsersFromApi();
    setUsersList(updated.length > 0 ? updated : [DEFAULT_ADMIN_USER]);
    addToast({
      type: 'info',
      title: 'User Removed',
      description: `Record for ${email} has been removed.`,
    });
  };

  const updateAccessConfig = async (cfg: Partial<AccessControlConfig>) => {
    const updated = { ...accessConfig, ...cfg };
    setAccessConfig(updated);
    await saveAccessConfigToApi(updated);
    addToast({
      type: 'success',
      title: 'Security Policy Updated',
      description: 'Access control configuration saved.',
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
        currentUser,
        idToken,
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
