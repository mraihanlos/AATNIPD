import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { InspectionRecord, PCArea } from '../types/index.ts';

interface InspectionHistoryTableProps {
  inspections: InspectionRecord[];
  pcAreas: PCArea[];
  onExportCSV: () => void;
  onViewDetail: (record: InspectionRecord) => void;
}

export const InspectionHistoryTable: React.FC<InspectionHistoryTableProps> = ({
  inspections,
  pcAreas,
  onExportCSV,
  onViewDetail,
}) => {
  const [periodTab, setPeriodTab] = useState<'day' | 'week' | 'month'>('day');
  const [selectedPC, setSelectedPC] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Filter inspections based on criteria
  const filteredRecords = useMemo(() => {
    return inspections.filter((item) => {
      // PC filter
      if (selectedPC !== 'all' && item.pcAreaId !== selectedPC) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.locationTitle.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchInspector = item.inspectorName.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchInspector) return false;
      }
      return true;
    });
  }, [inspections, selectedPC, searchQuery, periodTab]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const currentRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'normal':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            {label}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5"></span>
            {label}
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-5 mt-6">
      {/* Top Header of Table */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-heading font-bold text-sm sm:text-base text-[#00162d]">
            Log Riwayat Inspeksi Lapangan
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Catatan berkala hasil inspeksi manual teknisi SCADA di lokasi katup.
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
              className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs ${
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
              className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs ${
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
              className={`py-1.5 px-2 sm:px-3 text-center rounded-md transition-all text-xs ${
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
              <option value="all">Semua Area PC (5 Area)</option>
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
                placeholder="Cari ID / Katup..."
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
              onClick={onExportCSV}
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
            Tidak ada data inspeksi yang sesuai filter.
          </div>
        ) : (
          currentRecords.map((item) => (
            <div
              key={item.id}
              onClick={() => onViewDetail(item)}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
            >
              {/* Header: ID, PC Area, Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="font-mono font-bold text-sky-800 text-xs">{item.id}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                    {item.pcAreaId}
                  </span>
                </div>
                <div>{getStatusBadge(item.status, item.statusLabel)}</div>
              </div>

              {/* Location Title & Subtitle */}
              <div>
                <p className="font-heading font-bold text-xs text-[#00162d] line-clamp-1">
                  {item.locationTitle}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {item.date} • {item.time} WIB
                </p>
              </div>

              {/* Bottom: Pressure Metric & Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-baseline space-x-1">
                  <span className="text-[10px] text-slate-500 font-medium">Tekanan:</span>
                  <span className="font-telemetry font-bold text-sm text-sky-950">
                    {item.pressureBar.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">BAR</span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-700">
                  <span>Detail</span>
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/Tablet Table Content */}
      <div className="hidden md:block overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
              <th className="py-3 px-4">ID Inspeksi</th>
              <th className="py-3 px-4">Tanggal & Jam</th>
              <th className="py-3 px-4">PC Area</th>
              <th className="py-3 px-4">Lokasi Titik</th>
              <th className="py-3 px-4">Nilai Tekanan</th>
              <th className="py-3 px-4">Status Indikator</th>
              <th className="py-3 px-4">Petugas Lapangan</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Tidak ada data inspeksi yang sesuai filter.
                </td>
              </tr>
            ) : (
              currentRecords.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-800 whitespace-nowrap">
                    {item.id}
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    <span className="font-medium">{item.date}</span>
                    <span className="text-slate-400 ml-1.5 font-mono">• {item.time}</span>
                  </td>

                  {/* PC Area Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                      {item.pcAreaId}
                    </span>
                  </td>

                  {/* Location Title */}
                  <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                    {item.locationTitle}
                  </td>

                  {/* Pressure Value */}
                  <td className="py-3.5 px-4 font-telemetry font-bold text-slate-900 text-sm whitespace-nowrap">
                    {item.pressureBar.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-500 uppercase">BAR</span>
                  </td>

                  {/* Status Indicator */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(item.status, item.statusLabel)}
                  </td>

                  {/* Inspector Avatar & Name */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[#00162d] text-white flex items-center justify-center text-[10px] font-bold">
                        {item.inspectorInitials}
                      </div>
                      <span className="font-medium text-slate-800">{item.inspectorName}</span>
                    </div>
                  </td>

                  {/* Action: Lihat Detail */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => onViewDetail(item)}
                      className="inline-flex items-center space-x-1 text-sky-700 hover:text-sky-900 font-semibold hover:underline cursor-pointer"
                    >
                      <span>Lihat Detail</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination matching Image 3.jpeg */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 text-center sm:text-left">
        <p>
          Menampilkan{' '}
          <span className="font-bold text-slate-700">
            {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
          </span>{' '}
          dari <span className="font-bold text-slate-700">{filteredRecords.length}</span> rekaman inspeksi
        </p>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
