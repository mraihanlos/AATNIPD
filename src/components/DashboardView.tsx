import React, { useState, useMemo } from 'react';
import {
  Download,
  Plus,
  Gauge,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Calendar,
  RotateCcw,
  Filter,
} from 'lucide-react';
import {
  InspectionRecord,
  InspectionLocation,
  PCArea,
  UserProfile,
  NetworkLeakageRecord,
} from '../types/index.ts';
import { normalizeToISODate } from '../constants/monthColors.ts';
import { PipeNetworkMap } from './PipeNetworkMap.tsx';
import { QualityDistributionCard } from './QualityDistributionCard.tsx';
import { InspectionHistoryTable } from './InspectionHistoryTable.tsx';
import { LeakageHistoryTable } from './LeakageHistoryTable.tsx';

interface DashboardViewProps {
  inspections: InspectionRecord[];
  locations: InspectionLocation[];
  leakageRecords?: NetworkLeakageRecord[];
  pcAreas: PCArea[];
  currentUser: UserProfile;
  onNavigateToInput: () => void;
  onNavigateToLeakage?: () => void;
  onExportCSV: () => void;
  onViewDetail: (record: InspectionRecord) => void;
  onOpenCADModal: () => void;
  onShowCalibrationSchedule: () => void;
  onEditLeakageRecord?: (record: NetworkLeakageRecord) => void;
  onDeleteLeakageRecord?: (id: string) => void;
  onUpdateInspection?: (record: InspectionRecord) => Promise<void>;
  onDeleteInspection?: (id: string) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inspections,
  locations,
  leakageRecords = [],
  pcAreas,
  currentUser,
  onNavigateToInput,
  onNavigateToLeakage,
  onExportCSV,
  onViewDetail,
  onOpenCADModal,
  onShowCalibrationSchedule,
  onEditLeakageRecord,
  onDeleteLeakageRecord,
  onUpdateInspection,
  onDeleteInspection,
}) => {
  // Dynamically compute KPI summary
  const avgPressure =
    inspections.length > 0
      ? inspections.reduce((a, b) => a + b.pressureBar, 0) / inspections.length
      : 4.82;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentYearStr = String(currentYear);
  const currentMonthPadded = String(currentMonth).padStart(2, '0');
  const currentDayPadded = String(now.getDate()).padStart(2, '0');
  const todayISO = `${currentYearStr}-${currentMonthPadded}-${currentDayPadded}`;
  const currentYearMonthISO = `${currentYearStr}-${currentMonthPadded}`;

  // Period filter state for the Dual Monitoring Maps section
  const [mapPeriodStart, setMapPeriodStart] = useState<string>('');
  const [mapPeriodEnd, setMapPeriodEnd] = useState<string>('');

  const handlePresetToday = () => {
    setMapPeriodStart(todayISO);
    setMapPeriodEnd(todayISO);
  };

  const handlePreset7Days = () => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setMapPeriodStart(startStr);
    setMapPeriodEnd(todayISO);
  };

  const handlePresetThisMonth = () => {
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    setMapPeriodStart(`${currentYearStr}-${currentMonthPadded}-01`);
    setMapPeriodEnd(`${currentYearStr}-${currentMonthPadded}-${String(lastDay).padStart(2, '0')}`);
  };

  const handlePresetThisYear = () => {
    setMapPeriodStart(`${currentYearStr}-01-01`);
    setMapPeriodEnd(`${currentYearStr}-12-31`);
  };

  // Filter inspections for the Pressure Map
  const filteredInspectionsForMap = useMemo(() => {
    return inspections.filter((insp) => {
      const d = normalizeToISODate(insp.date);
      if (!d) return true;
      if (mapPeriodStart && d < mapPeriodStart) return false;
      if (mapPeriodEnd && d > mapPeriodEnd) return false;
      return true;
    });
  }, [inspections, mapPeriodStart, mapPeriodEnd]);

  // Filter leakage records for the Leakage Map
  const filteredLeakageForMap = useMemo(() => {
    return leakageRecords.filter((rec) => {
      const d = normalizeToISODate(rec.repairDate || rec.inspectionDate || rec.reportReceivedTime);
      if (!d) return true;
      if (mapPeriodStart && d < mapPeriodStart) return false;
      if (mapPeriodEnd && d > mapPeriodEnd) return false;
      return true;
    });
  }, [leakageRecords, mapPeriodStart, mapPeriodEnd]);

  // Month names in Indonesian
  const monthNamesID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const currentMonthLabel = `${monthNamesID[now.getMonth()]} ${currentYear}`;

  // Card 2: Total Titik Inspeksi Hari Ini
  const todayInspectionsCount = inspections.filter((i) => {
    const d = normalizeToISODate(i.date);
    return d === todayISO;
  }).length;
  const totalInspectedToday = todayInspectionsCount;
  const targetPoints = 150;
  const targetPct = Math.min(Math.round((totalInspectedToday / targetPoints) * 100), 100);

  // Card 3: Total Kebocoran Bulan Ini
  const leaksThisMonth = leakageRecords.filter((r) => {
    const dates = [r.inspectionDate, r.repairDate, r.createdAt].filter(Boolean);
    return dates.some((d) => {
      if (d.startsWith(currentYearMonthISO)) return true;
      const parts = d.split(/[/-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return parts[0] === currentYearStr && parts[1] === currentMonthPadded;
        } else if (parts[2].length === 4) {
          return parts[2] === currentYearStr && String(parseInt(parts[1], 10)).padStart(2, '0') === currentMonthPadded;
        }
      }
      return false;
    });
  }).length;

  // Card 4: Total Kebocoran Terlapor
  const totalLeaksReported = leakageRecords.length;
  const completedLeaks = leakageRecords.filter(
    (r) => r.status === 'Selesai' || r.status === 'Diverifikasi' || Boolean(r.photoAfterUrl)
  ).length;

  return (
    <div className="space-y-6 pb-12">

      {/* Main Title & Action Buttons Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm bg-sky-100 text-sky-800">
              Operasional Wilayah Aetra Air Tangerang
            </span>
            <span className="text-xs text-slate-400 font-mono">REV. 2025.02</span>
          </div>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#00162d] tracking-tight">
            Ringkasan Tekanan Jaringan Pipa
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Pantau metrik tekanan fluida, riwayat inspeksi lapangan, dan anomali distribusi
            hidrologis secara real-time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:flex sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={onExportCSV}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Unduh Laporan (CSV)</span>
          </button>

          {onNavigateToLeakage && (
            <button
              onClick={onNavigateToLeakage}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Lapor Kebocoran Pipa</span>
            </button>
          )}

          <button
            onClick={onNavigateToInput}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Input Inspeksi Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Rata - Rata tekanan Jaringan */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rata - Rata tekanan Jaringan
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700 shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="font-telemetry font-extrabold text-2xl sm:text-3xl text-[#00162d]">
                {avgPressure.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">BAR</span>
            </div>
            <div className="flex items-center justify-between mt-2.5 sm:mt-3 text-xs flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                Optimal / Normal
              </span>
              <span className="text-emerald-600 font-semibold flex items-center font-mono text-[11px]">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +0.12 Bar
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Titik inspeksi hari ini */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Titik inspeksi hari ini
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="font-telemetry font-extrabold text-2xl sm:text-3xl text-[#00162d]">
                {totalInspectedToday}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">TITIK</span>
            </div>
            <div className="flex items-center justify-between mt-2.5 sm:mt-3 text-xs flex-wrap gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">
                {totalInspectedToday > 0 ? 'Titik telah diinspeksi' : 'Belum ada inspeksi hari ini'}
              </span>

            </div>
          </div>
        </div>

        {/* Card 3: Total Kebocoran Bulan Ini */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Kebocoran Bulan Ini
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="font-telemetry font-extrabold text-2xl sm:text-3xl text-rose-600">
                {leaksThisMonth}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">KASUS</span>
            </div>
            <div className="flex items-center justify-between mt-2.5 sm:mt-3 text-xs flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200 text-[11px]">
                {currentMonthLabel}
              </span>
              <span className="text-slate-500 font-medium text-[11px]">
                {leaksThisMonth > 0 ? 'Dalam Penanganan' : 'Nihil Kebocoran'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Kebocoran Terlapor */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Kebocoran Terlapor
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="font-telemetry font-extrabold text-2xl sm:text-3xl text-amber-600">
                {totalLeaksReported}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">TITIK TERDATA</span>
            </div>
            <div className="flex items-center justify-between mt-2.5 sm:mt-3 text-xs flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                {completedLeaks} Selesai Tertangani
              </span>
              <span className="text-slate-500 font-medium text-[11px]">Histori Terdata</span>
            </div>
          </div>
        </div>
      </div>

      {/* Period Filter for Dual Monitoring Maps Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Badge */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-heading font-bold text-sm text-[#00162d]">
                  Filter Periode Waktu Peta Pemantauan
                </h3>
                {mapPeriodStart || mapPeriodEnd ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Filter Aktif: {mapPeriodStart || 'Awal'} s/d {mapPeriodEnd || 'Kini'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Semua Periode Data
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saring data telemetri tekanan pipa dan histori sebaran titik kebocoran pada kedua peta secara sinkron.
              </p>
            </div>
          </div>

          {/* Date Inputs: Dari (From) & Sampai (To) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-sky-500 focus-within:bg-white transition-all">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dari:</span>
              <input
                type="date"
                value={mapPeriodStart}
                onChange={(e) => setMapPeriodStart(e.target.value)}
                aria-label="Filter Tanggal Mulai"
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-sky-500 focus-within:bg-white transition-all">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sampai:</span>
              <input
                type="date"
                value={mapPeriodEnd}
                onChange={(e) => setMapPeriodEnd(e.target.value)}
                aria-label="Filter Tanggal Selesai"
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {(mapPeriodStart || mapPeriodEnd) && (
              <button
                type="button"
                onClick={() => {
                  setMapPeriodStart('');
                  setMapPeriodEnd('');
                }}
                className="py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Hapus Filter Periode"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => {
                setMapPeriodStart('');
                setMapPeriodEnd('');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                !mapPeriodStart && !mapPeriodEnd
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Data
            </button>
            <button
              type="button"
              onClick={handlePresetToday}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                mapPeriodStart === todayISO && mapPeriodEnd === todayISO
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handlePreset7Days}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={handlePresetThisMonth}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={handlePresetThisYear}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Tahun Ini ({currentYear})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Hasil Filter: <strong className="text-sky-900 font-bold">{filteredInspectionsForMap.length}</strong> Inspeksi Tekanan • <strong className="text-rose-700 font-bold">{filteredLeakageForMap.length}</strong> Titik Kebocoran
          </div>
        </div>
      </div>

      {/* Mid Section: Dual Monitoring Maps (Left: Pressure Inspection, Right: Leakage History) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Pressure Inspection Map */}
        <div className="w-full min-w-0">
          <PipeNetworkMap
            mode="pressure"
            inspections={filteredInspectionsForMap}
            locations={locations}
            periodStart={mapPeriodStart}
            periodEnd={mapPeriodEnd}
            onSelectInspection={onViewDetail}
          />
        </div>

        {/* Right Column: Leakage Historical Data Map */}
        <div className="w-full min-w-0">
          <PipeNetworkMap
            mode="leakage"
            leakageRecords={filteredLeakageForMap}
            locations={locations}
            periodStart={mapPeriodStart}
            periodEnd={mapPeriodEnd}
            onNavigateToLeakage={onNavigateToLeakage}
          />
        </div>
      </div>

      {/* Quality Distribution & PC Health Section */}
      <div className="w-full">
        <QualityDistributionCard
          pcAreas={pcAreas}
          inspections={inspections}
        />
      </div>

      {/* Bottom Section 1: Inspection History Table */}
      <InspectionHistoryTable
        inspections={inspections}
        pcAreas={pcAreas}
        onExportCSV={onExportCSV}
        onViewDetail={onViewDetail}
      />

      {/* Bottom Section 2: Pipe Leakage History Table */}
      <LeakageHistoryTable
        leakageRecords={leakageRecords}
        pcAreas={pcAreas}
        locations={locations}
        currentUser={currentUser}
        onEditRecord={onEditLeakageRecord}
        onDeleteRecord={onDeleteLeakageRecord}
      />
    </div>
  );
};
