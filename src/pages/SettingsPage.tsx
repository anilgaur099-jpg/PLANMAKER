import React, { useState } from 'react';
import {
  Sliders,
  Database,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  BookOpen,
  LogOut,
  ShieldCheck,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { useApp, CONTAINER_PRESETS } from '../context/AppContext';
import { clearLocalDatabase, generateSyntheticContainers } from '../db/db';
import { bulkSaveContainersToApi, clearContainersFromApi } from '../api/cloudSqlClient';
import { exportDatabaseBackup } from '../utils/excelParser';
import { ConfirmModal } from '../components/ConfirmModal';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    containers,
    refreshContainers,
    addToast,
    sessionUser,
    logoutSessionUser,
    setActivePage,
  } = useApp();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ processed: 0, total: 0 });
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'limits' | 'database' | 'readme'>('limits');

  const handleApplyPreset = (presetId: string) => {
    const preset = CONTAINER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    updateSettings({
      activePresetId: preset.id,
      maxVehicles: preset.maxVehicles,
      maxCbm: preset.maxCbm,
      maxWeightKg: preset.maxWeightKg,
      maxLengthCm: preset.maxLengthCm,
    });

    addToast({
      type: 'info',
      title: 'Preset Applied',
      description: `Loaded limits for ${preset.name}`,
    });
  };

  const handleGenerateScaleData = async (count: number) => {
    setIsGenerating(true);
    setGenerateProgress({ processed: 0, total: count });

    try {
      const generated = await generateSyntheticContainers(count, (processed, total) => {
        setGenerateProgress({ processed, total });
      });
      await bulkSaveContainersToApi(generated, (processed, total) => {
        setGenerateProgress({ processed, total });
      });
      await refreshContainers();

      addToast({
        type: 'success',
        title: 'Sample Dataset Added',
        description: `Successfully created ${count} realistic export containers (${count * 4} vehicles).`,
      });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Generation Failed', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearDatabase = async () => {
    try {
      await clearContainersFromApi();
      await clearLocalDatabase().catch(() => {});
      await refreshContainers();
      addToast({
        type: 'warning',
        title: 'Archive Cleared',
        description: 'All container records have been removed.',
      });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Error clearing archive', description: err.message });
    }
  };

  const handleRestoreJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.containers || !Array.isArray(parsed.containers)) {
          throw new Error('Invalid JSON backup file structure.');
        }

        const res = await bulkSaveContainersToApi(parsed.containers);
        await refreshContainers();
        addToast({
          type: 'success',
          title: 'Backup Restored',
          description: `Imported ${res.success} containers from JSON backup.`,
        });
      } catch (err: any) {
        console.error(err);
        addToast({ type: 'error', title: 'Restore Failed', description: err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Settings & Specifications</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            System Preferences
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure container loading constraints, appearance theme, and archive backups
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab('limits')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'limits'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Container Constraints & Presets</span>
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'database'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data Management & Backup</span>
        </button>
        <button
          onClick={() => setActiveTab('readme')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'readme'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>How It Works (README)</span>
        </button>
      </div>

      {/* TAB 1: Container Limits & Presets */}
      {activeTab === 'limits' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Container Type Presets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CONTAINER_PRESETS.map((preset) => {
                const isActive = settings.activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {preset.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">{preset.description}</p>
                    <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
                      <div>Max Volume: <strong>{preset.maxCbm} CBM</strong></div>
                      <div>Max Weight: <strong>{preset.maxWeightKg.toLocaleString()} kg</strong></div>
                      <div>Max Units: <strong>{preset.maxVehicles} Vehicles</strong></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Editable Limits */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Custom Container Limits (Editable)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Volume Limit (CBM)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.maxCbm}
                  onChange={(e) => updateSettings({ maxCbm: parseFloat(e.target.value) || 76.0 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default 76.0 for 40HC</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Cargo Weight (kg)
                </label>
                <input
                  type="number"
                  step="500"
                  value={settings.maxWeightKg}
                  onChange={(e) => updateSettings({ maxWeightKg: parseInt(e.target.value) || 26500 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default 26,500 kg payload</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Vehicles per Container
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxVehicles}
                  onChange={(e) => updateSettings({ maxVehicles: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default 4 vehicles</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Combined Length (cm)
                </label>
                <input
                  type="number"
                  value={settings.maxLengthCm}
                  onChange={(e) => updateSettings({ maxLengthCm: parseInt(e.target.value) || 2400 })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Container internal length ~1200cm (double deck)</span>
              </div>
            </div>
          </div>

          {/* Interface Preferences */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Interface Theme
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Color Mode:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                    settings.theme === 'light'
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Light Mode
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                    settings.theme === 'dark'
                      ? 'border-sky-500 bg-sky-950 text-sky-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Dark Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Data Management & Backup */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Archive Summary */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Fleet Archive Summary</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                {containers.length} Plans
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Containers</span>
                <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 tabular-nums">
                  {containers.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Vehicle Rows</span>
                <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 tabular-nums">
                  {containers.reduce((acc, c) => acc + (c.vehicleCount || c.vehicles?.length || 0), 0)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Distinct Models</span>
                <span className="font-mono font-bold text-base text-sky-600 dark:text-sky-400 tabular-nums">
                  {Array.from(new Set(containers.flatMap((c) => c.models))).length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Distinct Prefixes</span>
                <span className="font-mono font-bold text-base text-sky-600 dark:text-sky-400 tabular-nums">
                  {Array.from(new Set(containers.flatMap((c) => c.chassisPrefixes))).length}
                </span>
              </div>
            </div>
          </div>

          {/* Portal User Session & Access Control Section */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Portal Account & Team Access Control</span>
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {sessionUser
                  ? `Active Session: ${sessionUser.displayName || sessionUser.username} • Role: ${sessionUser.role.toUpperCase()}`
                  : 'Administrator Session (Master Control)'}
              </p>
              <p className="text-[11px] text-slate-500">
                Team credentials and access permissions are managed by Anil Gaur.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActivePage('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Manage Users</span>
              </button>
              <button
                onClick={() => logoutSessionUser()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Scale Test Generators */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <span>Sample Scale Test Generator</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Populate sample Japanese used vehicle container plans (ELF, CANTER, HIACE, WISH, RUMION, DYNA, DUTRO) to test search performance and charts at high volume.
              </p>
            </div>

            {isGenerating ? (
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center space-y-2">
                <div className="text-xs font-bold text-sky-800 dark:text-sky-200 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Sample Plans: {generateProgress.processed} / {generateProgress.total} Containers...</span>
                </div>
                <div className="w-full max-w-sm mx-auto h-2 bg-sky-200 dark:bg-sky-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 rounded-full"
                    style={{
                      width: `${(generateProgress.processed / generateProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleGenerateScaleData(25)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-900 dark:text-slate-100 cursor-pointer shadow-xs"
                >
                  + Generate 25 Containers (100 Vehicles)
                </button>
                <button
                  onClick={() => handleGenerateScaleData(250)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs"
                >
                  + Generate 250 Containers (1,000 Vehicles)
                </button>
                <button
                  onClick={() => handleGenerateScaleData(500)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs"
                >
                  + Generate 500 Containers (2,000 Vehicles)
                </button>
              </div>
            )}
          </div>

          {/* Backup & Restore JSON */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Full Archive Backup & Restore
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => exportDatabaseBackup(containers)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-sky-500" />
                  <span>Download Full JSON Backup</span>
                </button>

                <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Restore from JSON File</span>
                  <input type="file" accept=".json" onChange={handleRestoreJsonBackup} className="hidden" />
                </label>
              </div>

              <button
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Plans</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: README & Documentation */}
      {activeTab === 'readme' && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Container Plan Manager (Japanese Used Vehicle Export)
            </h2>
            <p className="text-slate-500">
              Technical documentation on Excel importing, chassis parsing, and the 3-phase automated planning engine.
            </p>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              1. How the Stacked Block Excel Importer Works
            </h3>
            <p>
              In Japanese yard operations, shipping manifests are often formatted in stacked 4-row blocks:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
              <li><strong>Row 1:</strong> Column A = Container Number (e.g. MSKU0113466), Columns B–P = Vehicle 1 columns</li>
              <li><strong>Row 2:</strong> Column A = Seal / BL Number (e.g. ML-JP0409806), Columns B–P = Vehicle 2 columns</li>
              <li><strong>Row 3:</strong> Column A = Extra / Tare Value (e.g. 4000), Columns B–P = Vehicle 3 columns</li>
              <li><strong>Row 4:</strong> Column A = (blank or empty), Columns B–P = Vehicle 4 columns</li>
              <li><strong>Row 5:</strong> Blank separator line between containers</li>
            </ul>
            <p>
              The built-in parser automatically detects this layout as well as flat multi-row formats, extracts all 15 vehicle attributes, calculates CBM as <code>L × W × H ÷ 1,000,000</code>, and flags any discrepancy between recorded CBM and mathematical CBM.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              2. Smart Chassis Prefix Extraction
            </h3>
            <p>
              Chassis numbers are parsed with smart regex heuristics:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
              <li>If hyphenated (<code>KDH206-8053689</code>), the prefix is <code>KDH206</code>.</li>
              <li>If non-hyphenated (<code>NPR58P7106494</code>), the trailing production serial number (6–7 digits) is stripped, yielding <code>NPR58P</code>.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              3. Strict Historical Plan Verification
            </h3>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Only uploaded historical plans are matched and verified:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-[11px]">
              <li>
                <strong>Level 1 (Exact Model + Chassis Prefix Match):</strong> Checks your uploaded plans for exact chassis code matches (e.g., ELF [NKR61E] + RUMION [ZRE152] + ELF [NPR58P] + HIACE [KDH206]).
              </li>
              <li>
                <strong>Level 2 (Exact Historical Model Combination Match):</strong> Checks uploaded plans for proven 4-vehicle multiset combinations.
              </li>
              <li>
                <strong>Strict Unmatched Safety:</strong> Zero guesswork. If a vehicle combination has not previously been uploaded in a past plan, it remains under Unmatched Vehicles so you only confirm 100% verified manifests.
              </li>
            </ol>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showClearModal}
        onCancel={() => setShowClearModal(false)}
        onConfirm={handleClearDatabase}
        title="Clear All Container Plans?"
        message="This will permanently delete all container plans and vehicle records from the shared archive. Download a JSON backup first if you need a copy."
        confirmLabel="Delete All Plans"
        isDestructive={true}
      />
    </div>
  );
};
