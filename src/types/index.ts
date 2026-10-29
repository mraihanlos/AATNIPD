export type UserRole = 'inspector' | 'manager';

export interface UserNotificationPreferences {
  alertSurge: boolean; // Peringatan Surge Tekanan (> 4.8 BAR)
  alertPatrol: boolean; // Pengingat Jadwal Patroli
  alertAudio: boolean; // Suara Peringatan Audio
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  inspectorId: string;
  department: string;
  phone?: string;
  verified: boolean;
  activeSector: string;
  notifications?: UserNotificationPreferences;
}

export interface PCArea {
  id: string; // 'PC 1' | 'PC 2' | 'PC 3' | 'PC 4' | 'PC 5'
  name: string;
  region: string;
  description: string;
  nominalPressureBar: number;
  toleranceBar: number;
  color: string;
  activeNodesCount: number;
  pipeCount?: number;
  totalLengthKm?: number;
  source?: string;
}

export interface InspectionLocation {
  id: string; // e.g. 'LOC-PC2-01'
  pcAreaId: string; // e.g. 'PC 2'
  title: string; // e.g. 'Sub-Stasiun Pipa Distribusi Utama PC-2B'
  subtitle: string; // e.g. 'Katup Inlet Segmen 14 • West Line'
  latitude: number;
  longitude: number;
  radiusMeters: number; // Geofence radius in meters, default 75m
  valveType?: string;
  nominalPressure?: number;
  createdAt: string;
}

export type InspectionStatus = 'normal' | 'warning' | 'critical';

export interface InspectionRecord {
  id: string; // e.g. 'INSP-2025-0891'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number;
  pcAreaId: string; // 'PC 1' .. 'PC 5'
  locationId: string;
  locationTitle: string;
  pressureBar: number;
  pressurePsi: number;
  unit: 'Bar' | 'PSI';
  status: InspectionStatus;
  statusLabel: string; // 'Normal' | 'Peringatan Rendah' | 'Peringatan Tinggi' | 'Kritis'
  inspectorId: string;
  inspectorName: string;
  inspectorAvatar?: string;
  inspectorInitials: string;
  photoUrl: string;
  photoTag: string; // e.g. 'PC-1A-MANO-04'
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  satelliteFix: string; // e.g. 'RTK Fixed 99.4% (HDOP 0.7)'
  notes?: string;
}

export interface TelemetrySummary {
  averagePressureBar: number;
  averagePressureTrend: number; // e.g. +0.12
  totalPointsToday: number;
  targetPointsToday: number;
  warningLocationsCount: number;
  warningPC: string; // e.g. 'PC-3'
  criticalAnomaliesCount: number;
  pipeIntegrityPercentage: number;
  stabilityIndex: number; // e.g. 96
  syncAgoSeconds: number;
  latencyMs: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  time: string;
  read: boolean;
}

export interface RepairMaterial {
  id: string; // e.g. 'MAT-01'
  name: string; // e.g. 'Coupler Electrofusion'
  defaultUnit: string; // e.g. 'bh (buah)', 'm (meter)', 'unit', 'set'
  unit?: string;
  category?: string; // e.g. 'Fitting & Sambungan', 'Pipa', 'Valve & Aksesoris', 'Klem & Gasket'
  standardDimension?: string; // e.g. 'Ø 110 mm', 'Ø 90 mm', 'DN 400'
  defaultSpec?: string;
  createdAt?: string;
}

export interface LeakageMaterialUsed {
  id: string;
  materialId?: string;
  materialName: string; // e.g. 'Coupler Electrofusion'
  specification: string; // e.g. 'Ø 110 mm'
  quantity: number; // e.g. 1
  unit: string; // e.g. 'bh (buah)'
}

