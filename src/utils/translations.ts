/**
 * Bilingual UI Text Dictionary: English (EN) & Japanese (JA - 日本語)
 * Tailored for Japanese Used-Vehicle Export Yards & International Logistics Teams.
 * NO HINDI USED.
 */

export interface TranslationItem {
  en: string;
  ja: string;
  hi?: string; // backwards compatibility alias for ja
}

export const LABELS: Record<string, TranslationItem> = {
  appName: { en: 'Container Plan Manager', ja: 'コンテナ積載プランマネージャー' },
  appSub: { en: 'Japanese Used-Vehicle Export', ja: '日本中古車輸出・積載管理システム' },
  dashboard: { en: 'Dashboard', ja: 'ダッシュボード' },
  planLibrary: { en: 'Plan Library', ja: '積載実績ライブラリ' },
  search: { en: 'Search & Models', ja: '型式・車台検索' },
  planBuilder: { en: 'Plan Builder', ja: '積載プラン作成 (実績照合)' },
  settings: { en: 'Settings', ja: 'システム設定' },
  admin: { en: 'Admin & Users', ja: '管理者・ユーザー管理' },

  containerNo: { en: 'Container No', ja: 'コンテナ番号 (MSKU...)' },
  sealNo: { en: 'Seal / B/L No', ja: 'シール / B/L 番号' },
  extraValue: { en: 'Extra / Tare (kg)', ja: '自重・予備重量 (kg)' },
  vehicleCount: { en: 'Vehicles', ja: '積載台数' },
  totalCbm: { en: 'Total CBM (m³)', ja: '総容積 (m³)' },
  totalWeight: { en: 'Total Weight (kg)', ja: '総重量 (kg)' },
  totalPrice: { en: 'Total Value (JPY)', ja: '合計金額 (JPY ¥)' },

  serialNo: { en: 'No', ja: '番号' },
  make: { en: 'Make', ja: 'メーカー (Toyota, Isuzu...)' },
  model: { en: 'Model', ja: '車種・モデル (Hiace, Elf...)' },
  engineCC: { en: 'Engine (CC)', ja: '排気量 (CC)' },
  fuel: { en: 'Fuel', ja: '燃料 (D=軽油, G=ガソリン)' },
  year: { en: 'Year', ja: '年式 (初度登録)' },
  vehicleId: { en: 'Vehicle ID', ja: '車両管理番号' },
  chassisNo: { en: 'Chassis No', ja: '車台番号' },
  chassisPrefix: { en: 'Chassis Prefix', ja: '型式プレフィックス (KDH206等)' },
  dimensions: { en: 'L × W × H (cm)', ja: '車両寸法 (長×幅×高 cm)' },
  length: { en: 'Length (cm)', ja: '全長 (cm)' },
  width: { en: 'Width (cm)', ja: '全幅 (cm)' },
  height: { en: 'Height (cm)', ja: '全高 (cm)' },
  qty: { en: 'Qty', ja: '数量' },
  price: { en: 'Price (JPY)', ja: '価格 (JPY ¥)' },
  weight: { en: 'Weight (kg)', ja: '車両重量 (kg)' },
  cbm: { en: 'CBM (m³)', ja: '容積 (m³)' },
  loadingSteps: { en: 'Loading Steps & Prep', ja: '積載作業指示・加工内容' },

  // Actions
  importExcel: { en: 'Import Excel', ja: 'Excel一括取込' },
  exportExcel: { en: 'Export to Excel', ja: 'Excel出力' },
  downloadTemplate: { en: 'Download Template', ja: 'Excel雛形ダウンロード' },
  newContainer: { en: 'New Container', ja: '新規コンテナ登録' },
  optimizeAgain: { en: 'Re-Match Plans', ja: '実績再照合' },
  patternMatched: { en: 'Historical Plan Matched', ja: '過去確定積載実績に一致' },
  saveToLibrary: { en: 'Save Plan to Library', ja: 'プランをライブラリに保存' },
  copyWhatsApp: { en: 'Copy for WhatsApp', ja: 'WhatsApp用テキストコピー' },
  printPlan: { en: 'Print / PDF Plan', ja: '積載表印刷 / PDF出力' },
  resetPassword: { en: 'Reset Password', ja: 'パスワード再設定' },
  grantAccess: { en: 'Grant Access', ja: 'アクセス権限を付与' },
  logout: { en: 'Log Out', ja: 'ログアウト' },
  login: { en: 'Sign In', ja: 'ログイン' },
};

/**
 * Returns rendered label in English or Japanese, or bilingual format.
 */
export function t(key: string, langOrBilingual: 'en' | 'ja' | boolean = 'en'): string {
  const item = LABELS[key];
  if (!item) return key;

  if (langOrBilingual === 'ja') return item.ja;
  if (langOrBilingual === 'en') return item.en;
  if (langOrBilingual === true) return `${item.en} / ${item.ja}`;
  return item.en;
}

export function th(key: string, langOrBilingual: 'en' | 'ja' | boolean = 'en'): { primary: string; secondary?: string } {
  const item = LABELS[key];
  if (!item) return { primary: key };

  if (langOrBilingual === 'ja') {
    return { primary: item.ja, secondary: item.en };
  }
  if (langOrBilingual === true) {
    return { primary: item.en, secondary: item.ja };
  }
  return { primary: item.en, secondary: undefined };
}

export function getLabel(key: string, lang: 'en' | 'ja' = 'en'): string {
  const item = LABELS[key];
  return item ? (lang === 'ja' ? item.ja : item.en) : key;
}
