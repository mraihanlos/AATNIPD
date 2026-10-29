export interface MonthColorConfig {
  month: number; // 1-12
  name: string; // 'Januari', etc.
  shortName: string; // 'JAN', etc.
  color: string; // Primary hex for marker, ping, zone
  bgDark: string; // Dark hex for marker badge background
  border: string; // Border color
  badgeBg: string; // Light badge background
  textColor: string; // Text color
}

export const LEAKAGE_MONTH_COLORS: Record<number, MonthColorConfig> = {
  1: {
    month: 1,
    name: 'Januari',
    shortName: 'JAN',
    color: '#ef4444', // Red (Januari = Red)
    bgDark: '#7f1d1d',
    border: '#fca5a5',
    badgeBg: '#fef2f2',
    textColor: '#991b1b',
  },
  2: {
    month: 2,
    name: 'Februari',
    shortName: 'FEB',
    color: '#3b82f6', // Blue (Februari = Blue)
    bgDark: '#1e3a8a',
    border: '#93c5fd',
    badgeBg: '#eff6ff',
    textColor: '#1e40af',
  },
  3: {
    month: 3,
    name: 'Maret',
    shortName: 'MAR',
    color: '#10b981', // Emerald / Green
    bgDark: '#064e3b',
    border: '#6ee7b7',
    badgeBg: '#ecfdf5',
    textColor: '#065f46',
  },
  4: {
    month: 4,
    name: 'April',
    shortName: 'APR',
    color: '#f59e0b', // Amber / Orange-Yellow
    bgDark: '#78350f',
    border: '#fcd34d',
    badgeBg: '#fffbeb',
    textColor: '#92400e',
  },
  5: {
    month: 5,
    name: 'Mei',
    shortName: 'MEI',
    color: '#8b5cf6', // Violet / Purple
    bgDark: '#4c1d95',
    border: '#c4b5fd',
    badgeBg: '#f5f3ff',
    textColor: '#5b21b6',
  },
  6: {
    month: 6,
    name: 'Juni',
    shortName: 'JUN',
    color: '#06b6d4', // Cyan / Biru Muda
    bgDark: '#164e63',
    border: '#67e8f9',
    badgeBg: '#ecfeff',
    textColor: '#155e75',
  },
  7: {
    month: 7,
    name: 'Juli',
    shortName: 'JUL',
    color: '#ec4899', // Pink / Merah Muda
    bgDark: '#831843',
    border: '#f472b6',
    badgeBg: '#fdf2f8',
    textColor: '#9d174d',
  },
  8: {
    month: 8,
    name: 'Agustus',
    shortName: 'AGS',
    color: '#6366f1', // Indigo / Nila
    bgDark: '#312e81',
    border: '#a5b4fc',
    badgeBg: '#eef2ff',
    textColor: '#3730a3',
  },
  9: {
    month: 9,
    name: 'September',
    shortName: 'SEP',
    color: '#14b8a6', // Teal / Toska
    bgDark: '#134e4a',
    border: '#5eead4',
    badgeBg: '#f0fdfa',
    textColor: '#115e59',
  },
  10: {
    month: 10,
    name: 'Oktober',
    shortName: 'OKT',
    color: '#ea580c', // Deep Orange / Jingga
    bgDark: '#7c2d12',
    border: '#fdba74',
    badgeBg: '#fff7ed',
    textColor: '#9a3412',
  },
  11: {
    month: 11,
    name: 'November',
    shortName: 'NOV',
    color: '#d946ef', // Fuchsia / Magenta
    bgDark: '#701a75',
    border: '#f0abfc',
    badgeBg: '#fdf4ff',
    textColor: '#86198f',
  },
  12: {
    month: 12,
    name: 'Desember',
    shortName: 'DES',
    color: '#0284c7', // Sky Blue / Biru Langit
    bgDark: '#0c4a6e',
    border: '#7dd3fc',
    badgeBg: '#f0f9ff',
    textColor: '#075985',
  },
};

/**
 * Extracts month (1-12) from leakage record dates (repairDate, inspectionDate, reportReceivedTime).
 */
export const getRecordMonth = (dateStr?: string): number => {
  if (!dateStr) return 1;

  // YYYY-MM-DD
  const isoMatch = dateStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12) return m;
  }

  // DD/MM/YYYY
  const dmyMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (dmyMatch) {
    const m = parseInt(dmyMatch[2], 10);
    if (m >= 1 && m <= 12) return m;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.getMonth() + 1;
  }

  return 1;
};

/**
 * Normalizes any date string (ISO or DD/MM/YYYY or timestamp) to standard YYYY-MM-DD
 */
export const normalizeToISODate = (dateStr?: string): string => {
  if (!dateStr) return '';

  const isoMatch = dateStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dmyMatch = dateStr.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
};
