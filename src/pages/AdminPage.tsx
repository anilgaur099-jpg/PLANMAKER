import React, { useState } from 'react';
import {
  ShieldCheck,
  UserX,
  UserCheck,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle2,
  Users,
  Search,
  Eye,
  EyeOff,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Cloud,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUserAccess } from '../types';
import { firebaseConfig } from '../firebase/config';

export const AdminPage: React.FC = () => {
  const {
    sessionUser,
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
    updateMasterPassword,
    addToast,
    settings,
  } = useApp();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'viewer'>('staff');
  const [isAdding, setIsAdding] = useState(false);

  // Edit User Password Modal / State (Existing passwords are never rendered or visible)
  const [editingUser, setEditingUser] = useState<AppUserAccess | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Change Master Password state
  const [showChangeMasterModal, setShowChangeMasterModal] = useState(false);
  const [currentMasterInput, setCurrentMasterInput] = useState('');
  const [newMasterInput, setNewMasterInput] = useState('');
  const [masterError, setMasterError] = useState('');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = unlockAdminWithPin(pinInput);
    if (success) {
      setPinError(false);
      setPinInput('');
      addToast({
        type: 'success',
        title: 'Admin Unlocked',
        description: 'Master access granted to Anil Gaur Admin Panel.',
      });
    } else {
      setPinError(true);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() && !newEmail.trim()) {
      addToast({ type: 'warning', title: 'Username or Email Required' });
      return;
    }
    if (!newPassword.trim()) {
      addToast({ type: 'warning', title: 'Password Required for User' });
      return;
    }

    setIsAdding(true);
    const identifier = newEmail.trim() || `${newUsername.trim().toLowerCase()}@cpm.internal`;
    const username = newUsername.trim() || newEmail.split('@')[0];

    try {
      await addUserAccess({
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        email: identifier.toLowerCase(),
        username: username.toLowerCase(),
        password: newPassword.trim(),
        displayName: newName.trim() || username,
        role: newRole,
        status: 'active',
        createdAt: Date.now(),
        lastActive: Date.now(),
      });

      setNewEmail('');
      setNewUsername('');
      setNewName('');
      setNewPassword('');

      addToast({
        type: 'success',
        title: 'User & Password Created',
        description: `Created credentials for ${username}. Only this user can now log in.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to add user', description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEditedPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editPasswordInput.trim()) return;

    try {
      const updated: AppUserAccess = {
        ...editingUser,
        password: editPasswordInput.trim(),
      };
      await addUserAccess(updated);
      setEditingUser(null);
      setEditPasswordInput('');
      addToast({
        type: 'success',
        title: 'Password Updated',
        description: `Updated password for ${updated.displayName || updated.username}.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', description: err.message });
    }
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError('');

    const actualMaster = accessConfig.masterPassword || '8076910181';
    if (currentMasterInput.trim() !== actualMaster.trim()) {
      setMasterError('Current Master Password is incorrect!');
      return;
    }

    if (!newMasterInput.trim() || newMasterInput.trim().length < 4) {
      setMasterError('New Master Password must be at least 4 characters long.');
      return;
    }

    try {
      await updateMasterPassword(newMasterInput.trim());
      setShowChangeMasterModal(false);
      setCurrentMasterInput('');
      setNewMasterInput('');
      addToast({
        type: 'success',
        title: 'Master Password Changed',
        description: 'New Master Password has been securely saved to database.',
      });
    } catch (err: any) {
      setMasterError(err.message || 'Failed to update master password');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789#@!';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              <span>User & Web Access Control Center</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              MADE BY ANIL GAUR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {settings.language === 'ja'
              ? '権限のあるユーザー名とパスワードを作成し、Webアクセスを管理します。アカウントの停止・削除も可能です。'
              : 'Create authorized usernames and passwords to grant web access. Manage user accounts and revoke access.'}
          </p>
        </div>

        {adminUnlockedWithPin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangeMasterModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Change Master PIN</span>
            </button>
            <button
              onClick={() => lockAdmin()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Panel</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Unlock Screen if not authenticated */}
      {!isAdmin && !adminUnlockedWithPin ? (
        <div className="max-w-lg mx-auto p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Admin Access Protected • Anil Gaur Operations
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              This area is restricted to primary administrator Anil Gaur. Enter Master PIN to manage users and access credentials.
              <span className="block mt-1 text-slate-400">このセクションは管理者専用です。ユーザーおよび権限を管理するにはマスターPINを入力してください。</span>
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3 max-w-xs mx-auto">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(false);
                }}
                autoFocus
                placeholder="Enter Master PIN"
                className={`w-full pl-9 pr-10 py-2.5 text-sm font-mono text-center rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none transition-all ${
                  pinError
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                }`}
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-2 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {pinError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Incorrect Master PIN! Access Denied.
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-xs cursor-pointer"
            >
              Unlock Admin Center
            </button>
          </form>
        </div>
      ) : (
        /* Unlocked Workspace */
        <div className="space-y-6">
          {/* Master Policy & Data Protection Banner */}
          <div className="p-5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/40 dark:from-sky-950/30 dark:via-slate-900 dark:to-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Global Web Access Security Policy
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  PROTECTED
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Primary Administrator: <strong className="text-slate-700 dark:text-slate-300">Anil Gaur</strong> (Master Control)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <input
                  type="checkbox"
                  checked={accessConfig.requireWebLogin !== false}
                  onChange={(e) => updateAccessConfig({ requireWebLogin: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Require Username & Password to Open Web App
                </span>
              </label>
            </div>
          </div>

          {/* Firebase Maker Console Environment Connection Card */}
          <div className="p-5 rounded-xl border border-sky-300 dark:border-sky-900 bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/40 dark:from-sky-950/40 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Firebase Maker Console Environment
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      console.firebase.google.com
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live connected to Google Cloud Firestore database for real-time synchronization of export plans, users, and vehicles.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CONNECTED TO MAKER CONSOLE</span>
                </span>
              </div>
            </div>

            {/* Quick stats / IDs and Direct Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Firebase Project ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block mt-0.5" title={firebaseConfig.projectId}>
                  {firebaseConfig.projectId}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Firestore Database ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block mt-0.5" title={firebaseConfig.firestoreDatabaseId}>
                  {firebaseConfig.firestoreDatabaseId}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Firestore Collections</span>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:underline mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Data in Console</span>
                </a>
              </div>

              <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project Overview</span>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/overview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Maker Dashboard</span>
                </a>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                💡 <strong>Maker Console Sync:</strong> All records are saved directly in project <code className="font-mono text-sky-600 dark:text-sky-400 font-bold">{firebaseConfig.projectId}</code> on <code className="font-mono">console.firebase.google.com</code>.
              </span>
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Maker Console</span>
              </a>
            </div>
          </div>

          {/* Data Confidentiality Guarantee Reassurance Box */}
          <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                Data Privacy & Export Confidentiality Guarantee / データ保護・機密保持保証
              </h4>
              <p className="text-emerald-800 dark:text-emerald-400 leading-relaxed text-[11px]">
                Your container data, vehicle pricing, chassis prefixes, and loading remarks are 100% confidential and secure. They are never shared with unauthorized parties. Only authenticated users created by you can access this database.
                <span className="block mt-1 font-sans text-emerald-900 dark:text-emerald-300 font-medium">
                  コンテナデータ、仕入れ価格、車台番号プレフィックス、積載作業指示備考は厳格に暗号化・保護されており、第三者への共有は一切行われません。作成された認証済みユーザーのみが閲覧できます。
                </span>
              </p>
            </div>
          </div>

          {/* Form: Create User & Password */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-500" />
                  <span>Create User & Password / 新規ユーザー登録</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up username, login credentials, and permission levels for team members. / チームメンバーのユーザー名とパスワードを発行します。
                </p>
              </div>

              <button
                type="button"
                onClick={generateRandomPassword}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Auto Generate Password</span>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name / 氏名・ヤード担当
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Kenji Tanaka"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Username * / ユーザーID
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. kenji1"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Password * / パスワード
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full pl-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 absolute right-1.5 top-1.5 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Role / 権限区分
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="staff">Staff (Build & View Plans / 作業・プラン作成)</option>
                  <option value="viewer">Viewer (View Only / 閲覧のみ)</option>
                  <option value="admin">Co-Admin (副管理者)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAdding ? 'Creating...' : 'Grant Access'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* User List & Passwords Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Authorized Users & Login Credentials ({filteredUsers.length})
                </h3>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user or username..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full sm:w-64"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">User / Name</th>
                    <th className="py-3 px-4">Username / Login ID</th>
                    <th className="py-3 px-4">Credentials & Security</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Access Status</th>
                    <th className="py-3 px-4 text-right">Actions (Kick Out / Allow)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                  {filteredUsers.map((u) => {
                    const isOwner = u.role === 'admin' || u.username === 'anil' || u.email.toLowerCase().includes('anilgaur');
                    const isBlocked = u.status === 'blocked';

                    return (
                      <tr
                        key={u.id || u.email}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isBlocked ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{isOwner ? 'Anil Gaur' : (u.displayName || u.username || u.email)}</span>
                            {isOwner && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                                Master Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {isOwner ? 'Administrator Account (Protected)' : u.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                            {isOwner ? 'anil' : (u.username || u.email.split('@')[0])}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-sans">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Master Protected</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 font-sans">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Password Protected (Hidden)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditPasswordInput('');
                                  setShowEditPassword(false);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title="Reset user password"
                              >
                                <KeyRound className="w-3 h-3 text-amber-500" />
                                <span>Reset Password</span>
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              <UserX className="w-3 h-3" />
                              <span>BLOCKED (KICKED OUT)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE ALLOWED</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isOwner ? (
                            <span className="text-[11px] text-slate-400 font-sans italic">Primary Admin</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2 font-sans">
                              {isBlocked ? (
                                <button
                                  onClick={() => unblockUser(u.email)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                                  title="Unblock user and restore access"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Allow Access</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => blockUser(u.email, 'Kicked out by Anil Gaur')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                                  title="Kick out this user immediately"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>Kick Out / Block</span>
                                </button>
                              )}

                              <button
                                onClick={() => removeUserAccess(u.email)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete user record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Reset User Password Modal (Old passwords are encrypted & hidden) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Reset User Password / パスワード再設定</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Account: <strong className="text-slate-800 dark:text-slate-200">{editingUser.displayName || editingUser.username}</strong> ({editingUser.email})
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 leading-relaxed">
                🔒 <strong>Privacy Protected:</strong> Existing passwords are never shown. Type and assign a new secure password below. / パスワードは暗号化されています。新しいパスワードを入力して更新してください。
              </p>
            </div>

            <form onSubmit={handleSaveEditedPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Password / 新しいパスワード
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                    placeholder="Enter new password to assign"
                    className="w-full pl-3 pr-8 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 absolute right-1.5 top-1.5 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditPasswordInput('');
                    setShowEditPassword(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg cursor-pointer shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Master Password Modal */}
      {showChangeMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Change Master Password / PIN (マスターPIN変更)
            </h3>
            <p className="text-xs text-slate-500">
              Keep this master PIN secret. Only you have full admin authority. / このマスターPINは管理者専用です。厳重に管理してください。
            </p>

            <form onSubmit={handleChangeMasterPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Current Master Password
                </label>
                <input
                  type="password"
                  required
                  value={currentMasterInput}
                  onChange={(e) => setCurrentMasterInput(e.target.value)}
                  placeholder="Enter current PIN"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Master Password / PIN
                </label>
                <input
                  type="password"
                  required
                  value={newMasterInput}
                  onChange={(e) => setNewMasterInput(e.target.value)}
                  placeholder="Enter new secret PIN"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              {masterError && (
                <div className="text-xs text-rose-500 font-medium">
                  {masterError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeMasterModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg cursor-pointer shadow-xs"
                >
                  Update Master PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
