import {
  UserProfile,
  UserNotificationPreferences,
  PCArea,
  InspectionLocation,
  InspectionRecord,
  InspectionStatus,
  AppNotification,
  RepairMaterial,
  NetworkLeakageRecord,
  PressureThresholdConfig,
} from '../types/index.ts';
import { MAN_SILHOUETTE_AVATAR, WOMAN_SILHOUETTE_AVATAR, sanitizeAvatar } from '../constants/avatars.ts';

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  alertSurge: true,
  alertPatrol: true,
  alertAudio: false,
};

// Sample Pressure Gauge Images as high quality inline SVG Data URLs
export const SAMPLE_GAUGES = [
  {
    id: 'gauge-1',
    label: 'Manometer WIKA 0-10 Bar (Normal 4.85 Bar)',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    pressure: 4.85,
  },
  {
    id: 'gauge-2',
    label: 'Manometer Industri Dial Kuning (3.62 Bar)',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    pressure: 3.62,
  },
  {
    id: 'gauge-3',
    label: 'Pressure Gauge Digital SCADA (5.12 Bar)',
    url: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80',
    pressure: 5.12,
  },
];

export const DEFAULT_PC_AREAS: PCArea[] = [
  {
    id: 'PC 1',
    name: 'PC 1 - Sektor Utara (Transmisi Utama & Intake)',
    region: 'Jakarta Pusat & Utara',
    description: 'Jalur transmisi intake air baku dan pipa tekanan tinggi Pelabuhan Tanjung Priok',
    nominalPressureBar: 5.10,
    toleranceBar: 0.4,
    color: '#006591',
    activeNodesCount: 12,
  },
  {
    id: 'PC 2',
    name: 'PC 2 - Sektor Industri Barat (West Industrial Core)',
    region: 'Jakarta Selatan Core',
    description: 'Distribusi pipa koridor komersial Kuningan, Sudirman dan Rasuna Said',
    nominalPressureBar: 4.88,
    toleranceBar: 0.35,
    color: '#0284c7',
    activeNodesCount: 14,
  },
  {
    id: 'PC 3',
    name: 'PC 3 - Koridor Barat Ring-1 (Tomang & Slipi)',
    region: 'Koridor Barat Ring-1',
    description: 'Jalur pengatur tekanan PRV utama persimpangan Tomang ke Grogol',
    nominalPressureBar: 3.92,
    toleranceBar: 0.5,
    color: '#eab308',
    activeNodesCount: 8,
  },
  {
    id: 'PC 4',
    name: 'PC 4 - Koridor Timur Industri (Pulogadung & Cakung)',
    region: 'Koridor Timur Industri',
    description: 'Pipa transmisi baja 16-inch zona manufaktur dan logistik timur',
    nominalPressureBar: 4.65,
    toleranceBar: 0.3,
    color: '#10b981',
    activeNodesCount: 9,
  },
  {
    id: 'PC 5',
    name: 'PC 5 - Depo Pelabuhan & Terminal Marunda',
    region: 'Depo Pelabuhan & Terminal',
    description: 'Manifold penerimaan pesisir pantai utara & katup pelepas tekanan laut',
    nominalPressureBar: 4.72,
    toleranceBar: 0.25,
    color: '#6366f1',
    activeNodesCount: 5,
  },
];

