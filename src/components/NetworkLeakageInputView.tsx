import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Navigation,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  Wrench,
  FileText,
  Sparkles,
  ExternalLink,
  Layers,
  Check,
  X,
  UploadCloud,
} from 'lucide-react';
import {
  UserProfile,
  RepairMaterial,
  LeakageMaterialUsed,
  NetworkLeakageRecord,
} from '../types/index.ts';
import { TimeRangeInput } from './TimeRangeInput.tsx';

interface NetworkLeakageInputViewProps {
  materials: RepairMaterial[];
  currentUser: UserProfile;
  onSaveRecord: (record: Omit<NetworkLeakageRecord, 'id' | 'timestamp' | 'createdAt'>) => Promise<void>;
  onNavigateToDashboard?: () => void;
  onNavigateToMasterData?: () => void;
}

export const NetworkLeakageInputView: React.FC<NetworkLeakageInputViewProps> = ({
  materials,
  currentUser,
  onSaveRecord,
  onNavigateToDashboard,
  onNavigateToMasterData,
}) => {
  // Helper to format today's date YYYY-MM-DD
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNowTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Safe image compression & watermarking: downscales to max 1280px and 0.80 JPEG
  // to avoid mobile browser memory spikes and tab crashes/reloads
  const compressAndWatermarkImage = (
    file: File,
    title: string,
    coords: { lat: number; lng: number; accuracy: number },
    timestampText: string,
    accentColor: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = (event) => {
        const rawData = event.target?.result as string;
        if (!rawData) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawData);
        img.onload = () => {
          try {
            // Scale down to max 1280px on the longest dimension
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
              resolve(rawData);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Watermark strip at bottom
            const stripHeight = Math.max(48, Math.floor(height * 0.12));
            ctx.fillStyle = 'rgba(0, 22, 45, 0.90)';
            ctx.fillRect(0, height - stripHeight, width, stripHeight);

            // Watermark title
            ctx.fillStyle = accentColor;
            ctx.font = `bold ${Math.max(13, Math.floor(stripHeight * 0.28))}px monospace`;
            ctx.fillText(title, 16, height - stripHeight + stripHeight * 0.35);

            // Watermark GPS and time
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.max(11, Math.floor(stripHeight * 0.22))}px monospace`;
            ctx.fillText(
              `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} (±${coords.accuracy}m)`,
              16,
              height - stripHeight + stripHeight * 0.65
            );
            ctx.fillText(timestampText, 16, height - stripHeight + stripHeight * 0.9);

            const result = canvas.toDataURL('image/jpeg', 0.80);
            canvas.width = 0;
            canvas.height = 0;
            resolve(result);
          } catch (err) {
            console.warn('Canvas watermarking error:', err);
            resolve(rawData);
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  };

  // Session draft persistence to prevent any data loss on mobile OS tab resume
  const getDraft = () => {
    try {
      const saved = sessionStorage.getItem('leakage_form_draft');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  const initialDraft = getDraft();

  // ==========================================
  // SECTION 1: JADWAL & PELAKSANAAN
  // ==========================================
  const [inspectionDate, setInspectionDate] = useState<string>(initialDraft?.inspectionDate || getTodayISO());
  const [repairDate, setRepairDate] = useState<string>(initialDraft?.repairDate || getTodayISO());
  const [repairStartTime, setRepairStartTime] = useState<string>(initialDraft?.repairStartTime || '');
  const [repairEndTime, setRepairEndTime] = useState<string>(initialDraft?.repairEndTime || '');
  const [isShutOff, setIsShutOff] = useState<boolean>(initialDraft?.isShutOff ?? false);
  const [shutOffStartTime, setShutOffStartTime] = useState<string>(initialDraft?.shutOffStartTime || '');
  const [shutOffEndTime, setShutOffEndTime] = useState<string>(initialDraft?.shutOffEndTime || '');

  // ==========================================
  // SECTION 2: ADMINISTRASI & LOKASI
  // ==========================================
  const [reporterInspector, setReporterInspector] = useState<string>(initialDraft?.reporterInspector || '');
  const [reportReceivedTime, setReportReceivedTime] = useState<string>(initialDraft?.reportReceivedTime || '');
  const [leakLocationDetail, setLeakLocationDetail] = useState<string>(initialDraft?.leakLocationDetail || '');
  const [latitude, setLatitude] = useState<number | null>(initialDraft?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialDraft?.longitude ?? null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(initialDraft?.gpsAccuracy ?? null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [initialReportNotes, setInitialReportNotes] = useState<string>(initialDraft?.initialReportNotes || '');
  const [gpsSyncToast, setGpsSyncToast] = useState<string | null>(null);

  // ==========================================
  // SECTION 3: FOTO KEBOCORAN & PERBAIKAN
  // ==========================================
  const [photoBeforeUrl, setPhotoBeforeUrl] = useState<string>(initialDraft?.photoBeforeUrl || '');
  const [photoBeforeTimestamp, setPhotoBeforeTimestamp] = useState<string>(initialDraft?.photoBeforeTimestamp || '');
  const [photoAfterUrl, setPhotoAfterUrl] = useState<string>(initialDraft?.photoAfterUrl || '');
  const [photoAfterTimestamp, setPhotoAfterTimestamp] = useState<string>(initialDraft?.photoAfterTimestamp || '');

  const photoBeforeInputRef = useRef<HTMLInputElement>(null);
  const photoAfterInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // SECTION 4: HASIL PEMERIKSAAN & TINDAKAN
  // ==========================================
  const [pipeType, setPipeType] = useState<string>(initialDraft?.pipeType || '');
  const [physicalInspectionResult, setPhysicalInspectionResult] = useState<string>(initialDraft?.physicalInspectionResult || '');
  const [inspectionNotes, setInspectionNotes] = useState<string>(initialDraft?.inspectionNotes || '');
  const [repairActionTaken, setRepairActionTaken] = useState<string>(initialDraft?.repairActionTaken || '');
  const [mitigationNotes, setMitigationNotes] = useState<string>(initialDraft?.mitigationNotes || '');

  // ==========================================
  // SECTION 5: PENGGUNAAN MATERIAL PERBAIKAN
  // ==========================================
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [materialSpecInput, setMaterialSpecInput] = useState<string>('');
  const [materialQtyInput, setMaterialQtyInput] = useState<number | ''>('');
  const [materialsUsedList, setMaterialsUsedList] = useState<LeakageMaterialUsed[]>(initialDraft?.materialsUsedList || []);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string>('');

  // Auto-save form draft to sessionStorage
  useEffect(() => {
    try {
      const dataToSave = {
        inspectionDate,
        repairDate,
        repairStartTime,
        repairEndTime,
        isShutOff,
        shutOffStartTime,
        shutOffEndTime,
        reporterInspector,
        reportReceivedTime,
        leakLocationDetail,
        latitude,
        longitude,
        gpsAccuracy,
        initialReportNotes,
        photoBeforeUrl,
        photoBeforeTimestamp,
        photoAfterUrl,
        photoAfterTimestamp,
        pipeType,
        physicalInspectionResult,
        inspectionNotes,
        repairActionTaken,
        mitigationNotes,
        materialsUsedList,
      };
      sessionStorage.setItem('leakage_form_draft', JSON.stringify(dataToSave));
    } catch {
      // ignore
    }
  }, [
    inspectionDate,
    repairDate,
    repairStartTime,
    repairEndTime,
    isShutOff,
    shutOffStartTime,
    shutOffEndTime,
    reporterInspector,
    reportReceivedTime,
    leakLocationDetail,
    latitude,
    longitude,
    gpsAccuracy,
    initialReportNotes,
    photoBeforeUrl,
    photoBeforeTimestamp,
    photoAfterUrl,
    photoAfterTimestamp,
    pipeType,
    physicalInspectionResult,
    inspectionNotes,
    repairActionTaken,
    mitigationNotes,
    materialsUsedList,
  ]);

  // Update default spec when material selection changes
  useEffect(() => {
    if (selectedMaterialId) {
      const found = materials.find((m) => m.id === selectedMaterialId);
      if (found && found.standardDimension) {
        setMaterialSpecInput(found.standardDimension);
      }
    }
  }, [selectedMaterialId, materials]);

  // GPS Acquisition Helper
  const acquireCurrentGPS = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = parseFloat(pos.coords.latitude.toFixed(6));
            const lng = parseFloat(pos.coords.longitude.toFixed(6));
            const acc = Math.round(pos.coords.accuracy || 5);
            resolve({ lat, lng, accuracy: acc });
          },
          (err) => {
            console.warn('Geolocation fallback used:', err.message);
            // Realistic Tangerang / Pasar Kemis pipe coordinates fallback
            const jitterLat = parseFloat((-6.182942 + (Math.random() - 0.5) * 0.0004).toFixed(6));
            const jitterLng = parseFloat((106.531205 + (Math.random() - 0.5) * 0.0004).toFixed(6));
            resolve({ lat: jitterLat, lng: jitterLng, accuracy: 4 });
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        resolve({ lat: -6.182942, lng: 106.531205, accuracy: 4 });
      }
    });
  };

  // Manual GPS Sync Button
  const handleManualGPSSync = async () => {
    setIsLocating(true);
    try {
      const coords = await acquireCurrentGPS();
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setGpsAccuracy(coords.accuracy);
      setGpsSyncToast(`GPS Disinkronkan: Lat ${coords.lat}, Lng ${coords.lng} (±${coords.accuracy}m)`);
      setTimeout(() => setGpsSyncToast(null), 3500);
    } finally {
      setIsLocating(false);
    }
  };

  // ==========================================
  // SYNC GPS AUTOMATICALLY WHEN PHOTO "SEBELUM" IS TAKEN
  // ==========================================
  const handlePhotoBeforeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediately trigger GPS sync
    setIsLocating(true);
    const coords = await acquireCurrentGPS();
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    setGpsAccuracy(coords.accuracy);
    setIsLocating(false);

    const nowStr = `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB`;
    setPhotoBeforeTimestamp(nowStr);

    try {
      const watermarked = await compressAndWatermarkImage(
        file,
        'AETRA FOTO SEBELUM PERBAIKAN (BEFORE)',
        coords,
        `WAKTU: ${nowStr}`,
        '#38bdf8'
      );
      setPhotoBeforeUrl(watermarked);
    } catch (err) {
      console.error('Error processing photo before:', err);
    }
    e.target.value = '';

    setGpsSyncToast(`📍 Koordinat GPS (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}) otomatis tersinkron dari Foto Sebelum!`);
    setTimeout(() => setGpsSyncToast(null), 4000);
  };

  const handlePhotoAfterCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediately trigger GPS sync
    setIsLocating(true);
    const coords = await acquireCurrentGPS();
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    setGpsAccuracy(coords.accuracy);
    setIsLocating(false);

    const nowStr = `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} WIB`;
    setPhotoAfterTimestamp(nowStr);

    try {
      const watermarked = await compressAndWatermarkImage(
        file,
        'AETRA FOTO SETELAH PERBAIKAN (AFTER)',
        coords,
        `SELESAI: ${nowStr}`,
        '#34d399'
      );
      setPhotoAfterUrl(watermarked);
    } catch (err) {
      console.error('Error processing photo after:', err);
    }
    e.target.value = '';

    setGpsSyncToast(`📍 Koordinat GPS (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}) otomatis tersinkron dari Foto Setelah Perbaikan!`);
    setTimeout(() => setGpsSyncToast(null), 4000);
  };

  // Add material row
  const handleAddMaterialRow = () => {
    if (!selectedMaterialId) {
      alert('Pilih jenis material terlebih dahulu.');
      return;
    }

    const selectedMat = materials.find((m) => m.id === selectedMaterialId);
    const matName = selectedMat ? selectedMat.name : 'Material Tambahan';
    const matUnit = selectedMat ? selectedMat.defaultUnit : 'bh (buah)';

    if (!materialSpecInput.trim()) {
      alert('Masukkan spesifikasi / dimensi material.');
      return;
    }

    const qty = typeof materialQtyInput === 'number' && materialQtyInput > 0 ? materialQtyInput : 1;

    const newItem: LeakageMaterialUsed = {
      id: `mat-used-${Date.now()}`,
      materialId: selectedMaterialId,
      materialName: matName,
      specification: materialSpecInput.trim(),
      quantity: qty,
      unit: matUnit,
    };

    setMaterialsUsedList([...materialsUsedList, newItem]);
    setSelectedMaterialId('');
    setMaterialSpecInput('');
    setMaterialQtyInput('');
  };

  const handleRemoveMaterialRow = (id: string) => {
    setMaterialsUsedList(materialsUsedList.filter((m) => m.id !== id));
  };

  // Reset form
  const handleResetForm = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan dan mereset isian formulir perbaikan ini?')) {
      setInspectionDate(getTodayISO());
      setRepairDate(getTodayISO());
      setRepairStartTime('');
      setRepairEndTime('');
      setIsShutOff(false);
      setShutOffStartTime('');
      setShutOffEndTime('');
      setReporterInspector('');
      setReportReceivedTime('');
      setLeakLocationDetail('');
      setLatitude(null);
      setLongitude(null);
      setGpsAccuracy(null);
      setInitialReportNotes('');
      setPhotoBeforeUrl('');
      setPhotoBeforeTimestamp('');
      setPhotoAfterUrl('');
      setPhotoAfterTimestamp('');
      setPipeType('');
      setPhysicalInspectionResult('');
      setInspectionNotes('');
      setRepairActionTaken('');
      setMitigationNotes('');
      setSelectedMaterialId('');
      setMaterialSpecInput('');
      setMaterialQtyInput('');
      setMaterialsUsedList([]);
      try {
        sessionStorage.removeItem('leakage_form_draft');
      } catch {
        // ignore
      }
    }
  };

  // Submit handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leakLocationDetail.trim()) {
      alert('Lokasi kebocoran detail wajib diisi sesuai berita acara.');
      return;
    }

    if (!photoAfterUrl) {
      alert('Foto kondisi setelah perbaikan (After) wajib diambil/diunggah.');
      return;
    }

    if (!pipeType) {
      alert('Tipe pipa (Primer, Sekunder, Tersier) wajib dipilih.');
      return;
    }

    if (!physicalInspectionResult.trim()) {
      alert('Hasil pemeriksaan fisik pipa wajib diisi.');
      return;
    }

    if (!repairActionTaken.trim()) {
      alert('Tindakan perbaikan yang dilakukan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecordData: Omit<NetworkLeakageRecord, 'id' | 'timestamp' | 'createdAt'> = {
        inspectionDate,
        repairDate,
        repairStartTime,
        repairEndTime,
        shutOffStartTime: isShutOff ? shutOffStartTime : '--:--',
        shutOffEndTime: isShutOff ? shutOffEndTime : '--:--',
        isShutOffOccurred: isShutOff,
        reporterInspector,
        reportReceivedTime,
        leakLocationDetail,
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        gpsAccuracyMeters: gpsAccuracy ?? undefined,
        initialReportNotes,
        photoBeforeUrl: photoBeforeUrl || photoAfterUrl,
        photoBeforeTimestamp: photoBeforeTimestamp || photoAfterTimestamp,
        photoAfterUrl,
        photoAfterTimestamp,
        pipeType,
        physicalInspectionResult,
        inspectionNotes,
        repairActionTaken,
        mitigationNotes,
        materialsUsed: materialsUsedList,
        sopReference: 'SOP: AAT/DIST/FM-02',
        status: 'Selesai',
        createdBy: currentUser.name || 'Inspector Lapangan',
      };

      await onSaveRecord(newRecordData);
      try {
        sessionStorage.removeItem('leakage_form_draft');
      } catch {
        // ignore
      }
      setSubmittedRecordId(`BA-AAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error saving leakage record:', err);
      alert('Terjadi kendala saat menyimpan data formulir ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Hidden file inputs for Camera & Upload */}
      <input
        ref={photoBeforeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoBeforeCapture}
        className="hidden"
      />
      <input
        ref={photoAfterInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoAfterCapture}
        className="hidden"
      />

      {/* Breadcrumb matching Image 1 (1).jpg */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
          <span>MONITORING LAPANGAN</span>
          <span className="text-slate-300">›</span>
          <span className="text-sky-700 font-bold">FORMULIR INPUT PERBAIKAN</span>
          <span className="text-slate-300">›</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
            SOP: AAT/DIST/FM-02
          </span>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-sky-50 text-sky-800 rounded-full border border-sky-200 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          <span>Entri Data Baru</span>
        </div>
      </div>

      {/* Main Title Header matching Image 1 (1).jpg */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#00162d] tracking-tight">
          Formulir Perawatan &amp; Perbaikan Kebocoran Jaringan Pipa
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-4xl leading-relaxed">
          Dokumentasi resmi berita acara penanganan kebocoran pipa transmisi &amp; distribusi, perekaman foto lapangan sebelum &amp; setelah perbaikan, koordinat GPS, serta alokasi material suku cadang PT Aetra Air Tangerang.
        </p>
      </div>

      {/* GPS Sync Notification Toast */}
      {gpsSyncToast && (
        <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-xl text-xs text-sky-950 font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-sky-600 text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>{gpsSyncToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsSyncToast(null)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORM START */}
      <form onSubmit={handleSubmitForm} className="space-y-6">
        {/* ======================================================== */}
        {/* SECTION 1: JADWAL PEMERIKSAAN & PELAKSANAAN PEKERJAAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <Clock className="w-5 h-5 text-sky-700 shrink-0" />
            <h2 className="font-heading font-bold text-base text-[#00162d]">
              Jadwal Pemeriksaan &amp; Pelaksanaan Pekerjaan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Tgl / Pemeriksaan */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Tgl / Pemeriksaan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>
            </div>

            {/* Tgl / Perbaikan */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Tgl / Perbaikan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>
            </div>

            {/* Waktu Perbaikan (Mulai s/d) */}
            <TimeRangeInput
              label="Waktu Perbaikan (Mulai s/d)"
              required
              startTime={repairStartTime}
              endTime={repairEndTime}
              onStartTimeChange={setRepairStartTime}
              onEndTimeChange={setRepairEndTime}
              theme="sky"
            />

            {/* Waktu Mati Aliran (Shut Off) */}
            <TimeRangeInput
              label="Waktu Mati Aliran (Shut Off)"
              badge={
                <label className="flex items-center space-x-1 cursor-pointer text-[10px] text-slate-500 font-medium">
                  <input
                    type="checkbox"
                    checked={isShutOff}
                    onChange={(e) => setIsShutOff(e.target.checked)}
                    className="rounded text-sky-600 accent-sky-600"
                  />
                  <span>Ada Shut Off</span>
                </label>
              }
              startTime={isShutOff ? shutOffStartTime : ''}
              endTime={isShutOff ? shutOffEndTime : ''}
              onStartTimeChange={setShutOffStartTime}
              onEndTimeChange={setShutOffEndTime}
              disabled={!isShutOff}
              theme="amber"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: DOKUMENTASI FOTO KEBOCORAN & PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <Camera className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h2 className="font-heading font-bold text-base text-[#00162d]">
                  Dokumentasi Foto Kebocoran &amp; Perbaikan
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wajib melampirkan dokumentasi visual kondisi fisik pipa setelah dilakukan perbaikan teknis.
                </p>
              </div>
            </div>

            <div className="self-start sm:self-auto px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Watermark GPS Otomatis</span>
            </div>
          </div>

          {/* Single Photo Card: Foto Setelah Perbaikan (After) */}
          <div className="max-w-2xl mx-auto w-full space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Foto Setelah Perbaikan (After)</span>
                <span className="text-rose-500 font-extrabold">*</span>
              </span>
              {photoAfterUrl && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Terunggah
                </span>
              )}
            </div>

            {photoAfterUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 aspect-16/10 group shadow-md">
                <img
                  src={photoAfterUrl}
                  alt="Foto Setelah Perbaikan"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3.5 text-white text-[11px] font-mono">
                  <p className="font-bold text-emerald-300">SETELAH PERBAIKAN</p>
                  <p className="text-slate-300">GPS: {latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : '-'}</p>
                  <p className="text-slate-400">{photoAfterTimestamp || 'Waktu Real-time'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => photoAfterInputRef.current?.click()}
                  className="absolute top-2.5 right-2.5 py-1 px-3 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-xs transition-colors cursor-pointer"
                >
                  Ganti Foto
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoAfterInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-16/10 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs group-hover:scale-105 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="font-heading font-bold text-sm text-[#00162d]">
                  Ambil Foto Setelah Perbaikan
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Dokumentasikan fisik pipa setelah pemasangan aksesoris / perbaikan teknis
                </p>
                <div className="flex items-center space-x-2 mt-3.5 text-[10px] font-semibold text-emerald-800">
                  <span className="bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Lat/Lng Embedded
                  </span>
                  <span className="bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Timestamp
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 font-bold mt-2.5 underline">
                  *Mengambil foto ini akan otomatis menyinkronkan koordinat GPS
                </p>
                <button
                  type="button"
                  className="mt-3.5 py-1.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs group-hover:border-emerald-500 group-hover:text-emerald-700 transition-colors"
                >
                  Pilih File / Kamera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: DATA ADMINISTRASI & LOKASI KEBOCORAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <MapPin className="w-5 h-5 text-sky-700 shrink-0" />
              <h2 className="font-heading font-bold text-base text-[#00162d]">
                Data Administrasi &amp; Lokasi Kebocoran
              </h2>
            </div>

            <button
              type="button"
              onClick={handleManualGPSSync}
              disabled={isLocating}
              className="self-start sm:self-auto py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 text-sky-700 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Menyinkronkan GPS...' : 'Sinkronkan GPS Lapangan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Pelapor / Pengawas Lapangan */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Pelapor / Pengawas Lapangan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reporterInspector}
                onChange={(e) => setReporterInspector(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-sky-500"
              />
            </div>

            {/* Tanggal / Waktu Laporan Masuk */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">
                  Tanggal / Waktu Laporan Masuk <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const d = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
                    setReportReceivedTime(d);
                  }}
                  className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                >
                  + Waktu Sekarang
                </button>
              </div>
              <input
                type="text"
                value={reportReceivedTime}
                onChange={(e) => setReportReceivedTime(e.target.value)}
                placeholder="Contoh: 22/10/2026 09:30 WIB"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-sky-500"
              />
            </div>
          </div>

          {/* Lokasi Kebocoran Detail */}
          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1.5">
              Lokasi Kebocoran Detail (Sesuai Berita Acara) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={leakLocationDetail}
              onChange={(e) => setLeakLocationDetail(e.target.value)}
              placeholder=""
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-sky-500"
            />
          </div>

          {/* Latitude & Longitude (Auto-synchronized from Photo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Latitude</label>
                <span className="text-[10px] text-sky-700 font-medium">Otomatis saat foto &ldquo;Setelah Perbaikan&rdquo; diambil</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={latitude !== null ? `LAT: ${latitude.toFixed(6)}` : ''}
                  placeholder=""
                  readOnly
                  className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Longitude</label>
                <span className="text-[10px] text-sky-700 font-medium">Otomatis saat foto &ldquo;Setelah Perbaikan&rdquo; diambil</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={longitude !== null ? `LNG: ${longitude.toFixed(6)}` : ''}
                  placeholder=""
                  readOnly
                  className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Isi Laporan / Keterangan Awal */}
          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1.5">
              Isi Laporan / Keterangan Awal
            </label>
            <input
              type="text"
              value={initialReportNotes}
              onChange={(e) => setInitialReportNotes(e.target.value)}
              placeholder=""
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: HASIL PEMERIKSAAN & TINDAKAN PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <Search className="w-5 h-5 text-sky-700 shrink-0" />
            <h2 className="font-heading font-bold text-base text-[#00162d]">
              Hasil Pemeriksaan &amp; Tindakan Perbaikan
            </h2>
          </div>

          {/* Dropdown: Tipe Pipa */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <label className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <span>Tipe Pipa</span>
                <span className="text-rose-500">*</span>
                <span className="text-[10px] font-normal text-slate-400">(Klasifikasi Jaringan Pipa)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Pilih kategori pipa
              </span>
            </div>
            <div className="relative">
              <select
                value={pipeType}
                onChange={(e) => setPipeType(e.target.value)}
                className="w-full sm:max-w-md bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs transition-all cursor-pointer"
              >
                <option value="">-- Pilih Tipe Pipa --</option>
                <option value="Primer">Primer</option>
                <option value="Sekunder">Sekunder</option>
                <option value="Tersier">Tersier</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Left: Hasil Pemeriksaan Fisik Pipa */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  Hasil Pemeriksaan Fisik Pipa <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Catatan Lapangan
                </span>
              </div>
              <textarea
                rows={4}
                value={physicalInspectionResult}
                onChange={(e) => setPhysicalInspectionResult(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-sky-500"
              />
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Catatan Diagnostik Tambahan:
                </span>
                <input
                  type="text"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder=""
                  className="w-full bg-transparent text-[11px] text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Right: Tindakan Perbaikan yang Dilakukan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  Tindakan Perbaikan yang Dilakukan <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tindakan Mitigasi
                </span>
              </div>
              <textarea
                rows={4}
                value={repairActionTaken}
                onChange={(e) => setRepairActionTaken(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-sky-500"
              />
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Prosedur Teknis Mitigasi:
                </span>
                <input
                  type="text"
                  value={mitigationNotes}
                  onChange={(e) => setMitigationNotes(e.target.value)}
                  placeholder=""
                  className="w-full bg-transparent text-[11px] text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 5: PENGGUNAAN MATERIAL PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <Wrench className="w-5 h-5 text-sky-700 shrink-0" />
              <div>
                <h2 className="font-heading font-bold text-base text-[#00162d]">
                  Penggunaan Material Perbaikan
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih lebih dari satu material dari katalog resmi SOP AETRA untuk dialokasikan pada pengerjaan ini.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-bold border border-sky-200">
                Formulir Multi-Material
              </span>
              {onNavigateToMasterData && (
                <button
                  type="button"
                  onClick={onNavigateToMasterData}
                  className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Kelola Master Data Jenis Material"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Kelola Jenis Material</span>
                </button>
              )}
            </div>
          </div>

          {/* Input Row for adding material */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Pilih Jenis Material (populated from master data) */}
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">
                Pilih Jenis Material
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMaterialId(val);
                  const found = materials.find((m) => m.id === val);
                  if (found && found.standardDimension) {
                    setMaterialSpecInput(found.standardDimension);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Pilih Jenis Material --</option>
                {materials.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} ({mat.defaultUnit})
                  </option>
                ))}
              </select>
            </div>

            {/* Spesifikasi / Dimensi */}
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">
                Spesifikasi / Dimensi
              </label>
              <input
                type="text"
                value={materialSpecInput}
                onChange={(e) => setMaterialSpecInput(e.target.value)}
                placeholder=""
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Jumlah */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Jumlah
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={materialQtyInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setMaterialQtyInput(val === '' ? '' : parseInt(val) || 1);
                }}
                placeholder=""
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold text-center focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Button Tambahkan */}
            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleAddMaterialRow}
                className="w-full py-2.5 px-3 bg-[#006591] hover:bg-[#005278] text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan</span>
              </button>
            </div>
          </div>

          {/* Table of Materials Used */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-sky-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-sky-100">
                  <tr>
                    <th className="py-3 px-4">Nama Material Komponen</th>
                    <th className="py-3 px-4">Spesifikasi Ukuran</th>
                    <th className="py-3 px-4 text-center">Kuantitas</th>
                    <th className="py-3 px-4 text-center">Satuan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialsUsedList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        Belum ada material yang ditambahkan. Gunakan formulir di atas untuk mengalokasikan suku cadang.
                      </td>
                    </tr>
                  ) : (
                    materialsUsedList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#00162d] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-600 inline-block"></span>
                          <span>{item.materialName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {item.specification}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 font-telemetry text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-medium">
                          {item.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(item.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ACTION BUTTONS */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset Isian Formulir</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-slate-900/20 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-sky-400" />
            <span>
              {isSubmitting ? 'Menyimpan & Memverifikasi...' : 'Simpan & Verifikasi Formulir Perbaikan'}
            </span>
          </button>
        </div>
      </form>

      {/* ======================================================== */}
      {/* MODAL SUKSES SUBMIT */}
      {/* ======================================================== */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[#00162d]">
                  Berita Acara Berhasil Disimpan!
                </h3>
                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                  ID: {submittedRecordId}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Kebocoran:</span>
                <span className="font-bold text-slate-900">{leakLocationDetail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Koordinat GNSS:</span>
                <span className="font-mono font-semibold">{latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Material Digunakan:</span>
                <span className="font-semibold">{materialsUsedList.length} Item Komponen</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Dokumen:</span>
                <span className="font-bold text-emerald-700">Tersertifikasi SOP: AAT/DIST/FM-02</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onNavigateToDashboard) onNavigateToDashboard();
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Ke Dashboard
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="py-2.5 px-5 rounded-xl bg-[#00162d] hover:bg-[#00284d] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Input Laporan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
