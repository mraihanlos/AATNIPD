import React from 'react';
import { X, Layers, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CADModalProps {
  onClose: () => void;
}

export const CADModal: React.FC<CADModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-[#001326] text-white rounded-2xl max-w-4xl w-full border border-sky-900 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 bg-[#001c37] border-b border-sky-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-sky-900/60 text-sky-400 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[10px] sm:text-xs font-bold text-sky-400">
                  DWG-SCADA-METRO-2025
                </span>
                <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-bold border border-emerald-500/30 shrink-0">
                  WGS84
                </span>
              </div>
              <h3 className="font-heading font-bold text-xs sm:text-base text-white truncate">
                Denah Skematik CAD Jaringan Pipa
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

        {/* CAD Schematic Canvas (SVG Industrial Blueprint) */}
        <div className="flex-1 p-3 sm:p-6 overflow-auto bg-[#040f1c] relative flex items-center justify-center min-h-[260px] sm:min-h-[420px]">
          {/* Blueprint Grid Lines Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #0ea5e920 1px, transparent 1px), linear-gradient(to bottom, #0ea5e920 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <svg className="w-full max-w-3xl h-96" viewBox="0 0 900 450">
            {/* Intake Node PC 1 */}
            <circle cx="100" cy="120" r="28" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
            <text x="100" y="115" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">PC 1</text>
            <text x="100" y="132" textAnchor="middle" fill="#38bdf8" fontSize="10">Intake Ancol</text>

            {/* Pipeline Segment 1 */}
            <line x1="128" y1="120" x2="300" y2="120" stroke="#38bdf8" strokeWidth="4" strokeDasharray="6,4" />
            <rect x="190" y="112" width="50" height="16" rx="4" fill="#00162d" stroke="#38bdf8" />
            <text x="215" y="124" textAnchor="middle" fill="#7dd3fc" fontSize="9" fontWeight="bold">DN 400</text>

            {/* PRV Station PC 3 */}
            <circle cx="330" cy="120" r="26" fill="#eab308" fillOpacity="0.2" stroke="#facc15" strokeWidth="2" />
            <text x="330" y="115" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">PC 3</text>
            <text x="330" y="132" textAnchor="middle" fill="#fde047" fontSize="10">PRV Tomang</text>

            {/* Main Trunk Line to PC 2 */}
            <path d="M 356 120 Q 450 120 450 240" fill="none" stroke="#22c55e" strokeWidth="5" />

            {/* PC 2 Core Distribution */}
            <circle cx="450" cy="265" r="32" fill="#15803d" fillOpacity="0.2" stroke="#4ade80" strokeWidth="3" />
            <text x="450" y="260" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">PC 2</text>
            <text x="450" y="278" textAnchor="middle" fill="#4ade80" fontSize="10">Kuningan Core</text>

            {/* Feed line to PC 4 */}
            <line x1="482" y1="265" x2="650" y2="265" stroke="#38bdf8" strokeWidth="4" />
            <rect x="545" y="257" width="50" height="16" rx="4" fill="#00162d" stroke="#38bdf8" />
            <text x="570" y="269" textAnchor="middle" fill="#7dd3fc" fontSize="9" fontWeight="bold">DN 350</text>

            {/* PC 4 Pulogadung */}
            <circle cx="680" cy="265" r="26" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
            <text x="680" y="260" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">PC 4</text>
            <text x="680" y="278" textAnchor="middle" fill="#38bdf8" fontSize="10">Pulogadung</text>

            {/* Coastal Feeder to PC 5 */}
            <path d="M 680 239 Q 700 80 800 80" fill="none" stroke="#818cf8" strokeWidth="4" strokeDasharray="8,6" />
            <circle cx="820" cy="80" r="28" fill="#4338ca" fillOpacity="0.3" stroke="#a5b4fc" strokeWidth="2" />
            <text x="820" y="75" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">PC 5</text>
            <text x="820" y="92" textAnchor="middle" fill="#a5b4fc" fontSize="10">Depo Marunda</text>

            {/* Telemetry live tags */}
            <rect x="360" y="320" width="180" height="45" rx="8" fill="#001c37" stroke="#38bdf8" />
            <text x="450" y="340" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">Tekanan Rata-rata: 4.82 BAR</text>
            <text x="450" y="355" textAnchor="middle" fill="#4ade80" fontSize="10">Integritas Pipa: 100% (Stabil)</text>
          </svg>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 bg-[#001c37] border-t border-sky-900/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 text-center sm:text-left">
          <span className="text-[11px] sm:text-xs">Standar Format SCADA Industrial CAD Vector 2025</span>
          <button
            onClick={() => alert('Diagram CAD telah disiapkan untuk cetak teknis.')}
            className="w-full sm:w-auto justify-center flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold transition-colors cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor File Gambar CAD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
