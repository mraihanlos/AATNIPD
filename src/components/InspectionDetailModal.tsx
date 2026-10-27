import React from 'react';
import {
  X,
  Gauge,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  FileText,
  Download,
} from 'lucide-react';
import { InspectionRecord } from '../types/index.ts';

interface InspectionDetailModalProps {
  record: InspectionRecord | null;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#00162d] text-white p-3.5 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-sky-900/60 text-sky-400 shrink-0">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sky-300 text-xs sm:text-sm">{record.id}</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.2 rounded bg-sky-800 text-sky-100 font-bold shrink-0">
                  {record.pcAreaId}
                </span>
              </div>
              <h3 className="font-heading font-bold text-xs sm:text-base text-white mt-0.5 truncate">
                {record.locationTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          {/* Photo with burnt-in watermark */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-16/10 flex items-center justify-center shadow-inner">
            <img
              src={record.photoUrl}
              alt={record.locationTitle}
              className="w-full h-full object-cover"
            />
            {/* Watermark HUD */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 text-white font-mono text-xs">
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-bold text-sky-300">TAG: {record.photoTag}</p>
                  <p className="text-[11px] text-slate-300">
                    GPS: {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)} (±
                    {record.gpsAccuracyMeters}m)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    WAKTU: {record.date} • {record.time} WIB
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-emerald-500 text-white font-bold text-sm shadow-md">
                    {record.pressureBar.toFixed(2)} BAR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">
                Tekanan (Bar)
              </span>
              <span className="font-telemetry font-bold text-lg text-[#00162d]">
                {record.pressureBar.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">Bar</span>
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">
                Tekanan (PSI)
              </span>
              <span className="font-telemetry font-bold text-lg text-slate-700">
                {record.pressurePsi.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-500">PSI</span>
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">
                Status Diagnosa
              </span>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  record.status === 'normal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : record.status === 'warning'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {record.statusLabel}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">
                Fix Satelit
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-700 block mt-1">
                {record.satelliteFix}
              </span>
            </div>
          </div>

          {/* GPS Geolocation Data with Google Maps Embed matching SAM screenshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>GPS Geolocation Data (Google Maps)</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2 truncate">
              Titik Katup: <span className="font-semibold text-slate-700">{record.locationTitle}</span>
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 h-44 w-full relative shadow-inner">
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${record.latitude},${record.longitude}&hl=id&z=15&output=embed`}
              />
            </div>
            <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center text-[11px] gap-1">
              <span className="text-slate-400">Akurasi Sinyal GNSS: ±{record.gpsAccuracyMeters}m</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1"
              >
                <span>Buka di Google Maps Penuh ↗</span>
              </a>
            </div>
          </div>

          {/* Inspector and Location Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Nama Petugas Inspeksi
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#00162d] text-white flex items-center justify-center font-bold text-xs">
                  {record.inspectorInitials}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{record.inspectorName}</p>
                  <p className="text-[11px] text-slate-500">ID: {record.inspectorId}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                Waktu & Titik Koordinat
              </span>
              <p className="font-medium text-slate-800">
                {record.date} pk. {record.time} WIB
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                Lat: {record.latitude.toFixed(6)}, Long: {record.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          {/* Physical Notes */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-700" />
              Catatan Kondisi Fisik Katup & Pipa
            </span>
            <p className="text-slate-700 leading-relaxed italic">
              "{record.notes || 'Tidak ada catatan khusus pada inspeksi ini.'}"
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-[#00162d] hover:bg-[#00274e] text-white rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
