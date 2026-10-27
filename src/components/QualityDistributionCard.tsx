import React from 'react';
import { PCArea, InspectionRecord } from '../types/index.ts';
import { ShieldAlert, ArrowUpRight, Activity } from 'lucide-react';

interface QualityDistributionCardProps {
  pcAreas: PCArea[];
  inspections: InspectionRecord[];
  onShowCalibrationSchedule?: () => void;
}

export const QualityDistributionCard: React.FC<QualityDistributionCardProps> = ({
  pcAreas,
  inspections,
  onShowCalibrationSchedule,
}) => {
  // Compute dynamic stats per PC area based on logs
  const pcStats = pcAreas.map((area) => {
    const areaLogs = inspections.filter((i) => i.pcAreaId === area.id);
    const avgPressure =
      areaLogs.length > 0
        ? areaLogs.reduce((acc, curr) => acc + curr.pressureBar, 0) / areaLogs.length
        : area.nominalPressureBar;
    
    // Quality health percentage
    const normalCount = areaLogs.filter((i) => i.status === 'normal').length;
    const healthPercent =
      areaLogs.length > 0
        ? Math.round((normalCount / areaLogs.length) * 100)
        : area.id === 'PC 3' ? 82 : 96;

    const isFluctuating = healthPercent < 90 || avgPressure < 4.0;

    return {
      area,
      avgPressure,
      healthPercent,
      isFluctuating,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col justify-between min-h-[420px] lg:h-[470px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-700 shrink-0" />
            <h3 className="font-heading font-bold text-xs sm:text-sm text-[#00162d]">
              Distribusi Kualitas PC Area
            </h3>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 shrink-0">
            5 PC Aktif
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500 mb-4">
          Analisis stabilitas debit dan deviasi bar per distrik regulator.
        </p>

        {/* Circular Gauge Card matching Image 3.jpeg */}
        <div className="bg-[#f0f7ff] rounded-xl p-4 flex items-center space-x-4 border border-sky-100 mb-5">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* SVG circle gauge */}
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-sky-600 transition-all duration-1000 ease-out"
                strokeDasharray="96, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-heading font-extrabold text-sm text-[#00162d]">96%</span>
              <span className="text-[8px] font-bold tracking-wider text-slate-500 uppercase">
                INDEKS
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold text-xs text-[#00162d] leading-snug">
              Indeks Stabilitas Jaringan
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Fluktuasi rata-rata hanya <span className="font-bold text-sky-900">±0.18 Bar</span> di
              seluruh koridor pipa transmisi.
            </p>
          </div>
        </div>

        {/* 5 PC Area Progress Bars */}
        <div className="space-y-3">
          {pcStats.map(({ area, avgPressure, healthPercent, isFluctuating }) => (
            <div key={area.id} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700 truncate max-w-[190px]">
                  {area.id} - {area.region}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-900">
                  {avgPressure.toFixed(2)} Bar{' '}
                  <span
                    className={`font-sans font-bold text-[10px] ml-1 ${
                      isFluctuating ? 'text-sky-600' : 'text-emerald-600'
                    }`}
                  >
                    ({healthPercent}% {isFluctuating ? 'Fluktuatif' : 'Normal'})
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFluctuating
                      ? 'bg-gradient-to-r from-sky-400 to-sky-600'
                      : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
