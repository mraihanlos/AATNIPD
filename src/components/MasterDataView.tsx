import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  MapPin,
  Plus,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Layers,
  ShieldCheck,
  Radio,
  ExternalLink,
  ArrowRight,
  Building2,
  Sliders,
  AlertTriangle,
  Info,
  Wrench,
  Package,
  Check,
  X,
  Gauge,
  Activity,
  Save,
  HelpCircle,
} from 'lucide-react';
import { PCArea, InspectionLocation, UserProfile, RepairMaterial, PressureThresholdConfig } from '../types/index.ts';
import { LocationMapPicker } from './LocationMapPicker.tsx';
import { DEFAULT_PRESSURE_THRESHOLDS, evaluatePressureStatus } from '../services/storage.ts';

interface MasterDataViewProps {
  pcAreas: PCArea[];
  locations: InspectionLocation[];
  currentUser: UserProfile;
  materials?: RepairMaterial[];
  pressureThresholds?: PressureThresholdConfig;
  onUpdatePressureThresholds?: (config: Partial<PressureThresholdConfig>) => Promise<void>;
  onAddLocation: (loc: Omit<InspectionLocation, 'id' | 'createdAt'>) => void;
  onDeleteLocation: (id: string) => void;
  onAddPCArea?: (area: PCArea) => Promise<void>;
  onUpdatePCArea?: (area: PCArea) => Promise<void>;
  onDeletePCArea?: (id: string) => Promise<void>;
  onAddMaterial?: (mat: Omit<RepairMaterial, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateMaterial?: (mat: RepairMaterial) => Promise<void>;
  onDeleteMaterial?: (id: string) => Promise<void>;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  pcAreas,
  locations,
  currentUser,
  materials = [],
  pressureThresholds,
  onUpdatePressureThresholds,
  onAddLocation,
  onDeleteLocation,
  onAddPCArea,
  onUpdatePCArea,
  onDeletePCArea,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}) => {
  // Active master data sub-tab: 'pc-table' | 'location-table' | 'material-table' | 'pressure-thresholds'
  const [activeTab, setActiveTab] = useState<'pc-table' | 'location-table' | 'material-table' | 'pressure-thresholds'>('pc-table');

  // ==========================================
  // TABEL PC (AREA / ZONA) STATE
  // ==========================================
  const [pcSearchQuery, setPcSearchQuery] = useState<string>('');
  const [pcCurrentPage, setPcCurrentPage] = useState<number>(1);
  const pcItemsPerPage = 6;

  // Add / Edit PC Modal State
  const [showPCAreaModal, setShowPCAreaModal] = useState<boolean>(false);
  const [editingPCArea, setEditingPCArea] = useState<PCArea | null>(null);
  const [pcModalId, setPcModalId] = useState<string>('');
  const [pcModalName, setPcModalName] = useState<string>('');
  const [pcModalRegion, setPcModalRegion] = useState<string>('');
  const [pcModalDescription, setPcModalDescription] = useState<string>('');
  const [pcModalNominalBar, setPcModalNominalBar] = useState<number | ''>(4.85);
  const [pcModalToleranceBar, setPcModalToleranceBar] = useState<number | ''>(0.35);
  const [pcModalColor, setPcModalColor] = useState<string>('#0284c7');
  const [isSavingPC, setIsSavingPC] = useState<boolean>(false);

  // Delete PC State
  const [pcToDelete, setPcToDelete] = useState<PCArea | null>(null);
  const [isDeletingPC, setIsDeletingPC] = useState<boolean>(false);

  // ==========================================
  // TABEL NAMA LOKASI (TITIK BERINDUK) STATE
  // ==========================================
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');
  const [selectedParentPCFilter, setSelectedParentPCFilter] = useState<string>('all');
  const [locationCurrentPage, setLocationCurrentPage] = useState<number>(1);
  const locationItemsPerPage = 7;

  // Form New Location State (Collapsible or Modal)
  const [showAddLocationPanel, setShowAddLocationPanel] = useState<boolean>(false);
  const [selectedPCAreaId, setSelectedPCAreaId] = useState<string>(
    pcAreas.length > 0 ? pcAreas[0].id : 'PC 1'
  );
  const [locationTitle, setLocationTitle] = useState<string>('');
  const [locationSubtitle, setLocationSubtitle] = useState<string>('');
  const [coordMode, setCoordMode] = useState<'map' | 'auto' | 'manual'>('map');
  const [showMapPicker, setShowMapPicker] = useState<boolean>(true);
  const [latitude, setLatitude] = useState<number | ''>(-6.208821);
  const [longitude, setLongitude] = useState<number | ''>(106.845612);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(75);
  const [locationValidationError, setLocationValidationError] = useState<string | null>(null);

  // Delete Location Modal State
  const [locationToDelete, setLocationToDelete] = useState<InspectionLocation | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState<boolean>(false);

  // Global Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ==========================================
  // PC AREA DATA & CALCULATIONS
  // ==========================================
  // Map of location count for each PC Area
  const locationsCountByPC = useMemo(() => {
    const map: Record<string, number> = {};
    pcAreas.forEach((pc) => {
      map[pc.id] = 0;
    });
    locations.forEach((loc) => {
      map[loc.pcAreaId] = (map[loc.pcAreaId] || 0) + 1;
    });
    return map;
  }, [pcAreas, locations]);

  // Filtered PC Areas
  const filteredPCAreas = useMemo(() => {
    return pcAreas.filter((pc) => {
      if (!pcSearchQuery.trim()) return true;
      const q = pcSearchQuery.toLowerCase();
      return (
        pc.id.toLowerCase().includes(q) ||
        pc.name.toLowerCase().includes(q) ||
        pc.region.toLowerCase().includes(q) ||
        pc.description.toLowerCase().includes(q)
      );
    });
  }, [pcAreas, pcSearchQuery]);

  const totalPCPages = Math.ceil(filteredPCAreas.length / pcItemsPerPage) || 1;
  const currentPCRecords = filteredPCAreas.slice(
    (pcCurrentPage - 1) * pcItemsPerPage,
    pcCurrentPage * pcItemsPerPage
  );

  // ==========================================
  // LOCATION DATA & CALCULATIONS
  // ==========================================
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (selectedParentPCFilter !== 'all' && loc.pcAreaId !== selectedParentPCFilter) {
        return false;
      }
      if (locationSearchQuery.trim()) {
        const q = locationSearchQuery.toLowerCase();
        const matchTitle = loc.title.toLowerCase().includes(q);
        const matchSubtitle = (loc.subtitle || '').toLowerCase().includes(q);
        const matchId = loc.id.toLowerCase().includes(q);
        const matchParent = (loc.pcAreaId || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubtitle && !matchId && !matchParent) return false;
      }
      return true;
    });
  }, [locations, selectedParentPCFilter, locationSearchQuery]);

  const totalLocationPages = Math.ceil(filteredLocations.length / locationItemsPerPage) || 1;
  const currentLocationRecords = filteredLocations.slice(
    (locationCurrentPage - 1) * locationItemsPerPage,
    locationCurrentPage * locationItemsPerPage
  );

  // ==========================================
  // TABEL 3: MATERIAL PERBAIKAN STATE & LOGIC
  // ==========================================
  const effectiveMaterials = useMemo(() => materials || [], [materials]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [selectedMaterialCategoryFilter, setSelectedMaterialCategoryFilter] = useState<string>('all');
  const [materialCurrentPage, setMaterialCurrentPage] = useState<number>(1);
  const materialItemsPerPage = 7;

  // Add / Edit Material Modal State
  const [showMaterialModal, setShowMaterialModal] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<RepairMaterial | null>(null);
  const [materialModalName, setMaterialModalName] = useState<string>('');
  const [materialModalUnit, setMaterialModalUnit] = useState<string>('bh (buah)');
  const [materialModalCategory, setMaterialModalCategory] = useState<string>('Fitting & Sambungan');
  const [materialModalSpec, setMaterialModalSpec] = useState<string>('Ø 110 mm');
  const [isSavingMaterial, setIsSavingMaterial] = useState<boolean>(false);

  // Delete Material Modal State
  const [materialToDelete, setMaterialToDelete] = useState<RepairMaterial | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState<boolean>(false);

  // ==========================================
  // TABEL 4: STANDAR BATAS TEKANAN (PRESSURE THRESHOLDS) STATE & PRESETS
  // ==========================================
  const effectiveThresholds = useMemo(
    () => pressureThresholds || DEFAULT_PRESSURE_THRESHOLDS,
    [pressureThresholds]
  );
  const [minOptimalBar, setMinOptimalBar] = useState<number | ''>(effectiveThresholds.minOptimalBar);
  const [maxOptimalBar, setMaxOptimalBar] = useState<number | ''>(effectiveThresholds.maxOptimalBar);
  const [minCriticalBar, setMinCriticalBar] = useState<number | ''>(effectiveThresholds.minCriticalBar ?? 3.0);
  const [maxCriticalBar, setMaxCriticalBar] = useState<number | ''>(effectiveThresholds.maxCriticalBar ?? 7.0);
  const [thresholdPresetName, setThresholdPresetName] = useState<string>(
    effectiveThresholds.presetName || 'Standar Distribusi Perkotaan / PAM (3.5 - 6.5 Bar)'
  );
  const [thresholdNotes, setThresholdNotes] = useState<string>(effectiveThresholds.notes || '');
  const [isSavingThresholds, setIsSavingThresholds] = useState<boolean>(false);
  const [testPressureValue, setTestPressureValue] = useState<number>(4.85);

  // Keep state in sync if remote Firestore changes
  useEffect(() => {
    if (pressureThresholds) {
      setMinOptimalBar(pressureThresholds.minOptimalBar);
      setMaxOptimalBar(pressureThresholds.maxOptimalBar);
      setMinCriticalBar(pressureThresholds.minCriticalBar ?? 3.0);
      setMaxCriticalBar(pressureThresholds.maxCriticalBar ?? 7.0);
      setThresholdPresetName(pressureThresholds.presetName || 'Standar Distribusi Perkotaan / PAM (3.5 - 6.5 Bar)');
      setThresholdNotes(pressureThresholds.notes || '');
    }
  }, [pressureThresholds]);

  // Industry Presets for Water Utility Engineering
  const PRESSURE_PRESETS = [
    {
      id: 'pdam-std',
      name: 'Standar Distribusi Perkotaan / PAM (3.5 - 6.5 Bar)',
      minOpt: 3.5,
      maxOpt: 6.5,
      minCrit: 3.0,
      maxCrit: 7.0,
      desc: 'Standar teknis Permen PUPR & AWWA untuk transmisi sekunder dan pipa primer perkotaan. Menjaga sisa tekan 10 mka di pelanggan terjauh.',
    },
    {
      id: 'high-trans',
      name: 'Pipa Transmisi Utama / High Pressure (4.5 - 7.5 Bar)',
      minOpt: 4.5,
      maxOpt: 7.5,
      minCrit: 4.0,
      maxCrit: 8.5,
      desc: 'Pipa baja/HDPE transmisi intake & pompa booster menuju reservoir induk sebelum pengatur PRV.',
    },
    {
      id: 'secondary-res',
      name: 'Jaringan Sekunder & Pemukiman (2.0 - 4.5 Bar)',
      minOpt: 2.0,
      maxOpt: 4.5,
      minCrit: 1.5,
      maxCrit: 5.5,
      desc: 'Jaringan pipa distribusi perumahan padat untuk mencegah kebocoran pada sambungan meteran pelanggan.',
    },
    {
      id: 'gravity-low',
      name: 'Distribusi Gravitasi / Elevasi Rendah (1.5 - 3.5 Bar)',
      minOpt: 1.5,
      maxOpt: 3.5,
      minCrit: 1.0,
      maxCrit: 4.5,
      desc: 'Distribusi air sistem gravitasi dari reservoir dataran tinggi atau daerah dengan topografi datar.',
    },
    {
      id: 'hilly-terrain',
      name: 'Zona Berbukit / Kontur Curam (3.0 - 5.5 Bar)',
      minOpt: 3.0,
      maxOpt: 5.5,
      minCrit: 2.5,
      maxCrit: 6.5,
      desc: 'Area dengan perbedaan elevasi tanah signifikan antar sub-zona distribusi.',
    },
  ];

  const handleApplyPreset = (preset: typeof PRESSURE_PRESETS[0]) => {
    setMinOptimalBar(preset.minOpt);
    setMaxOptimalBar(preset.maxOpt);
    setMinCriticalBar(preset.minCrit);
    setMaxCriticalBar(preset.maxCrit);
    setThresholdPresetName(preset.name);
    setThresholdNotes(preset.desc);
    showToast(`Preset "${preset.name}" diterapkan! Klik Simpan untuk memperbarui database.`, 'info');
  };

  const handleSaveThresholds = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minOpt = typeof minOptimalBar === 'number' ? minOptimalBar : parseFloat(String(minOptimalBar));
    const maxOpt = typeof maxOptimalBar === 'number' ? maxOptimalBar : parseFloat(String(maxOptimalBar));
    const minCrit = typeof minCriticalBar === 'number' ? minCriticalBar : parseFloat(String(minCriticalBar));
    const maxCrit = typeof maxCriticalBar === 'number' ? maxCriticalBar : parseFloat(String(maxCriticalBar));

    if (isNaN(minOpt) || isNaN(maxOpt) || minOpt <= 0 || maxOpt <= 0) {
      showToast('Nilai batas optimal harus berupa angka positif yang valid.', 'warning');
      return;
    }
    if (minOpt >= maxOpt) {
      showToast('Batas minimum optimal harus lebih kecil dari batas maksimum optimal.', 'warning');
      return;
    }
    if (!isNaN(minCrit) && minCrit >= minOpt) {
      showToast('Batas kritis drop harus lebih kecil dari batas minimum optimal.', 'warning');
      return;
    }
    if (!isNaN(maxCrit) && maxCrit <= maxOpt) {
      showToast('Batas kritis surge harus lebih besar dari batas maksimum optimal.', 'warning');
      return;
    }

    try {
      setIsSavingThresholds(true);
      if (onUpdatePressureThresholds) {
        await onUpdatePressureThresholds({
          minOptimalBar: minOpt,
          maxOptimalBar: maxOpt,
          minCriticalBar: !isNaN(minCrit) ? minCrit : Math.max(0, minOpt - 0.5),
          maxCriticalBar: !isNaN(maxCrit) ? maxCrit : maxOpt + 0.5,
          presetName: thresholdPresetName || 'Kustom Standar Operasional',
          notes: thresholdNotes.trim(),
        });
      }
      showToast(`Standar Batas Optimal (${minOpt} - ${maxOpt} Bar) berhasil disimpan ke Master Data!`, 'success');
    } catch (err) {
      console.error('Error saving pressure thresholds:', err);
      showToast('Gagal menyimpan standar batas tekanan.', 'warning');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleResetThresholdsToDefault = async () => {
    setMinOptimalBar(3.5);
    setMaxOptimalBar(6.5);
    setMinCriticalBar(3.0);
    setMaxCriticalBar(7.0);
    setThresholdPresetName('Standar Distribusi Perkotaan / PAM (3.5 - 6.5 Bar)');
    setThresholdNotes('Standar teknis distribusi air perpipaan menjaga sisa tekan pelanggan optimal tanpa membebani kekuatan sambungan pipa.');
    try {
      setIsSavingThresholds(true);
      if (onUpdatePressureThresholds) {
        await onUpdatePressureThresholds(DEFAULT_PRESSURE_THRESHOLDS);
      }
      showToast('Standar batas tekanan dikembalikan ke default pabrikan (3.5 - 6.5 Bar).', 'success');
    } catch (err) {
      console.error('Error resetting thresholds:', err);
      showToast('Gagal mengembalikan ke default.', 'warning');
    } finally {
      setIsSavingThresholds(false);
    }
  };


  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return effectiveMaterials.filter((mat) => {
      if (selectedMaterialCategoryFilter !== 'all' && mat.category !== selectedMaterialCategoryFilter) {
        return false;
      }
      if (materialSearchQuery.trim()) {
        const q = materialSearchQuery.toLowerCase();
        const matchName = mat.name.toLowerCase().includes(q);
        const matchSpec = (mat.standardDimension || '').toLowerCase().includes(q);
        const matchCat = (mat.category || '').toLowerCase().includes(q);
        const matchId = mat.id.toLowerCase().includes(q);
        if (!matchName && !matchSpec && !matchCat && !matchId) return false;
      }
      return true;
    });
  }, [effectiveMaterials, selectedMaterialCategoryFilter, materialSearchQuery]);

  const totalMaterialPages = Math.ceil(filteredMaterials.length / materialItemsPerPage) || 1;
  const currentMaterialRecords = filteredMaterials.slice(
    (materialCurrentPage - 1) * materialItemsPerPage,
    materialCurrentPage * materialItemsPerPage
  );

  // Handle GPS Auto detection
  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
          setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
          showToast('Koordinat GPS presisi berhasil dideteksi!', 'info');
        },
        () => {
          // Fallback coordinate
          setLatitude(-6.208821 + (Math.random() - 0.5) * 0.002);
          setLongitude(106.845612 + (Math.random() - 0.5) * 0.002);
          showToast('Koordinat GPS disesuaikan ke posisi stasiun pipa.', 'info');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Quick switch from PC row to Location table filtered by that PC
  const handleViewLocationsUnderPC = (pcId: string) => {
    setSelectedParentPCFilter(pcId);
    setLocationSearchQuery('');
    setLocationCurrentPage(1);
    setActiveTab('location-table');
    showToast(`Menampilkan titik lokasi yang berinduk pada ${pcId}`, 'info');
  };

  // Open modal to add or edit PC Area
  const handleOpenAddPCModal = () => {
    setEditingPCArea(null);
    const nextNumber = pcAreas.length + 1;
    setPcModalId(`PC ${nextNumber}`);
    setPcModalName(`PC ${nextNumber} - Zona Baru Sektor`);
    setPcModalRegion('Jakarta & Sekitarnya');
    setPcModalDescription('Area operasional jaringan transmisi dan distribusi sekunder');
    setPcModalNominalBar(4.85);
    setPcModalToleranceBar(0.35);
    setPcModalColor('#0284c7');
    setShowPCAreaModal(true);
  };

  const handleOpenEditPCModal = (area: PCArea) => {
    setEditingPCArea(area);
    setPcModalId(area.id);
    setPcModalName(area.name);
    setPcModalRegion(area.region);
    setPcModalDescription(area.description);
    setPcModalNominalBar(area.nominalPressureBar);
    setPcModalToleranceBar(area.toleranceBar);
    setPcModalColor(area.color || '#0284c7');
    setShowPCAreaModal(true);
  };

  // Save PC Area (Add or Edit)
  const handleSavePCAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcModalId.trim() || !pcModalName.trim()) {
      showToast('Mohon lengkapi ID PC dan Nama Area/Zona', 'warning');
      return;
    }

    const payload: PCArea = {
      id: pcModalId.trim(),
      name: pcModalName.trim(),
      region: pcModalRegion.trim() || 'Zona Distribusi Terpusat',
      description: pcModalDescription.trim() || 'Jalur transmisi dan katup pengatur tekanan',
      nominalPressureBar: typeof pcModalNominalBar === 'number' ? pcModalNominalBar : (parseFloat(String(pcModalNominalBar)) || 4.85),
      toleranceBar: typeof pcModalToleranceBar === 'number' ? pcModalToleranceBar : (parseFloat(String(pcModalToleranceBar)) || 0.35),
      color: pcModalColor || '#0284c7',
      activeNodesCount: locationsCountByPC[pcModalId.trim()] || 0,
    };

    try {
      setIsSavingPC(true);
      if (editingPCArea) {
        if (onUpdatePCArea) {
          await onUpdatePCArea(payload);
        }
        showToast(`Area/Zona "${payload.name}" berhasil diperbarui!`, 'success');
      } else {
        if (onAddPCArea) {
          await onAddPCArea(payload);
        }
        showToast(`Area/Zona baru "${payload.name}" berhasil ditambahkan!`, 'success');
      }
      setShowPCAreaModal(false);
    } catch (err) {
      console.error('Error saving PC Area:', err);
      showToast('Gagal menyimpan Area/Zona PC.', 'warning');
    } finally {
      setIsSavingPC(false);
    }
  };

  // Save New Location
  const handleSaveLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocationValidationError(null);
    if (!locationTitle.trim()) {
      setLocationValidationError('Mohon isi Judul / Nama Titik Lokasi.');
      return;
    }

    const resolvedLat = typeof latitude === 'number' ? latitude : (parseFloat(String(latitude)) || -6.208821);
    const resolvedLng = typeof longitude === 'number' ? longitude : (parseFloat(String(longitude)) || 106.845612);

    onAddLocation({
      pcAreaId: selectedPCAreaId,
      title: locationTitle.trim(),
      subtitle: locationSubtitle.trim() || `Titik Lokasi Berinduk pada ${selectedPCAreaId}`,
      latitude: resolvedLat,
      longitude: resolvedLng,
      radiusMeters: geofenceRadius,
      valveType: 'Gate Valve Standard DN300',
    });

    showToast(`Titik lokasi "${locationTitle}" berhasil disimpan ke ${selectedPCAreaId}!`, 'success');

    // Reset & close form
    setLocationTitle('');
    setLocationSubtitle('');
    setShowAddLocationPanel(false);
  };

  // Color preset options for PC Area
  const PC_COLOR_PRESETS = [
    { label: 'Biru Utama', value: '#006591' },
    { label: 'Sky Biru', value: '#0284c7' },
    { label: 'Emerald Hijau', value: '#10b981' },
    { label: 'Amber Kuning', value: '#eab308' },
    { label: 'Indigo Ungu', value: '#6366f1' },
    { label: 'Rose Merah', value: '#f43f5e' },
  ];

  return (
    <div className="space-y-6 pb-14">
      {/* ======================================================== */}
      {/* 1. HEADER & TOP METRICS */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              Struktur Hierarki Jaringan Pipa
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              Relasi: PC (Area/Zona Induk) ➔ Nama Lokasi (Titik Berinduk)
            </span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#00162d] tracking-tight">
            Master Data Area (PC) & Nama Lokasi
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Kelola tabel <strong>Area / Zona (PC)</strong> sebagai wilayah induk dan tabel{' '}
            <strong>Nama Lokasi</strong> sebagai titik fisik inspeksi lapangan yang berinduk pada masing-masing PC.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Card: Total Area / Zona (PC) */}
          <div
            onClick={() => setActiveTab('pc-table')}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 ${
              activeTab === 'pc-table'
                ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-100 text-sky-700 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Tabel Induk (PC)
              </p>
              <p className="font-telemetry font-extrabold text-lg sm:text-xl text-[#00162d]">
                {pcAreas.length}{' '}
                <span className="font-sans text-[10px] sm:text-xs font-bold text-sky-700 uppercase">Area</span>
              </p>
            </div>
          </div>

          {/* Card: Total Nama Lokasi */}
          <div
            onClick={() => setActiveTab('location-table')}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 ${
              activeTab === 'location-table'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Titik Lokasi
              </p>
              <p className="font-telemetry font-extrabold text-lg sm:text-xl text-[#00162d]">
                {locations.length}{' '}
                <span className="font-sans text-[10px] sm:text-xs font-bold text-emerald-700 uppercase">Titik</span>
              </p>
            </div>
          </div>

          {/* Card: Total Material Perbaikan */}
          <div
            onClick={() => setActiveTab('material-table')}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center space-x-2.5 sm:space-x-3.5 ${
              activeTab === 'material-table'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Material SOP
              </p>
              <p className="font-telemetry font-extrabold text-lg sm:text-xl text-[#00162d]">
                {effectiveMaterials.length}{' '}
                <span className="font-sans text-[10px] sm:text-xs font-bold text-amber-700 uppercase">Item</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Explanation Card */}
      <div className="bg-[#f0f7ff] border border-sky-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-sky-950 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <Info className="w-4 h-4 text-sky-700 shrink-0" />
          <span className="text-slate-700 text-xs">
            <strong className="text-sky-950">Aturan Relasi Database:</strong>{' '}
            <strong className="text-sky-800">PC (Pressure Control / Area)</strong> adalah zona induk.{' '}
            <strong className="text-emerald-800">Nama Lokasi</strong> merupakan stasiun/katup berinduk.{' '}
            <strong className="text-amber-800">Katalog Material</strong> adalah daftar resmi komponen suku cadang perbaikan kebocoran (SOP AETRA).
          </span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded bg-white text-sky-800 border border-sky-200">
            RELASI: 1 PC ➔ BANYAK LOKASI • KATALOG MATERIAL TERPUSAT
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-TAB NAVIGATION: TABEL PC vs TABEL NAMA LOKASI vs MATERIAL */}
      {/* ======================================================== */}
      <div className="border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 sm:pb-0">
        <div className="flex flex-wrap space-x-0 sm:space-x-2 gap-1.5 sm:gap-0 pb-1 sm:pb-0 w-full sm:w-auto">
          {/* TAB 1: TABEL PC (AREA / ZONA) */}
          <button
            type="button"
            onClick={() => setActiveTab('pc-table')}
            className={`py-2 sm:py-3 px-2.5 sm:px-4 text-xs font-bold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pc-table'
                ? 'border-[#006591] text-[#006591] bg-white rounded-t-xl border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'pc-table' ? 'text-[#006591]' : 'text-slate-400'}`} />
            <span className="truncate">Tabel 1: PC Area</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'pc-table'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {pcAreas.length}
            </span>
          </button>

          {/* TAB 2: TABEL NAMA LOKASI (TITIK BERINDUK) */}
          <button
            type="button"
            onClick={() => setActiveTab('location-table')}
            className={`py-2 sm:py-3 px-2.5 sm:px-4 text-xs font-bold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'location-table'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'location-table' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="truncate">Tabel 2: Nama Lokasi</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'location-table'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {locations.length}
            </span>
          </button>

          {/* TAB 3: TABEL MATERIAL PERBAIKAN */}
          <button
            type="button"
            onClick={() => setActiveTab('material-table')}
            className={`py-2 sm:py-3 px-2.5 sm:px-4 text-xs font-bold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'material-table'
                ? 'border-amber-600 text-amber-800 bg-white rounded-t-xl border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
            }`}
          >
            <Wrench className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'material-table' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="truncate">Tabel 3: Material Perbaikan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'material-table'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {effectiveMaterials.length}
            </span>
          </button>

          {/* TAB 4: STANDAR BATAS TEKANAN (PRESSURE THRESHOLDS) */}
          <button
            type="button"
            onClick={() => setActiveTab('pressure-thresholds')}
            className={`py-2 sm:py-3 px-2.5 sm:px-4 text-xs font-bold flex items-center justify-center space-x-1.5 sm:space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pressure-thresholds'
                ? 'border-indigo-600 text-indigo-800 bg-white rounded-t-xl border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
            }`}
          >
            <Gauge className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'pressure-thresholds' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="truncate">Tabel 4: Batas Tekanan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'pressure-thresholds'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {typeof minOptimalBar === 'number' && typeof maxOptimalBar === 'number'
                ? `${minOptimalBar} - ${maxOptimalBar} Bar`
                : '3.5 - 6.5'}
            </span>
          </button>
        </div>

        {/* Quick action button matching the active tab */}
        <div className="shrink-0 flex justify-end w-full sm:w-auto">
          {activeTab === 'pc-table' ? (
            <button
              type="button"
              onClick={handleOpenAddPCModal}
              className="w-full sm:w-auto justify-center mb-1 py-2.5 px-3.5 bg-[#00162d] hover:bg-[#00274e] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Tambah Area / Zona (PC)</span>
            </button>
          ) : activeTab === 'location-table' ? (
            <button
              type="button"
              onClick={() => setShowAddLocationPanel(!showAddLocationPanel)}
              className="w-full sm:w-auto justify-center mb-1 py-2.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-200" />
              <span>{showAddLocationPanel ? 'Tutup Form Tambah' : 'Tambah Titik Lokasi'}</span>
            </button>
          ) : activeTab === 'material-table' ? (
            <button
              type="button"
              onClick={() => {
                setEditingMaterial(null);
                setMaterialModalName('');
                setMaterialModalUnit('bh (buah)');
                setMaterialModalCategory('Fitting & Sambungan');
                setMaterialModalSpec('Ø 110 mm');
                setShowMaterialModal(true);
              }}
              className="w-full sm:w-auto justify-center mb-1 py-2.5 px-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-200" />
              <span>Tambah Material Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveThresholds()}
              disabled={isSavingThresholds}
              className="w-full sm:w-auto justify-center mb-1 py-2.5 px-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isSavingThresholds ? 'Menyimpan ke Database...' : 'Simpan Batas Tekanan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VIEW TAB 1: TABEL PC (AREA / ZONA INDUK) */}
      {/* ======================================================== */}
      {activeTab === 'pc-table' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-6 space-y-4">
            {/* Toolbar: Search, Filter, Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="relative flex-1 w-full sm:w-auto sm:min-w-[260px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari kode PC, nama area, wilayah, atau deskripsi..."
                  value={pcSearchQuery}
                  onChange={(e) => {
                    setPcSearchQuery(e.target.value);
                    setPcCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                  {filteredPCAreas.length} Area Terdaftar
                </span>

                <button
                  type="button"
                  onClick={() => setPcSearchQuery('')}
                  title="Reset Filter"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Card List for PC Areas (Smartphones) */}
            <div className="md:hidden space-y-3">
              {currentPCRecords.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  Tidak ada data Area / Zona (PC) yang sesuai pencarian.
                </div>
              ) : (
                currentPCRecords.map((area) => {
                  const childCount = locationsCountByPC[area.id] || 0;
                  return (
                    <div
                      key={area.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      {/* Top: PC ID, Badge, Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: area.color || '#006591' }}
                          />
                          <span className="font-mono font-bold text-sm text-[#00162d]">
                            {area.id}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-semibold border border-sky-100">
                            Parent Area
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPCModal(area)}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title={`Edit Area ${area.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPcToDelete(area)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Hapus Area ${area.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Area Name & Region */}
                      <div>
                        <p className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                          {area.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{area.region}</p>
                      </div>

                      {/* Pressure & Node count */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Standar Tekanan
                          </span>
                          <span className="font-telemetry font-bold text-sm text-slate-900">
                            {area.nominalPressureBar.toFixed(2)} Bar
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Tol: ±{area.toleranceBar.toFixed(2)} Bar
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Titik Berinduk
                            </span>
                            <span className="font-bold text-sm text-emerald-800">
                              {childCount} Titik
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewLocationsUnderPC(area.id)}
                            className="mt-1 text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-0.5 cursor-pointer"
                          >
                            <span>Lihat Titik</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {area.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed italic bg-slate-50/60 p-2 rounded-lg">
                          "{area.description}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* TABEL PC (AREA / ZONA) Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-3.5">Kode & ID PC</th>
                    <th className="py-3 px-3.5">Nama Area / Zona (Induk)</th>
                    <th className="py-3 px-3.5">Wilayah & Sektor</th>
                    <th className="py-3 px-3.5">Standar Tekanan Desain</th>
                    <th className="py-3 px-3.5 text-center">Titik Lokasi Berinduk</th>
                    <th className="py-3 px-3.5">Keterangan Operasional</th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentPCRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada data Area / Zona (PC) yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    currentPCRecords.map((area) => {
                      const childCount = locationsCountByPC[area.id] || 0;
                      return (
                        <tr key={area.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Kode & ID PC */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: area.color || '#006591' }}
                              />
                              <span className="font-mono font-bold text-sm text-[#00162d]">
                                {area.id}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              Zona Induk
                            </span>
                          </td>

                          {/* Nama Area / Zona */}
                          <td className="py-3.5 px-3.5">
                            <p className="font-bold text-slate-900 leading-snug">{area.name}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-semibold border border-sky-100 mt-1">
                              Parent Area
                            </span>
                          </td>

                          {/* Wilayah / Region */}
                          <td className="py-3.5 px-3.5 text-slate-700 whitespace-nowrap">
                            <span className="font-medium">{area.region}</span>
                          </td>

                          {/* Standar Tekanan */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5 font-telemetry">
                              <span className="font-bold text-slate-900 text-sm">
                                {area.nominalPressureBar.toFixed(2)}
                              </span>
                              <span className="text-xs text-slate-500 font-sans font-medium">Bar Nom.</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Tol: ±{area.toleranceBar.toFixed(2)} Bar
                            </span>
                          </td>

                          {/* Titik Lokasi Berinduk */}
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                  childCount > 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {childCount} Titik Lokasi
                              </span>
                              <button
                                type="button"
                                onClick={() => handleViewLocationsUnderPC(area.id)}
                                className="mt-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer"
                              >
                                <span>Lihat Titik</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Keterangan Operasional */}
                          <td className="py-3.5 px-3.5 text-slate-600 max-w-xs">
                            <p className="line-clamp-2 text-[11px] leading-relaxed">
                              {area.description}
                            </p>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPCModal(area)}
                                className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                title={`Edit Area ${area.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPcToDelete(area)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={`Hapus Area ${area.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for PC Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center sm:text-left">
              <p>
                Menampilkan{' '}
                <span className="font-bold text-slate-700">
                  {filteredPCAreas.length > 0 ? (pcCurrentPage - 1) * pcItemsPerPage + 1 : 0}-
                  {Math.min(pcCurrentPage * pcItemsPerPage, filteredPCAreas.length)}
                </span>{' '}
                dari total <span className="font-bold text-slate-700">{filteredPCAreas.length}</span>{' '}
                Area/Zona PC
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPcCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={pcCurrentPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  {pcCurrentPage} / {totalPCPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPcCurrentPage((p) => Math.min(p + 1, totalPCPages))}
                  disabled={pcCurrentPage === totalPCPages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VIEW TAB 2: TABEL NAMA LOKASI (BERINDUK PADA PC) */}
      {/* ======================================================== */}
      {activeTab === 'location-table' && (
        <div className="space-y-5">
          {/* Form Tambah Titik Lokasi (Collapsible Panel) */}
          {showAddLocationPanel && (
            <div className="bg-white rounded-xl shadow-md border-2 border-emerald-400/60 p-4 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-[#00162d]">
                      Form Tambah Titik / Nama Lokasi Baru
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tentukan nama titik inspeksi dan pilih <strong>Area PC</strong> tempat lokasi ini berinduk.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddLocationPanel(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1 bg-slate-100 rounded-lg"
                >
                  Tutup Form
                </button>
              </div>

              {locationValidationError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{locationValidationError}</span>
                </div>
              )}

              <form onSubmit={handleSaveLocationSubmit} className="space-y-5">
                {/* Top Section: Form Inputs in 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left side: PC Parent, Title, Subtitle */}
                  <div className="space-y-4">
                    {/* Select Induk PC */}
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Induk Area / Zona (PC) <span className="text-rose-500">* Wajib</span>
                      </label>
                      <select
                        value={selectedPCAreaId}
                        onChange={(e) => setSelectedPCAreaId(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500"
                      >
                        {pcAreas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.id} — {area.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Lokasi ini akan berinduk pada area zona di atas.
                      </p>
                    </div>

                    {/* Judul Titik Lokasi */}
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Nama / Judul Titik Lokasi <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={locationTitle}
                        onChange={(e) => setLocationTitle(e.target.value)}
                        placeholder="cth: Sub-Stasiun Pipa Distribusi Utama PC-2B"
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                        required
                      />
                    </div>

                    {/* Keterangan Segmen Pipa */}
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Keterangan Segmen Pipa / Spesifikasi Node
                      </label>
                      <input
                        type="text"
                        value={locationSubtitle}
                        onChange={(e) => setLocationSubtitle(e.target.value)}
                        placeholder="cth: Katup Inlet Segmen 14 • West Line"
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Right side: Coordinates, Geofence, Pressure */}
                  <div className="space-y-4">
                    {/* Koordinat GPS & Mode Selection */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          Koordinat GPS Titik (WGS84)
                        </label>
                        <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setCoordMode('map');
                              setShowMapPicker(true);
                            }}
                            className={`px-2 py-1 rounded transition-all flex items-center justify-center space-x-1 cursor-pointer text-xs ${
                              coordMode === 'map'
                                ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-emerald-200" />
                            <span>Maps</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCoordMode('auto');
                              handleDetectGPS();
                            }}
                            className={`px-2 py-1 rounded transition-all flex items-center justify-center space-x-1 cursor-pointer text-xs ${
                              coordMode === 'auto'
                                ? 'bg-sky-800 text-white shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Radio className="w-3 h-3 text-sky-300" />
                            <span>Auto</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoordMode('manual')}
                            className={`px-2 py-1 rounded transition-all flex items-center justify-center space-x-1 cursor-pointer text-xs ${
                              coordMode === 'manual'
                                ? 'bg-[#00162d] text-white shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>Manual</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Latitude</span>
                          <input
                            type="number"
                            step="0.000001"
                            value={latitude}
                            placeholder="-6.208821"
                            onChange={(e) => {
                              const val = e.target.value;
                              setLatitude(val === '' ? '' : parseFloat(val));
                            }}
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 placeholder:text-slate-300"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Longitude</span>
                          <input
                            type="number"
                            step="0.000001"
                            value={longitude}
                            placeholder="106.845612"
                            onChange={(e) => {
                              const val = e.target.value;
                              setLongitude(val === '' ? '' : parseFloat(val));
                            }}
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:bg-white focus:border-sky-500 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>Titik koordinat dapat ditentukan dengan menggeser pin atau klik langsung pada peta di bawah.</span>
                      </p>
                    </div>

                    {/* Geofence Radius */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">Geofence Radius</label>
                        <span className="text-xs font-mono font-bold text-sky-800">{geofenceRadius} m</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="250"
                        step="5"
                        value={geofenceRadius}
                        onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                        className="w-full accent-emerald-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Map Picker Section (Penentuan Titik Lokasi dengan Pin Poin pada Maps) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          Penentuan Titik Lokasi dengan Pin Poin pada Maps
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Klik di mana saja pada peta atau geser pin merah untuk menentukan posisi akurat titik inspeksi pipa.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors cursor-pointer"
                    >
                      {showMapPicker ? 'Sembunyikan Peta' : 'Tampilkan Peta Interaktif'}
                    </button>
                  </div>

                  {showMapPicker && (
                    <div className="mt-2 animate-in fade-in duration-200">
                      <LocationMapPicker
                        latitude={typeof latitude === 'number' ? latitude : -6.208821}
                        longitude={typeof longitude === 'number' ? longitude : 106.845612}
                        radiusMeters={geofenceRadius}
                        existingLocations={locations}
                        color={pcAreas.find((a) => a.id === selectedPCAreaId)?.color || '#0284c7'}
                        onLocationChange={(newLat, newLng) => {
                          setLatitude(newLat);
                          setLongitude(newLng);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center space-x-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
                  >
                    <MapPin className="w-4 h-4 text-emerald-200" />
                    <span>Simpan Titik ke {selectedPCAreaId}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLocationPanel(false)}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table Container for Nama Lokasi */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-6 space-y-4">
            {/* Toolbar: Search & Filter by Parent PC */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full sm:w-auto sm:min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama lokasi, ID titik, atau segmen..."
                  value={locationSearchQuery}
                  onChange={(e) => {
                    setLocationSearchQuery(e.target.value);
                    setLocationCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              {/* Filter by Induk PC (Area / Zona) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold py-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                  Filter Induk PC:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParentPCFilter('all');
                    setLocationCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedParentPCFilter === 'all'
                      ? 'bg-[#00162d] text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua PC ({locations.length})
                </button>
                {pcAreas.map((pc) => (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => {
                      setSelectedParentPCFilter(pc.id);
                      setLocationCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                      selectedParentPCFilter === pc.id
                        ? 'bg-[#006591] text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pc.color || '#006591' }}
                    />
                    <span>{pc.id}</span>
                    <span className="text-[10px] opacity-80">({locationsCountByPC[pc.id] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-header info */}
            <div className="flex items-center justify-between pt-2 pb-1 border-b border-slate-100 text-xs">
              <div className="flex items-center space-x-2">
                <h4 className="font-heading font-bold text-sm text-[#00162d]">
                  Daftar Titik & Nama Lokasi Fisik
                </h4>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                  {filteredLocations.length} Lokasi
                </span>
                {selectedParentPCFilter !== 'all' && (
                  <span className="text-xs text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    Induk: {selectedParentPCFilter}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearchQuery('');
                    setSelectedParentPCFilter('all');
                  }}
                  title="Reset Filter"
                  className="p-1 text-slate-400 hover:text-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Card List for Locations (Smartphones) */}
            <div className="md:hidden space-y-3">
              {currentLocationRecords.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  {locations.length === 0
                    ? 'Belum ada titik lokasi yang terdaftar. Tambahkan titik lokasi baru di atas.'
                    : 'Tidak ada titik lokasi yang cocok dengan filter yang dipilih.'}
                </div>
              ) : (
                currentLocationRecords.map((loc) => {
                  const parentPC = pcAreas.find((a) => a.id === loc.pcAreaId);
                  return (
                    <div
                      key={loc.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      {/* Top: Location ID, Parent PC, Delete button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-sky-900">
                            {loc.id}
                          </span>
                          <span className="inline-flex items-center space-x-1 font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: parentPC?.color || '#006591' }}
                            />
                            <span>{loc.pcAreaId}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setLocationToDelete(loc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Hapus Titik ${loc.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Location Title & Subtitle */}
                      <div>
                        <p className="font-heading font-bold text-xs sm:text-sm text-[#00162d] leading-snug">
                          {loc.title}
                        </p>
                        {loc.subtitle && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{loc.subtitle}</p>
                        )}
                      </div>

                      {/* Coordinates with Maps Link */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      {/* Specs: Geofence */}
                      <div className="pt-1 text-xs">
                        <span className="text-[11px] text-slate-500">
                          Geofence: <strong className="text-slate-800 font-mono">{loc.radiusMeters}m</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* TABEL NAMA LOKASI (TITIK BERINDUK PADA PC) Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                    <th className="py-3 px-3">ID Titik</th>
                    <th className="py-3 px-3">Induk PC (Area / Zona)</th>
                    <th className="py-3 px-3">Nama Titik Lokasi Pipa</th>
                    <th className="py-3 px-3">Koordinat GPS</th>
                    <th className="py-3 px-3 text-center">Geofence</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentLocationRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {locations.length === 0 ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-600">Belum ada titik lokasi yang terdaftar.</p>
                            <p className="text-xs text-slate-400">
                              Klik tombol &ldquo;Tambah Titik Lokasi&rdquo; di atas untuk mendaftarkan titik inspeksi yang berinduk pada Area PC.
                            </p>
                          </div>
                        ) : (
                          'Tidak ada titik lokasi yang cocok dengan filter yang dipilih.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    currentLocationRecords.map((loc) => {
                      const parentPC = pcAreas.find((a) => a.id === loc.pcAreaId);
                      return (
                        <tr key={loc.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* ID Titik */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-sky-900">
                            {loc.id}
                          </td>

                          {/* Induk PC (Area / Zona) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: parentPC?.color || '#006591' }}
                              />
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {loc.pcAreaId}
                              </span>
                            </div>
                            {parentPC && (
                              <span className="text-[10px] text-slate-500 block mt-0.5 max-w-[140px] truncate">
                                {parentPC.region}
                              </span>
                            )}
                          </td>

                          {/* Nama Titik Lokasi Pipa */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 leading-snug">{loc.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{loc.subtitle}</p>
                          </td>

                          {/* Koordinat GPS */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            <div>{loc.latitude.toFixed(6)}</div>
                            <div className="text-slate-400">{loc.longitude.toFixed(6)}</div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-sky-700 hover:underline flex items-center space-x-1 mt-0.5"
                            >
                              <span>Buka Maps</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>

                          {/* Geofence */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                              {loc.radiusMeters} m
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setLocationToDelete(loc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Hapus Titik ${loc.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Location Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center sm:text-left">
              <p>
                Menampilkan{' '}
                <span className="font-bold text-slate-700">
                  {filteredLocations.length > 0
                    ? (locationCurrentPage - 1) * locationItemsPerPage + 1
                    : 0}
                  -{Math.min(locationCurrentPage * locationItemsPerPage, filteredLocations.length)}
                </span>{' '}
                dari total <span className="font-bold text-slate-700">{filteredLocations.length}</span>{' '}
                titik inspeksi
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setLocationCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={locationCurrentPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  {locationCurrentPage} / {totalLocationPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLocationCurrentPage((p) => Math.min(p + 1, totalLocationPages))
                  }
                  disabled={locationCurrentPage === totalLocationPages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TABEL 3: MASTER DATA JENIS MATERIAL PERBAIKAN */}
      {/* ======================================================== */}
      {activeTab === 'material-table' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Explanation Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-amber-950">
                  Katalog Resmi Material Perbaikan Pipa (SOP AETRA)
                </h3>
                <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
                  Daftar material suku cadang resmi untuk pemeliharaan &amp; perbaikan kebocoran jaringan pipa. Item dalam katalog ini otomatis muncul pada pilihan <strong>&ldquo;Jenis Material&rdquo;</strong> di formulir Berita Acara Perbaikan Kebocoran.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingMaterial(null);
                setMaterialModalName('');
                setMaterialModalUnit('bh (buah)');
                setMaterialModalCategory('Fitting & Sambungan');
                setMaterialModalSpec('Ø 110 mm');
                setShowMaterialModal(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Material Baru</span>
            </button>
          </div>

          {/* Table Container for Material */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-6 space-y-4">
            {/* Toolbar: Search & Filter by Category */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full sm:w-auto sm:min-w-[260px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari jenis material, ukuran, atau kategori..."
                  value={materialSearchQuery}
                  onChange={(e) => {
                    setMaterialSearchQuery(e.target.value);
                    setMaterialCurrentPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold py-1">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                  Kategori:
                </span>
                {['all', 'Fitting & Sambungan', 'Pipa', 'Valve & Aksesoris', 'Klem & Gasket'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedMaterialCategoryFilter(cat);
                      setMaterialCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs ${
                      selectedMaterialCategoryFilter === cat
                        ? 'bg-amber-800 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? `Semua (${effectiveMaterials.length})` : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID Material</th>
                    <th className="py-3 px-4">Nama Jenis Material</th>
                    <th className="py-3 px-4">Kategori SOP</th>
                    <th className="py-3 px-4">Spesifikasi Standar</th>
                    <th className="py-3 px-4 text-center">Satuan Default</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMaterialRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        Tidak ada material yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    currentMaterialRecords.map((mat) => (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-800">
                          {mat.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#00162d]">
                          {mat.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {mat.category || 'Fitting & Sambungan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {mat.standardDimension || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {mat.defaultUnit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMaterial(mat);
                                setMaterialModalName(mat.name);
                                setMaterialModalUnit(mat.defaultUnit);
                                setMaterialModalCategory(mat.category || 'Fitting & Sambungan');
                                setMaterialModalSpec(mat.standardDimension || '');
                                setShowMaterialModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Material"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMaterialToDelete(mat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {currentMaterialRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  Tidak ada material yang sesuai kriteria pencarian.
                </div>
              ) : (
                currentMaterialRecords.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {mat.id}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {mat.defaultUnit}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#00162d]">{mat.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Kategori: <span className="font-medium text-slate-700">{mat.category || 'Fitting & Sambungan'}</span>
                      </p>
                      <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                        Dimensi: {mat.standardDimension || '-'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMaterial(mat);
                          setMaterialModalName(mat.name);
                          setMaterialModalUnit(mat.defaultUnit);
                          setMaterialModalCategory(mat.category || 'Fitting & Sambungan');
                          setMaterialModalSpec(mat.standardDimension || '');
                          setShowMaterialModal(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialToDelete(mat)}
                        className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination for Material Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-500 text-center sm:text-left">
              <p>
                Menampilkan{' '}
                <span className="font-bold text-slate-700">
                  {filteredMaterials.length > 0
                    ? (materialCurrentPage - 1) * materialItemsPerPage + 1
                    : 0}
                  -{Math.min(materialCurrentPage * materialItemsPerPage, filteredMaterials.length)}
                </span>{' '}
                dari total <span className="font-bold text-slate-700">{filteredMaterials.length}</span>{' '}
                item material SOP
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMaterialCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={materialCurrentPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  {materialCurrentPage} / {totalMaterialPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMaterialCurrentPage((p) => Math.min(p + 1, totalMaterialPages))
                  }
                  disabled={materialCurrentPage === totalMaterialPages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TABEL 4: STANDAR AMBANG BATAS TEKANAN (PRESSURE THRESHOLDS) */}
      {/* ======================================================== */}
      {activeTab === 'pressure-thresholds' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-[#00162d] to-sky-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-indigo-800/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-heading font-bold text-base sm:text-lg text-white">
                      Standar Ambang Batas Tekanan Pipa (Pressure Thresholds)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-400/20 text-indigo-300 border border-indigo-400/40">
                      Master Data Terpusat
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl leading-relaxed">
                    Pengaturan rentang tekanan hidrolis optimal dan ambang batas kritis telemetri. Nilai yang Anda simpan di sini akan <strong>otomatis tersinkronisasi</strong> ke formulir <em>Input Inspeksi Lapangan</em>, penentuan status manometer (Normal / Warning / Kritis), dan monitoring dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleResetThresholdsToDefault}
                  disabled={isSavingThresholds}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default (3.5 - 6.5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveThresholds()}
                  disabled={isSavingThresholds}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingThresholds ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Konfigurasi Nilai Ambang Batas */}
          <form
            onSubmit={handleSaveThresholds}
            className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Formulir Parameter Ambang Batas Tekanan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan nilai batas bawah dan atas dalam satuan <strong>Bar</strong> (konversi PSI dihitung otomatis).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Field 1: Batas Minimum Optimal */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950">
                    Batas Minimum Optimal <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    ≈ {typeof minOptimalBar === 'number' ? (minOptimalBar * 14.5038).toFixed(1) : '0'} PSI
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="20"
                    value={minOptimalBar}
                    onChange={(e) =>
                      setMinOptimalBar(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="3.5"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    Bar
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-tight">
                  Mulai dari nilai ini, status manometer dinyatakan <strong>Normal (Stabil)</strong>.
                </p>
              </div>

              {/* Field 2: Batas Maksimum Optimal */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950">
                    Batas Maksimum Optimal <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    ≈ {typeof maxOptimalBar === 'number' ? (maxOptimalBar * 14.5038).toFixed(1) : '0'} PSI
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="20"
                    value={maxOptimalBar}
                    onChange={(e) =>
                      setMaxOptimalBar(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="6.5"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    Bar
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-tight">
                  Hingga nilai ini, tekanan pipa masih berada dalam zona <strong>Normal (Stabil)</strong>.
                </p>
              </div>

              {/* Field 3: Ambang Kritis Bawah (Drop) */}
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-950">
                    Batas Kritis Drop (&lt;)
                  </label>
                  <span className="text-[10px] font-bold font-mono text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                    ≈ {typeof minCriticalBar === 'number' ? (minCriticalBar * 14.5038).toFixed(1) : '0'} PSI
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="20"
                    value={minCriticalBar}
                    onChange={(e) =>
                      setMinCriticalBar(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="3.0"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    Bar
                  </span>
                </div>
                <p className="text-[10px] text-rose-800 leading-tight">
                  Bila tekanan di bawah nilai ini, sistem mengunci status <strong>Kritis (Tekanan Drop)</strong>.
                </p>
              </div>

              {/* Field 4: Ambang Kritis Atas (Surge) */}
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-950">
                    Batas Kritis Tekanan Atas (&gt;)
                  </label>
                  <span className="text-[10px] font-bold font-mono text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                    ≈ {typeof maxCriticalBar === 'number' ? (maxCriticalBar * 14.5038).toFixed(1) : '0'} PSI
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="30"
                    value={maxCriticalBar}
                    onChange={(e) =>
                      setMaxCriticalBar(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="7.0"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    Bar
                  </span>
                </div>
                <p className="text-[10px] text-rose-800 leading-tight">
                  Bila tekanan di atas nilai ini, sistem memicu alarm <strong>Kritis (Kelebihan Tekanan)</strong>.
                </p>
              </div>
            </div>

            {/* Nama Profil SOP & Catatan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Label Profil Standar Operasional
                </label>
                <input
                  type="text"
                  value={thresholdPresetName}
                  onChange={(e) => setThresholdPresetName(e.target.value)}
                  placeholder="Contoh: Standar Operasional Distribusi Pam Jaya 2026"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Teknis / Referensi Dokumen SOP
                </label>
                <input
                  type="text"
                  value={thresholdNotes}
                  onChange={(e) => setThresholdNotes(e.target.value)}
                  placeholder="Contoh: Mengacu pada SK Direksi No. 44/DIST/2025 batas transmisi utama"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Interactive Live Preview & Simulation Bar */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-800 flex items-center space-x-1.5">
                    <span>Visualisasi Skala Telemetri &amp; Simulator Uji Langsung</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Geser slider simulasi di bawah untuk melihat bagaimana formulir inspeksi mengklasifikasikan bacaan manometer dengan standar baru ini:
                  </p>
                </div>

                {/* Simulated Diagnostic Result */}
                {(() => {
                  const currentSimThresholds: PressureThresholdConfig = {
                    minOptimalBar: typeof minOptimalBar === 'number' ? minOptimalBar : 3.5,
                    maxOptimalBar: typeof maxOptimalBar === 'number' ? maxOptimalBar : 6.5,
                    minCriticalBar: typeof minCriticalBar === 'number' ? minCriticalBar : 3.0,
                    maxCriticalBar: typeof maxCriticalBar === 'number' ? maxCriticalBar : 7.0,
                  };
                  const simDiag = evaluatePressureStatus(testPressureValue, currentSimThresholds);
                  return (
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs text-slate-500 font-semibold">Hasil Diagnosa:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${simDiag.badgeClass}`}>
                        {simDiag.label}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Graphical Range Representation Bar */}
              <div className="space-y-1.5">
                <div className="h-5 w-full rounded-xl flex overflow-hidden shadow-inner border border-slate-300 text-[10px] font-bold text-white text-center">
                  <div
                    style={{ width: `${Math.min(100, Math.max(10, ((Number(minCriticalBar) || 3) / 10) * 100))}%` }}
                    className="bg-red-500 flex items-center justify-center truncate px-1"
                    title="Kritis Drop"
                  >
                    &lt; {minCriticalBar || 3} Bar
                  </div>
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          8,
                          (((Number(minOptimalBar) || 3.5) - (Number(minCriticalBar) || 3)) / 10) * 100
                        )
                      )}%`,
                    }}
                    className="bg-sky-400 flex items-center justify-center truncate px-1"
                    title="Peringatan Rendah"
                  >
                    Rendah
                  </div>
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          20,
                          (((Number(maxOptimalBar) || 6.5) - (Number(minOptimalBar) || 3.5)) / 10) * 100
                        )
                      )}%`,
                    }}
                    className="bg-emerald-500 flex items-center justify-center truncate px-1 text-white font-extrabold"
                    title="Batas Optimal (Stabil)"
                  >
                    OPTIMAL ({minOptimalBar || 3.5} - {maxOptimalBar || 6.5} Bar)
                  </div>
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          8,
                          (((Number(maxCriticalBar) || 7) - (Number(maxOptimalBar) || 6.5)) / 10) * 100
                        )
                      )}%`,
                    }}
                    className="bg-amber-400 flex items-center justify-center truncate px-1 text-amber-950 font-bold"
                    title="Peringatan Fluktuasi"
                  >
                    Tinggi
                  </div>
                  <div
                    style={{ flex: 1 }}
                    className="bg-red-600 flex items-center justify-center truncate px-1"
                    title="Kritis Surge"
                  >
                    &gt; {maxCriticalBar || 7} Bar
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-500">
                  <span>0.00 Bar (Min)</span>
                  <span className="text-emerald-700 font-bold">
                    Rentang Optimal: {minOptimalBar || 3.5} - {maxOptimalBar || 6.5} Bar
                  </span>
                  <span>10.00+ Bar (Max)</span>
                </div>
              </div>

              {/* Slider Simulator */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Geser Uji Manometer:</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    {testPressureValue.toFixed(2)} Bar (≈ {(testPressureValue * 14.5038).toFixed(1)} PSI)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.05"
                  value={testPressureValue}
                  onChange={(e) => setTestPressureValue(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                {effectiveThresholds.updatedAt ? (
                  <span>
                    Terakhir diperbarui:{' '}
                    <strong>{new Date(effectiveThresholds.updatedAt).toLocaleString('id-ID')}</strong>
                    {effectiveThresholds.updatedBy ? ` oleh ${effectiveThresholds.updatedBy}` : ''}
                  </span>
                ) : (
                  <span>Menggunakan pengaturan default sistem.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetThresholdsToDefault}
                  disabled={isSavingThresholds}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal / Reset
                </button>
                <button
                  type="submit"
                  disabled={isSavingThresholds}
                  className="py-2.5 px-6 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-md shadow-indigo-900/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingThresholds ? 'Menyimpan ke Master Data...' : 'Simpan Batas Tekanan'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL TAMBAH / EDIT AREA / ZONA (PC) */}
      {/* ======================================================== */}
      {showPCAreaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#00162d]">
                    {editingPCArea ? 'Edit Area / Zona (PC)' : 'Tambah Area / Zona (PC) Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Zona operasional induk yang membawahi titik-titik lokasi inspeksi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPCAreaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePCAreaSubmit} className="mt-4 space-y-4">
              {/* ID PC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kode / ID PC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pcModalId}
                    onChange={(e) => setPcModalId(e.target.value)}
                    placeholder="cth: PC 6"
                    disabled={editingPCArea !== null}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Warna Indikator Zona
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={pcModalColor}
                      onChange={(e) => setPcModalColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      {PC_COLOR_PRESETS.slice(0, 4).map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setPcModalColor(preset.value)}
                          className="w-5 h-5 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: preset.value }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nama Area / Zona */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Area / Zona <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={pcModalName}
                  onChange={(e) => setPcModalName(e.target.value)}
                  placeholder="cth: PC 6 - Sektor Selatan Pipa Transmisi"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white"
                  required
                />
              </div>

              {/* Wilayah / Region */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Wilayah / Cakupan Geografis
                </label>
                <input
                  type="text"
                  value={pcModalRegion}
                  onChange={(e) => setPcModalRegion(e.target.value)}
                  placeholder="cth: Jakarta Selatan & Depok Border"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              {/* Tekanan Nominal & Toleransi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Rekomendasi Tekanan (Bar)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={pcModalNominalBar}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPcModalNominalBar(val === '' ? '' : parseFloat(val));
                    }}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white placeholder:text-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Batas Toleransi (± Bar)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={pcModalToleranceBar}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPcModalToleranceBar(val === '' ? '' : parseFloat(val));
                    }}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white placeholder:text-slate-300"
                    required
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Deskripsi / Keterangan Operasional Jaringan
                </label>
                <textarea
                  rows={2}
                  value={pcModalDescription}
                  onChange={(e) => setPcModalDescription(e.target.value)}
                  placeholder="Penjelasan fungsi segmen pipa, jenis fluida, dan peruntukan zona..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPCAreaModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPC}
                  className="py-2.5 px-5 bg-[#00162d] hover:bg-[#00274e] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center space-x-1.5"
                >
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <span>{isSavingPC ? 'Menyimpan...' : 'Simpan Area (PC)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL KONFIRMASI HAPUS AREA / ZONA (PC) */}
      {/* ======================================================== */}
      {pcToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#00162d]">
                  Konfirmasi Hapus Area / Zona
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  {pcToDelete.id}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                Apakah Anda yakin ingin menghapus Area/Zona{' '}
                <strong className="text-slate-900 font-bold">&ldquo;{pcToDelete.name}&rdquo;</strong>?
              </p>

              {(locationsCountByPC[pcToDelete.id] || 0) > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Peringatan Relasi:</strong> Terdapat{' '}
                    <strong>{locationsCountByPC[pcToDelete.id]} titik lokasi</strong> yang saat ini berinduk
                    pada {pcToDelete.id}. Titik-titik tersebut perlu dialihkan atau diperbarui jika area ini dihapus.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeletingPC}
                onClick={() => setPcToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isDeletingPC}
                onClick={async () => {
                  try {
                    setIsDeletingPC(true);
                    if (onDeletePCArea) {
                      await onDeletePCArea(pcToDelete.id);
                    }
                    showToast(`Area/Zona "${pcToDelete.id}" berhasil dihapus.`, 'success');
                    setPcToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete PC area:', err);
                    showToast('Gagal menghapus Area PC.', 'warning');
                  } finally {
                    setIsDeletingPC(false);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-900/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingPC ? 'Menghapus...' : 'Ya, Hapus Area'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL KONFIRMASI HAPUS NAMA LOKASI */}
      {/* ======================================================== */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#00162d]">
                  Konfirmasi Hapus Titik Lokasi
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  {locationToDelete.id} • Induk: {locationToDelete.pcAreaId}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              Apakah Anda yakin ingin menghapus titik lokasi{' '}
              <strong className="text-slate-900 font-bold">&ldquo;{locationToDelete.title}&rdquo;</strong>{' '}
              (yang berinduk pada {locationToDelete.pcAreaId})? Data koordinat geofence akan dihapus secara permanen.
            </p>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeletingLocation}
                onClick={() => setLocationToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isDeletingLocation}
                onClick={async () => {
                  try {
                    setIsDeletingLocation(true);
                    await onDeleteLocation(locationToDelete.id);
                    showToast(`Titik "${locationToDelete.title}" berhasil dihapus.`, 'success');
                    setLocationToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete location:', err);
                    showToast('Gagal menghapus titik lokasi.', 'warning');
                  } finally {
                    setIsDeletingLocation(false);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-900/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingLocation ? 'Menghapus...' : 'Ya, Hapus Titik'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL TAMBAH / EDIT MATERIAL PERBAIKAN */}
      {/* ======================================================== */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#00162d]">
                    {editingMaterial ? 'Edit Material Perbaikan' : 'Tambah Jenis Material Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Katalog Resmi Suku Cadang &amp; Komponen Perbaikan SOP AETRA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!materialModalName.trim()) {
                  showToast('Nama jenis material wajib diisi.', 'warning');
                  return;
                }
                setIsSavingMaterial(true);
                try {
                  if (editingMaterial) {
                    if (onUpdateMaterial) {
                      await onUpdateMaterial({
                        ...editingMaterial,
                        name: materialModalName.trim(),
                        defaultUnit: materialModalUnit.trim() || 'bh (buah)',
                        category: materialModalCategory,
                        standardDimension: materialModalSpec.trim(),
                      });
                    }
                    showToast(`Material "${materialModalName}" berhasil diperbarui.`, 'success');
                  } else {
                    if (onAddMaterial) {
                      await onAddMaterial({
                        name: materialModalName.trim(),
                        defaultUnit: materialModalUnit.trim() || 'bh (buah)',
                        category: materialModalCategory,
                        standardDimension: materialModalSpec.trim(),
                      });
                    }
                    showToast(`Material baru "${materialModalName}" berhasil ditambahkan.`, 'success');
                  }
                  setShowMaterialModal(false);
                } catch (err) {
                  console.error('Error saving material:', err);
                  showToast('Gagal menyimpan material ke database.', 'warning');
                } finally {
                  setIsSavingMaterial(false);
                }
              }}
              className="space-y-4 pt-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Jenis Material <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={materialModalName}
                  onChange={(e) => setMaterialModalName(e.target.value)}
                  placeholder="Contoh: Coupler Electrofusion, Clamp Saddle HDPE"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori SOP
                  </label>
                  <select
                    value={materialModalCategory}
                    onChange={(e) => setMaterialModalCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-amber-500"
                  >
                    <option value="Fitting & Sambungan">Fitting &amp; Sambungan</option>
                    <option value="Pipa">Pipa Transmisi &amp; Distribusi</option>
                    <option value="Valve & Aksesoris">Valve &amp; Aksesoris</option>
                    <option value="Klem & Gasket">Klem &amp; Gasket</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Satuan Default <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={materialModalUnit}
                    onChange={(e) => setMaterialModalUnit(e.target.value)}
                    placeholder="Contoh: bh (buah), m (meter), unit, set"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Spesifikasi / Dimensi Standar
                </label>
                <input
                  type="text"
                  value={materialModalSpec}
                  onChange={(e) => setMaterialModalSpec(e.target.value)}
                  placeholder="Contoh: Ø 110 mm, DN 100 PN 16"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMaterial}
                  className="py-2.5 px-5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingMaterial ? 'Menyimpan...' : 'Simpan Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL KONFIRMASI HAPUS MATERIAL */}
      {/* ======================================================== */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#00162d]">
                  Konfirmasi Hapus Material
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {materialToDelete.id}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              Apakah Anda yakin ingin menghapus material{' '}
              <strong className="text-slate-900 font-bold">&ldquo;{materialToDelete.name}&rdquo;</strong>{' '}
              ({materialToDelete.standardDimension || materialToDelete.defaultUnit}) dari katalog resmi perbaikan?
            </p>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeletingMaterial}
                onClick={() => setMaterialToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isDeletingMaterial}
                onClick={async () => {
                  try {
                    setIsDeletingMaterial(true);
                    if (onDeleteMaterial) {
                      await onDeleteMaterial(materialToDelete.id);
                    }
                    showToast(`Material "${materialToDelete.name}" berhasil dihapus.`, 'success');
                    setMaterialToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete material:', err);
                    showToast('Gagal menghapus material.', 'warning');
                  } finally {
                    setIsDeletingMaterial(false);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-900/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingMaterial ? 'Menghapus...' : 'Ya, Hapus Material'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. GLOBAL TOAST NOTIFICATION */}
      {/* ======================================================== */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600'
              : 'bg-[#00162d]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-white" />
          ) : (
            <Info className="w-4 h-4 text-sky-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