export const DEFAULT_LOCATIONS: InspectionLocation[] = [
  {
    id: 'LOC-PC2-01',
    pcAreaId: 'PC 2',
    title: 'Sub-Stasiun Pipa Distribusi Utama PC-2B',
    subtitle: 'Katup Inlet Segmen 14 • West Line',
    latitude: -6.208821,
    longitude: 106.845612,
    radiusMeters: 75,
    valveType: 'Gate Valve DN400',
    createdAt: '2025-01-15',
  },
  {
    id: 'LOC-PC1-04',
    pcAreaId: 'PC 1',
    title: 'Check Valve Station CV-09 Utara',
    subtitle: 'Jalur Transmisi Ancol • Node N-03',
    latitude: -6.124501,
    longitude: 106.832940,
    radiusMeters: 50,
    valveType: 'Check Valve DN300',
    createdAt: '2025-01-18',
  },
  {
    id: 'LOC-PC3-11',
    pcAreaId: 'PC 3',
    title: 'Pressure Regulator Node Harmoni 02',
    subtitle: 'Stasiun Pengatur Penurunan Tekanan (PRV)',
    latitude: -6.166710,
    longitude: 106.819830,
    radiusMeters: 100,
    valveType: 'PRV Valve DN250',
    createdAt: '2025-01-20',
  },
  {
    id: 'LOC-PC4-08',
    pcAreaId: 'PC 4',
    title: 'Flange Gate Selatan Sektor TB Simatupang',
    subtitle: 'Saluran Tekanan Sedang 16-Inch',
    latitude: -6.298412,
    longitude: 106.812304,
    radiusMeters: 60,
    valveType: 'Butterfly Valve DN350',
    createdAt: '2025-02-01',
  },
  {
    id: 'LOC-PC5-03',
    pcAreaId: 'PC 5',
    title: 'Offtake Station Marunda Coastal Line',
    subtitle: 'Manifold Penerimaan Pesisir Katup 01',
    latitude: -6.098730,
    longitude: 106.963219,
    radiusMeters: 150,
    valveType: 'Ball Valve DN500',
    createdAt: '2025-02-10',
  },
  {
    id: 'LOC-PC1-01',
    pcAreaId: 'PC 1',
    title: 'Node Manometer PC-1A (Jl. Industri Raya KM 4)',
    subtitle: 'Pipa Utama Distribusi Industri Kemayoran',
    latitude: -6.214620,
    longitude: 106.845130,
    radiusMeters: 80,
    valveType: 'Gate Valve DN400',
    createdAt: '2025-02-14',
  },
  {
    id: 'LOC-PC2-05',
    pcAreaId: 'PC 2',
    title: 'Katup Valve KP-12 Rasuna Said',
    subtitle: 'Jalur Manifold Kuningan Timur',
    latitude: -6.223841,
    longitude: 106.831201,
    radiusMeters: 70,
    valveType: 'Control Valve DN300',
    createdAt: '2025-02-18',
  },
  {
    id: 'LOC-PC3-04',
    pcAreaId: 'PC 3',
    title: 'Manifold Utama Tomang Ring-1',
    subtitle: 'Jalur Transmisi Barat Km 12',
    latitude: -6.175110,
    longitude: 106.792450,
    radiusMeters: 90,
    valveType: 'Regulator DN300',
    createdAt: '2025-02-22',
  },
];

