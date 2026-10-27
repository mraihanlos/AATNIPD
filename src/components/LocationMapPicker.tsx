import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin, Navigation, Search, Check, AlertCircle } from 'lucide-react';
import { InspectionLocation } from '../types/index.ts';

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
  existingLocations?: InspectionLocation[];
  onLocationChange: (lat: number, lng: number) => void;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  radiusMeters,
  color = '#0284c7',
  existingLocations = [],
  onLocationChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const otherMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapLayerType, setMapLayerType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Create custom draggable pin icon
  const createDraggablePinIcon = (pinColor: string) => {
    return L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="position: relative; width: 36px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <!-- Pulsing ring effect -->
          <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 8px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(2px);"></div>
          <!-- Pin body -->
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); transition: transform 0.15s ease;">
            <path d="M17 0C7.61116 0 0 7.61116 0 17C0 26.5 14.5 40.5 16.2 42C16.6 42.4 17.4 42.4 17.8 42C19.5 40.5 34 26.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="${pinColor}" />
            <circle cx="17" cy="16" r="7" fill="white" />
            <circle cx="17" cy="16" r="4" fill="${pinColor}" />
          </svg>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -42],
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = Number.isFinite(latitude) && latitude !== 0 ? latitude : -6.2088;
      const initialLng = Number.isFinite(longitude) && longitude !== 0 ? longitude : 106.8456;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add default Google Maps tile layer
      const gmapsLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        attribution: '&copy; Google Maps',
      }).addTo(map);

      tileLayerRef.current = gmapsLayer;

      // Group for other existing markers
      const otherGroup = L.layerGroup().addTo(map);
      otherMarkersGroupRef.current = otherGroup;

      // Create main draggable picker marker
      const pinIcon = createDraggablePinIcon('#e11d48'); // Bright crimson red for primary picker
      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.bindTooltip('Geser pin atau klik peta untuk pindah posisi', {
        permanent: false,
        direction: 'top',
        offset: [0, -38],
      });

      // Handle drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const lat = parseFloat(pos.lat.toFixed(6));
        const lng = parseFloat(pos.lng.toFixed(6));
        onLocationChange(lat, lng);
      });

      // Handle click on map to move pin directly
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = parseFloat(e.latlng.lat.toFixed(6));
        const lng = parseFloat(e.latlng.lng.toFixed(6));
        marker.setLatLng([lat, lng]);
        onLocationChange(lat, lng);
      });

      // Create geofence radius circle
      const circle = L.circle([initialLat, initialLng], {
        radius: radiusMeters,
        color: '#e11d48',
        fillColor: '#e11d48',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);

      markerRef.current = marker;
      circleRef.current = circle;
      mapInstanceRef.current = map;

      // Invalidate size after mount
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync marker and circle when latitude / longitude change from outside
  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Sync circle radius when radiusMeters changes
  useEffect(() => {
    if (circleRef.current && Number.isFinite(radiusMeters)) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Handle Tile Layer Switch (Roadmap vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapLayerType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Satellite Hybrid
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Roadmap

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 21,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapLayerType]);

  // Render existing locations as reference markers
  useEffect(() => {
    const group = otherMarkersGroupRef.current;
    if (!group) return;

    group.clearLayers();

    existingLocations.forEach((loc) => {
      // Don't render if it's the exact same point
      if (Math.abs(loc.latitude - latitude) < 0.00001 && Math.abs(loc.longitude - longitude) < 0.00001) {
        return;
      }

      const existingIcon = L.divIcon({
        className: 'existing-point-icon',
        html: `
          <div style="background: #00162d; color: #38bdf8; border: 1.5px solid #38bdf8; border-radius: 9999px; padding: 2px 6px; font-size: 9px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 3px;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #38bdf8;"></div>
            <span>${loc.id}</span>
          </div>
        `,
        iconSize: [70, 20],
        iconAnchor: [35, 10],
      });

      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: existingIcon,
      });

      marker.bindTooltip(
        `<strong>${loc.title}</strong><br/><span style="font-size:10px; color:#94a3b8">${loc.pcAreaId}</span>`,
        { direction: 'top', offset: [0, -10] }
      );

      group.addLayer(marker);
    });
  }, [existingLocations, latitude, longitude]);

  // Center map on marker position
  const handleRecenter = () => {
    if (mapInstanceRef.current && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
    }
  };

  // Fly to device current GPS location
  const handleUseCurrentGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          onLocationChange(lat, lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
          }
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setSearchError('Izin lokasi tidak tersedia atau sinyal GPS lemah.');
          setTimeout(() => setSearchError(null), 3000);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Search Address / Landmark via Nominatim Geocoding
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
          },
        }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const lng = parseFloat(parseFloat(data[0].lon).toFixed(6));
        onLocationChange(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        }
      } else {
        setSearchError('Lokasi tidak ditemukan. Coba nama jalan atau kota lain.');
        setTimeout(() => setSearchError(null), 3500);
      }
    } catch (err) {
      console.error('Search location error:', err);
      setSearchError('Gagal mencari lokasi. Periksa koneksi internet.');
      setTimeout(() => setSearchError(null), 3500);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-900">
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search Bar on Map */}
        <form
          onSubmit={handleSearchAddress}
          className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 overflow-hidden w-full sm:max-w-xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Cari jalan, stasiun, atau wilayah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs py-1.5 px-2 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isSearching ? '...' : 'Cari'}
          </button>
        </form>

        {/* Action Controls: Layer toggle & GPS */}
        <div className="pointer-events-auto flex items-center space-x-1.5">
          {/* Layer Switcher */}
          <div className="bg-white/95 backdrop-blur-md p-0.5 rounded-lg border border-slate-200/80 shadow-md flex items-center text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMapLayerType('roadmap')}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${
                mapLayerType === 'roadmap'
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jalan
            </button>
            <button
              type="button"
              onClick={() => setMapLayerType('satellite')}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${
                mapLayerType === 'satellite'
                  ? 'bg-[#00162d] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satelit
            </button>
          </div>

          {/* Current GPS button */}
          <button
            type="button"
            onClick={handleUseCurrentGPS}
            title="Gunakan Posisi GPS Saya"
            className="p-1.5 bg-white/95 backdrop-blur-md hover:bg-white text-sky-800 rounded-lg border border-slate-200/80 shadow-md transition-all cursor-pointer flex items-center space-x-1 text-[11px] font-bold"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-700" />
            <span className="hidden sm:inline">GPS Saya</span>
          </button>

          {/* Recenter Pin button */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Pusatkan ke Pin"
            className="p-1.5 bg-white/95 backdrop-blur-md hover:bg-white text-rose-700 rounded-lg border border-slate-200/80 shadow-md transition-all cursor-pointer flex items-center space-x-1 text-[11px] font-bold"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Pusatkan</span>
          </button>
        </div>
      </div>

      {/* Search error toast if any */}
      {searchError && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center space-x-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-72 sm:h-80 min-h-[280px] sm:min-h-[320px] select-none" />

      {/* Bottom Info HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto bg-[#00162d]/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-lg border border-sky-900/60 shadow-lg flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-300 text-[11px]">Pin Terpilih:</span>
            <span className="font-mono font-bold text-sky-300 text-[11px]">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700 hidden sm:block" />

          <div className="text-[11px] text-slate-300 hidden sm:flex items-center space-x-1">
            <span>Radius Geofence:</span>
            <span className="font-mono font-bold text-emerald-400">{radiusMeters} m</span>
          </div>
        </div>

        <div className="pointer-events-auto bg-white/90 backdrop-blur-md text-slate-700 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-md hidden md:flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-600" />
          <span>💡 <strong>Klik peta</strong> atau <strong>geser pin</strong> untuk mengubah koordinat</span>
        </div>
      </div>
    </div>
  );
};
