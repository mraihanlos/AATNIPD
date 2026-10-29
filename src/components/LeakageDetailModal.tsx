import React, { useState } from 'react';
import {
  X,
  Wrench,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Package,
  FileText,
  Maximize2,
  Edit2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { NetworkLeakageRecord, PCArea, UserProfile } from '../types/index.ts';

interface LeakageDetailModalProps {
  record: NetworkLeakageRecord | null;
  pcAreas?: PCArea[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onEditRecord?: (record: NetworkLeakageRecord) => void;
  onDeleteRecord?: (id: string) => void;
}

export const LeakageDetailModal: React.FC<LeakageDetailModalProps> = ({
  record,
  currentUser,
  onClose,
  onEditRecord,
  onDeleteRecord,
}) => {
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; title: string } | null>(null);

  if (!record) return null;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Selesai Tertangani
          </span>
        );
      case 'Diverifikasi':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5"></span>
            Tervalidasi Berita Acara
          </span>
        );
      case 'Baru':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            {status || 'Dalam Penanganan'}
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto">
          {/* Modal Header */}
          <div className="bg-[#00162d] text-white p-4 sm:px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 rounded-lg bg-rose-900/60 text-rose-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-mono font-bold text-rose-300 text-sm">
                    {record.id}
                  </span>
                  {record.zona && (
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-bold">
                      {record.zona}
                    </span>
                  )}
                  {record.pcAreaId && (
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-sky-800 text-sky-100 font-bold">
                      {record.pcAreaId}
                    </span>
                  )}
                  {record.pipeType && (
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold">
                      Pipa {record.pipeType}
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-white mt-1 truncate">
                  {record.leakLocationDetail}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-3">
              <button
                onClick={handlePrint}
                title="Cetak Berita Acara"
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
              <button
                onClick={onClose}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {/* Top Status & Summary Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-3">
                {getStatusBadge(record.status)}
                {record.sopReference && (
                  <span className="text-xs font-mono text-slate-500 font-semibold">
                    {record.sopReference}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Dilaporkan oleh:{' '}
                <span className="font-bold text-slate-800">
                  {record.reporterInspector || record.createdBy || 'Petugas Lapangan'}
                </span>
              </div>
            </div>

            {/* Photos Section: Foto Setelah Perbaikan (After) */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Dokumentasi Foto Setelah Perbaikan (After)</span>
              </h4>

              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex flex-col shadow-xs">
                <div className="p-2.5 bg-slate-800 text-slate-200 text-[11px] font-bold flex items-center justify-between">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto Kondisi Setelah Perbaikan (After)
                  </span>
                  {record.photoAfterUrl && (
                    <button
                      onClick={() =>
                        setEnlargedPhoto({
                          url: record.photoAfterUrl,
                          title: 'Foto Setelah Perbaikan (After)',
                        })
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" /> Perbesar
                    </button>
                  )}
                </div>
                <div className="relative aspect-16/10 sm:aspect-2/1 max-h-80 bg-slate-950 flex items-center justify-center overflow-hidden">
                  {record.photoAfterUrl ? (
                    <img
                      src={record.photoAfterUrl}
                      alt="Foto Setelah Perbaikan"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 text-xs">Tidak ada foto setelah perbaikan</span>
                  )}
                  {record.photoAfterTimestamp && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 text-white font-mono text-[11px]">
                      Waktu Dokumentasi: {record.photoAfterTimestamp}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline & Schedule Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Tgl Pemeriksaan
                </span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {record.inspectionDate || '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Tgl Perbaikan
                </span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {record.repairDate || '-'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Waktu Perbaikan
                </span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {record.repairStartTime || '--:--'} s/d {record.repairEndTime || '--:--'} WIB
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">
                  Mati Aliran (Shut Off)
                </span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {record.isShutOffOccurred
                    ? `${record.shutOffStartTime || '--:--'} s/d ${record.shutOffEndTime || '--:--'}`
                    : 'Tidak Ada Mati Aliran'}
                </span>
              </div>
            </div>

            {/* Location & GPS Details */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-700 font-bold">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Detail Lokasi &amp; Koordinat GPS</span>
              </div>
              <p className="text-slate-800 font-medium">{record.leakLocationDetail}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-mono text-[11px] pt-1 border-t border-slate-200">
                <span>
                  Lat: <strong className="text-slate-700">{record.latitude ? record.latitude.toFixed(6) : '-'}</strong>
                </span>
                <span>
                  Lng: <strong className="text-slate-700">{record.longitude ? record.longitude.toFixed(6) : '-'}</strong>
                </span>
                {record.gpsAccuracyMeters && (
                  <span>
                    Akurasi: <strong className="text-slate-700">±{record.gpsAccuracyMeters}m</strong>
                  </span>
                )}
                {record.reportReceivedTime && (
                  <span>
                    Laporan Masuk: <strong className="text-slate-700">{record.reportReceivedTime}</strong>
                  </span>
                )}
                {record.zona && (
                  <span>
                    Zona: <strong className="text-emerald-700">{record.zona}</strong>
                  </span>
                )}
                {record.pcAreaId && (
                  <span>
                    Area: <strong className="text-sky-700">{record.pcAreaId}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Findings & Repair Action */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <h5 className="font-bold text-amber-900 mb-1 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hasil Pemeriksaan Fisik Pipa</span>
                </h5>
                <p className="text-slate-700 leading-relaxed">
                  {record.physicalInspectionResult || '-'}
                </p>
                {record.inspectionNotes && (
                  <p className="text-slate-500 text-[11px] mt-1.5 italic">
                    {record.inspectionNotes}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <h5 className="font-bold text-emerald-900 mb-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tindakan Perbaikan yang Dilakukan</span>
                </h5>
                <p className="text-slate-700 leading-relaxed">
                  {record.repairActionTaken || '-'}
                </p>
                {record.mitigationNotes && (
                  <p className="text-slate-500 text-[11px] mt-1.5 italic">
                    Prosedur Mitigasi: {record.mitigationNotes}
                  </p>
                )}
                {record.estimasiNRW && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">Estimasi Kehilangan Air (NRW):</span>
                    <span className="font-mono font-extrabold text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      💧 {record.estimasiNRW.includes('m³') ? record.estimasiNRW : `${record.estimasiNRW} m³`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Used Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-sky-600" />
                <span>Penggunaan Material Perbaikan</span>
              </h4>

              {record.materialsUsed && record.materialsUsed.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3">Nama Material</th>
                        <th className="py-2.5 px-3">Spesifikasi / Dimensi</th>
                        <th className="py-2.5 px-3 text-center">Jumlah</th>
                        <th className="py-2.5 px-3">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {record.materialsUsed.map((mat, idx) => (
                        <tr key={mat.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {mat.materialName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {mat.specification || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-sky-900">
                            {mat.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {mat.unit || 'unit'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  Tidak ada material khusus yang dicatat untuk perbaikan ini.
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <span className="text-slate-500 font-mono text-[11px]">
              ID Arsip: {record.id}
            </span>
            <div className="flex items-center space-x-2">
              {currentUser?.role === 'manager' && onEditRecord && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditRecord(record);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Data (Manager)</span>
                </button>
              )}
              {currentUser?.role === 'manager' && onDeleteRecord && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus data laporan #${record.id}?`)) {
                      onDeleteRecord(record.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white font-bold transition-all cursor-pointer shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Enlarged Photo Modal */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-700"
          >
            <div className="p-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-semibold">{enlargedPhoto.title}</span>
              <button
                onClick={() => setEnlargedPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[80vh]">
              <img
                src={enlargedPhoto.url}
                alt={enlargedPhoto.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