export const DEFAULT_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'INSP-2025-0891',
    date: '2025-10-24',
    time: '14:15',
    timestamp: Date.now() - 15 * 60 * 1000,
    pcAreaId: 'PC 2',
    locationId: 'LOC-PC2-05',
    locationTitle: 'Katup Valve KP-12 Rasuna Said',
    pressureBar: 4.95,
    pressurePsi: 71.79,
    unit: 'Bar',
    status: 'normal',
    statusLabel: 'Normal',
    inspectorId: 'NI-8841',
    inspectorName: 'Budi Santoso',
    inspectorInitials: 'BS',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    photoTag: 'PC-2B-MANO-12',
    latitude: -6.223841,
    longitude: 106.831201,
    gpsAccuracyMeters: 2.4,
    satelliteFix: 'RTK Fixed 99.8% (HDOP 0.6)',
    notes: 'Kondisi jarum stabil tanpa vibrasi getaran berlebih, paking katup kering tanpa rembesan oli/air.',
  },
  {
    id: 'INSP-2025-0890',
    date: '2025-10-24',
    time: '13:58',
    timestamp: Date.now() - 32 * 60 * 1000,
    pcAreaId: 'PC 3',
    locationId: 'LOC-PC3-04',
    locationTitle: 'Manifold Utama Tomang Ring-1',
    pressureBar: 3.62,
    pressurePsi: 52.50,
    unit: 'Bar',
    status: 'warning',
    statusLabel: 'Peringatan Rendah',
    inspectorId: 'NI-8842',
    inspectorName: 'Dimas Aditya',
    inspectorInitials: 'DA',
    photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoTag: 'PC-3A-MANO-02',
    latitude: -6.175110,
    longitude: 106.792450,
    gpsAccuracyMeters: 3.1,
    satelliteFix: 'GNSS 3D Fix (HDOP 0.9)',
    notes: 'Terdeteksi penurunan tekanan minor di sub-jalur barat, rekomendasikan pengecekan katup PRV cabang.',
  },
  {
    id: 'INSP-2025-0889',
    date: '2025-10-24',
    time: '13:42',
    timestamp: Date.now() - 48 * 60 * 1000,
    pcAreaId: 'PC 1',
    locationId: 'LOC-PC1-04',
    locationTitle: 'Regulator Sub-Stasiun Gambir',
    pressureBar: 5.12,
    pressurePsi: 74.26,
    unit: 'Bar',
    status: 'normal',
    statusLabel: 'Normal',
    inspectorId: 'NI-8843',
    inspectorName: 'Rian Hidayat',
    inspectorInitials: 'RH',
    photoUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80',
    photoTag: 'PC-1A-MANO-08',
    latitude: -6.175401,
    longitude: 106.827100,
    gpsAccuracyMeters: 2.8,
    satelliteFix: 'RTK Fixed 99.4% (HDOP 0.7)',
    notes: 'Tekanan optimal sesuai kurva hidrolik jam beban puncak siang hari.',
  },
  {
    id: 'INSP-2025-0888',
    date: '2025-10-24',
    time: '12:50',
    timestamp: Date.now() - 100 * 60 * 1000,
    pcAreaId: 'PC 5',
    locationId: 'LOC-PC5-03',
    locationTitle: 'Conduit Marunda Gate Valve-02',
    pressureBar: 4.72,
    pressurePsi: 68.45,
    unit: 'Bar',
    status: 'normal',
    statusLabel: 'Normal',
    inspectorId: 'NI-8844',
    inspectorName: 'Agus Lestari',
    inspectorInitials: 'AL',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    photoTag: 'PC-5A-MANO-03',
    latitude: -6.098730,
    longitude: 106.963219,
    gpsAccuracyMeters: 3.5,
    satelliteFix: 'GNSS Differential (HDOP 0.8)',
    notes: 'Kondisi katup pesisir terlumasi baik, proteksi katodik korosi aktif.',
  },
  {
    id: 'INSP-2025-0887',
    date: '2025-10-24',
    time: '11:20',
    timestamp: Date.now() - 190 * 60 * 1000,
    pcAreaId: 'PC 4',
    locationId: 'LOC-PC4-08',
    locationTitle: 'Flange Pipa Kawasan Pulogadung',
    pressureBar: 4.68,
    pressurePsi: 67.87,
    unit: 'Bar',
    status: 'normal',
    statusLabel: 'Normal',
    inspectorId: 'NI-8845',
    inspectorName: 'Eko Prasetyo',
    inspectorInitials: 'EP',
    photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoTag: 'PC-4B-MANO-01',
    latitude: -6.195612,
    longitude: 106.912300,
    gpsAccuracyMeters: 2.1,
    satelliteFix: 'RTK Fixed 99.6% (HDOP 0.65)',
    notes: 'Jalur industri stabil, indikator jarum manometer jelas terbaca.',
  },
];

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-inspector-1',
    name: 'Budi Santoso, S.T.',
    email: 'budi.santoso@network.id',
    role: 'inspector',
    avatar: MAN_SILHOUETTE_AVATAR,
    inspectorId: 'INS-2024-089',
    department: 'Divisi Pemeliharaan Jaringan & Telemetri Lapangan',
    phone: '+62 812-3456-7890',
    verified: true,
    activeSector: 'Sektor Barat (PC 1 & PC 2)',
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  },
  {
    id: 'user-manager-1',
    name: 'Hendra Wijaya, S.T., M.Eng.',
    email: 'manager@network.id',
    role: 'manager',
    avatar: MAN_SILHOUETTE_AVATAR,
    inspectorId: 'MGR-1042',
    department: 'Direktorat Pengawasan Aset & Manajemen Jaringan SCADA',
    phone: '+62 811-9876-5432',
    verified: true,
    activeSector: 'Pusat Kontrol SCADA Metropolitan',
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  },
];

