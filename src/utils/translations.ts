/**
 * UI Text Dictionary: Pure English (EN)
 * Tailored for Japanese Used-Vehicle Export Yards & International Logistics Teams.
 */

export interface TranslationItem {
  en: string;
}

export const LABELS: Record<string, TranslationItem> = {
  appName: { en: 'Container Plan Manager' },
  appSub: { en: 'Japanese Used-Vehicle Export' },
  dashboard: { en: 'Dashboard' },
  planLibrary: { en: 'Plan Library' },
  search: { en: 'Search & Models' },
  planBuilder: { en: 'Plan Builder' },
  settings: { en: 'Settings' },
  admin: { en: 'Admin & Users' },

  containerNo: { en: 'Container No' },
  sealNo: { en: 'Seal / B/L No' },
  extraValue: { en: 'Extra / Tare (kg)' },
  vehicleCount: { en: 'Vehicles' },
  totalCbm: { en: 'Total CBM (m³)' },
  totalWeight: { en: 'Total Weight (kg)' },
  totalPrice: { en: 'Total Value (JPY)' },

  serialNo: { en: 'No' },
  make: { en: 'Make' },
  model: { en: 'Model' },
  engineCC: { en: 'Engine (CC)' },
  fuel: { en: 'Fuel' },
  year: { en: 'Year' },
  vehicleId: { en: 'Vehicle ID' },
  chassisNo: { en: 'Chassis No' },
  chassisPrefix: { en: 'Chassis Prefix' },
  dimensions: { en: 'L × W × H (cm)' },
  length: { en: 'Length (cm)' },
  width: { en: 'Width (cm)' },
  height: { en: 'Height (cm)' },
  qty: { en: 'Qty' },
  price: { en: 'Price (JPY)' },
  weight: { en: 'Weight (kg)' },
  cbm: { en: 'CBM (m³)' },
  loadingSteps: { en: 'Loading Steps & Prep' },

  // Actions
  importExcel: { en: 'Import Excel' },
  exportExcel: { en: 'Export to Excel' },
  downloadTemplate: { en: 'Download Template' },
  newContainer: { en: 'New Container' },
  optimizeAgain: { en: 'Re-Match Plans' },
  patternMatched: { en: 'Historical Plan Matched' },
  saveToLibrary: { en: 'Save Plan to Library' },
  copyWhatsApp: { en: 'Copy for WhatsApp' },
  printPlan: { en: 'Print / PDF Plan' },
  resetPassword: { en: 'Reset Password' },
  grantAccess: { en: 'Grant Access' },
  logout: { en: 'Log Out' },
  login: { en: 'Sign In' },
};

/**
 * Returns rendered label in clean English.
 */
export function t(key: string, _unused?: any): string {
  const item = LABELS[key];
  return item ? item.en : key;
}

export function th(key: string, _unused?: any): { primary: string; secondary?: string } {
  const item = LABELS[key];
  return { primary: item ? item.en : key, secondary: undefined };
}

export function getLabel(key: string, _unused?: any): string {
  const item = LABELS[key];
  return item ? item.en : key;
}

