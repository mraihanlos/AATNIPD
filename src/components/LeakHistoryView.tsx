import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Filter,
  FileText,
  Clock,
  MapPin,
  Camera,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  X,
} from 'lucide-react';
import { LeakReport, UserProfile } from '../types/index.ts';

interface LeakHistoryViewProps {
  leakReports: LeakReport[];
  currentUser: UserProfile;
  onNavigateToForm: () => void;
  onDeleteReport: (id: string) => Promise<void>;
}

export const LeakHistoryView: React.FC<LeakHistoryViewProps> = ({
  leakReports,
  currentUser,
  onNavigateToForm,
  onDeleteReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'KLBC' | 'KPPR'>('all');
  const [selectedReport, setSelectedReport] = useState<LeakReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<LeakReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered reports
  const filteredReports = leakReports.filter((report) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      report.reportNo.toLowerCase().includes(query) ||
      report.leakLocationDetail.toLowerCase().includes(query) ||
      report.zoneArea.toLowerCase().includes(query) ||
      report.reporterName.toLowerCase().includes(query) ||
      (report.physicalInspectionResult && report.physicalInspectionResult.toLowerCase().includes(query));

    const matchStatus = filterStatus === 'all' || report.workStatus === filterStatus;
    return matchQuery && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const currentRecords = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteReport(reportToDelete.id);
      setReportToDelete(null);
    } catch (err) {
      console.error('Failed to delete report:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 flex-wrap">
        <span>MONITORING LAPANGAN</span>
        <span>&rsaquo;</span>
        <span className="text-sky-700 font-extrabold">RIWAYAT KEBOCORAN &amp; PERBAIKAN</span>
        <span>&rsaquo;</span>
        <span className="text-slate-400">ARSIP BERITA ACARA</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#00162d] tracking-tight">
            Riwayat Perawatan &amp; Perbaikan Kebocoran Pipa
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Arsip digital berita acara penanganan kebocoran, verifikasi foto dokumentasi sebelum &amp; setelah,
            koordinat GPS, serta alokasi material perbaikan PT Aetra Air Tangerang.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToForm}
          className="self-start sm:self-auto py-2.5 px-4 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-sky-950/20 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>+ Buat Laporan Baru</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Laporan Kebocoran
          </span>
          <p className="font-telemetry font-extrabold text-2xl text-[#00162d] mt-1">
            {leakReports.length}{' '}
            <span className="font-sans text-xs font-bold text-sky-700">Laporan</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Status KLBC (Kebocoran Pipa)
          </span>
          <p className="font-telemetry font-extrabold text-2xl text-emerald-700 mt-1">
            {leakReports.filter((r) => r.workStatus === 'KLBC').length}{' '}
            <span className="font-sans text-xs font-bold text-slate-500">Kasus</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Status KPPR (Pipa Putus/Emergency)
          </span>
          <p className="font-telemetry font-extrabold text-2xl text-amber-700 mt-1">
            {leakReports.filter((r) => r.workStatus === 'KPPR').length}{' '}
            <span className="font-sans text-xs font-bold text-slate-500">Kasus</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Foto Tervalidasi Watermark
          </span>
          <p className="font-telemetry font-extrabold text-2xl text-sky-700 mt-1">
            {leakReports.filter((r) => r.photoBeforeUrl && r.photoAfterUrl).length}{' '}
            <span className="font-sans text-xs font-bold text-slate-500">Lengkap</span>
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari lokasi kebocoran, no. berita acara, zona, atau petugas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold py-1">
            <button
              type="button"
              onClick={() => {
                setFilterStatus('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-[#00162d] text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Status ({leakReports.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatus('KLBC');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'KLBC'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              KLBC ({leakReports.filter((r) => r.workStatus === 'KLBC').length})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatus('KPPR');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'KPPR'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              KPPR ({leakReports.filter((r) => r.workStatus === 'KPPR').length})
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-3.5">No. Berita Acara</th>
                <th className="py-3 px-3.5">Zona / Area</th>
                <th className="py-3 px-3.5">Detail Lokasi Kebocoran</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Tgl &amp; Waktu</th>
                <th className="py-3 px-3.5">Dokumentasi Foto</th>
                <th className="py-3 px-3.5">Material Dipakai</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada laporan kebocoran yang sesuai pencarian. Klik "Buat Laporan Baru" di atas untuk menambah data.
                  </td>
                </tr>
              ) : (
                currentRecords.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* No. Berita Acara */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-sky-900 block">{report.id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{report.reportNo}</span>
                    </td>

                    {/* Zona / Area */}
                    <td className="py-3.5 px-3.5">
                      <span className="font-bold text-slate-800 text-xs block leading-snug">
                        {report.zoneArea}
                      </span>
                      <span className="text-[10px] text-slate-400">{report.department}</span>
                    </td>

                    {/* Detail Lokasi Kebocoran */}
                    <td className="py-3.5 px-3.5 max-w-xs">
                      <p className="font-semibold text-slate-900 leading-snug line-clamp-1">
                        {report.leakLocationDetail}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                      </span>
                    </td>

                    {/* Status KLBC / KPPR */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          report.workStatus === 'KLBC'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {report.workStatus}
                      </span>
                    </td>

                    {/* Tgl & Waktu */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-medium text-slate-700 block text-xs">
                        {report.inspectionDate}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {report.repairTimeStart} - {report.repairTimeEnd} WIB
                      </span>
                    </td>

                    {/* Dokumentasi Foto */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        {report.photoBeforeUrl && (
                          <img
                            src={report.photoBeforeUrl}
                            alt="Sebelum"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-300 shadow-2xs"
                            title="Foto Sebelum"
                          />
                        )}
                        {report.photoAfterUrl ? (
                          <img
                            src={report.photoAfterUrl}
                            alt="Setelah"
                            className="w-8 h-8 rounded-lg object-cover border border-emerald-400 shadow-2xs"
                            title="Foto Setelah"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada After</span>
                        )}
                      </div>
                    </td>

                    {/* Material */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-xs">
                      <span className="font-bold text-slate-700">
                        {report.materials?.length || 0} Material
                      </span>
                      {report.materials?.[0] && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {report.materials[0].materialName}
                        </p>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Berita Acara Lengkap"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportToDelete(report)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List */}
        <div className="md:hidden space-y-3">
          {currentRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              Tidak ada data laporan kebocoran pipa.
            </div>
          ) : (
            currentRecords.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs text-sky-900">{report.id}</span>
                    <span className="text-[10px] text-slate-400 block">{report.reportNo}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      report.workStatus === 'KLBC'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {report.workStatus}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {report.leakLocationDetail}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{report.zoneArea}</p>
                </div>

                {/* Photos mini strip */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-900">
                    {report.photoBeforeUrl ? (
                      <img
                        src={report.photoBeforeUrl}
                        alt="Foto Sebelum"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        Tidak ada foto
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">
                      Sebelum
                    </div>
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-900">
                    {report.photoAfterUrl ? (
                      <img
                        src={report.photoAfterUrl}
                        alt="Foto Setelah"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        Tidak ada foto
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-emerald-950/80 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded font-bold">
                      Setelah
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">
                    {report.inspectionDate} • {report.repairTimeStart}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 font-bold hover:bg-sky-100 text-xs"
                    >
                      Buka Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportToDelete(report)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <p>
            Menampilkan{' '}
            <span className="font-bold text-slate-700">
              {filteredReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, filteredReports.length)}
            </span>{' '}
            dari total <span className="font-bold text-slate-700">{filteredReports.length}</span> Berita Acara
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DETAIL BERITA ACARA LENGKAP */}
      {/* ======================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#00162d] text-white p-4 px-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-sky-900/60 text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sky-300 text-sm">
                      {selectedReport.id}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        selectedReport.workStatus === 'KLBC'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {selectedReport.workStatus}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-white mt-0.5">
                    {selectedReport.leakLocationDetail}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Cetak Berita Acara"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {/* Form Metadata Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    No. Dokumen
                  </span>
                  <span className="font-mono font-bold text-slate-900">{selectedReport.reportNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Zona / Area
                  </span>
                  <span className="font-bold text-slate-900">{selectedReport.zoneArea}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Waktu Laporan Masuk
                  </span>
                  <span className="font-medium text-slate-800">{selectedReport.reportReceivedAt}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Pelapor / Pengawas
                  </span>
                  <span className="font-bold text-slate-900">{selectedReport.reporterName}</span>
                </div>
              </div>

              {/* Photos Side by Side (Sebelum & Setelah) */}
              <div className="space-y-2">
                <h4 className="font-heading font-bold text-sm text-[#00162d] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-700" />
                  Dokumentasi Foto Lapangan (Watermarked GPS)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">
                    <div className="bg-rose-900/60 text-rose-200 text-[11px] font-bold px-3 py-1.5 flex items-center justify-between">
                      <span>KONDISI SEBELUM PERBAIKAN (BEFORE)</span>
                      <span className="font-mono text-[10px]">{selectedReport.inspectionDate}</span>
                    </div>
                    {selectedReport.photoBeforeUrl ? (
                      <img
                        src={selectedReport.photoBeforeUrl}
                        alt="Sebelum Perbaikan"
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                        Tidak ada foto sebelum perbaikan
                      </div>
                    )}
                  </div>

                  {/* After */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs">
                    <div className="bg-emerald-900/60 text-emerald-200 text-[11px] font-bold px-3 py-1.5 flex items-center justify-between">
                      <span>KONDISI SETELAH PERBAIKAN (AFTER)</span>
                      <span className="font-mono text-[10px]">{selectedReport.repairDate}</span>
                    </div>
                    {selectedReport.photoAfterUrl ? (
                      <img
                        src={selectedReport.photoAfterUrl}
                        alt="Setelah Perbaikan"
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                        Belum ada foto setelah perbaikan
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspection Findings & Repair Action Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Hasil Pemeriksaan Fisik Pipa
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedReport.physicalInspectionResult}
                  </p>
                  {selectedReport.physicalInspectionNotes && (
                    <p className="text-slate-600 leading-relaxed italic">
                      {selectedReport.physicalInspectionNotes}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Tindakan Perbaikan yang Dilakukan
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedReport.repairActionTaken}
                  </p>
                  {selectedReport.repairActionNotes && (
                    <p className="text-slate-600 leading-relaxed italic">
                      {selectedReport.repairActionNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Materials Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-heading font-bold text-sm text-[#00162d] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-sky-700" />
                  Alokasi Suku Cadang &amp; Material Terpakai
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3.5">Nama Komponen</th>
                        <th className="py-2.5 px-3.5">Spesifikasi Ukuran</th>
                        <th className="py-2.5 px-3.5 text-center">Kuantitas</th>
                        <th className="py-2.5 px-3.5 text-center">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedReport.materials?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            Tidak ada material yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        selectedReport.materials.map((m: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2.5 px-3.5 font-bold text-slate-800">
                              {m.materialName}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-700">{m.spec}</td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-sky-900">
                              {m.quantity}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-slate-500">{m.unit}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Google Maps Embed Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Titik Koordinat Lokasi Kebocoran
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Buka Rute Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 h-44 w-full">
                  <iframe
                    title="Google Maps Location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}&hl=id&z=16&output=embed`}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Diinput oleh: {selectedReport.createdByName || 'Petugas Lapangan'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="py-2 px-5 bg-[#00162d] hover:bg-[#00274e] text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS LAPORAN */}
      {/* ======================================================== */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#00162d]">
                  Konfirmasi Hapus Laporan
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  {reportToDelete.id}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              Apakah Anda yakin ingin menghapus berita acara kebocoran pipa di{' '}
              <strong className="text-slate-900 font-bold">&ldquo;{reportToDelete.leakLocationDetail}&rdquo;</strong>?
              Dokumentasi foto dan data material akan terhapus secara permanen.
            </p>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReportToDelete(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-rose-900/20"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
