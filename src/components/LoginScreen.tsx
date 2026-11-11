import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, Eye, EyeOff, LogIn, AlertCircle, Ship } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, unlockAdminWithPin, signInWithGoogle, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'credentials' | 'pin'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await loginWithCredentials(identifier, password);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Welcome!',
          description: 'Access granted to Container Plan Manager.',
        });
      } else {
        setErrorMessage(res.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Please enter Master PIN.');
      return;
    }

    const success = unlockAdminWithPin(pin);
    if (success) {
      addToast({
        type: 'success',
        title: 'Master Access Unlocked',
        description: 'Welcome, Anil Gaur (Administrator).',
      });
    } else {
      setErrorMessage('Incorrect Master PIN! Access denied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Container Plan Manager
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Japanese Used-Vehicle Export
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/70 border border-amber-900/60 px-2.5 py-1 rounded-full">
          MADE BY ANIL GAUR
        </span>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Authorized Portal Access
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Yeh web application surakshit hai. Sirf Anil Gaur dwara authorised users hi access kar sakte hain.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('credentials');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              User & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'pin'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Master Admin PIN
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Tab 1: Username & Password Form */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username or Email / यूजरनेम
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password / पासवर्ड
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 absolute right-2.5 top-2 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Verifying...' : 'Sign In to Portal'}</span>
              </button>
            </form>
          )}

          {/* Tab 2: Master Admin PIN Form */}
          {activeTab === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Admin PIN / एडमिन पिन
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter Master PIN"
                    className="w-full pl-9 pr-10 py-2.5 text-xs font-mono rounded-xl border border-slate-800 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-center tracking-widest"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 absolute right-2.5 top-2 cursor-pointer"
                    aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Sirf Anil Gaur ke master control ke liye.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock Master Access</span>
              </button>
            </form>
          )}

          {/* Contact Admin Notice */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              Need access credentials? Contact Administrator: <strong className="text-white">Anil Gaur</strong>
            </p>
          </div>
        </div>

        {/* Data Privacy & Confidentiality Guarantee Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Private & Confidential Export Data Guarantee</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Aapka container data, vehicle chassis numbers aur pricing Google ya kisi teesre ke sath share nahi kiya jaata. Yeh data poori tarah surakshit aur private hai.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 relative z-10 py-2">
        Container Plan Manager • Built for Japanese Used-Vehicle Export • Managed by Anil Gaur
      </footer>
    </div>
  );
};