export interface NetworkLeakageRecord {
  id: string; // e.g. 'LEAK-2026-0089'
  // 1. Jadwal Pemeriksaan & Pelaksanaan Pekerjaan
  inspectionDate: string; // Tgl / Pemeriksaan (YYYY-MM-DD or DD/MM/YYYY)
  repairDate: string; // Tgl / Perbaikan
  repairStartTime: string; // Waktu Perbaikan Mulai (e.g. '16:00')
  repairEndTime: string; // Waktu Perbaikan Selesai (e.g. '18:00')
  shutOffStartTime?: string; // Waktu Mati Aliran (Shut Off)
  shutOffEndTime?: string; // e.g. '--:--'
  isShutOffOccurred?: boolean;

  // 2. Data Administrasi & Lokasi Kebocoran
  reporterInspector: string; // Pelapor / Pengawas Lapangan
  reportReceivedTime: string; // Tanggal / Waktu Laporan Masuk (e.g. '11/10/2026 - 15:30 WIB')
  zona?: 'Zona 1' | 'Zona 2' | string; // Zona 1 atau Zona 2
  leakLocationDetail: string; // Lokasi Kebocoran Detail (Sesuai Berita Acara) *
  latitude: number; // Synchronized when photo "Sebelum" is taken
  longitude: number; // Synchronized when photo "Sebelum" is taken
  gpsAccuracyMeters?: number;
  initialReportNotes: string; // Isi Laporan / Keterangan Awal

  // 3. Dokumentasi Foto Kebocoran & Perbaikan
  photoBeforeUrl: string; // Foto Sebelum Perbaikan (Before) *
  photoBeforeTimestamp?: string;
  photoAfterUrl: string; // Foto Setelah Perbaikan (After) *
  photoAfterTimestamp?: string;

  // 4. Hasil Pemeriksaan & Tindakan Perbaikan
  pipeType?: 'Primer' | 'Sekunder' | 'Tersier' | string; // Tipe Pipa: Primer / Sekunder / Tersier
  physicalInspectionResult: string; // Hasil Pemeriksaan Fisik Pipa *
  inspectionNotes?: string; // Catatan Lapangan / Keterangan
  repairActionTaken: string; // Tindakan Perbaikan yang Dilakukan *
  mitigationNotes?: string; // Tindakan Mitigasi / Keterangan
  estimasiNRW?: string; // Estimasi NRW (Potensi Kehilangan Air, e.g., '12.5 m³/jam')

  // 5. Penggunaan Material Perbaikan
  materialsUsed: LeakageMaterialUsed[];
  pipeDiameter?: string;
  pipeMaterial?: string;

  // Metadata
  pcAreaId?: string; // e.g. 'PC 1' | 'PC 2'
  sopReference?: string; // e.g. 'SOP: AAT/DIST/FM-02'
  status?: 'Baru' | 'Selesai' | 'Diverifikasi';
  createdBy?: string;
  createdAt: string;
  timestamp: number;
}

export type RepairMaterialItem = RepairMaterial;

export interface LeakReportMaterial {
  materialId?: string;
  materialName: string;
  spec: string;
  quantity: number;
  unit: string;
}

export interface LeakReport {
  id: string;
  reportNo: string;
  department: string;
  zoneArea: string;
  workStatus: string;
  inspectionDate: string;
  repairDate: string;
  repairTimeStart: string;
  repairTimeEnd: string;
  shutOffTimeStart?: string;
  shutOffTimeEnd?: string;
  reporterName: string;
  reportReceivedAt: string;
  leakLocationDetail: string;
  latitude: number;
  longitude: number;
  initialReportNotes?: string;
  photoBeforeUrl: string;
  photoBeforeTag?: string;
  photoBeforeTimestamp?: string;
  photoAfterUrl?: string;
  photoAfterTag?: string;
  photoAfterTimestamp?: string;
  physicalInspectionResult: string;
  physicalInspectionNotes?: string;
  repairActionTaken: string;
  repairActionNotes?: string;
  materials: LeakReportMaterial[];
  status?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  timestamp?: number;
}

export interface PressureThresholdConfig {
  id?: string;
  minOptimalBar: number; // e.g. 3.5
  maxOptimalBar: number; // e.g. 6.5
  minCriticalBar: number; // e.g. 3.0 (drop)
  maxCriticalBar: number; // e.g. 7.0 (surge)
  presetName?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

