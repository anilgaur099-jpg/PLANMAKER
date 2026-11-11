import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  ShieldCheck,
  Settings,
  Ship,
  Sun,
  Moon,
  Languages,
  X,
  Cloud,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const {
    activePage,
    setActivePage,
    containers,
    settings,
    updateSettings,
    isCloudConnected,
    cloudSyncStatus,
    syncToCloud,
  } = useApp();

  const totalContainers = containers.length;
  const totalVehicles = containers.reduce((sum, c) => sum + (c.vehicleCount || c.vehicles?.length || 0), 0);
  const isJa = settings.language === 'ja';

  const navItems = [
    {
      id: 'dashboard' as const,
      label: isJa ? 'ダッシュボード' : 'Dashboard',
      sub: isJa ? 'Dashboard' : 'ダッシュボード',
      icon: LayoutDashboard,
    },
    {
      id: 'library' as const,
      label: isJa ? '積載プラン一覧' : 'Plan Library',
      sub: isJa ? 'Plan Archive' : '積載実績一覧',
      icon: FolderKanban,
      badge: totalContainers,
    },
    {
      id: 'search' as const,
      label: isJa ? '型式・車台検索' : 'Search & Models',
      sub: isJa ? 'Search & Insights' : '型式・車台検索',
      icon: Search,
    },
    {
      id: 'builder' as const,
      label: isJa ? 'プラン作成' : 'Plan Builder',
      sub: isJa ? 'Pattern Match' : '実績照合プラン作成',
      icon: ShieldCheck,
      highlight: true,
    },
    {
      id: 'settings' as const,
      label: isJa ? '設定' : 'Settings',
      sub: isJa ? 'Configuration' : 'システム設定',
      icon: Settings,
    },
    {
      id: 'admin' as const,
      label: isJa ? '管理者パネル' : 'Admin & Users',
      sub: isJa ? 'Access Control' : 'ユーザー・権限管理',
      icon: ShieldAlert,
    },
  ];

  const handleNavClick = (pageId: typeof activePage) => {
    setActivePage(pageId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Container Plan</span>
                <span className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">JP</span>
              </div>
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                MADE BY ANIL GAUR
              </div>
              <div className="text-[11px] text-slate-400">
                Vehicle Export Logistics
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <div className="truncate">
                    <div className="leading-tight">{item.label}</div>
                    {item.sub && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight">
                        {item.sub}
                      </div>
                    )}
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Check
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Database Quick Stats */}
        <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>OFFLINE DB</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">READY</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {totalContainers}
              </div>
              <div className="text-[10px] text-slate-500">Containers</div>
            </div>
            <div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {totalVehicles}
              </div>
              <div className="text-[10px] text-slate-500">Vehicles</div>
            </div>
          </div>

          {/* Firebase Cloud status row */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Cloud className="w-3 h-3 text-sky-500" />
              <span>Firebase Cloud</span>
            </div>
            <button
              onClick={() => syncToCloud()}
              disabled={cloudSyncStatus === 'syncing'}
              title="Sync local plans to Firebase Firestore"
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                cloudSyncStatus === 'syncing'
                  ? 'bg-sky-100 text-sky-700 animate-pulse'
                  : isCloudConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {cloudSyncStatus === 'syncing' ? 'SYNCING' : isCloudConnected ? 'CONNECTED' : 'STANDBY'}
            </button>
          </div>
        </div>

        {/* Footer Quick Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
          {/* Language Toggle: English (EN) / 日本語 (JA) */}
          <button
            onClick={() => updateSettings({ language: isJa ? 'en' : 'ja' })}
            title={isJa ? 'Switch to English' : '日本語に切り替え'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60 hover:bg-sky-100 dark:hover:bg-sky-900/50"
          >
            <Languages className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[11px] font-bold tracking-tight">{isJa ? '日本語 (JA)' : 'English (EN)'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </aside>
    </>
  );
};
