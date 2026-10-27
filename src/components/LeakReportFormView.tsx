import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Clock,
  MapPin,
  Camera,
  Search,
  Wrench,
  RotateCcw,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Navigation,
  ShieldCheck,
  Building2,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  UserProfile,
  PCArea,
  RepairMaterialItem,
  LeakReport,
  LeakReportMaterial,
} from '../types/index.ts';

interface LeakReportFormViewProps {
  currentUser: UserProfile;
  pcAreas: PCArea[];
  repairMaterials: RepairMaterialItem[];
  onSubmitSuccess: (report: LeakReport) => void;
  onNavigateToHistory: () => void;
  onNavigateToMasterData: () => void;
}

export const LeakReportFormView: React.FC<LeakReportFormViewProps> = ({
  currentUser,
  pcAreas,
  repairMaterials,
  onSubmitSuccess,
  onNavigateToHistory,
  onNavigateToMasterData,
}) => {
  // Current dates & times
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayDate = getTodayISO();
  const nowFormattedTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  // Section 1: General Info
  const [department] = useState('Distribusi (Distribution Dept)');
  const [zoneArea, setZoneArea] = useState('');
  const [workStatus, setWorkStatus] = useState<'KLBC' | 'KPPR'>('KLBC');

  // Section 2: Schedule
  const [inspectionDate, setInspectionDate] = useState(todayDate);
  const [repairDate, setRepairDate] = useState(todayDate);
  const [repairTimeStart, setRepairTimeStart] = useState('');
  const [repairTimeEnd, setRepairTimeEnd] = useState('');
  const [shutOffTimeStart, setShutOffTimeStart] = useState('');
  const [shutOffTimeEnd, setShutOffTimeEnd] = useState('');

  // Section 3: Administration & Location
  const [reporterName, setReporterName] = useState('');
  const [reportReceivedAt, setReportReceivedAt] = useState('');
  const [leakLocationDetail, setLeakLocationDetail] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSyncingGPS, setIsSyncingGPS] = useState(false);
  const [gpsSyncMessage, setGpsSyncMessage] = useState<string | null>(null);
  const [initialReportNotes, setInitialReportNotes] = useState('');

  // Section 4: Photos
  const [photoBeforeUrl, setPhotoBeforeUrl] = useState<string>('');
  const [photoBeforeTag, setPhotoBeforeTag] = useState<string>('');
  const [photoBeforeTimestamp, setPhotoBeforeTimestamp] = useState<string>('');
  const [photoAfterUrl, setPhotoAfterUrl] = useState<string>('');
  const [photoAfterTag, setPhotoAfterTag] = useState<string>('');
  const [photoAfterTimestamp, setPhotoAfterTimestamp] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Native file inputs
  const photoBeforeInputRef = useRef<HTMLInputElement>(null);
  const photoAfterInputRef = useRef<HTMLInputElement>(null);

  // Section 5: Inspection Results & Repair Actions
  const [physicalInspectionResult, setPhysicalInspectionResult] = useState('');
  const [physicalInspectionNotes, setPhysicalInspectionNotes] = useState('');
  const [repairActionTaken, setRepairActionTaken] = useState('');
  const [repairActionNotes, setRepairActionNotes] = useState('');

  // Section 6: Materials Used
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [materialSpecInput, setMaterialSpecInput] = useState('');
  const [materialQtyInput, setMaterialQtyInput] = useState<number | ''>('');
  const [materialsList, setMaterialsList] = useState<LeakReportMaterial[]>([]);

  // Form Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Pre-select first material if available
  useEffect(() => {
    if (selectedMaterialId) {
      const found = repairMaterials.find((m) => m.id === selectedMaterialId);
      if (found && found.defaultSpec) {
        setMaterialSpecInput(found.defaultSpec);
      }
    }
  }, [repairMaterials, selectedMaterialId]);

  // Handle Material Selection Change
  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const found = repairMaterials.find((m) => m.id === matId);
    if (found) {
      if (found.defaultSpec) {
        setMaterialSpecInput(found.defaultSpec);
      }
    }
  };

  const handleAddMaterialItem = () => {
    const mat = repairMaterials.find((m) => m.id === selectedMaterialId);
    const materialName = mat ? mat.name : 'Material Pipa';
    const unit = mat ? (mat.unit || mat.defaultUnit || 'bh (buah)') : 'bh (buah)';

    if (!materialSpecInput.trim()) {
      alert('Masukkan spesifikasi / dimensi material.');
      return;
    }
    const qty = typeof materialQtyInput === 'number' && materialQtyInput > 0 ? materialQtyInput : 1;

    setMaterialsList((prev) => [
      ...prev,
      {
        materialId: mat?.id,
        materialName,
        spec: materialSpecInput.trim(),
        quantity: qty,
        unit,
      },
    ]);
  };

  const handleRemoveMaterialItem = (index: number) => {
    setMaterialsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Synchronize GPS location
  const syncGPSCoordinates = async (): Promise<{ lat: number; lng: number }> => {
    setIsSyncingGPS(true);
    setGpsSyncMessage('Mencari sinyal GPS satelit...');
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setIsSyncingGPS(false);
        setGpsSyncMessage('Geolocation tidak didukung peramban. Menggunakan titik default.');
        resolve({ lat: latitude ?? -6.182942, lng: longitude ?? 106.531205 });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setIsSyncingGPS(false);
          setGpsSyncMessage(
            `GPS Tersinkron: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Akurasi: ±${Math.round(
              pos.coords.accuracy
            )}m)`
          );
          setTimeout(() => setGpsSyncMessage(null), 4000);
          resolve({ lat, lng });
        },
        (err) => {
          console.warn('GPS location error:', err);
          setIsSyncingGPS(false);
          setGpsSyncMessage('Sinyal GPS lemah atau izin ditolak. Koordinat tetap dipertahankan.');
          setTimeout(() => setGpsSyncMessage(null), 3500);
          resolve({ lat: latitude ?? -6.182942, lng: longitude ?? 106.531205 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  };

  // Process photo and watermark with GPS & Timestamp
  const processAndWatermarkPhoto = async (
    file: File,
    type: 'before' | 'after',
    coords?: { lat: number; lng: number }
  ) => {
    setIsProcessingPhoto(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1280;
        canvas.height = img.height || 960;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Draw base image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Calculate watermark dimensions
          const now = new Date();
          const timestampStr = now.toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'medium',
          }) + ' WIB';
          const latVal = coords ? coords.lat : (latitude ?? 0);
          const lngVal = coords ? coords.lng : (longitude ?? 0);
          const tag = type === 'before' ? 'AAT-LEAK-BEFORE' : 'AAT-LEAK-AFTER';

          // Watermark banner background at bottom
          const bannerHeight = Math.max(90, Math.floor(canvas.height * 0.1));
          ctx.fillStyle = 'rgba(0, 19, 38, 0.88)';
          ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

          // Accent border line
          ctx.fillStyle = type === 'before' ? '#ef4444' : '#10b981';
          ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 5);

          // Watermark text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(16, Math.floor(bannerHeight * 0.28))}px sans-serif`;
          ctx.fillText(
            `PT AETRA AIR TANGERANG • ${tag}`,
            24,
            canvas.height - bannerHeight + Math.floor(bannerHeight * 0.38)
          );

          ctx.font = `${Math.max(13, Math.floor(bannerHeight * 0.22))}px monospace`;
          ctx.fillStyle = '#93c5fd';
          ctx.fillText(
            `GPS: ${latVal.toFixed(6)}, ${lngVal.toFixed(6)} | WAKTU: ${timestampStr}`,
            24,
            canvas.height - bannerHeight + Math.floor(bannerHeight * 0.72)
          );

          // Status stamp pill on right
          const stampText = type === 'before' ? 'SEBELUM PERBAIKAN' : 'SETELAH PERBAIKAN';
          ctx.fillStyle = type === 'before' ? '#dc2626' : '#059669';
          const stampWidth = Math.max(180, Math.floor(canvas.width * 0.24));
          const stampX = canvas.width - stampWidth - 24;
          const stampY = canvas.height - bannerHeight + 16;
          const stampH = bannerHeight - 32;

          ctx.fillRect(stampX, stampY, stampWidth, stampH);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(13, Math.floor(stampH * 0.45))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(stampText, stampX + stampWidth / 2, stampY + stampH * 0.65);
          ctx.textAlign = 'left';

          const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);

          if (type === 'before') {
            setPhotoBeforeUrl(finalDataUrl);
            setPhotoBeforeTag(tag);
            setPhotoBeforeTimestamp(timestampStr);
          } else {
            setPhotoAfterUrl(finalDataUrl);
            setPhotoAfterTag(tag);
            setPhotoAfterTimestamp(timestampStr);
          }
        }
        setIsProcessingPhoto(false);
      };
    };

    reader.readAsDataURL(file);
  };

  // Handle Photo Before Capture
  // Special Requirement:
  // "Untuk field longitude & latitude dapat tersinkronasi otomatis ketika pengambilan foto "Sebelum"."
  const handlePhotoBeforeSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Automatically trigger GPS synchronization in parallel when taking photo "Sebelum"
    const freshCoords = await syncGPSCoordinates();
    await processAndWatermarkPhoto(file, 'before', freshCoords);
  };

  const triggerCaptureBefore = () => {
    // Initiate GPS satellite sync immediately on photo click
    syncGPSCoordinates();
    if (photoBeforeInputRef.current) {
      photoBeforeInputRef.current.value = '';
      photoBeforeInputRef.current.click();
    }
  };

  const handleLoadSampleBeforePhoto = async () => {
    const freshCoords = await syncGPSCoordinates();
    const sampleUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=1280&q=80';
    setPhotoBeforeUrl(sampleUrl);
    setPhotoBeforeTag('AAT-LEAK-BEFORE');
    setPhotoBeforeTimestamp(
      new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }) + ' WIB'
    );
  };

  // Handle Photo After Capture
  const handlePhotoAfterSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const freshCoords = await syncGPSCoordinates();
    await processAndWatermarkPhoto(file, 'after', freshCoords);
  };

  const triggerCaptureAfter = () => {
    syncGPSCoordinates();
    if (photoAfterInputRef.current) {
      photoAfterInputRef.current.value = '';
      photoAfterInputRef.current.click();
    }
  };

  const handleLoadSampleAfterPhoto = async () => {
    const freshCoords = await syncGPSCoordinates();
    const sampleUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1280&q=80';
    setPhotoAfterUrl(sampleUrl);
    setPhotoAfterTag('AAT-LEAK-AFTER');
    setPhotoAfterTimestamp(
      new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }) + ' WIB'
    );
  };

  // Reset entire form
  const handleResetForm = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan semua isian formulir?')) {
      setZoneArea('');
      setWorkStatus('KLBC');
      setInspectionDate(todayDate);
      setRepairDate(todayDate);
      setRepairTimeStart('');
      setRepairTimeEnd('');
      setShutOffTimeStart('');
      setShutOffTimeEnd('');
      setReporterName('');
      setReportReceivedAt('');
      setLeakLocationDetail('');
      setLatitude(null);
      setLongitude(null);
      setInitialReportNotes('');
      setPhotoBeforeUrl('');
      setPhotoAfterUrl('');
      setPhysicalInspectionResult('');
      setPhysicalInspectionNotes('');
      setRepairActionTaken('');
      setRepairActionNotes('');
      setSelectedMaterialId('');
      setMaterialSpecInput('');
      setMaterialQtyInput('');
      setMaterialsList([]);
      setFormError(null);
    }
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!leakLocationDetail.trim()) {
      setFormError('Harap isi detail lokasi kebocoran sesuai berita acara.');
      return;
    }
    if (!photoAfterUrl) {
      setFormError('Foto "Setelah Perbaikan (After)" wajib dilampirkan dengan bukti fisik lapangan.');
      return;
    }
    if (!physicalInspectionResult.trim()) {
      setFormError('Hasil pemeriksaan fisik pipa wajib diisi.');
      return;
    }
    if (!repairActionTaken.trim()) {
      setFormError('Tindakan perbaikan yang dilakukan wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newReportData: Omit<LeakReport, 'id' | 'createdAt' | 'timestamp'> = {
        reportNo: 'AAT/DIST/FM-02',
        department,
        zoneArea,
        workStatus,
        inspectionDate,
        repairDate,
        repairTimeStart,
        repairTimeEnd,
        shutOffTimeStart,
        shutOffTimeEnd,
        reporterName,
        reportReceivedAt,
        leakLocationDetail,
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        initialReportNotes,
        photoBeforeUrl: photoBeforeUrl || photoAfterUrl,
        photoBeforeTag: photoBeforeTag || photoAfterTag,
        photoBeforeTimestamp: photoBeforeTimestamp || photoAfterTimestamp,
        photoAfterUrl: photoAfterUrl || '',
        photoAfterTag,
        photoAfterTimestamp,
        physicalInspectionResult,
        physicalInspectionNotes,
        repairActionTaken,
        repairActionNotes,
        materials: materialsList,
        status: 'submitted',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      };

      onSubmitSuccess(newReportData as any);
      setSuccessToast('Formulir Perawatan & Perbaikan Kebocoran Pipa berhasil disimpan ke database!');
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error('Error saving leak report:', err);
      setFormError(err.message || 'Gagal menyimpan laporan perbaikan kebocoran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Hidden Native File / Camera Inputs */}
      <input
        ref={photoBeforeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoBeforeSelected}
        className="hidden"
      />
      <input
        ref={photoAfterInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoAfterSelected}
        className="hidden"
      />

      {/* Breadcrumb matching Image_1_adacad87.jpeg */}
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 flex-wrap">
        <span>MONITORING LAPANGAN</span>
        <span>&rsaquo;</span>
        <span className="text-sky-700 font-extrabold">FORMULIR INPUT PERBAIKAN</span>
        <span>&rsaquo;</span>
        <span className="text-slate-400">SOP: AAT/DIST/FM-02</span>
      </div>

      {/* Main Page Title & Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#00162d] tracking-tight">
            Formulir Perawatan & Perbaikan Kebocoran Jaringan Pipa
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-4xl leading-relaxed">
            Dokumentasi resmi berita acara penanganan kebocoran pipa transmisi & distribusi, perekaman foto lapangan
            sebelum & setelah perbaikan, koordinat GPS, serta alokasi material suku cadang PT Aetra Air Tangerang.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold flex items-center space-x-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span>Entri Data Baru</span>
          </div>

          <button
            type="button"
            onClick={onNavigateToHistory}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Lihat Riwayat Laporan</span>
          </button>
        </div>
      </div>

      {/* Official Navy Banner matching Image_1_adacad87.jpeg */}
      <div className="bg-[#00162d] text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-sky-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-sky-600/30 text-sky-400 border border-sky-500/40 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider font-semibold text-sky-300 uppercase">
              FORMULIR RESMI NO: AAT/DIST/FM-02 • REVISI: 00 • TGL BERLAKU: 01/10/2020
            </div>
            <h3 className="font-heading font-extrabold text-base sm:text-lg text-white tracking-tight mt-0.5">
              PERAWATAN DAN PERBAIKAN KEBOCORAN JARINGAN PIPA
            </h3>
            <p className="text-xs text-slate-300">
              Departemen Distribusi • PT Aetra Air Tangerang
            </p>
          </div>
        </div>

        <div className="self-end md:self-auto bg-[#002447] border border-sky-800/60 rounded-xl px-3.5 py-2 text-right shrink-0">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
            Status Formulir
          </span>
          <span className="text-[11px] font-mono font-bold text-sky-300 flex items-center justify-end gap-1.5 mt-0.5">
            <span>MODE INPUT LAPANGAN</span>
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </span>
        </div>
      </div>

      {/* Error alert if any */}
      {formError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center space-x-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmitForm} className="space-y-6">
        {/* ======================================================== */}
        {/* SECTION 1: DEPARTEMEN, AREA KERJA & STATUS PEKERJAAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Departemen Bertanggung Jawab */}
          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Departemen Bertanggung Jawab
            </label>
            <div className="relative">
              <input
                type="text"
                value={department}
                readOnly
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-slate-800 focus:outline-none"
              />
              <Building2 className="w-4 h-4 text-sky-700 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Area Kerja / Zona Lapangan */}
          <div className="md:col-span-5">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Area Kerja / Zona Lapangan <span className="text-rose-500">*</span>
            </label>
            <select
              value={zoneArea}
              onChange={(e) => setZoneArea(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-600 shadow-2xs"
            >
              <option value="Zona 1 - Pasar Kemis & Rajeg">Zona 1 - Pasar Kemis &amp; Rajeg</option>
              <option value="Zona 2 - Cikupa & Balaraja">Zona 2 - Cikupa &amp; Balaraja</option>
              <option value="Zona 3 - Tigaraksa & Panongan">Zona 3 - Tigaraksa &amp; Panongan</option>
              <option value="Zona 4 - Sepatan & Pakuhaji">Zona 4 - Sepatan &amp; Pakuhaji</option>
              {pcAreas.map((pc) => (
                <option key={pc.id} value={`${pc.id} - ${pc.name}`}>
                  {pc.id} - {pc.name} ({pc.region})
                </option>
              ))}
            </select>
          </div>

          {/* Status Pekerjaan (Radio KLBC / KPPR) */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Status Pekerjaan <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="workStatus"
                  value="KLBC"
                  checked={workStatus === 'KLBC'}
                  onChange={() => setWorkStatus('KLBC')}
                  className="w-4 h-4 text-sky-600 accent-sky-600"
                />
                <span>KLBC</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="workStatus"
                  value="KPPR"
                  checked={workStatus === 'KPPR'}
                  onChange={() => setWorkStatus('KPPR')}
                  className="w-4 h-4 text-sky-600 accent-sky-600"
                />
                <span>KPPR</span>
              </label>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: JADWAL PEMERIKSAAN & PELAKSANAAN PEKERJAAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <Clock className="w-4 h-4 text-sky-700" />
            <h4 className="font-heading font-bold text-sm text-[#00162d]">
              Jadwal Pemeriksaan &amp; Pelaksanaan Pekerjaan
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tgl / Pemeriksaan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tgl / Pemeriksaan
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            {/* Tgl / Perbaikan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tgl / Perbaikan
              </label>
              <input
                type="date"
                value={repairDate}
                onChange={(e) => setRepairDate(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            {/* Waktu Perbaikan (Mulai s/d) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Waktu Perbaikan (Mulai s/d)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={repairTimeStart}
                  onChange={(e) => setRepairTimeStart(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:bg-white"
                />
                <span className="text-xs text-slate-400 font-bold">s/d</span>
                <input
                  type="time"
                  value={repairTimeEnd}
                  onChange={(e) => setRepairTimeEnd(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Waktu Mati Aliran (Shut Off) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Waktu Mati Aliran (Shut Off)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={shutOffTimeStart}
                  onChange={(e) => setShutOffTimeStart(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:bg-white"
                />
                <span className="text-xs text-slate-400 font-bold">s/d</span>
                <input
                  type="time"
                  value={shutOffTimeEnd}
                  onChange={(e) => setShutOffTimeEnd(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: DOKUMENTASI FOTO KEBOCORAN & PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-sky-700" />
                <h4 className="font-heading font-bold text-sm text-[#00162d]">
                  Dokumentasi Foto Kebocoran &amp; Perbaikan
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Wajib melampirkan dokumentasi visual kondisi fisik pipa setelah dilakukan perbaikan teknis.
              </p>
            </div>

            <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 shrink-0">
              Watermark GPS Otomatis
            </span>
          </div>

          {/* Single Photo Card: Foto Setelah Perbaikan */}
          <div className="max-w-2xl mx-auto w-full space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-800">
                Foto Setelah Perbaikan (After) <span className="text-rose-500">*</span>
              </span>
            </div>

            <div
              onClick={triggerCaptureAfter}
              className={`relative rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[220px] ${
                photoAfterUrl
                  ? 'border-emerald-400 bg-slate-900 overflow-hidden'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-400'
              }`}
            >
              {photoAfterUrl ? (
                <div className="relative w-full h-full min-h-[200px]">
                  <img
                    src={photoAfterUrl}
                    alt="Foto Setelah Perbaikan"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    SETELAH PERBAIKAN
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerCaptureAfter();
                    }}
                    className="absolute bottom-2 right-2 bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/20 shadow-lg cursor-pointer"
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Ambil Foto Setelah Perbaikan
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bukti fisik pipa setelah perbaikan / pemasangan aksesoris permanen
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      ⌖ Lat/Lng Embedded
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      🕒 Timestamp
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-semibold italic">
                    💡 Koordinat Latitude &amp; Longitude otomatis tersinkron saat foto ini diambil
                  </p>
                </div>
              )}
            </div>

            {!photoAfterUrl && (
              <button
                type="button"
                onClick={handleLoadSampleAfterPhoto}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulasi Foto Selesai Perbaikan &amp; Sinkronkan GPS</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: DATA ADMINISTRASI & LOKASI KEBOCORAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-sky-700" />
              <h4 className="font-heading font-bold text-sm text-[#00162d]">
                Data Administrasi &amp; Lokasi Kebocoran
              </h4>
            </div>

            {/* Sinkronkan GPS Button */}
            <button
              type="button"
              onClick={syncGPSCoordinates}
              disabled={isSyncingGPS}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Navigation className={`w-3.5 h-3.5 text-sky-700 ${isSyncingGPS ? 'animate-spin' : ''}`} />
              <span>{isSyncingGPS ? 'Menyinkronkan GPS...' : 'Sinkronkan GPS Lapangan'}</span>
            </button>
          </div>

          {gpsSyncMessage && (
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-medium flex items-center space-x-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gpsSyncMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pelapor / Pengawas Lapangan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Pelapor / Pengawas Lapangan
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder=""
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>

            {/* Tanggal / Waktu Laporan Masuk */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Tanggal / Waktu Laporan Masuk
              </label>
              <input
                type="text"
                value={reportReceivedAt}
                onChange={(e) => setReportReceivedAt(e.target.value)}
                placeholder=""
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
              />
            </div>
          </div>

          {/* Lokasi Kebocoran Detail (Sesuai Berita Acara) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Lokasi Kebocoran Detail (Sesuai Berita Acara) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={leakLocationDetail}
              onChange={(e) => setLeakLocationDetail(e.target.value)}
              placeholder=""
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
              required
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Latitude</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-mono font-bold text-slate-400">
                  LAT:
                </span>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude !== null ? latitude : ''}
                  onChange={(e) => setLatitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder=""
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-14 pr-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Longitude</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-mono font-bold text-slate-400">
                  LNG:
                </span>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude !== null ? longitude : ''}
                  onChange={(e) => setLongitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder=""
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-14 pr-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Isi Laporan / Keterangan Awal */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Isi Laporan / Keterangan Awal
            </label>
            <input
              type="text"
              value={initialReportNotes}
              onChange={(e) => setInitialReportNotes(e.target.value)}
              placeholder=""
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
            />
          </div>
        </div>


        {/* ======================================================== */}
        {/* SECTION 5: HASIL PEMERIKSAAN & TINDAKAN PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <Search className="w-4 h-4 text-sky-700" />
            <h4 className="font-heading font-bold text-sm text-[#00162d]">
              Hasil Pemeriksaan &amp; Tindakan Perbaikan
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hasil Pemeriksaan Fisik Pipa */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Hasil Pemeriksaan Fisik Pipa <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-sky-700 font-semibold">Catatan Lapangan</span>
              </div>
              <textarea
                rows={3}
                value={physicalInspectionResult}
                onChange={(e) => setPhysicalInspectionResult(e.target.value)}
                placeholder=""
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
                required
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                {physicalInspectionNotes}
              </p>
            </div>

            {/* Tindakan Perbaikan yang Dilakukan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Tindakan Perbaikan yang Dilakukan <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-sky-700 font-semibold">Tindakan Mitigasi</span>
              </div>
              <textarea
                rows={3}
                value={repairActionTaken}
                onChange={(e) => setRepairActionTaken(e.target.value)}
                placeholder=""
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600"
                required
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                {repairActionNotes}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 6: PENGGUNAAN MATERIAL PERBAIKAN */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-sky-700" />
                <h4 className="font-heading font-bold text-sm text-[#00162d]">
                  Penggunaan Material Perbaikan
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih lebih dari satu material dari katalog resmi SOP AETRA untuk dialokasikan pada pengerjaan ini.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="px-2.5 py-1 rounded bg-sky-100 text-sky-800 text-[11px] font-bold border border-sky-200">
                Formulir Multi-Material
              </span>
              <button
                type="button"
                onClick={onNavigateToMasterData}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 underline flex items-center space-x-1 cursor-pointer"
                title="Kelola daftar jenis material di Master Data"
              >
                <span>Kelola Master Material</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Input Row for Adding Material */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            {/* Pilih Jenis Material (from Master Data) */}
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pilih Jenis Material
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Pilih Jenis Material --</option>
                {repairMaterials.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} ({mat.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Spesifikasi / Dimensi */}
            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Spesifikasi / Dimensi
              </label>
              <input
                type="text"
                value={materialSpecInput}
                onChange={(e) => setMaterialSpecInput(e.target.value)}
                placeholder=""
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* Jumlah */}
            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah</label>
              <input
                type="number"
                min="1"
                value={materialQtyInput}
                onChange={(e) => setMaterialQtyInput(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                placeholder=""
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 text-center text-slate-800 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* + Tambahkan Button */}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddMaterialItem}
                className="w-full py-2.5 px-3 rounded-xl bg-[#006591] hover:bg-[#005278] text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan</span>
              </button>
            </div>
          </div>

          {/* Table of Selected Materials matching Image_1_adacad87.jpeg */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">NAMA MATERIAL KOMPONEN</th>
                  <th className="py-3 px-4">SPESIFIKASI UKURAN</th>
                  <th className="py-3 px-4 text-center">KUANTITAS</th>
                  <th className="py-3 px-4 text-center">SATUAN</th>
                  <th className="py-3 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {materialsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Belum ada material yang ditambahkan. Pilih jenis material di atas dan klik "+ Tambahkan".
                    </td>
                  </tr>
                ) : (
                  materialsList.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                        <span>{item.materialName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {item.spec}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-telemetry text-sky-900">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialItem(index)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris material"
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

        {/* ======================================================== */}
        {/* SECTION 7: BOTTOM ACTION BUTTONS */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Isian Formulir</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-sky-950/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-sky-400" />
            <span>
              {isSubmitting
                ? 'Menyimpan & Memverifikasi...'
                : 'Simpan & Verifikasi Formulir Perbaikan'}
            </span>
          </button>
        </div>

        {/* Success Alert Floating Toast */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#00162d] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500 flex items-center space-x-3.5 animate-in fade-in slide-in-from-bottom-5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm text-white">{successToast}</p>
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs text-sky-300 hover:underline mt-0.5 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Buka daftar Riwayat Kebocoran & Perbaikan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
