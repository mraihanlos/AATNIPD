import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  InspectionRecord,
  InspectionLocation,
  NetworkLeakageRecord,
} from '../types/index.ts';
import {
  Eye,
  ExternalLink,
  Navigation,
  MapPin,
  Layers,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  Clock,
  User,
  X,
  Maximize2,
} from 'lucide-react';

export interface PipeNetworkMapProps {
  mode?: 'pressure' | 'leakage';
  inspections?: InspectionRecord[];
  locations?: InspectionLocation[];
  leakageRecords?: NetworkLeakageRecord[];
  onOpenCADModal?: () => void;
  onSelectInspection?: (record: InspectionRecord) => void;
  onNavigateToLeakage?: () => void;
}

export const PipeNetworkMap: React.FC<PipeNetworkMapProps> = ({
  mode = 'pressure',
  inspections = [],
  locations = [],
  leakageRecords = [],
  onOpenCADModal,
  onSelectInspection,
  onNavigateToLeakage,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Popup state for Pressure Inspection mode
  const [activePressurePopup, setActivePressurePopup] = useState<{
    title: string;
    pressure: number;
    time: string;
    lat: number;
    lng: number;
    status: string;
    pcArea: string;
    record?: InspectionRecord;
  } | null>(null);

  // Popup state for Leakage Historical mode
  const [activeLeakagePopup, setActiveLeakagePopup] = useState<NetworkLeakageRecord | null>(null);

  // Fullscreen photo modal state
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Initialize Leaflet map with Google Maps tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center in Jakarta Metropolitan Area
      const map = L.map(mapContainerRef.current, {
        center: [-6.2088, 106.8456],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Google Maps Vector/Roadmap Tile Layer
      const gmapsLayer = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          attribution: '&copy; Google Maps',
        }
      ).addTo(map);

      tileLayerRef.current = gmapsLayer;
      mapInstanceRef.current = map;

      // Handle resize events to prevent gray tiles or misalignments
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    }
  }, []);

  // Update tile layer when switching between Roadmap & Satellite
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapLayerType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Google Maps Hybrid (Satellite + Labels)
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Maps Roadmap

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapLayerType]);

  // Render markers according to mode (pressure vs leakage)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Invalidate map size to ensure full container coverage
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Clear existing markers and circles
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    if (mode === 'pressure') {
      // ----------------------------------------------------
      // PRESSURE INSPECTION MODE
      // ----------------------------------------------------
      if (locations.length === 0) return;

      locations.forEach((loc) => {
        const matchInspection = inspections.find(
          (i) => i.locationId === loc.id || i.locationTitle === loc.title
        );
        const hasInspection = !!matchInspection;
        const pressure = matchInspection ? matchInspection.pressureBar : (loc.nominalPressure ?? 0);
        const status = matchInspection
          ? matchInspection.status
          : pressure >= 4.0 && pressure <= 5.5
          ? 'normal'
          : pressure > 0
          ? 'warning'
          : 'uninspected';

        let markerColor = '#10b981';
        let markerLabel = 'NORMAL';
        if (status === 'uninspected') {
          markerColor = '#64748b';
          markerLabel = 'BELUM DIINSPEKSI';
        } else if (status === 'warning') {
          markerColor = '#0284c7';
          markerLabel = 'PERINGATAN';
        } else if (status === 'critical') {
          markerColor = '#ef4444';
          markerLabel = 'KRITIS';
        }

        const customIcon = L.divIcon({
          className: 'custom-pipe-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: ${markerColor}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; min-width: 38px; height: 38px; padding: 0 4px; border-radius: 10px; background-color: #00162d; border: 2px solid ${markerColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); cursor: pointer;">
                <span style="font-size: 8px; font-weight: 800; color: #fff; font-family: monospace;">${loc.pcAreaId.replace(' ', '')}</span>
                <span style="font-size: 10px; font-weight: 800; color: ${markerColor}; font-family: monospace;">${hasInspection || pressure > 0 ? `${pressure.toFixed(1)}b` : '-'}</span>
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(map);
        bounds.extend([loc.latitude, loc.longitude]);

        // Add geofence perimeter circle
        L.circle([loc.latitude, loc.longitude], {
          radius: loc.radiusMeters || 75,
          color: markerColor,
          weight: 1.5,
          fillColor: markerColor,
          fillOpacity: 0.1,
        }).addTo(map);

        marker.on('click', () => {
          setActivePressurePopup({
            title: loc.title,
            pcArea: loc.pcAreaId,
            pressure,
            time: matchInspection
              ? `${matchInspection.time} WIB (${matchInspection.date})`
              : 'Belum diinspeksi',
            lat: loc.latitude,
            lng: loc.longitude,
            status: markerLabel,
            record: matchInspection,
          });
          setActiveLeakagePopup(null);
        });
      });
    } else {
      // ----------------------------------------------------
      // LEAKAGE HISTORICAL DATA MODE
      // ----------------------------------------------------
      // 1. Render pipe network locations lightly as background context
      locations.forEach((loc) => {
        const bgIcon = L.divIcon({
          className: 'bg-pipe-node',
          html: `
            <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #94a3b8; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
          `,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([loc.latitude, loc.longitude], { icon: bgIcon, opacity: 0.6 }).addTo(map);
        bounds.extend([loc.latitude, loc.longitude]);
      });

      // 2. Render leakage records
      const validRecords = leakageRecords.filter(
        (r) =>
          typeof r.latitude === 'number' &&
          typeof r.longitude === 'number' &&
          !isNaN(r.latitude) &&
          !isNaN(r.longitude) &&
          (r.latitude !== 0 || r.longitude !== 0)
      );

      validRecords.forEach((record) => {
        const leakColor = '#e11d48'; // Rose-600 for leak incident

        const customIcon = L.divIcon({
          className: 'custom-leak-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: ${leakColor}; opacity: 0.3; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; min-width: 40px; height: 40px; padding: 0 5px; border-radius: 12px; background-color: #881337; border: 2px solid #fda4af; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(225,29,72,0.45); cursor: pointer;">
                <span style="font-size: 8px; font-weight: 900; color: #ffe4e6; letter-spacing: 0.5px;">BOCOR</span>
                <span style="font-size: 9px; font-weight: 800; color: #ffffff; font-family: monospace;">${record.pipeDiameter || 'PIPA'}</span>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([record.latitude, record.longitude], { icon: customIcon }).addTo(map);
        bounds.extend([record.latitude, record.longitude]);

        // Zone circle around the repaired leak point
        L.circle([record.latitude, record.longitude], {
          radius: 60,
          color: leakColor,
          weight: 1.5,
          fillColor: leakColor,
          fillOpacity: 0.12,
        }).addTo(map);

        marker.on('click', () => {
          setActiveLeakagePopup(record);
          setActivePressurePopup(null);
        });
      });
    }

    // Auto fit map view to contain registered markers
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mode, inspections, locations, leakageRecords]);

  // Compute stats for display
  const validLeakCount = leakageRecords.filter(
    (r) =>
      typeof r.latitude === 'number' &&
      typeof r.longitude === 'number' &&
      !isNaN(r.latitude) &&
      !isNaN(r.longitude) &&
      (r.latitude !== 0 || r.longitude !== 0)
  ).length;

  return (
    <div className="relative bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-[400px] sm:h-[470px] w-full">
      {/* Top Header of Map */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white z-10 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {mode === 'pressure' ? (
              <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <h3 className="font-heading font-bold text-xs sm:text-sm text-[#00162d] truncate">
              {mode === 'pressure'
                ? 'Peta Pemantauan Tekanan Pipa'
                : 'Peta Riwayat Kebocoran Pipa'}
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                mode === 'pressure'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {mode === 'pressure' ? 'Pressure Monitoring' : 'Leakage History'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
            {mode === 'pressure'
              ? 'Sebaran titik inspeksi & telemetri sensor tekanan pipa (Bar)'
              : 'Sebaran histori insiden kebocoran & penanganan perbaikan'}
          </p>
        </div>

        {/* Controls & Layer Switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Map Layer Switcher: Google Maps vs Satelit */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setMapLayerType('roadmap')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                mapLayerType === 'roadmap'
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Google Maps Standar"
            >
              <Navigation className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-[11px]">Maps</span>
            </button>
            <button
              onClick={() => setMapLayerType('satellite')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                mapLayerType === 'satellite'
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Satelit Citra Udara"
            >
              <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px]">Satelit</span>
            </button>
          </div>

          {/* Mode Legend */}
          {mode === 'pressure' ? (
            <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700 text-[10px] font-medium">Normal</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span className="text-slate-700 text-[10px] font-medium">Peringatan</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-slate-700 text-[10px] font-medium">Kritis</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span className="text-slate-700 text-[10px] font-medium">Titik Kebocoran</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-slate-700 text-[10px] font-medium">Jaringan</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas with Google Maps tiles */}
      <div className="relative flex-1 w-full h-full min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Empty state for Pressure Mode */}
        {mode === 'pressure' && locations.length === 0 && (
          <div className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="bg-white/95 rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-xs text-center">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2.5">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#00162d] mb-1">
                Belum Ada Titik Inspeksi
              </h4>
              <p className="text-[11px] text-slate-500">
                Tambahkan titik lokasi baru di menu Master Data untuk mulai memetakan jaringan pipa.
              </p>
            </div>
          </div>
        )}

        {/* Empty state for Leakage Mode */}
        {mode === 'leakage' && validLeakCount === 0 && (
          <div className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="bg-white/95 rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-xs text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2.5">
                <Wrench className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#00162d] mb-1">
                Belum Ada Riwayat Kebocoran
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Belum ada rekaman histori kebocoran pipa berkoordinat GPS yang tercatat dalam sistem.
              </p>
              {onNavigateToLeakage && (
                <button
                  onClick={onNavigateToLeakage}
                  className="w-full py-1.5 px-3 bg-[#00162d] hover:bg-[#00284f] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-rose-400" />
                  <span>Input Laporan Kebocoran</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Interactive Popup for Pressure Mode */}
        {mode === 'pressure' && activePressurePopup && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-slate-200 sm:w-72 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{activePressurePopup.title}</span>
              </span>
              <button
                onClick={() => setActivePressurePopup(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-100">
              <div>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                  Nilai Tekanan:
                </p>
                <p className="text-lg font-bold font-telemetry text-sky-900">
                  {activePressurePopup.pressure > 0
                    ? `${activePressurePopup.pressure.toFixed(2)} Bar`
                    : '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                  Waktu Inspeksi:
                </p>
                <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                  {activePressurePopup.time}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-mono mt-2 bg-slate-50 p-1.5 rounded-md flex items-center justify-between">
              <span>Lat: {activePressurePopup.lat.toFixed(5)}</span>
              <span>Long: {activePressurePopup.lng.toFixed(5)}</span>
            </p>

            <div className="flex gap-2 mt-2.5">
              {activePressurePopup.record && (
                <button
                  onClick={() => onSelectInspection && onSelectInspection(activePressurePopup.record!)}
                  className="flex-1 py-1.5 px-2 bg-[#00162d] hover:bg-[#00284f] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detail</span>
                </button>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activePressurePopup.lat},${activePressurePopup.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Navigation className="w-3 h-3 text-rose-600" />
                <span>Google Maps ↗</span>
              </a>
            </div>
          </div>
        )}

        {/* Interactive Popup for Leakage Mode */}
        {mode === 'leakage' && activeLeakagePopup && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-rose-200 sm:w-80 max-h-[85%] overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
                  <span className="text-[10px] font-mono font-bold text-rose-700">
                    {activeLeakagePopup.id}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    SELESAI
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-800 mt-1 line-clamp-2">
                  {activeLeakagePopup.leakLocationDetail || 'Lokasi Kebocoran Pipa'}
                </h5>
              </div>
              <button
                onClick={() => setActiveLeakagePopup(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1 text-slate-500">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Tgl Perbaikan:</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {activeLeakagePopup.repairDate || activeLeakagePopup.inspectionDate || '-'}
                </span>
              </div>

              {activeLeakagePopup.repairStartTime && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Waktu Kerja:</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {activeLeakagePopup.repairStartTime} - {activeLeakagePopup.repairEndTime || '--'} WIB
                  </span>
                </div>
              )}

              {activeLeakagePopup.pipeType && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Tipe Pipa:</span>
                  <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-200">
                    {activeLeakagePopup.pipeType}
                  </span>
                </div>
              )}

              {activeLeakagePopup.pipeDiameter && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Diameter Pipa:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeLeakagePopup.pipeDiameter}
                  </span>
                </div>
              )}

              {activeLeakagePopup.physicalInspectionResult && (
                <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100 mt-1">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wide">
                    Hasil Pemeriksaan Fisik:
                  </p>
                  <p className="text-slate-700 text-[11px] mt-0.5 line-clamp-2">
                    {activeLeakagePopup.physicalInspectionResult}
                  </p>
                </div>
              )}

              {activeLeakagePopup.repairActionTaken && (
                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                    Tindakan Perbaikan:
                  </p>
                  <p className="text-slate-700 text-[11px] mt-0.5 line-clamp-2">
                    {activeLeakagePopup.repairActionTaken}
                  </p>
                </div>
              )}

              {activeLeakagePopup.reporterInspector && (
                <div className="flex items-center justify-between text-slate-600 pt-1">
                  <span className="flex items-center gap-1 text-slate-500">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Pengawas:</span>
                  </span>
                  <span className="font-medium text-slate-800 truncate max-w-[130px]">
                    {activeLeakagePopup.reporterInspector}
                  </span>
                </div>
              )}

              {/* Photo Thumbnail */}
              {activeLeakagePopup.photoAfterUrl && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Foto Setelah Perbaikan:
                  </p>
                  <div
                    onClick={() => setEnlargedPhotoUrl(activeLeakagePopup.photoAfterUrl)}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 cursor-pointer"
                  >
                    <img
                      src={activeLeakagePopup.photoAfterUrl}
                      alt="Foto Setelah Perbaikan"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Perbesar</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activeLeakagePopup.latitude},${activeLeakagePopup.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3 h-3 text-white" />
                <span>Navigasi Google Maps ↗</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Bar with dynamic statistics */}
      <div className="p-2 sm:p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 z-10 shrink-0">
        <span className="text-slate-600 font-medium truncate">
          {mode === 'pressure'
            ? locations.length > 0
              ? `Menampilkan ${locations.length} titik lokasi inspeksi terdaftar.`
              : 'Belum ada titik inspeksi terdaftar.'
            : validLeakCount > 0
            ? `Menampilkan ${validLeakCount} riwayat titik perbaikan kebocoran.`
            : 'Belum ada data koordinat titik kebocoran.'}
        </span>

        {mode === 'pressure' ? (
          onOpenCADModal && (
            <button
              onClick={onOpenCADModal}
              className="text-sky-700 hover:text-sky-900 font-semibold flex items-center space-x-1 hover:underline cursor-pointer shrink-0"
            >
              <span>Denah CAD</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )
        ) : (
          onNavigateToLeakage && (
            <button
              onClick={onNavigateToLeakage}
              className="text-rose-700 hover:text-rose-900 font-semibold flex items-center space-x-1 hover:underline cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Kebocoran</span>
            </button>
          )
        )}
      </div>

      {/* Enlarged Photo Modal */}
      {enlargedPhotoUrl && (
        <div
          onClick={() => setEnlargedPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-700"
          >
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Dokumentasi Foto Setelah Perbaikan
              </span>
              <button
                onClick={() => setEnlargedPhotoUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center max-h-[80vh]">
              <img
                src={enlargedPhotoUrl}
                alt="Dokumentasi Fullsize"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
