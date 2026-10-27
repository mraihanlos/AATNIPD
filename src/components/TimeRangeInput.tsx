import React from 'react';
import { Clock } from 'lucide-react';

interface TimeRangeInputProps {
  label: string;
  required?: boolean;
  badge?: React.ReactNode;
  startTime: string;
  endTime: string;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  disabled?: boolean;
  theme?: 'sky' | 'amber';
}

// Format digits to HH:MM automatically while typing (e.g. typing 1920 becomes 19:20)
export const formatTimeDigits = (raw: string): string => {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 1) {
    return digits;
  }

  if (digits.length === 2) {
    const h = parseInt(digits, 10);
    return h > 23 ? '23' : digits;
  }

  if (digits.length === 3) {
    let h = parseInt(digits.slice(0, 2), 10);
    if (h > 23) h = 23;
    const m = digits.slice(2, 3);
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // 4 or more digits (e.g. 1920 -> 19:20)
  let h = parseInt(digits.slice(0, 2), 10);
  if (h > 23) h = 23;
  let m = parseInt(digits.slice(2, 4), 10);
  if (m > 59) m = 59;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Normalize on blur (e.g. 9 -> 09:00, 19 -> 19:00, 19:2 -> 19:20)
export const normalizeTimeOnBlur = (val: string): string => {
  if (!val.trim()) return '';
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 1) {
    return `0${digits}:00`;
  }
  if (digits.length === 2) {
    const h = Math.min(23, parseInt(digits, 10));
    return `${String(h).padStart(2, '0')}:00`;
  }
  if (digits.length === 3) {
    const h = Math.min(23, parseInt(digits.slice(0, 1), 10));
    const m = Math.min(59, parseInt(digits.slice(1, 3), 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (digits.length >= 4) {
    const h = Math.min(23, parseInt(digits.slice(0, 2), 10));
    const m = Math.min(59, parseInt(digits.slice(2, 4), 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return val;
};

export const TimeRangeInput: React.FC<TimeRangeInputProps> = ({
  label,
  required = false,
  badge,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
  theme = 'sky',
}) => {
  const getNowHHMM = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleSetCurrentTime = () => {
    const now = getNowHHMM();
    if (!startTime) {
      onStartTimeChange(now);
    } else if (!endTime) {
      onEndTimeChange(now);
    } else {
      onStartTimeChange(now);
    }
  };

  const activeThemeClasses =
    theme === 'amber'
      ? disabled
        ? 'bg-slate-50 border-slate-200 text-slate-400'
        : 'bg-amber-50/60 border-amber-300 text-slate-800'
      : disabled
      ? 'bg-slate-50 border-slate-200 text-slate-400'
      : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-sky-400 focus-within:border-sky-500 focus-within:bg-white';

  return (
    <div>
      {/* Field Header */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label className="font-bold text-slate-700 text-xs flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        <div className="flex items-center space-x-2">
          {badge}

          {!disabled && (
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md px-2 py-0.5 flex items-center gap-1 transition-colors cursor-pointer"
              title="Isi waktu saat ini otomatis"
            >
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Sekarang</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Input Box */}
      <div
        className={`flex items-center justify-between border rounded-xl px-3 py-2 transition-colors ${activeThemeClasses}`}
      >
        {/* Mulai (Start Time) */}
        <div className="relative flex-1 flex items-center justify-center">
          <input
            type="text"
            disabled={disabled}
            value={startTime}
            onChange={(e) => onStartTimeChange(formatTimeDigits(e.target.value))}
            onBlur={() => onStartTimeChange(normalizeTimeOnBlur(startTime))}
            placeholder="--:--"
            maxLength={5}
            className="w-16 text-center font-bold font-mono text-sm bg-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onStartTimeChange(getNowHHMM())}
              className="ml-1 p-1 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-100/60 transition-colors cursor-pointer"
              title="Set Waktu Mulai ke Sekarang"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-slate-400 font-bold px-2 text-xs select-none">s/d</span>

        {/* Selesai (End Time) */}
        <div className="relative flex-1 flex items-center justify-center">
          <input
            type="text"
            disabled={disabled}
            value={endTime}
            onChange={(e) => onEndTimeChange(formatTimeDigits(e.target.value))}
            onBlur={() => onEndTimeChange(normalizeTimeOnBlur(endTime))}
            placeholder="--:--"
            maxLength={5}
            className="w-16 text-center font-bold font-mono text-sm bg-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onEndTimeChange(getNowHHMM())}
              className="ml-1 p-1 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-100/60 transition-colors cursor-pointer"
              title="Set Waktu Selesai ke Sekarang"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
