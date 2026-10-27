import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NetworkLeakageRecord, PCArea, InspectionLocation } from '../types/index.ts';
import { LeakageDetailModal } from './LeakageDetailModal.tsx';

interface LeakageHistoryTableProps {
  leakageRecords: NetworkLeakageRecord[];
  pcAreas: PCArea[];
  locations?: InspectionLocation[];
  onExportCSV?: (records: NetworkLeakageRecord[]) => void;
  onViewDetail?: (record: NetworkLeakageRecord) => void;
}

export const LeakageHistoryTable: React.FC<LeakageHistoryTableProps> = ({
  leakageRecords = [],
  pcAreas = [],
  locations = [],
  onExportCSV,
  onViewDetail,
}) => {
  const [periodTab, setPeriodTab] = useState<'day' | 'week' | 'month'>('day');
  const [selectedPC, setSelectedPC] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeModalRecord, setActiveModalRecord] = useState<NetworkLeakageRecord | null>(null);
  const itemsPerPage = 5;

  // Helper to determine or match PC Area for a leakage record
  const getRecordPCArea = (record: NetworkLeakageRecord): string => {
    if (record.pcAreaId) return record.pcAreaId;
    const match = record.leakLocationDetail.match(/PC\s*([1-5])/i);
    if (match) return `PC ${match[1]}`;

    // Match closest location if coordinates exist
    if (record.latitude && record.longitude && locations.length > 0) {
      let closestLoc = locations[0];
      let minDistance = Infinity;
      for (const loc of locations) {
        const d = Math.hypot(loc.latitude - record.latitude, loc.longitude - record.longitude);
        if (d < minDistance) {
          minDistance = d;
          closestLoc = loc;
        }
      }
      if (closestLoc && minDistance < 0.2) {
        return closestLoc.pcAreaId;
      }
    }
    return pcAreas[0]?.id || 'PC 1';
  };

  // Helper to parse dates safely
  const parseRecordDate = (record: NetworkLeakageRecord): Date => {
    const rawDate = record.repairDate || record.inspectionDate || record.createdAt;
    if (!rawDate) return new Date(record.timestamp || Date.now());

    // Check if ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      return new Date(rawDate);
    }
    // Check if DD/MM/YYYY format
    const parts = rawDate.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    return new Date(record.timestamp || Date.now());
  };

  // Filter records based on selected criteria
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return leakageRecords.filter((item) => {
      // 1. Filter by PC Area
      const recordArea = getRecordPCArea(item);
      if (selectedPC !== 'all' && recordArea !== selectedPC) {
        return false;
      }

      // 2. Filter by Period
      const recDate = parseRecordDate(item);
      const rawDateStr = item.repairDate || item.inspectionDate || item.createdAt || '';

      if (periodTab === 'day') {
        const isToday =
          rawDateStr.includes(todayStr) ||
          recDate.toDateString() === now.toDateString() ||
          rawDateStr.includes(
            `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
          );
        if (!isToday) return false;
      } else if (periodTab === 'week') {
        if (recDate < oneWeekAgo || recDate > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
          return false;
        }
      } else if (periodTab === 'month') {
        const isThisMonth =
          rawDateStr.includes(currentYearMonth) ||
          (recDate.getFullYear() === now.getFullYear() && recDate.getMonth() === now.getMonth());
        if (!isThisMonth) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = item.id.toLowerCase().includes(q);
        const matchLocation = item.leakLocationDetail.toLowerCase().includes(q);
        const matchInspector = (item.reporterInspector || item.createdBy || '').toLowerCase().includes(q);
        const matchPipe = (item.pipeType || '').toLowerCase().includes(q);
        const matchRepair = (item.repairActionTaken || '').toLowerCase().includes(q);
        const matchResult = (item.physicalInspectionResult || '').toLowerCase().includes(q);
        const matchMaterial = item.materialsUsed?.some((m) =>
          m.materialName.toLowerCase().includes(q)
        );

        if (
          !matchId &&
          !matchLocation &&
          !matchInspector &&
          !matchPipe &&
          !matchRepair &&
          !matchResult &&
          !matchMaterial
        ) {
          return false;
        }
      }

      return true;
    });
  }, [leakageRecords, selectedPC, searchQuery, periodTab, pcAreas, locations]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const currentRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Selesai
          </span>
        );
      case 'Diverifikasi':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5"></span>
            Diverifikasi
          </span>
        );
      case 'Baru':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            {status || 'Dalam Penanganan'}
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV(filteredRecords);
      return;
    }

    // Default built-in CSV export for leakage records
    const headers = [
      'ID Kebocoran',
      'Tanggal Pemeriksaan',
      'Tanggal Perbaikan',
      'Waktu Perbaikan',
      'PC Area',
      'Lokasi Detail',
      'Tipe Pipa',
      'Status',
      'Petugas Pelapor',
      'Hasil Pemeriksaan',
      'Tindakan Perbaikan',
      'Material Digunakan',
      'Latitude',
      'Longitude',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.inspectionDate || '-',
      r.repairDate || '-',
      `${r.repairStartTime || '--:--'} - ${r.repairEndTime || '--:--'}`,
      getRecordPCArea(r),
      `"${(r.leakLocationDetail || '-').replace(/"/g, '""')}"`,
      r.pipeType || '-',
      r.status || 'Selesai',
      `"${(r.reporterInspector || r.createdBy || '-').replace(/"/g, '""')}"`,
      `"${(r.physicalInspectionResult || '-').replace(/"/g, '""')}"`,
      `"${(r.repairActionTaken || '-').replace(/"/g, '""')}"`,
      `"${(r.materialsUsed?.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join('; ') || '-').replace(/"/g, '""')}"`,
      r.latitude || '',
      r.longitude || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Kebocoran_Pipa_AETRA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (item: NetworkLeakageRecord) => {
    if (onViewDetail) {
      onViewDetail(item);
    } else {
      setActiveModalRecord(item);
    }
  };

  // Helper to extract initials
  const getInitials = (name?: string) => {
    if (!name) return 'PL';
    const clean = name.replace(/[^a-zA-Z\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'P').toUpperCase();
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-5 mt-6">
        {/* Top Header of Table */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-[#00162d]">
              Log Riwayat Kebocoran Pipa
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Catatan berkala laporan kebocoran pipa, status tindakan perbaikan, dan material terpasang.
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {/* Day / Week / Month Toggle */}
            <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold w-full sm:w-auto">
              <button
                onClick={() => {
                  setPeriodTab('day');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs cursor-pointer ${
                  periodTab === 'day'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">Hari</span>
                <span className="hidden sm:inline">Hari Ini (Day)</span>
              </button>
              <button
                onClick={() => {
                  setPeriodTab('week');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs cursor-pointer ${
                  periodTab === 'week'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">Minggu</span>
                <span className="hidden sm:inline">Minggu Ini (Week)</span>
              </button>
              <button
                onClick={() => {
                  setPeriodTab('month');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs cursor-pointer ${
                  periodTab === 'month'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">Bulan</span>
                <span className="hidden sm:inline">Bulan Ini (Month)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              {/* PC Area Select */}
              <select
                value={selectedPC}
                onChange={(e) => {
                  setSelectedPC(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter Area PC"
                className="w-full sm:w-auto text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">
                  Semua Area PC ({pcAreas.length > 0 ? `${pcAreas.length} Area` : '5 Area'})
                </option>
                {pcAreas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} - {p.region}
                  </option>
                ))}
              </select>

              {/* Search box */}
              <div className="relative w-full sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari ID / Lokasi..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              {/* CSV Export Button */}
              <button
                onClick={handleExportCSV}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-[#006591] hover:bg-[#005177] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Card List for Smartphones */}
        <div className="md:hidden mt-4 space-y-3">
          {currentRecords.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              Tidak ada data kebocoran yang sesuai filter.
            </div>
          ) : (
            currentRecords.map((item) => {
              const area = getRecordPCArea(item);
              const inspector = item.reporterInspector || item.createdBy || 'Petugas Lapangan';
              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
                >
                  {/* Header: ID, PC Area, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-mono font-bold text-rose-900 text-xs">{item.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {area}
                      </span>
                    </div>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  {/* Location Title & Subtitle */}
                  <div>
                    <p className="font-heading font-bold text-xs text-[#00162d] line-clamp-1">
                      {item.leakLocationDetail}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {item.repairDate || item.inspectionDate} • {item.repairStartTime || '16:00'} WIB
                      {item.pipeType && ` • Pipa ${item.pipeType}`}
                    </p>
                  </div>

                  {/* Materials / Repair Action summary */}
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-500">Tindakan: </span>
                    <span className="font-semibold text-slate-800 line-clamp-1">
                      {item.repairActionTaken || item.physicalInspectionResult || 'Perbaikan pipa'}
                    </span>
                  </div>

                  {/* Bottom: Inspector & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-[#00162d] text-white flex items-center justify-center text-[9px] font-bold">
                        {getInitials(inspector)}
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 truncate max-w-[140px]">
                        {inspector}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-700">
                      <span>Detail</span>
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop/Tablet Table Content */}
        <div className="hidden md:block overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">ID Kebocoran</th>
                <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3 px-4">PC Area</th>
                <th className="py-3 px-4">Lokasi / Pipa</th>
                <th className="py-3 px-4">Status Perbaikan</th>
                <th className="py-3 px-4">Material Digunakan</th>
                <th className="py-3 px-4">Petugas / Pelapor</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada data kebocoran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                currentRecords.map((item) => {
                  const area = getRecordPCArea(item);
                  const inspector = item.reporterInspector || item.createdBy || 'Petugas Lapangan';
                  const primaryDate = item.repairDate || item.inspectionDate || item.createdAt;
                  const primaryTime = item.repairStartTime || item.reportReceivedTime || '16:00';

                  // Format materials summary
                  const materialSummary =
                    item.materialsUsed && item.materialsUsed.length > 0
                      ? item.materialsUsed.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join(', ')
                      : item.repairActionTaken || '-';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID Kebocoran */}
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-900 whitespace-nowrap">
                        <span>{item.id}</span>
                        {item.sopReference && (
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">
                            {item.sopReference}
                          </span>
                        )}
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <span className="font-medium">{primaryDate}</span>
                        <span className="text-slate-400 ml-1.5 font-mono">• {primaryTime} WIB</span>
                      </td>

                      {/* PC Area Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {area}
                        </span>
                      </td>

                      {/* Lokasi / Pipa */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-medium text-slate-800 block truncate" title={item.leakLocationDetail}>
                          {item.leakLocationDetail}
                        </span>
                        {item.pipeType && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            Pipa {item.pipeType} {item.pipeDiameter ? `• ${item.pipeDiameter}` : ''}
                          </span>
                        )}
                      </td>

                      {/* Status Perbaikan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Material Digunakan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-slate-700 font-medium block truncate" title={materialSummary}>
                          {materialSummary}
                        </span>
                      </td>

                      {/* Petugas / Pelapor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-[#00162d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(inspector)}
                          </div>
                          <span className="font-medium text-slate-800 max-w-[120px] truncate" title={inspector}>
                            {inspector}
                          </span>
                        </div>
                      </td>

                      {/* Action: Lihat Detail */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleRowClick(item)}
                          className="inline-flex items-center space-x-1 text-sky-700 hover:text-sky-900 font-semibold hover:underline cursor-pointer"
                        >
                          <span>Lihat Detail</span>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching screenshot */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 text-center sm:text-left">
          <p>
            Menampilkan{' '}
            <span className="font-bold text-slate-700">
              {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </span>{' '}
            dari <span className="font-bold text-slate-700">{filteredRecords.length}</span> rekaman kebocoran
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Halaman Sebelumnya"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Halaman Selanjutnya"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Leakage Detail Modal */}
      {activeModalRecord && (
        <LeakageDetailModal
          record={activeModalRecord}
          pcAreas={pcAreas}
          onClose={() => setActiveModalRecord(null)}
        />
      )}
    </>
  );
};