const STORAGE_KEYS = {
  CURRENT_USER: 'network_inspector_current_user',
  USERS: 'network_inspector_users_list',
  PC_AREAS: 'network_inspector_pc_areas',
  LOCATIONS: 'network_inspector_locations',
  INSPECTIONS: 'network_inspector_inspections',
  NOTIFICATIONS: 'network_inspector_notifications',
  NOTIF_PREFS_PREFIX: 'network_inspector_notif_prefs_',
};

// Storage helper functions
export const storage = {
  getNotificationPreferences(userId?: string): UserNotificationPreferences {
    try {
      const key = userId
        ? `${STORAGE_KEYS.NOTIF_PREFS_PREFIX}${userId}`
        : `${STORAGE_KEYS.NOTIF_PREFS_PREFIX}default`;
      const data = localStorage.getItem(key);
      if (data) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  },

  saveNotificationPreferences(
    userId: string | undefined,
    prefs: UserNotificationPreferences
  ) {
    try {
      const key = userId
        ? `${STORAGE_KEYS.NOTIF_PREFS_PREFIX}${userId}`
        : `${STORAGE_KEYS.NOTIF_PREFS_PREFIX}default`;
      localStorage.setItem(key, JSON.stringify(prefs));

      // Also keep cached user profile in sync
      const cached = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (cached) {
        const u = JSON.parse(cached);
        if (!userId || u.id === userId) {
          u.notifications = prefs;
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(u));
        }
      }

      // Also keep network_inspector_cached_user in sync
      const appCached = localStorage.getItem('network_inspector_cached_user');
      if (appCached) {
        const u = JSON.parse(appCached);
        if (!userId || u.id === userId) {
          u.notifications = prefs;
          localStorage.setItem('network_inspector_cached_user', JSON.stringify(u));
        }
      }
    } catch {
      // fallback
    }
  },

  getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        const user: UserProfile = JSON.parse(data);
        const cleanAvatar = sanitizeAvatar(user.avatar, user.role, user.name);
        let changed = false;
        if (cleanAvatar !== user.avatar) {
          user.avatar = cleanAvatar;
          changed = true;
        }
        if (!user.notifications) {
          user.notifications = storage.getNotificationPreferences(user.id);
          changed = true;
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        }
        return user;
      }
    } catch {
      // fallback
    }
    // Default to Budi Santoso
    return DEFAULT_USERS[0];
  },

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      const cleanUser: UserProfile = {
        ...user,
        avatar: sanitizeAvatar(user.avatar, user.role, user.name),
        notifications: user.notifications || storage.getNotificationPreferences(user.id),
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cleanUser));
      if (cleanUser.notifications) {
        storage.saveNotificationPreferences(cleanUser.id, cleanUser.notifications);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        const users: UserProfile[] = JSON.parse(data);
        return users.map((u) => ({
          ...u,
          avatar: sanitizeAvatar(u.avatar, u.role, u.name),
        }));
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  saveUsers(users: UserProfile[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getPCAreas(): PCArea[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PC_AREAS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.PC_AREAS, JSON.stringify(DEFAULT_PC_AREAS));
    return DEFAULT_PC_AREAS;
  },

  savePCAreas(areas: PCArea[]) {
    localStorage.setItem(STORAGE_KEYS.PC_AREAS, JSON.stringify(areas));
  },

  getLocations(): InspectionLocation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(DEFAULT_LOCATIONS));
    return DEFAULT_LOCATIONS;
  },

  saveLocations(locs: InspectionLocation[]) {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locs));
  },

  addLocation(loc: Omit<InspectionLocation, 'id' | 'createdAt'>): InspectionLocation {
    const locs = this.getLocations();
    const countInPC = locs.filter(l => l.pcAreaId === loc.pcAreaId).length + 1;
    const cleanPcId = loc.pcAreaId.replace(/\s+/g, '');
    const newId = `LOC-${cleanPcId}-${countInPC < 10 ? '0' : ''}${countInPC}`;
    const newLocation: InspectionLocation = {
      ...loc,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    locs.unshift(newLocation);
    this.saveLocations(locs);
    return newLocation;
  },

  deleteLocation(id: string) {
    const locs = this.getLocations().filter(l => l.id !== id);
    this.saveLocations(locs);
  },

  getInspections(): InspectionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(DEFAULT_INSPECTIONS));
    return DEFAULT_INSPECTIONS;
  },

  saveInspections(items: InspectionRecord[]) {
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(items));
  },

  addInspection(item: Omit<InspectionRecord, 'id' | 'date' | 'time' | 'timestamp'>): InspectionRecord {
    const items = this.getInspections();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `INSP-${year}-${randomNum}`;
    
    const newRecord: InspectionRecord = {
      ...item,
      id: newId,
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
      timestamp: now.getTime(),
    };

    items.unshift(newRecord);
    this.saveInspections(items);
    return newRecord;
  },

  deleteInspection(id: string) {
    const items = this.getInspections().filter(i => i.id !== id);
    this.saveInspections(items);
  },

  exportToCSV(records: InspectionRecord[], filename = 'Laporan_Inspeksi_Tekanan_Pipa.csv') {
    const headers = [
      'ID Inspeksi',
      'Tanggal',
      'Jam (WIB)',
      'PC Area',
      'Lokasi Titik',
      'Tekanan (Bar)',
      'Tekanan (PSI)',
      'Status',
      'Petugas Lapangan',
      'ID Petugas',
      'Latitude',
      'Longitude',
      'Akurasi GPS (m)',
      'Foto Watermark Tag',
      'Catatan Kondisi',
    ];

    const rows = records.map(r => [
      r.id,
      r.date,
      r.time,
      r.pcAreaId,
      `"${r.locationTitle.replace(/"/g, '""')}"`,
      r.pressureBar.toFixed(2),
      r.pressurePsi.toFixed(2),
      r.statusLabel,
      `"${r.inspectorName.replace(/"/g, '""')}"`,
      r.inspectorId,
      r.latitude.toFixed(6),
      r.longitude.toFixed(6),
      r.gpsAccuracyMeters.toFixed(1),
      r.photoTag,
      `"${(r.notes || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// Default pressure thresholds based on municipal water distribution standards (AETRA / PAM / AWWA)
export const DEFAULT_PRESSURE_THRESHOLDS: PressureThresholdConfig = {
  id: 'pressure_thresholds',
  minOptimalBar: 3.5,
  maxOptimalBar: 6.5,
  minCriticalBar: 3.0,
  maxCriticalBar: 7.0,
  presetName: 'Standar Distribusi Perkotaan / PAM (3.5 - 6.5 Bar)',
  notes: 'Standar teknis distribusi air perpipaan menjaga sisa tekan pelanggan optimal tanpa membebani kekuatan sambungan pipa.',
};

// Pressure calculation logic with dynamic thresholds support
export function evaluatePressureStatus(
  bar: number,
  thresholds: PressureThresholdConfig = DEFAULT_PRESSURE_THRESHOLDS
): {
  status: InspectionStatus;
  label: string;
  badgeClass: string;
} {
  const minOpt = typeof thresholds?.minOptimalBar === 'number' ? thresholds.minOptimalBar : 3.5;
  const maxOpt = typeof thresholds?.maxOptimalBar === 'number' ? thresholds.maxOptimalBar : 6.5;
  const minCrit = typeof thresholds?.minCriticalBar === 'number' ? thresholds.minCriticalBar : Math.max(0, minOpt - 0.5);
  const maxCrit = typeof thresholds?.maxCriticalBar === 'number' ? thresholds.maxCriticalBar : maxOpt + 0.5;

  if (bar < minCrit) {
    return {
      status: 'critical',
      label: 'Kritis (Tekanan Drop)',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    };
  }
  if (bar > maxCrit) {
    return {
      status: 'critical',
      label: 'Kritis (Surge Berlebih)',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    };
  }
  if (bar < minOpt) {
    return {
      status: 'warning',
      label: 'Peringatan Rendah',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    };
  }
  if (bar > maxOpt) {
    return {
      status: 'warning',
      label: 'Peringatan Fluktuasi Tinggi',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  return {
    status: 'normal',
    label: 'Normal (Stabil)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
}

// Default Catalog of Repair Materials matching SOP AETRA
export const DEFAULT_REPAIR_MATERIALS: RepairMaterial[] = [
  {
    id: 'MAT-01',
    name: 'Coupler Electrofusion',
    defaultUnit: 'bh (buah)',
    category: 'Fitting & Sambungan',
    standardDimension: 'Ø 110 mm',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-02',
    name: 'Clamp Saddle HDPE',
    defaultUnit: 'bh (buah)',
    category: 'Fitting & Sambungan',
    standardDimension: 'Ø 110 mm x 1/2"',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-03',
    name: 'Gibault Joint Cast Iron',
    defaultUnit: 'bh (buah)',
    category: 'Fitting & Sambungan',
    standardDimension: 'Ø 150 mm (6")',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-04',
    name: 'Pipa HDPE SDR 17 PN 10',
    defaultUnit: 'm (meter)',
    category: 'Pipa',
    standardDimension: 'Ø 110 mm (4")',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-05',
    name: 'Pipa PVC High Impact SNI',
    defaultUnit: 'm (meter)',
    category: 'Pipa',
    standardDimension: 'Ø 90 mm (3")',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-06',
    name: 'Mechanical Repair Clamp SS 304',
    defaultUnit: 'bh (buah)',
    category: 'Klem & Gasket',
    standardDimension: 'Ø 110 mm (Panjang 200 mm)',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-07',
    name: 'Flange Adaptor Universal',
    defaultUnit: 'bh (buah)',
    category: 'Fitting & Sambungan',
    standardDimension: 'DN 100 PN 16',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-08',
    name: 'Gate Valve Resilient Seated',
    defaultUnit: 'unit',
    category: 'Valve & Aksesoris',
    standardDimension: 'DN 100 PN 16',
    createdAt: '2025-01-10',
  },
  {
    id: 'MAT-09',
    name: 'Rubber Gasket EPDM',
    defaultUnit: 'lembar',
    category: 'Klem & Gasket',
    standardDimension: 'Tebal 3 mm (PN 16)',
    createdAt: '2025-01-10',
  },
];

const getRelativeDateISO = (daysAgo: number): string => {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Sample default leakage records matching Image 1 (1).jpg with relative dates for dynamic Day/Week/Month testing
export const DEFAULT_LEAKAGE_RECORDS: NetworkLeakageRecord[] = [
  {
    id: 'LEAK-2026-0012',
    inspectionDate: getRelativeDateISO(0),
    repairDate: getRelativeDateISO(0),
    repairStartTime: '14:30',
    repairEndTime: '16:45',
    shutOffStartTime: '--:--',
    shutOffEndTime: '--:--',
    isShutOffOccurred: false,
    reporterInspector: 'Dadang Marbono / Bondan Setiawan',
    reportReceivedTime: `${getRelativeDateISO(0)} - 13:50 WIB`,
    leakLocationDetail: 'Jl. Raya Pasar Kemis - Rajeg (PC 1)',
    latitude: -6.182942,
    longitude: 106.531205,
    gpsAccuracyMeters: 4.2,
    initialReportNotes: 'Kebocoran pipa distribusi utama, rembesan deras ke bahu jalan',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    photoBeforeTimestamp: `${getRelativeDateISO(0)} 14:15 WIB`,
    photoAfterUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoAfterTimestamp: `${getRelativeDateISO(0)} 16:50 WIB`,
    pipeType: 'Primer',
    pipeDiameter: 'Ø 110 mm',
    physicalInspectionResult: 'Bocor pipa Ø 110 terkena besi patok bekisting jalan',
    inspectionNotes: 'Keterangan: Diidentifikasi terjadi retakan lateral akibat penetrasi beban konstruksi eksternal.',
    repairActionTaken: 'Diperbaiki menggunakan coupler electrofusion Ø 110 mm',
    mitigationNotes: 'Metode penyambungan electrofusion coupling dengan pendinginan standar 30 menit.',
    materialsUsed: [
      {
        id: 'mat-used-1',
        materialId: 'MAT-01',
        materialName: 'Coupler Electrofusion',
        specification: 'Ø 110 mm',
        quantity: 1,
        unit: 'bh (buah)',
      },
    ],
    sopReference: 'SOP: AAT/DIST/FM-02',
    status: 'Selesai',
    createdBy: 'Dadang Marbono',
    createdAt: getRelativeDateISO(0),
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'LEAK-2026-0015',
    inspectionDate: getRelativeDateISO(2),
    repairDate: getRelativeDateISO(2),
    repairStartTime: '09:15',
    repairEndTime: '11:45',
    shutOffStartTime: '--:--',
    shutOffEndTime: '--:--',
    isShutOffOccurred: false,
    reporterInspector: 'Bondan Setiawan, S.T.',
    reportReceivedTime: `${getRelativeDateISO(2)} - 08:30 WIB`,
    leakLocationDetail: 'Jalur Distribusi Kuningan Barat Segmen 14 (PC 2)',
    latitude: -6.223841,
    longitude: 106.831201,
    gpsAccuracyMeters: 3.1,
    initialReportNotes: 'Rembesan tekanan tinggi pada flange sambungan dekat valve KP-12',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoBeforeTimestamp: `${getRelativeDateISO(2)} 09:00 WIB`,
    photoAfterUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80',
    photoAfterTimestamp: `${getRelativeDateISO(2)} 11:55 WIB`,
    pipeType: 'Sekunder',
    pipeDiameter: 'Ø 110 mm',
    physicalInspectionResult: 'Klem eksisting aus terkena getaran beban lalu lintas jalan protokol',
    inspectionNotes: 'Pipa tidak retak, hanya seal klem lepas sebagian.',
    repairActionTaken: 'Pemasangan Mechanical Repair Clamp SS 304 & Gasket EPDM baru',
    mitigationNotes: 'Torsi baut dikencangkan sesuai spesifikasi teknis 85 Nm.',
    materialsUsed: [
      {
        id: 'mat-used-2',
        materialId: 'MAT-06',
        materialName: 'Mechanical Repair Clamp SS 304',
        specification: 'Ø 110 mm (Panjang 200 mm)',
        quantity: 1,
        unit: 'bh (buah)',
      },
      {
        id: 'mat-used-3',
        materialId: 'MAT-09',
        materialName: 'Rubber Gasket EPDM',
        specification: 'Tebal 3 mm (PN 16)',
        quantity: 1,
        unit: 'lembar',
      },
    ],
    sopReference: 'SOP: AAT/DIST/FM-02',
    status: 'Selesai',
    createdBy: 'Bondan Setiawan',
    createdAt: getRelativeDateISO(2),
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'LEAK-2026-0018',
    inspectionDate: getRelativeDateISO(4),
    repairDate: getRelativeDateISO(4),
    repairStartTime: '10:00',
    repairEndTime: '13:30',
    shutOffStartTime: '10:15',
    shutOffEndTime: '12:45',
    isShutOffOccurred: true,
    reporterInspector: 'Rian Hidayat',
    reportReceivedTime: `${getRelativeDateISO(4)} - 09:10 WIB`,
    leakLocationDetail: 'Manifold Tomang Ring-1 Barat (PC 3)',
    latitude: -6.175110,
    longitude: 106.792450,
    gpsAccuracyMeters: 2.8,
    initialReportNotes: 'Tekanan drop mendadak, air meluap di saluran drainase Tomang',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80',
    photoBeforeTimestamp: `${getRelativeDateISO(4)} 09:40 WIB`,
    photoAfterUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    photoAfterTimestamp: `${getRelativeDateISO(4)} 13:45 WIB`,
    pipeType: 'Tersier',
    pipeDiameter: 'Ø 90 mm',
    physicalInspectionResult: 'Pipa PVC lama pecah longitudinal akibat deformasi tanah',
    inspectionNotes: 'Segmen rusak 2.5 meter dipotong dan diganti pipa HDPE baru.',
    repairActionTaken: 'Penyambungan pipa HDPE SDR 17 PN 10 dengan 2 unit coupler',
    mitigationNotes: 'Uji tekan hidrostatik 6 Bar selama 15 menit nihil rembesan.',
    materialsUsed: [
      {
        id: 'mat-used-4',
        materialId: 'MAT-04',
        materialName: 'Pipa HDPE SDR 17 PN 10',
        specification: 'Ø 110 mm (4")',
        quantity: 3,
        unit: 'm (meter)',
      },
      {
        id: 'mat-used-5',
        materialId: 'MAT-01',
        materialName: 'Coupler Electrofusion',
        specification: 'Ø 110 mm',
        quantity: 2,
        unit: 'bh (buah)',
      },
    ],
    sopReference: 'SOP: AAT/DIST/FM-03',
    status: 'Diverifikasi',
    createdBy: 'Rian Hidayat',
    createdAt: getRelativeDateISO(4),
    timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'LEAK-2026-0021',
    inspectionDate: getRelativeDateISO(10),
    repairDate: getRelativeDateISO(10),
    repairStartTime: '15:10',
    repairEndTime: '17:40',
    shutOffStartTime: '--:--',
    shutOffEndTime: '--:--',
    isShutOffOccurred: false,
    reporterInspector: 'Eko Prasetyo, S.T.',
    reportReceivedTime: `${getRelativeDateISO(10)} - 14:20 WIB`,
    leakLocationDetail: 'Flange Pipa Kawasan Pulogadung Blok B (PC 4)',
    latitude: -6.195612,
    longitude: 106.912300,
    gpsAccuracyMeters: 3.5,
    initialReportNotes: 'Penurunan tekanan pada pipa transmisi baja kawasan industri',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    photoBeforeTimestamp: `${getRelativeDateISO(10)} 14:50 WIB`,
    photoAfterUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoAfterTimestamp: `${getRelativeDateISO(10)} 17:50 WIB`,
    pipeType: 'Primer',
    pipeDiameter: 'Ø 150 mm',
    physicalInspectionResult: 'Baut sambungan flange berkarat dan paking aus',
    inspectionNotes: 'Korosi atmosferik industri kimia ringan.',
    repairActionTaken: 'Penggantian Gibault Joint Cast Iron Ø 150 mm',
    mitigationNotes: 'Dilapisi proteksi aspal dingin dan isolasi pelindung karat.',
    materialsUsed: [
      {
        id: 'mat-used-6',
        materialId: 'MAT-03',
        materialName: 'Gibault Joint Cast Iron',
        specification: 'Ø 150 mm (6")',
        quantity: 1,
        unit: 'bh (buah)',
      },
    ],
    sopReference: 'SOP: AAT/DIST/FM-02',
    status: 'Selesai',
    createdBy: 'Eko Prasetyo',
    createdAt: getRelativeDateISO(10),
    timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'LEAK-2026-0024',
    inspectionDate: getRelativeDateISO(18),
    repairDate: getRelativeDateISO(18),
    repairStartTime: '08:30',
    repairEndTime: '10:50',
    shutOffStartTime: '--:--',
    shutOffEndTime: '--:--',
    isShutOffOccurred: false,
    reporterInspector: 'Agus Lestari',
    reportReceivedTime: `${getRelativeDateISO(18)} - 07:50 WIB`,
    leakLocationDetail: 'Jalur Conduit Marunda Gate Valve-02 (PC 5)',
    latitude: -6.098730,
    longitude: 106.963219,
    gpsAccuracyMeters: 2.5,
    initialReportNotes: 'Rembesan air payau di sekitar pelindung katup laut',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    photoBeforeTimestamp: `${getRelativeDateISO(18)} 08:15 WIB`,
    photoAfterUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80',
    photoAfterTimestamp: `${getRelativeDateISO(18)} 11:00 WIB`,
    pipeType: 'Sekunder',
    pipeDiameter: 'Ø 110 mm',
    physicalInspectionResult: 'Klem cabang aus akibat salinitas air laut pesisir',
    inspectionNotes: 'Dipasang clamp saddle baru tahan korosi.',
    repairActionTaken: 'Pemasangan Clamp Saddle HDPE Ø 110 mm x 1/2"',
    mitigationNotes: 'Pengecekan anoda korban proteksi katodik di area manifold.',
    materialsUsed: [
      {
        id: 'mat-used-7',
        materialId: 'MAT-02',
        materialName: 'Clamp Saddle HDPE',
        specification: 'Ø 110 mm x 1/2"',
        quantity: 1,
        unit: 'bh (buah)',
      },
    ],
    sopReference: 'SOP: AAT/DIST/FM-02',
    status: 'Selesai',
    createdBy: 'Agus Lestari',
    createdAt: getRelativeDateISO(18),
    timestamp: Date.now() - 18 * 24 * 60 * 60 * 1000,
  },
];
