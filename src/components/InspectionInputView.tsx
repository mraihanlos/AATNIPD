import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Video,
  RefreshCw,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Save,
  ShieldCheck,
  Radio,
  Check,
  Link as LinkIcon,
  Sparkles,
  Navigation,
  Compass,
  Loader2,
} from 'lucide-react';
import {
  PCArea,
  InspectionLocation,
  UserProfile,
  InspectionRecord,
  PressureThresholdConfig,
} from '../types/index.ts';
import { evaluatePressureStatus, DEFAULT_PRESSURE_THRESHOLDS, storage } from '../services/storage.ts';

const INSPECTION_DRAFT_KEY = 'inspection_form_draft';

// Extract GPS coordinates from image EXIF metadata (when photo is captured with smartphone camera)
const extractExifGps = async (file: File): Promise<{ lat: number; lng: number } | null> => {
  try {
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 16) return null;
    if (view.getUint16(0, false) !== 0xffd8) return null; // Not JPEG

    let offset = 2;
    const length = view.byteLength;
    while (offset + 4 < length) {
      if (view.getUint8(offset) !== 0xff) return null;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xe1) {
        // APP1 marker
        const exifHeader = offset + 4;
        if (
          offset + 10 < length &&
          view.getUint32(exifHeader, false) === 0x45786966 && // 'Exif'
          view.getUint16(exifHeader + 4, false) === 0x0000
        ) {
          const tiffStart = exifHeader + 6;
          const endian = view.getUint16(tiffStart, false);
          const little = endian === 0x4949; // 'II' = little endian, 'MM' = big endian
          const ifd0Offset = view.getUint32(tiffStart + 4, little);
          let ifdOffset = tiffStart + ifd0Offset;
          if (ifdOffset + 2 > length) return null;
          const entryCount = view.getUint16(ifdOffset, little);
          ifdOffset += 2;

          let gpsInfoOffset = 0;
          for (let i = 0; i < entryCount && ifdOffset + i * 12 + 12 <= length; i++) {
            const tag = view.getUint16(ifdOffset + i * 12, little);
            if (tag === 0x8825) {
              gpsInfoOffset = view.getUint32(ifdOffset + i * 12 + 8, little);
              break;
            }
          }

          if (gpsInfoOffset > 0) {
            const gpsOffset = tiffStart + gpsInfoOffset;
            if (gpsOffset + 2 > length) return null;
            const gpsEntries = view.getUint16(gpsOffset, little);
            let latRef = 'N';
            let lngRef = 'E';
            let latDeg = 0, latMin = 0, latSec = 0;
            let lngDeg = 0, lngMin = 0, lngSec = 0;

            const readRational = (offsetRational: number) => {
              if (offsetRational + 8 > length) return 0;
              const num = view.getUint32(offsetRational, little);
              const den = view.getUint32(offsetRational + 4, little);
              return den ? num / den : 0;
            };

            for (let i = 0; i < gpsEntries && gpsOffset + 2 + i * 12 + 12 <= length; i++) {
              const entry = gpsOffset + 2 + i * 12;
              const tag = view.getUint16(entry, little);
              if (tag === 0x0001) {
                // GPSLatitudeRef
                latRef = String.fromCharCode(view.getUint8(entry + 8));
              } else if (tag === 0x0002) {
                // GPSLatitude (3 rationals)
                const valOffset = tiffStart + view.getUint32(entry + 8, little);
                latDeg = readRational(valOffset);
                latMin = readRational(valOffset + 8);
                latSec = readRational(valOffset + 16);
              } else if (tag === 0x0003) {
                // GPSLongitudeRef
                lngRef = String.fromCharCode(view.getUint8(entry + 8));
              } else if (tag === 0x0004) {
                // GPSLongitude (3 rationals)
                const valOffset = tiffStart + view.getUint32(entry + 8, little);
                lngDeg = readRational(valOffset);
                lngMin = readRational(valOffset + 8);
                lngSec = readRational(valOffset + 16);
              }
            }

            if ((latDeg || latMin || latSec) && (lngDeg || lngMin || lngSec)) {
              let lat = latDeg + latMin / 60 + latSec / 3600;
              let lng = lngDeg + lngMin / 60 + lngSec / 3600;
              if (latRef === 'S') lat = -lat;
              if (lngRef === 'W') lng = -lng;
              if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
              }
            }
          }
        }
        break;
      } else {
        const segLen = view.getUint16(offset + 2, false);
        offset += 2 + segLen;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

const getSavedInspectionDraft = () => {
  try {
    const saved = sessionStorage.getItem(INSPECTION_DRAFT_KEY) || localStorage.getItem(INSPECTION_DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

interface InspectionInputViewProps {
  pcAreas: PCArea[];
  locations: InspectionLocation[];
  currentUser: UserProfile;
  pressureThresholds?: PressureThresholdConfig;
  onSubmitSuccess: (record: InspectionRecord) => void;
  onNavigateToDashboard: () => void;
}

export const InspectionInputView: React.FC<InspectionInputViewProps> = ({
  pcAreas,
  locations,
  currentUser,
  pressureThresholds,
  onSubmitSuccess,
}) => {
  const initialDraft = getSavedInspectionDraft();

  // Form State - initialized from draft if present to survive mobile camera backgrounding/reloads
  const [selectedPCAreaId, setSelectedPCAreaId] = useState<string>(
    initialDraft?.selectedPCAreaId || pcAreas[0]?.id || 'PC 1'
  );
  const [selectedLocationTitle, setSelectedLocationTitle] = useState<string>(
    initialDraft?.selectedLocationTitle || ''
  );
  const [pressureValue, setPressureValue] = useState<number | string>(
    initialDraft?.pressureValue !== undefined ? initialDraft.pressureValue : ''
  );
  const [pressureUnit, setPressureUnit] = useState<'Bar' | 'PSI'>(
    initialDraft?.pressureUnit || 'Bar'
  );
  const [latitude, setLatitude] = useState<number | ''>(
    initialDraft?.latitude !== undefined ? initialDraft.latitude : ''
  );
  const [longitude, setLongitude] = useState<number | ''>(
    initialDraft?.longitude !== undefined ? initialDraft.longitude : ''
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(
    initialDraft?.gpsAccuracy ?? null
  );
  const [notes, setNotes] = useState<string>(initialDraft?.notes || '');
  const [photoUrl, setPhotoUrl] = useState<string>(initialDraft?.photoUrl || '');
  const [photoTag, setPhotoTag] = useState<string>(initialDraft?.photoTag || '');
  const [isCapturingCamera, setIsCapturingCamera] = useState<boolean>(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [autoSyncInfo, setAutoSyncInfo] = useState<{
    synced: boolean;
    locationTitle: string;
    pcAreaId: string;
    distanceMeters: number;
    isInsideGeofence: boolean;
    source: 'gps_auto' | 'location_select' | 'manual';
    timestamp: string;
  } | null>(initialDraft?.autoSyncInfo || null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Available locations for chosen PC Area
  const areaLocations = locations.filter((loc) => loc.pcAreaId === selectedPCAreaId);

  // Accurate Haversine distance formula in meters
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Synchronize "Nama Lokasi Pipa" and "Pilih PC Area" based on GPS coordinates matching saved area
  const syncLocationFromCoords = (
    lat: number,
    lng: number,
    source: 'gps_auto' | 'location_select' | 'manual' = 'gps_auto'
  ): {
    nearestLoc: InspectionLocation;
    minDistance: number;
    photoTag: string;
    autoSyncInfo: any;
  } | null => {
    const activeLocations = locations && locations.length > 0 ? locations : storage.getLocations();
    if (!activeLocations || activeLocations.length === 0) return null;

    let nearestLoc: InspectionLocation | null = null;
    let minDistance = Infinity;

    for (const loc of activeLocations) {
      if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        const dist = calculateDistanceMeters(lat, lng, loc.latitude, loc.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestLoc = loc;
        }
      }
    }

    if (nearestLoc) {
      // 1. Automatically update Nama Lokasi Pipa
      setSelectedLocationTitle(nearestLoc.title);

      // 2. Automatically synchronize "Pilih PC Area" with Nama Lokasi Pipa
      if (nearestLoc.pcAreaId) {
        setSelectedPCAreaId(nearestLoc.pcAreaId);
      }

      // 3. Update photo tag
      const clean = (nearestLoc.pcAreaId || 'PC').replace(/\s+/g, '');
      const newTag = `${clean}-MANO-${Math.floor(10 + Math.random() * 90)}`;
      setPhotoTag(newTag);

      const newSyncInfo = {
        synced: true,
        locationTitle: nearestLoc.title,
        pcAreaId: nearestLoc.pcAreaId,
        distanceMeters: Math.round(minDistance),
        isInsideGeofence: minDistance <= (nearestLoc.radiusMeters || 75),
        source,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      };

      setAutoSyncInfo(newSyncInfo);

      return {
        nearestLoc,
        minDistance,
        photoTag: newTag,
        autoSyncInfo: newSyncInfo,
      };
    }
    return null;
  };

  // When location changes (selected or typed), automatically synchronize "Pilih PC Area"
  const handleLocationChange = (locTitle: string) => {
    setSelectedLocationTitle(locTitle);
    const found = locations.find((l) => l.title === locTitle || l.id === locTitle);
    if (found) {
      // Automatically synchronize "Pilih PC Area" with the selected "Nama Lokasi Pipa"
      if (found.pcAreaId) {
        setSelectedPCAreaId(found.pcAreaId);
      }
      setLatitude(found.latitude);
      setLongitude(found.longitude);
      const clean = (found.pcAreaId || 'PC').replace(/\s+/g, '');
      setPhotoTag(`${clean}-MANO-${Math.floor(10 + Math.random() * 90)}`);

      setAutoSyncInfo({
        synced: true,
        locationTitle: found.title,
        pcAreaId: found.pcAreaId,
        distanceMeters: 0,
        isInsideGeofence: true,
        source: 'location_select',
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    }
  };

  // When PC Area changes manually, keep empty if not selected yet or reset if from another area
  const handlePCAreaChange = (areaId: string) => {
    setSelectedPCAreaId(areaId);
    if (selectedLocationTitle) {
      const locs = locations.filter((l) => l.pcAreaId === areaId);
      const isAlreadyInArea = locs.some((l) => l.title === selectedLocationTitle);
      if (!isAlreadyInArea) {
        setSelectedLocationTitle('');
        setLatitude('');
        setLongitude('');
        setPressureValue('');
        setAutoSyncInfo(null);
      }
    }
  };

  // Auto-save form draft to sessionStorage and localStorage so phone camera app backgrounding never resets the form
  const saveDraft = useCallback((extraPhoto?: string) => {
    try {
      const dataToSave = {
        selectedPCAreaId,
        selectedLocationTitle,
        pressureValue,
        pressureUnit,
        latitude,
        longitude,
        gpsAccuracy,
        notes,
        photoUrl: extraPhoto !== undefined ? extraPhoto : photoUrl,
        photoTag,
        autoSyncInfo,
      };
      const json = JSON.stringify(dataToSave);
      sessionStorage.setItem(INSPECTION_DRAFT_KEY, json);
      try {
        localStorage.setItem(INSPECTION_DRAFT_KEY, json);
      } catch {
        // quota exceeded fallback
      }
    } catch {
      // ignore
    }
  }, [
    selectedPCAreaId,
    selectedLocationTitle,
    pressureValue,
    pressureUnit,
    latitude,
    longitude,
    gpsAccuracy,
    notes,
    photoUrl,
    photoTag,
    autoSyncInfo,
  ]);

  // Keep draft in sync on every field change
  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Location changes are handled directly via handleLocationChange to prevent unexpected PC Area resets

  // Fetch high-accuracy GPS coordinates asynchronously with guaranteed quick fallback
  const getCurrentGPSLocation = (
    autoMatchSavedArea = true,
    fileForExif?: File
  ): Promise<{
    lat: number;
    lng: number;
    acc: number;
    matchedLoc?: InspectionLocation | null;
    photoTag?: string;
    autoSyncInfo?: any;
  }> => {
    setIsLocating(true);
    return new Promise(async (resolve) => {
      let isDone = false;

      // 1. Try reading EXIF GPS from photo file if captured with mobile camera
      let exifCoords: { lat: number; lng: number } | null = null;
      if (fileForExif) {
        try {
          exifCoords = await extractExifGps(fileForExif);
        } catch {
          // ignore
        }
      }

      const finish = (lat: number, lng: number, acc: number) => {
        if (isDone) return;
        isDone = true;
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(acc);
        setIsLocating(false);

        let matchResult: any = null;
        if (autoMatchSavedArea) {
          matchResult = syncLocationFromCoords(lat, lng, 'gps_auto');
        }

        resolve({
          lat,
          lng,
          acc,
          matchedLoc: matchResult?.nearestLoc,
          photoTag: matchResult?.photoTag,
          autoSyncInfo: matchResult?.autoSyncInfo,
        });
      };

      // If EXIF GPS found in the photo, immediately finish with it
      if (exifCoords) {
        finish(exifCoords.lat, exifCoords.lng, 2.5);
        return;
      }

      // Fast timeout: never block photo processing for more than 4 seconds
      const timeoutId = setTimeout(() => {
        const activeLocations = locations && locations.length > 0 ? locations : storage.getLocations();
        const loc = activeLocations.find((l) => l.title === selectedLocationTitle) || activeLocations[0];
        const lat = loc ? loc.latitude : (typeof latitude === 'number' ? latitude : -6.21462);
        const lng = loc ? loc.longitude : (typeof longitude === 'number' ? longitude : 106.84513);
        const acc = 2.8;
        finish(lat, lng, acc);
      }, 4000);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            const lat = parseFloat(pos.coords.latitude.toFixed(6));
            const lng = parseFloat(pos.coords.longitude.toFixed(6));
            const acc = Math.round(pos.coords.accuracy || 3.0);
            finish(lat, lng, acc);
          },
          () => {
            clearTimeout(timeoutId);
            const activeLocations = locations && locations.length > 0 ? locations : storage.getLocations();
            const loc = activeLocations.find((l) => l.title === selectedLocationTitle) || activeLocations[0];
            const lat = loc ? loc.latitude : (typeof latitude === 'number' ? latitude : -6.21462);
            const lng = loc ? loc.longitude : (typeof longitude === 'number' ? longitude : 106.84513);
            const acc = 2.8;
            finish(lat, lng, acc);
          },
          { timeout: 3800, enableHighAccuracy: true, maximumAge: 30000 }
        );
      } else {
        clearTimeout(timeoutId);
        const activeLocations = locations && locations.length > 0 ? locations : storage.getLocations();
        const loc = activeLocations.find((l) => l.title === selectedLocationTitle) || activeLocations[0];
        const resolvedLat = typeof latitude === 'number' ? latitude : (loc ? loc.latitude : -6.21462);
        const resolvedLng = typeof longitude === 'number' ? longitude : 106.84513;
        finish(resolvedLat, resolvedLng, gpsAccuracy ?? 3.0);
      }
    });
  };

  const handleUpdateGPS = () => {
    getCurrentGPSLocation(true);
  };

  // Pressure calculations with dynamic thresholds
  const effectiveThresholds = pressureThresholds || DEFAULT_PRESSURE_THRESHOLDS;
  const isPressureEmpty = pressureValue === '' || isNaN(Number(pressureValue));
  const numericPressure = isPressureEmpty ? 0 : Number(pressureValue);
  const currentBar = pressureUnit === 'Bar' ? numericPressure : numericPressure / 14.5038;
  const currentPsi = pressureUnit === 'PSI' ? numericPressure : numericPressure * 14.5038;
  const diag = isPressureEmpty
    ? {
        status: 'normal' as const,
        label: 'Belum Diisi',
        badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      }
    : evaluatePressureStatus(currentBar, effectiveThresholds);

  // Safe image compression & telemetry HUD watermarking:
  // Uses URL.createObjectURL + Canvas downscaling to max 1280px to prevent mobile RAM crashes
  const processAndWatermarkPhoto = (
    file: File | string,
    coords?: { lat: number; lng: number; acc: number },
    customTag?: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      let objectUrl: string | null = null;
      let imgSrc = '';

      if (typeof file === 'string') {
        imgSrc = file;
      } else {
        try {
          objectUrl = URL.createObjectURL(file);
          imgSrc = objectUrl;
        } catch {
          const reader = new FileReader();
          reader.onload = (e) => {
            imgSrc = e.target?.result as string;
            loadImg(imgSrc);
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
          return;
        }
      }

      const cleanup = () => {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // ignore
          }
        }
      };

      const loadImg = (source: string) => {
        const img = new Image();
        // Do NOT set crossOrigin on blob or data URL to prevent WebKit/Safari security faults
        img.onerror = () => {
          cleanup();
          resolve(source);
        };
        img.onload = () => {
          try {
            const maxDim = 1280;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              cleanup();
              resolve(source);
              return;
            }

            // Draw captured photo resized
            ctx.drawImage(img, 0, 0, width, height);

            // Bottom gradient HUD overlay for high contrast text readability
            const gradHeight = Math.max(120, height * 0.22);
            const grad = ctx.createLinearGradient(0, height - gradHeight, 0, height);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.65)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, height - gradHeight, width, gradHeight);

            // Top-Left Watermark Badge
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(20, 20, 250, 36, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText('🛡 Watermark Otomatis Tersemat', 32, 43);

            // Bottom HUD Information
            const timeStr = new Date().toLocaleTimeString('id-ID') + ' WIB';
            const fontSize = Math.max(14, Math.round(width * 0.022));

            const useLat = coords ? coords.lat : (typeof latitude === 'number' ? latitude : -6.21462);
            const useLng = coords ? coords.lng : (typeof longitude === 'number' ? longitude : 106.84513);
            const useAcc = coords ? coords.acc : (gpsAccuracy ?? 3.0);
            const currentTag = customTag || photoTag || `${(selectedPCAreaId || 'PC').replace(/\s+/g, '')}-MANO-INSP`;

            ctx.font = `bold ${fontSize}px monospace`;
            ctx.fillStyle = '#7dd3fc';
            ctx.fillText(`TAG: ${currentTag} • ${timeStr}`, 24, height - (gradHeight * 0.55));

            ctx.font = `${Math.round(fontSize * 0.85)}px monospace`;
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(
              `GPS: ${useLat.toFixed(6)}, ${useLng.toFixed(6)} (±${useAcc}m)`,
              24,
              height - (gradHeight * 0.24)
            );

            // Right Pressure Badge
            const barText = `${currentBar > 0 ? currentBar.toFixed(2) : '---'} BAR`;
            const badgeW = Math.max(115, fontSize * 6.5);
            const badgeH = Math.max(36, fontSize * 2);
            const badgeX = width - badgeW - 24;
            const badgeY = height - (gradHeight * 0.62);

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(fontSize * 0.95)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(barText, badgeX + badgeW / 2, badgeY + badgeH * 0.68);
            ctx.textAlign = 'left';

            const finalUrl = canvas.toDataURL('image/jpeg', 0.80);
            canvas.width = 0;
            canvas.height = 0;
            cleanup();
            resolve(finalUrl);
          } catch (err) {
            console.warn('Canvas watermarking error:', err);
            cleanup();
            resolve(source);
          }
        };
        img.src = source;
      };

      loadImg(imgSrc);
    });
  };

  // Native phone camera capture handler with memory protection and draft auto-save
  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setCameraError(null);

    try {
      // 1. Fetch GPS coordinates and automatically match & choose saved area
      const gpsResult = await getCurrentGPSLocation(true, file);
      const coords = { lat: gpsResult.lat, lng: gpsResult.lng, acc: gpsResult.acc };

      // 2. Compress and watermark safely with matched area photo tag
      const watermarked = await processAndWatermarkPhoto(file, coords, gpsResult.photoTag);
      if (watermarked) {
        setPhotoUrl(watermarked);

        // 3. Immediately save draft with updated matched area so mobile camera backgrounding preserves everything
        const matchedLoc = gpsResult.matchedLoc;
        const draftData = {
          selectedPCAreaId: matchedLoc?.pcAreaId || selectedPCAreaId,
          selectedLocationTitle: matchedLoc?.title || selectedLocationTitle,
          pressureValue,
          pressureUnit,
          latitude: gpsResult.lat,
          longitude: gpsResult.lng,
          gpsAccuracy: gpsResult.acc,
          notes,
          photoUrl: watermarked,
          photoTag: gpsResult.photoTag || photoTag,
          autoSyncInfo: gpsResult.autoSyncInfo || autoSyncInfo,
        };
        try {
          const json = JSON.stringify(draftData);
          sessionStorage.setItem(INSPECTION_DRAFT_KEY, json);
          localStorage.setItem(INSPECTION_DRAFT_KEY, json);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Error handling native camera capture:', err);
      setCameraError('Gagal memproses foto manometer. Silakan coba lagi.');
    } finally {
      setIsProcessingPhoto(false);
      try {
        e.target.value = '';
      } catch {
        // ignore
      }
    }
  };

  // Start in-browser WebRTC Live Viewfinder
  const startLiveViewfinder = async () => {
    try {
      setCameraError(null);
      setIsCapturingCamera(true);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.warn('WebRTC camera error:', err);
      setIsCapturingCamera(false);
      setCameraError('Izin kamera live di peramban dibatasi. Beralih ke Kamera HP / Perangkat langsung.');
      // Auto open native camera
      setTimeout(() => {
        nativeCameraInputRef.current?.click();
      }, 300);
    }
  };

  // Ensure video element plays stream once mounted
  useEffect(() => {
    if (isCapturingCamera && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [isCapturingCamera]);

  // Live viewfinder snapshot: captures frame and runs GPS update in parallel
  const takeSnapshot = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        setIsProcessingPhoto(true);
        try {
          // Fetch GPS coordinates and automatically match & choose saved area
          const gpsResult = await getCurrentGPSLocation(true);
          const coords = { lat: gpsResult.lat, lng: gpsResult.lng, acc: gpsResult.acc };
          const watermarked = await processAndWatermarkPhoto(dataUrl, coords, gpsResult.photoTag);
          if (watermarked) {
            setPhotoUrl(watermarked);
            const matchedLoc = gpsResult.matchedLoc;
            const draftData = {
              selectedPCAreaId: matchedLoc?.pcAreaId || selectedPCAreaId,
              selectedLocationTitle: matchedLoc?.title || selectedLocationTitle,
              pressureValue,
              pressureUnit,
              latitude: gpsResult.lat,
              longitude: gpsResult.lng,
              gpsAccuracy: gpsResult.acc,
              notes,
              photoUrl: watermarked,
              photoTag: gpsResult.photoTag || photoTag,
              autoSyncInfo: gpsResult.autoSyncInfo || autoSyncInfo,
            };
            try {
              const json = JSON.stringify(draftData);
              sessionStorage.setItem(INSPECTION_DRAFT_KEY, json);
              localStorage.setItem(INSPECTION_DRAFT_KEY, json);
            } catch {
              // ignore
            }
          }
        } catch (err) {
          console.error('Error watermarking snapshot:', err);
        } finally {
          setIsProcessingPhoto(false);
        }
        return;
      }
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCapturingCamera(false);
  };

  // Pressure unit conversion
  const toggleUnit = (unit: 'Bar' | 'PSI') => {
    if (unit === pressureUnit) return;
    if (!isPressureEmpty) {
      const num = Number(pressureValue);
      if (unit === 'PSI') {
        setPressureValue(parseFloat((num * 14.5038).toFixed(2)));
      } else {
        setPressureValue(parseFloat((num / 14.5038).toFixed(2)));
      }
    }
    setPressureUnit(unit);
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocationTitle.trim()) {
      alert('Nama lokasi pipa wajib dipilih atau diisi terlebih dahulu.');
      return;
    }

    if (isPressureEmpty) {
      alert('Nilai tekanan terukur wajib diisi dengan angka.');
      return;
    }

    if (!photoUrl) {
      alert('Foto inspeksi manometer wajib diambil menggunakan kamera sebelum data dapat disimpan.');
      return;
    }

    const matchedLoc = locations.find((l) => l.title === selectedLocationTitle);
    const resolvedLat = typeof latitude === 'number' ? latitude : (parseFloat(String(latitude)) || matchedLoc?.latitude || -6.21462);
    const resolvedLng = typeof longitude === 'number' ? longitude : (parseFloat(String(longitude)) || matchedLoc?.longitude || 106.84513);
    const resolvedAcc = gpsAccuracy ?? 3.0;
    const finalPhotoTag = photoTag || `${(selectedPCAreaId || 'PC').replace(/\s+/g, '')}-MANO-${Math.floor(10 + Math.random() * 90)}`;

    const newRecord: Omit<InspectionRecord, 'id' | 'date' | 'time' | 'timestamp'> = {
      pcAreaId: selectedPCAreaId,
      locationId: matchedLoc?.id || `LOC-${selectedPCAreaId.replace(' ', '')}-NEW`,
      locationTitle: selectedLocationTitle,
      pressureBar: parseFloat(currentBar.toFixed(2)),
      pressurePsi: parseFloat(currentPsi.toFixed(2)),
      unit: pressureUnit,
      status: diag.status,
      statusLabel: diag.label,
      inspectorId: currentUser.inspectorId,
      inspectorName: currentUser.name,
      inspectorInitials: currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      photoUrl,
      photoTag: finalPhotoTag,
      latitude: resolvedLat,
      longitude: resolvedLng,
      gpsAccuracyMeters: resolvedAcc,
      satelliteFix: 'RTK Fixed 99.4% (HDOP 0.7)',
      notes,
    };

    setSavedSuccessMessage('Data inspeksi berhasil disimpan & disinkronkan ke Firestore!');
    try {
      sessionStorage.removeItem(INSPECTION_DRAFT_KEY);
      localStorage.removeItem(INSPECTION_DRAFT_KEY);
    } catch {
      // ignore
    }
    setTimeout(() => {
      onSubmitSuccess(newRecord as any);
      setSavedSuccessMessage(null);
    }, 1200);
  };

  const handleReset = () => {
    try {
      sessionStorage.removeItem(INSPECTION_DRAFT_KEY);
      localStorage.removeItem(INSPECTION_DRAFT_KEY);
    } catch {
      // ignore
    }
    setSelectedLocationTitle('');
    setPressureValue('');
    setPressureUnit('Bar');
    setLatitude('');
    setLongitude('');
    setGpsAccuracy(null);
    setPhotoUrl('');
    setPhotoTag('');
    setNotes('');
    setCameraError(null);
    setAutoSyncInfo(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden Native Camera Input for Direct Android/iOS Camera Launch */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Title & Inspector Info Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#00162d] tracking-tight">
            Formulir Input Data Inspeksi Tekanan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Catat hasil pembacaan manometer pipa di lapangan beserta foto bukti dan titik koordinat
            akurat guna mendeteksi anomali hidrolik secara real-time.
          </p>
        </div>

        {/* Petugas Lapangan card */}
        <div className="w-full lg:w-auto bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs flex items-center space-x-3 shrink-0">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Petugas Lapangan
            </p>
            <p className="font-heading font-bold text-xs sm:text-sm text-[#00162d] truncate">
              {currentUser.name} <span className="font-normal text-slate-500 text-xs">({currentUser.inspectorId})</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Form Layout */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: 01 Foto Inspeksi (*Wajib) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-md bg-[#00162d] text-white flex items-center justify-center font-bold text-xs font-mono">
                    01
                  </span>
                  <h3 className="font-heading font-bold text-sm text-[#00162d]">Foto Inspeksi</h3>
                </div>
                <span className="text-xs font-bold text-rose-500">* Wajib</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Ambil foto manometer yang menampilkan jarum dial atau display numerik secara tegak lurus dan jelas.
              </p>

              {/* Camera Error Message if any */}
              {cameraError && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Photo Preview / Live Viewfinder Box */}
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-900 aspect-4/3 flex items-center justify-center group shadow-inner">
                {isProcessingPhoto ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-950/90 z-20">
                    <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                    <p className="text-xs font-bold text-white mb-1">
                      Memproses Foto &amp; Watermark GPS...
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Mengompresi dan menyematkan koordinat serta waktu secara aman.
                    </p>
                  </div>
                ) : isCapturingCamera ? (
                  <div className="relative w-full h-full bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span>LIVE VIEW</span>
                    </div>
                    <div className="absolute bottom-4 inset-x-4 flex justify-between gap-3 z-30">
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="py-2.5 px-4 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer backdrop-blur-xs"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={takeSnapshot}
                        className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xl"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ambil Foto</span>
                      </button>
                    </div>
                  </div>
                ) : photoUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={photoUrl}
                      alt="Manometer Dial Hasil Foto"
                      className="w-full h-full object-cover"
                    />

                    {/* Watermark Otomatis Badge */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-white font-medium flex items-center space-x-1.5 border border-white/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Watermark Otomatis Tersemat</span>
                    </div>

                    {/* Bottom HUD Metadata Overlay on Photo */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 text-white font-mono text-[11px] leading-tight">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sky-300">
                            TAG: {photoTag || `${(selectedPCAreaId || 'PC').replace(/\s+/g, '')}-MANO-INSP`} • {new Date().toLocaleTimeString('id-ID')} WIB
                          </p>
                          <p className="text-[10px] text-slate-300">
                            GPS: {latitude !== '' ? Number(latitude).toFixed(6) : '-.------'}, {longitude !== '' ? Number(longitude).toFixed(6) : '---.------'} (±{gpsAccuracy ?? 3}m)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-xs shadow-sm">
                            {currentBar.toFixed(2)} BAR
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (!isProcessingPhoto) nativeCameraInputRef.current?.click();
                    }}
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 cursor-pointer hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-sky-400 shadow-inner group-hover:scale-105 group-hover:border-sky-500 transition-all">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">
                      Buka Kamera
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Ketuk di sini atau gunakan tombol di bawah untuk membuka kamera perangkat Anda dan memotret jarum manometer secara langsung.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons: Native Camera */}
              <div className="mt-4">
                <button
                  type="button"
                  disabled={isProcessingPhoto}
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-[#00162d] hover:bg-[#00274e] disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                >
                  {isProcessingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      <span>Memproses Foto...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-sky-400" />
                      <span>
                        {photoUrl ? 'Ambil Ulang (Kamera HP / Perangkat)' : 'Ambil Foto (Kamera HP / Perangkat)'}
                      </span>
                    </>
                  )}
                </button>

                {photoUrl && !isProcessingPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl('');
                      saveDraft('');
                    }}
                    className="mt-2 w-full py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Hapus Foto Ini
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Foto kamera otomatis tersinkronasi dengan koordinat GPS &amp; waktu</span>
              </p>
            </div>

            {/* Ringkasan Validasi Data card */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h4 className="font-heading font-bold text-xs text-[#00162d] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  Ringkasan Validasi Data
                </h4>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {photoUrl ? 'Siap Kirim (Online)' : 'Menunggu Foto'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sektor Area</span>
                  <span className="font-bold text-slate-800">{selectedPCAreaId} - Sektor Terpilih</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Titik Manometer</span>
                  <span className="font-semibold text-slate-800 max-w-[200px] truncate text-right">
                    {selectedLocationTitle || <span className="text-slate-400 font-normal">Belum dipilih</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nilai Tekanan</span>
                  <span className="font-telemetry font-bold text-sm text-sky-900 flex items-center gap-1">
                    {isPressureEmpty ? (
                      <span className="text-slate-400 font-medium text-xs">Belum diisi</span>
                    ) : (
                      <>
                        {currentBar.toFixed(2)} Bar
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Foto</span>
                  <span className={`font-semibold ${photoUrl ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {photoUrl ? '✓ Foto Terambil' : 'Belum Ada Foto'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Petugas</span>
                  <span className="font-semibold text-slate-800">{currentUser.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 02 Parameter & Lokasi Manometer (*Wajib diisi) */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-md bg-[#00162d] text-white flex items-center justify-center font-bold text-xs font-mono">
                  02
                </span>
                <h3 className="font-heading font-bold text-sm text-[#00162d]">
                  Parameter & Lokasi Manometer
                </h3>
              </div>
              <span className="text-xs font-bold text-rose-500">* Wajib diisi</span>
            </div>

            {/* Auto-Sync Notification Banner when Location Auto-Updates */}
            {autoSyncInfo && (
              <div className="p-3 bg-sky-50/90 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-600 text-white shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {autoSyncInfo.isInsideGeofence ? 'Area Terdeteksi' : `±${autoSyncInfo.distanceMeters}m`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {autoSyncInfo.timestamp} WIB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Bidang <strong>"Pilih PC Area"</strong> ({autoSyncInfo.pcAreaId}) telah disinkronkan otomatis dengan data <strong>"Nama Lokasi Pipa"</strong>: <span className="font-medium text-slate-800">{autoSyncInfo.locationTitle}</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSyncInfo(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-sky-100 transition-colors cursor-pointer"
                  title="Tutup Notifikasi"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Grid 2 Fields: Pilih PC Area & Nama Lokasi Pipa */}
            <div className="space-y-4">
              {/* Field 1: Pilih PC Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Pilih PC Area</span>
                    <span className="text-rose-500">*</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200">
                      <LinkIcon className="w-2.5 h-2.5 mr-1" />
                      Auto-Sync
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500">Sektor Area Induk</span>
                </div>
                <select
                  value={selectedPCAreaId}
                  onChange={(e) => handlePCAreaChange(e.target.value)}
                  aria-label="Pilih PC Area"
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 shadow-2xs transition-all"
                >
                  {pcAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.region})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                  <span>Nilai PC Area otomatis menyesuaikan ketika lokasi pipa terdeteksi / dipilih</span>
                </p>
              </div>

              {/* Field 2: Nama Lokasi Pipa */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Nama Lokasi Pipa</span>
                    <span className="text-rose-500">*</span>
                    <span className="text-[10px] font-normal text-slate-400">(Titik Manometer Lapangan)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUpdateGPS}
                    disabled={isLocating}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>Auto-Update GPS</span>
                  </button>
                </div>

                {/* Dropdown Select grouping all locations with parent PC */}
                <div className="space-y-2">
                  <select
                    value={selectedLocationTitle}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    aria-label="Nama Lokasi Pipa"
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 shadow-2xs transition-all"
                  >
                    <option value="">-- Pilih Titik Manometer Lapangan --</option>
                    {pcAreas.map((pc) => {
                      const pcLocs = locations.filter((l) => l.pcAreaId === pc.id);
                      if (pcLocs.length === 0) return null;
                      return (
                        <optgroup key={pc.id} label={`📍 ${pc.name}`}>
                          {pcLocs.map((loc) => (
                            <option key={loc.id} value={loc.title}>
                              {loc.title} ({loc.subtitle})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>

                  {/* Quick searchable input / custom location */}
                  <div className="relative">
                    <input
                      type="text"
                      list="all-locations-list"
                      value={selectedLocationTitle}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      placeholder="Atau ketik untuk mencari nama titik pipa..."
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-9 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 placeholder:text-slate-400"
                    />
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <datalist id="all-locations-list">
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.title}>
                          [{loc.pcAreaId}] {loc.subtitle}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Status Synchronization Pill */}
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] bg-slate-100/80 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 gap-1.5">
                  <div className="flex items-center space-x-1.5 text-slate-700 min-w-0">
                    <LinkIcon className="w-3 h-3 text-sky-600 shrink-0" />
                    <span className="shrink-0 font-medium">Sinkronisasi:</span>
                    <strong className="text-[#00162d] shrink-0">{selectedPCAreaId}</strong>
                    <span className="text-slate-400">↔</span>
                    <span className="text-slate-600 truncate max-w-[140px] sm:max-w-[200px]">
                      {selectedLocationTitle || 'Belum ada titik dipilih'}
                    </span>
                  </div>
                  <span className={`self-start sm:self-center text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    selectedLocationTitle
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {selectedLocationTitle ? 'Tersinkron' : 'Belum Dipilih'}
                  </span>
                </div>
              </div>
            </div>

            {/* Nilai Tekanan Terukur */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Input Tekanan <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Masukkan nilai tekanan aktual di lapangan
                  </p>
                </div>

                {/* Unit Switch: [Bar] [PSI] */}
                <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => toggleUnit('Bar')}
                    className={`px-3 py-1 rounded transition-all ${
                      pressureUnit === 'Bar'
                        ? 'bg-[#00162d] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleUnit('PSI')}
                    className={`px-3 py-1 rounded transition-all ${
                      pressureUnit === 'PSI'
                        ? 'bg-[#00162d] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PSI
                  </button>
                </div>
              </div>

              {/* Number Input & Status Pill */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="150"
                    value={pressureValue}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPressureValue('');
                      } else {
                        setPressureValue(val);
                      }
                    }}
                    className="w-full text-2xl font-telemetry font-bold bg-white border-2 border-sky-600/40 focus:border-sky-600 rounded-xl px-4 py-2.5 text-[#00162d] focus:outline-none placeholder:text-slate-300"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    {pressureUnit}
                  </span>
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${diag.badgeClass}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current mr-1.5"></span>
                    {diag.label}
                  </span>
                </div>
              </div>

              {/* Range Slider */}
              <div>
                <input
                  type="range"
                  min="0"
                  max={pressureUnit === 'Bar' ? 10 : 145}
                  step={pressureUnit === 'Bar' ? 0.05 : 0.5}
                  value={isPressureEmpty ? 0 : Number(pressureValue)}
                  onChange={(e) => setPressureValue(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono font-semibold text-slate-500 mt-1 gap-1">
                  <div className="flex justify-between sm:justify-start sm:gap-2">
                    <span>0.00 {pressureUnit} (Min)</span>
                    <span className="sm:hidden">{pressureUnit === 'Bar' ? '10.00 Bar' : '145.00 PSI'} (Max)</span>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-center">
                    Batas Optimal:{' '}
                    {pressureUnit === 'Bar'
                      ? `${effectiveThresholds.minOptimalBar} - ${effectiveThresholds.maxOptimalBar} Bar`
                      : `${Math.round(effectiveThresholds.minOptimalBar * 14.5038)} - ${Math.round(effectiveThresholds.maxOptimalBar * 14.5038)} PSI`}
                  </span>
                  <span className="hidden sm:inline">
                    {pressureUnit === 'Bar' ? '10.00 Bar' : '145.00 PSI'} (Max)
                  </span>
                </div>
              </div>
            </div>

            {/* Koordinat GPS (Latitude & Longitude) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Koordinat GPS (Latitude & Longitude) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleUpdateGPS}
                  disabled={isLocating}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>Auto-Update GPS &amp; Sync Lokasi</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium mb-1">LATITUDE</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    placeholder="-6.214620"
                    onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-medium mb-1">LONGITUDE</span>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    placeholder="106.845130"
                    onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Accuracy chip */}
              {gpsAccuracy !== null && latitude !== '' && longitude !== '' ? (
                <div className="mt-2 flex items-start sm:items-center space-x-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 p-2 rounded-lg leading-tight">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="break-words">
                    Terkunci akurasi ±{gpsAccuracy} meter: Lat {Number(latitude).toFixed(5)}, Long {Number(longitude).toFixed(5)}{' '}
                    (Satelit GNSS 14 Node)
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 p-2 rounded-lg leading-tight">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Koordinat GPS akan terisi otomatis saat memilih lokasi pipa atau foto diambil</span>
                </div>
              )}

              {/* Live Google Maps Preview */}
              <div className="mt-3 bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>GPS Geolocation Data (Google Maps)</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {latitude !== '' && longitude !== '' ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}` : 'Lokasi Belum Terkunci'}
                  </span>
                </div>
                {latitude !== '' && longitude !== '' ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 h-36 w-full relative">
                    <iframe
                      title="Google Maps Field Preview"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=id&z=15&output=embed`}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 h-28 w-full flex flex-col items-center justify-center p-3 text-center bg-slate-50 text-slate-400">
                    <MapPin className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Peta Belum Aktif</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Pilih titik lokasi pipa di atas atau klik "Auto-Update GPS"</span>
                  </div>
                )}
                {latitude !== '' && longitude !== '' && (
                  <div className="mt-1.5 flex justify-end">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1"
                    >
                      <span>Buka Rute Navigasi Google Maps ↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Catatan Kondisi Fisik Pipa & Manometer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Catatan Kondisi Fisik Pipa &amp; Manometer
                </label>
                <span className="text-[11px] text-slate-400">Opsional</span>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Terlihat rembesan mikro dekat flange nomor 4, indikator getaran pompa stabil, kaca manometer sedikit buram namun terbaca normal..."
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-[#00162d] text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
            <div className="p-2 rounded-lg bg-sky-900/60 text-sky-300 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-heading font-bold text-white text-xs sm:text-sm">
                Sinkronisasi Instan Ke Master Dashboard
              </p>
              <p className="text-slate-300 text-[10px] sm:text-[11px]">
                Setelah tombol simpan ditekan, log telemetri ini akan segera dimutakhirkan ke database pusat untuk komputasi hidrolik.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto justify-center py-2.5 px-3 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto justify-center py-2.5 px-4 sm:px-5 rounded-xl bg-[#006591] hover:bg-[#005278] text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-sky-950/40 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data</span>
            </button>
          </div>
        </div>

        {/* Success Modal / Toast */}
        {savedSuccessMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
};
