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
  Map as MapIcon,
  GitFork,
  Activity,
  Info,
} from 'lucide-react';
import { LEAKAGE_MONTH_COLORS, getRecordMonth } from '../constants/monthColors.ts';
import {
  PC_BOUNDARY_AREAS,
  PRIMARY_PIPE_LINES,
  PCBoundaryArea,
} from '../constants/pcBoundaries.ts';

export interface PipeNetworkMapProps {
  mode?: 'pressure' | 'leakage';
  inspections?: InspectionRecord[];
  locations?: InspectionLocation[];
  leakageRecords?: NetworkLeakageRecord[];
  periodStart?: string;
  periodEnd?: string;
  onOpenCADModal?: () => void;
  onSelectInspection?: (record: InspectionRecord) => void;
  onNavigateToLeakage?: () => void;
}

export const PipeNetworkMap: React.FC<PipeNetworkMapProps> = ({
  mode = 'pressure',
  inspections = [],
  locations = [],
  leakageRecords = [],
  periodStart,
  periodEnd,
  onOpenCADModal,
  onSelectInspection,
  onNavigateToLeakage,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Layer Visibility Controls
  const [showPCBoundaries, setShowPCBoundaries] = useState<boolean>(true);
  const [showPipeLines, setShowPipeLines] = useState<boolean>(true);
  const [selectedPCFilter, setSelectedPCFilter] = useState<string | null>(null);
  const [activePCAreaDetail, setActivePCAreaDetail] = useState<PCBoundaryArea | null>(null);

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

  // Month filter state for Leakage Historical mode (null = all months, 1-12 = specific month)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Synchronize popup if selected month changes
  useEffect(() => {
    if (activeLeakagePopup && selectedMonth !== null) {
      const popupMonth = getRecordMonth(
        activeLeakagePopup.repairDate ||
        activeLeakagePopup.inspectionDate ||
        activeLeakagePopup.reportReceivedTime
      );
      if (popupMonth !== selectedMonth) {
        setActiveLeakagePopup(null);
      }
    }
  }, [selectedMonth, activeLeakagePopup]);

  // Fullscreen photo modal state
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Initialize Leaflet map with Google Maps tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center in Kabupaten Tangerang (operational zone of PC 1 - PC 5)
      const map = L.map(mapContainerRef.current, {
        center: [-6.175, 106.495],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Google Maps Tile Layer
      const initialTileUrl =
        mapLayerType === 'satellite'
          ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      const gmapsLayer = L.tileLayer(initialTileUrl, {
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      }).addTo(map);

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

    // Clear existing markers, polylines, and polygons
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // 1. Render Batas Wilayah PC Polygons & On-Map Badges (PC 1 to PC 5)
    if (showPCBoundaries) {
      const areaLabelNames: Record<string, string> = {
        'PC 1': 'Sepatan',
        'PC 2': 'Pasar Kemis',
        'PC 3': 'Cikupa',
        'PC 4': 'Jayanti & Balaraja',
        'PC 5': 'Sindang Jaya',
      };

      PC_BOUNDARY_AREAS.forEach((area) => {
        const isSelected = selectedPCFilter === area.id;
        const poly = L.polygon(area.polygon, {
          color: isSelected ? '#ffffff' : '#facc15', // yellow dashed border matching reference map
          weight: isSelected ? 3.5 : 2.5,
          dashArray: '6, 6',
          fillColor: area.fillColor,
          fillOpacity: isSelected ? 0.45 : 0.30,
        }).addTo(map);

        poly.bindTooltip(
          `<div style="font-family: inherit; padding: 2px;">
            <div style="font-weight: 800; color: ${area.color}; font-size: 11px;">${area.shortName}</div>
            <div style="font-size: 10px; color: #334155;">${area.region}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${area.pipeCount} Segmen Pipa • ${area.totalLengthKm} km • Target: ${area.nominalPressureBar} Bar</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );

        poly.on('click', () => {
          setActivePCAreaDetail(area);
          setActivePressurePopup(null);
          setActiveLeakagePopup(null);
        });

        // Add prominent PC Badge & Name directly on the map
        if (area.id === 'PC 4') {
          // PC 4 has dual prominent region labels (Jayanti on west, Balaraja on east)
          const pc4LabelIcon = L.divIcon({
            className: 'pc-area-center-label',
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
                <div style="background-color: #facc15; color: #0f172a; font-weight: 900; font-size: 11px; padding: 1.5px 7px; border-radius: 5px; border: 1.5px solid #000; box-shadow: 0 2px 5px rgba(0,0,0,0.5); font-family: ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.5px;">
                  PC 4
                </div>
              </div>
            `,
            iconSize: [60, 26],
            iconAnchor: [30, 13],
          });
          L.marker([-6.205, 106.425], { icon: pc4LabelIcon, interactive: false, zIndexOffset: 250 }).addTo(map);

          // Jayanti label on West
          const jayantiIcon = L.divIcon({
            className: 'pc-sub-label',
            html: `<div style="color: #ffffff; font-weight: 800; font-size: 11px; text-shadow: -1px -1px 0 #991b1b, 1px -1px 0 #991b1b, -1px 1px 0 #991b1b, 1px 1px 0 #991b1b, 0 2px 5px rgba(0,0,0,0.9); font-family: ui-sans-serif, system-ui, sans-serif; white-space: nowrap; pointer-events: none;">Jayanti</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });
          L.marker([-6.205, 106.388], { icon: jayantiIcon, interactive: false, zIndexOffset: 250 }).addTo(map);

          // Balaraja label on East
          const balarajaIcon = L.divIcon({
            className: 'pc-sub-label',
            html: `<div style="color: #ffffff; font-weight: 800; font-size: 11px; text-shadow: -1px -1px 0 #991b1b, 1px -1px 0 #991b1b, -1px 1px 0 #991b1b, 1px 1px 0 #991b1b, 0 2px 5px rgba(0,0,0,0.9); font-family: ui-sans-serif, system-ui, sans-serif; white-space: nowrap; pointer-events: none;">Balaraja</div>`,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });
          L.marker([-6.216, 106.456], { icon: balarajaIcon, interactive: false, zIndexOffset: 250 }).addTo(map);
        } else {
          // PC 1, 2, 3, 5
          const areaLabelIcon = L.divIcon({
            className: 'pc-area-center-label',
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
                <div style="background-color: #facc15; color: #0f172a; font-weight: 900; font-size: 11px; padding: 1.5px 7px; border-radius: 5px; border: 1.5px solid #000; box-shadow: 0 2px 5px rgba(0,0,0,0.5); font-family: ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.5px;">
                  ${area.id}
                </div>
                <div style="color: #ffffff; font-weight: 800; font-size: 11px; margin-top: 2px; text-shadow: -1px -1px 0 #991b1b, 1px -1px 0 #991b1b, -1px 1px 0 #991b1b, 1px 1px 0 #991b1b, 0 2px 5px rgba(0,0,0,0.9); font-family: ui-sans-serif, system-ui, sans-serif; white-space: nowrap;">
                  ${areaLabelNames[area.id] || area.shortName}
                </div>
              </div>
            `,
            iconSize: [110, 40],
            iconAnchor: [55, 20],
          });
          L.marker(area.center, { icon: areaLabelIcon, interactive: false, zIndexOffset: 250 }).addTo(map);
        }

        // Always include boundary vertices in map extent calculation
        area.polygon.forEach((pt) => bounds.extend(pt));
      });
    }

    // 6. Render Jaringan Pipa Distribusi Utama (Internal PC branches)
    if (showPipeLines) {
      PRIMARY_PIPE_LINES.forEach((pipe) => {
        const pcArea = PC_BOUNDARY_AREAS.find((a) => a.id === pipe.pcId);
        const lineColor = pcArea ? pcArea.color : '#0284c7';
        const weight = pipe.diameter >= 500 ? 3.5 : pipe.diameter >= 300 ? 2.5 : 1.8;

        const line = L.polyline(pipe.coordinates, {
          color: lineColor,
          weight,
          opacity: 0.7,
        }).addTo(map);

        line.bindTooltip(
          `<div style="font-family: inherit; font-size: 10px;">
            <div style="font-weight: 800; color: ${lineColor};">Pipa ${pipe.networkType} Ø ${pipe.diameter} mm (${pipe.material})</div>
            <div style="color: #475569;">${pipe.pcId} • ${pipe.lengthMeters} m ${pipe.yearLaid ? `(${pipe.yearLaid})` : ''}</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );
      });
    }

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
      const allValidRecords = leakageRecords.filter(
        (r) =>
          typeof r.latitude === 'number' &&
          typeof r.longitude === 'number' &&
          !isNaN(r.latitude) &&
          !isNaN(r.longitude) &&
          (r.latitude !== 0 || r.longitude !== 0)
      );

      const validRecords = selectedMonth !== null
        ? allValidRecords.filter(
            (r) =>
              getRecordMonth(r.repairDate || r.inspectionDate || r.reportReceivedTime) ===
              selectedMonth
          )
        : allValidRecords;

      validRecords.forEach((record) => {
        const mNum = getRecordMonth(record.repairDate || record.inspectionDate || record.reportReceivedTime);
        const mCfg = LEAKAGE_MONTH_COLORS[mNum] || LEAKAGE_MONTH_COLORS[1];
        const leakColor = mCfg.color;

        const customIcon = L.divIcon({
          className: 'custom-leak-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: ${leakColor}; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; min-width: 44px; height: 42px; padding: 0 4px; border-radius: 12px; background-color: ${mCfg.bgDark}; border: 2px solid ${mCfg.border}; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 16px ${leakColor}60; cursor: pointer;">
                <span style="font-size: 8px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">${mCfg.shortName}</span>
                <span style="font-size: 9px; font-weight: 800; color: ${mCfg.border}; font-family: monospace;">${record.pipeDiameter || 'PIPA'}</span>
              </div>
            </div>
          `,
          iconSize: [44, 42],
          iconAnchor: [22, 21],
        });

        const marker = L.marker([record.latitude, record.longitude], { icon: customIcon }).addTo(map);
        bounds.extend([record.latitude, record.longitude]);

        // Zone circle around the repaired leak point using month color
        L.circle([record.latitude, record.longitude], {
          radius: 65,
          color: leakColor,
          weight: 2,
          fillColor: leakColor,
          fillOpacity: 0.15,
        }).addTo(map);

        marker.bindTooltip(
          `<strong>${record.leakLocationDetail || 'Titik Kebocoran'}</strong><br/><span style="color:${mCfg.color}; font-weight:bold;">Bulan ${mCfg.name}</span> • ${record.pipeDiameter || 'Pipa'}`,
          { direction: 'top', offset: [0, -15] }
        );

        marker.on('click', () => {
          setActiveLeakagePopup(record);
          setActivePressurePopup(null);
        });
      });
    }

    // Auto fit map view to contain registered markers or selected PC area
    if (selectedPCFilter) {
      const area = PC_BOUNDARY_AREAS.find((a) => a.id === selectedPCFilter);
      if (area) {
        map.fitBounds(L.polygon(area.polygon).getBounds(), { padding: [30, 30] });
        return;
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [25, 25], maxZoom: 13 });
    } else {
      map.setView([-6.175, 106.495], 11);
    }
  }, [mode, inspections, locations, leakageRecords, selectedMonth, showPCBoundaries, showPipeLines, selectedPCFilter]);

  // Compute stats for display
  const allValidLeakCount = leakageRecords.filter(
    (r) =>
      typeof r.latitude === 'number' &&
      typeof r.longitude === 'number' &&
      !isNaN(r.latitude) &&
      !isNaN(r.longitude) &&
      (r.latitude !== 0 || r.longitude !== 0)
  ).length;

  const filteredLeakCount = selectedMonth !== null
    ? leakageRecords.filter((r) => {
        if (
          typeof r.latitude !== 'number' ||
          typeof r.longitude !== 'number' ||
          isNaN(r.latitude) ||
          isNaN(r.longitude) ||
          (r.latitude === 0 && r.longitude === 0)
        )
          return false;
        return (
          getRecordMonth(r.repairDate || r.inspectionDate || r.reportReceivedTime) ===
          selectedMonth
        );
      }).length
    : allValidLeakCount;

  return (
    <div className="relative bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-[450px] sm:h-[510px] w-full">
      {/* Top Header of Map */}
      <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-white z-10 shrink-0 flex flex-col gap-2">
        {/* Row 1: Title & Map Layer Switcher */}
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            {mode === 'pressure' ? (
              <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <h3 className="font-heading font-bold text-xs sm:text-sm text-[#00162d] whitespace-nowrap">
              {mode === 'pressure'
                ? 'Peta Pemantauan Tekanan Pipa'
                : 'Peta Riwayat Kebocoran Pipa'}
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border whitespace-nowrap hidden md:inline-flex ${
                mode === 'pressure'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {mode === 'pressure' ? 'Pressure Monitoring' : 'Leakage History'}
            </span>
          </div>

          {/* Map Controls: Batas PC, Jalur Pipa, and Google Maps vs Satelit */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Toggle Batas PC */}
            <button
              type="button"
              onClick={() => setShowPCBoundaries(!showPCBoundaries)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                showPCBoundaries
                  ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs font-extrabold'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
              }`}
              title="Tampilkan / Sembunyikan Batas Wilayah PC (5 Wilayah Kab. Tangerang)"
            >
              <MapIcon className={`w-3 h-3 ${showPCBoundaries ? 'text-sky-600' : 'text-slate-400'}`} />
              <span className="text-[11px] whitespace-nowrap">Batas PC</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                  showPCBoundaries ? 'bg-sky-200 text-sky-900' : 'bg-slate-100 text-slate-400'
                }`}
              >
                5
              </span>
            </button>

            {/* Toggle Jalur Pipa Distribusi */}
            <button
              type="button"
              onClick={() => setShowPipeLines(!showPipeLines)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                showPipeLines
                  ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs font-extrabold'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
              }`}
              title="Tampilkan / Sembunyikan Jaringan Pipa Distribusi Utama"
            >
              <GitFork className={`w-3 h-3 ${showPipeLines ? 'text-teal-600' : 'text-slate-400'}`} />
              <span className="text-[11px] whitespace-nowrap">Jalur Pipa</span>
            </button>

            {/* Map Layer Switcher: Google Maps vs Satelit */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold shrink-0 shadow-2xs">
              <button
                onClick={() => setMapLayerType('roadmap')}
                className={`px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
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
                className={`px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
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
          </div>
        </div>

        {/* Row 2: PC Filter & Status Legend (Pressure) OR Clickable Month Filter (Leakage) */}
        {mode === 'pressure' ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs w-full">
            {/* PC Quick Focus Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap shrink-0 mr-0.5">
                Wilayah PC:
              </span>
              <button
                type="button"
                onClick={() => setSelectedPCFilter(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap border ${
                  selectedPCFilter === null
                    ? 'bg-[#00162d] text-white border-[#00162d] shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              {PC_BOUNDARY_AREAS.map((area) => {
                const isSelected = selectedPCFilter === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      const next = isSelected ? null : area.id;
                      setSelectedPCFilter(next);
                      if (next) {
                        setActivePCAreaDetail(area);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'text-white shadow-xs font-black'
                        : 'bg-white hover:brightness-95 text-slate-700 border-slate-200'
                    }`}
                    style={{
                      borderColor: isSelected ? area.color : undefined,
                      backgroundColor: isSelected ? area.color : undefined,
                    }}
                    title={`${area.name} (${area.totalLengthKm} km pipa, ${area.pipeCount} segmen)`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : area.color }}
                    />
                    <span>{area.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Status Legend */}
            <div className="flex items-center space-x-2 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700 text-[9px] font-medium">Normal</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                <span className="text-slate-700 text-[9px] font-medium">Peringatan</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-700 text-[9px] font-medium">Kritis</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-slate-50/95 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1 shrink-0 text-slate-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Warna per Bulan:
              </span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 flex-1 min-w-0">
              {selectedMonth !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth(null)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Tampilkan Semua Bulan"
                >
                  Semua
                </button>
              )}
              {Object.values(LEAKAGE_MONTH_COLORS).map((cfg) => {
                const isSelected = selectedMonth === cfg.month;
                const count = leakageRecords.filter((r) => {
                  if (
                    typeof r.latitude !== 'number' ||
                    typeof r.longitude !== 'number' ||
                    isNaN(r.latitude) ||
                    isNaN(r.longitude) ||
                    (r.latitude === 0 && r.longitude === 0)
                  )
                    return false;
                  return (
                    getRecordMonth(r.repairDate || r.inspectionDate || r.reportReceivedTime) ===
                    cfg.month
                  );
                }).length;
                return (
                  <button
                    key={cfg.month}
                    type="button"
                    onClick={() => setSelectedMonth(isSelected ? null : cfg.month)}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'ring-2 ring-offset-1 text-white shadow-xs font-black'
                        : count > 0
                        ? 'bg-white shadow-2xs font-extrabold hover:brightness-95'
                        : 'bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-200/60'
                    }`}
                    style={{
                      borderColor: isSelected ? cfg.color : count > 0 ? cfg.color : undefined,
                      backgroundColor: isSelected ? cfg.color : undefined,
                      color: isSelected ? '#ffffff' : count > 0 ? cfg.color : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${cfg.color}40` : undefined,
                    }}
                    title={
                      isSelected
                        ? `Sedang memfilter: Bulan ${cfg.name} (${count} titik). Klik untuk kembali ke Semua Bulan.`
                        : `Klik untuk filter data Bulan ${cfg.name} (${count} titik)`
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : cfg.color }}
                    />
                    <span>{cfg.shortName}</span>
                    {count > 0 && (
                      <span
                        className={`px-1 rounded-full text-[9px] ${
                          isSelected ? 'bg-black/20 text-white' : 'text-white'
                        }`}
                        style={{ backgroundColor: isSelected ? undefined : cfg.color }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        {mode === 'leakage' && allValidLeakCount === 0 && (
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

        {/* Empty state when specific month has no data */}
        {mode === 'leakage' && allValidLeakCount > 0 && selectedMonth !== null && filteredLeakCount === 0 && (
          <div className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-slate-200 max-w-xs text-center pointer-events-auto">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-black text-xs"
                style={{ backgroundColor: LEAKAGE_MONTH_COLORS[selectedMonth]?.color || '#ef4444' }}
              >
                {LEAKAGE_MONTH_COLORS[selectedMonth]?.shortName}
              </div>
              <h4 className="font-heading font-bold text-xs text-[#00162d] mb-1">
                Tidak Ada Titik Kebocoran di Bulan {LEAKAGE_MONTH_COLORS[selectedMonth]?.name}
              </h4>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Tidak ditemukan catatan kebocoran pada bulan yang dipilih dalam rentang periode ini.
              </p>
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="py-1 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Tampilkan Semua Bulan ({allValidLeakCount} Titik)
              </button>
            </div>
          </div>
        )}

        {/* Interactive Detail Card for Clicked PC Area Boundary */}
        {activePCAreaDetail && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-2xl border border-slate-200 sm:w-80 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activePCAreaDetail.color }}
                  />
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: activePCAreaDetail.color }}
                  >
                    {activePCAreaDetail.id}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Batas Wilayah Operasional
                  </span>
                </div>
                <h4 className="font-heading font-bold text-xs sm:text-sm text-[#00162d] mt-1 line-clamp-1">
                  {activePCAreaDetail.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {activePCAreaDetail.region}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePCAreaDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2.5 leading-relaxed">
              {activePCAreaDetail.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-center mb-3">
              <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                <p className="text-[9px] font-bold text-sky-700 uppercase tracking-wider">Total Jaringan</p>
                <p className="text-xs sm:text-sm font-bold text-sky-950 font-telemetry">{activePCAreaDetail.totalLengthKm} km</p>
                <p className="text-[9px] text-sky-600">{activePCAreaDetail.pipeCount} segmen pipa</p>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Target Tekanan</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-950 font-telemetry">{activePCAreaDetail.nominalPressureBar.toFixed(2)} Bar</p>
                <p className="text-[9px] text-emerald-600">±{activePCAreaDetail.toleranceBar} Bar</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPCFilter(activePCAreaDetail.id);
                  const map = mapInstanceRef.current;
                  if (map) {
                    map.fitBounds(L.polygon(activePCAreaDetail.polygon).getBounds(), { padding: [30, 30] });
                  }
                }}
                className="flex-1 py-1.5 px-2 bg-[#00162d] hover:bg-[#00284f] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Fokus Area Ini</span>
              </button>
              {selectedPCFilter === activePCAreaDetail.id && (
                <button
                  type="button"
                  onClick={() => setSelectedPCFilter(null)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Tampilkan Semua PC"
                >
                  Reset
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
        {mode === 'leakage' && activeLeakagePopup && (() => {
          const mNum = getRecordMonth(activeLeakagePopup.repairDate || activeLeakagePopup.inspectionDate || activeLeakagePopup.reportReceivedTime);
          const mCfg = LEAKAGE_MONTH_COLORS[mNum] || LEAKAGE_MONTH_COLORS[1];
          return (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-slate-200 sm:w-80 max-h-[85%] overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-2xs"
                    style={{ backgroundColor: mCfg.color }}
                  >
                    Bulan {mCfg.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
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
                className="w-full py-1.5 px-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{ backgroundColor: mCfg.color }}
              >
                <Navigation className="w-3 h-3 text-white" />
                <span>Navigasi Google Maps ↗</span>
              </a>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Map Footer Bar with dynamic statistics & active period */}
      <div className="p-2 sm:p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 z-10 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-600 font-medium truncate">
            {mode === 'pressure'
              ? locations.length > 0
                ? `Menampilkan ${locations.length} titik lokasi inspeksi terdaftar.`
                : 'Belum ada titik inspeksi terdaftar.'
              : selectedMonth !== null
              ? `Menampilkan ${filteredLeakCount} dari ${allValidLeakCount} titik kebocoran (${LEAKAGE_MONTH_COLORS[selectedMonth]?.name}).`
              : allValidLeakCount > 0
              ? `Menampilkan ${allValidLeakCount} riwayat titik perbaikan kebocoran.`
              : 'Belum ada data koordinat titik kebocoran.'}
          </span>
          {mode === 'leakage' && selectedMonth !== null && (
            <span
              className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1.5 shadow-2xs"
              style={{ backgroundColor: LEAKAGE_MONTH_COLORS[selectedMonth]?.color || '#ef4444' }}
            >
              <span>Filter: Bulan {LEAKAGE_MONTH_COLORS[selectedMonth]?.name}</span>
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="hover:opacity-75 font-black text-xs cursor-pointer"
                title="Hapus Filter Bulan"
              >
                ×
              </button>
            </span>
          )}
          {(periodStart || periodEnd) && (
            <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full shrink-0">
              Periode: {periodStart || 'Awal'} s/d {periodEnd || 'Kini'}
            </span>
          )}
        </div>

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
