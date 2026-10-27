/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, testFirestoreConnection } from './services/firebase.ts';
import { firebaseService } from './services/firebaseService.ts';
import {
  UserProfile,
  PCArea,
  InspectionLocation,
  InspectionRecord,
  RepairMaterial,
  NetworkLeakageRecord,
  PressureThresholdConfig,
} from './types/index.ts';
import { DEFAULT_PRESSURE_THRESHOLDS, DEFAULT_LEAKAGE_RECORDS, storage } from './services/storage.ts';
import {
  MAN_SILHOUETTE_AVATAR,
  WOMAN_SILHOUETTE_AVATAR,
  sanitizeAvatar,
} from './constants/avatars.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { InspectionInputView } from './components/InspectionInputView.tsx';
import { NetworkLeakageInputView } from './components/NetworkLeakageInputView.tsx';
import { MasterDataView } from './components/MasterDataView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { InspectionDetailModal } from './components/InspectionDetailModal.tsx';
import { CADModal } from './components/CADModal.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { MobileDrawer } from './components/MobileDrawer.tsx';
import { Wrench, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('network_inspector_cached_user');
      if (saved) {
        const u = JSON.parse(saved);
        u.avatar = sanitizeAvatar(u.avatar, u.role, u.name);
        if (!u.notifications) {
          u.notifications = storage.getNotificationPreferences(u.id);
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [authChecking, setAuthChecking] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('network_inspector_cached_user');
    } catch {
      return true;
    }
  });

  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'input' | 'leakage' | 'master' | 'profile'
  >(() => {
    try {
      const savedTab = sessionStorage.getItem('network_inspector_active_tab');
      return (savedTab as any) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Keep active tab in sessionStorage so mobile camera backgrounding returns to same tab
  useEffect(() => {
    try {
      sessionStorage.setItem('network_inspector_active_tab', currentTab);
    } catch {
      // ignore
    }
  }, [currentTab]);

  // Dynamic state populated directly from Firestore with local cache backup
  const [pcAreas, setPCAreas] = useState<PCArea[]>(() => {
    try {
      const cached = storage.getPCAreas();
      return cached && cached.length > 0 ? cached : [];
    } catch {
      return [];
    }
  });
  const [locations, setLocations] = useState<InspectionLocation[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [materials, setMaterials] = useState<RepairMaterial[]>([]);
  const [leakageRecords, setLeakageRecords] =
    useState<NetworkLeakageRecord[]>(DEFAULT_LEAKAGE_RECORDS);
  const [pressureThresholds, setPressureThresholds] =
    useState<PressureThresholdConfig>(DEFAULT_PRESSURE_THRESHOLDS);
  const [lang, setLang] = useState<'ID' | 'EN'>('ID');

  // Modals state
  const [selectedRecordForDetail, setSelectedRecordForDetail] =
    useState<InspectionRecord | null>(null);
  const [showCADModal, setShowCADModal] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState<boolean>(false);

  // Initialize and check Firestore connection & Auth State
  useEffect(() => {
    testFirestoreConnection();

    // Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await firebaseService.getUserProfile(fbUser.uid);
          if (profile) {
            profile.avatar = sanitizeAvatar(profile.avatar, profile.role, profile.name);
            if (!profile.notifications) {
              profile.notifications = storage.getNotificationPreferences(profile.id);
            }
            setCurrentUser(profile);
            localStorage.setItem('network_inspector_cached_user', JSON.stringify(profile));
            storage.setCurrentUser(profile);
          } else {
            // Default profile for new authenticated user
            const fallbackProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || 'Petugas Inspeksi Lapangan',
              email: fbUser.email || 'inspector@network.id',
              role: 'inspector',
              avatar: sanitizeAvatar(fbUser.photoURL, 'inspector', fbUser.displayName || ''),
              inspectorId: 'NI-8841',
              department: 'Divisi Pemeliharaan Jaringan & Telemetri Lapangan',
              verified: true,
              activeSector: 'Sektor Barat (PC 1 & PC 2)',
              notifications: storage.getNotificationPreferences(fbUser.uid),
            };
            await firebaseService.saveUserProfile(fallbackProfile);
            setCurrentUser(fallbackProfile);
            localStorage.setItem('network_inspector_cached_user', JSON.stringify(fallbackProfile));
            storage.setCurrentUser(fallbackProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('network_inspector_cached_user');
      }
      setAuthChecking(false);
    });

    // Safety timeout: ensure authChecking never blocks for more than 2.5s
    const timer = setTimeout(() => {
      setAuthChecking(false);
    }, 2500);

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
    };
  }, []);

  // Set up real-time Firestore subscriptions when authenticated
  useEffect(() => {
    if (!currentUser) return;

    // Seed master data once if database is completely empty
    firebaseService.seedInitialDatabaseIfEmpty();

    // Subscribe to PC Areas
    const unsubPC = firebaseService.subscribePCAreas((areas) => {
      setPCAreas(areas);
      storage.savePCAreas(areas);
    });

    // Subscribe to Master Locations
    const unsubLoc = firebaseService.subscribeLocations((locs) => {
      setLocations(locs);
    });

    // Subscribe to Inspection Logs
    const unsubInsp = firebaseService.subscribeInspections((records) => {
      setInspections(records);
    });

    // Subscribe to Repair Materials Master Data
    const unsubMat = firebaseService.subscribeMaterials((mats) => {
      setMaterials(mats);
    });

    // Subscribe to Network Leakage Records
    const unsubLeak = firebaseService.subscribeLeakageRecords((records) => {
      setLeakageRecords(records.length > 0 ? records : DEFAULT_LEAKAGE_RECORDS);
    });

    // Subscribe to Pressure Thresholds Settings
    const unsubThresholds = firebaseService.subscribePressureThresholds((cfg) => {
      setPressureThresholds(cfg);
    });

    return () => {
      unsubPC();
      unsubLoc();
      unsubInsp();
      unsubMat();
      unsubLeak();
      unsubThresholds();
    };
  }, [currentUser]);

  // Authentication Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('network_inspector_cached_user');
    sessionStorage.removeItem('network_inspector_active_tab');
    setCurrentUser(null);
  };

  const handleSwitchRole = async (newRole: 'inspector' | 'manager') => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      role: newRole,
      department:
        newRole === 'manager'
          ? 'Direktorat Pengawasan Aset & Manajemen SCADA'
          : 'Divisi Pemeliharaan Jaringan & Telemetri Lapangan',
    };
    setCurrentUser(updated);
    localStorage.setItem('network_inspector_cached_user', JSON.stringify(updated));
    storage.setCurrentUser(updated);
    await firebaseService.saveUserProfile(updated);
  };

  const handleUpdateUser = async (updatedFields: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedFields };
    setCurrentUser(updated);
    localStorage.setItem('network_inspector_cached_user', JSON.stringify(updated));
    storage.setCurrentUser(updated);
    if (updated.notifications) {
      storage.saveNotificationPreferences(updated.id, updated.notifications);
    }
    await firebaseService.saveUserProfile(updated);
  };

  // Inspection Handlers: write directly to Firestore
  const handleAddInspection = async (
    newLog: Omit<InspectionRecord, 'id' | 'date' | 'time' | 'timestamp'>
  ) => {
    const payload = {
      ...newLog,
      userId: currentUser?.id || 'anonymous',
    };
    await firebaseService.addInspection(payload);
    setCurrentTab('dashboard');
  };

  // Master Data Location Handlers: write directly to Firestore with optimistic local update
  const handleAddLocation = async (newLoc: Omit<InspectionLocation, 'id' | 'createdAt'>) => {
    const saved = await firebaseService.addLocation(newLoc);
    if (saved) {
      setLocations((prev) => {
        if (prev.some((l) => l.id === saved.id)) return prev;
        return [saved, ...prev];
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    // Optimistic UI update immediately
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    try {
      await firebaseService.deleteLocation(id);
    } catch (err) {
      console.error('Error deleting location from Firestore:', err);
    }
  };

  // Master Data PC Area Handlers with immediate local storage sync
  const handleAddPCArea = async (newArea: PCArea) => {
    setPCAreas((prev) => {
      const next = prev.some((a) => a.id === newArea.id)
        ? prev.map((a) => (a.id === newArea.id ? newArea : a))
        : [...prev, newArea];
      next.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      storage.savePCAreas(next);
      return next;
    });
    try {
      await firebaseService.addPCArea(newArea);
    } catch (err) {
      console.error('Error saving PC Area to Firestore:', err);
    }
  };

  const handleUpdatePCArea = async (updatedArea: PCArea) => {
    setPCAreas((prev) => {
      const next = prev.map((a) => (a.id === updatedArea.id ? updatedArea : a));
      storage.savePCAreas(next);
      return next;
    });
    try {
      await firebaseService.updatePCArea(updatedArea);
    } catch (err) {
      console.error('Error updating PC Area in Firestore:', err);
    }
  };

  const handleDeletePCArea = async (id: string) => {
    setPCAreas((prev) => {
      const next = prev.filter((a) => a.id !== id);
      storage.savePCAreas(next);
      return next;
    });
    try {
      await firebaseService.deletePCArea(id);
    } catch (err) {
      console.error('Error deleting PC Area from Firestore:', err);
    }
  };

  // Repair Materials CRUD
  const handleAddMaterial = async (mat: Omit<RepairMaterial, 'id' | 'createdAt'>) => {
    try {
      const added = await firebaseService.addMaterial(mat);
      setMaterials((prev) => {
        if (prev.some((m) => m.id === added.id)) return prev;
        return [added, ...prev];
      });
    } catch (err) {
      console.error('Error adding repair material:', err);
    }
  };

  const handleUpdateMaterial = async (mat: RepairMaterial) => {
    setMaterials((prev) => prev.map((m) => (m.id === mat.id ? mat : m)));
    try {
      await firebaseService.updateMaterial(mat);
    } catch (err) {
      console.error('Error updating repair material:', err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    try {
      await firebaseService.deleteMaterial(id);
    } catch (err) {
      console.error('Error deleting repair material:', err);
    }
  };

  const handleUpdatePressureThresholds = async (config: Partial<PressureThresholdConfig>) => {
    try {
      await firebaseService.updatePressureThresholds({
        ...config,
        updatedBy: currentUser?.name || 'Administrator',
      });
    } catch (err) {
      console.error('Error updating pressure thresholds:', err);
    }
  };

  // Network Distribution Leakage Record Handler
  const handleAddLeakageRecord = async (
    record: Omit<NetworkLeakageRecord, 'id' | 'timestamp' | 'createdAt'>
  ) => {
    try {
      await firebaseService.addLeakageRecord(record);
    } catch (err) {
      console.error('Error adding network leakage record:', err);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
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

    const rows = inspections.map((r) => [
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

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Laporan_Inspeksi_Tekanan_Pipa_SCADA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-[#00162d] flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="font-heading font-semibold text-sm text-slate-300">
          Menghubungkan ke Firebase Authentication & Firestore...
        </p>
      </div>
    );
  }

  // If user is not authenticated, render AuthPage
  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-[#f8f9ff] text-[#0b1c30]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          lang={lang}
          setLang={setLang}
          onOpenMobileDrawer={() => setShowMobileDrawer(true)}
        />

        {/* Scrollable Main View Container with safe bottom clearance for mobile nav */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 pb-28 md:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              inspections={inspections}
              locations={locations}
              leakageRecords={leakageRecords}
              pcAreas={pcAreas}
              currentUser={currentUser}
              onNavigateToInput={() => setCurrentTab('input')}
              onNavigateToLeakage={() => setCurrentTab('leakage')}
              onExportCSV={handleExportCSV}
              onViewDetail={(record) => setSelectedRecordForDetail(record)}
              onOpenCADModal={() => setShowCADModal(true)}
              onShowCalibrationSchedule={() => setShowCalibrationModal(true)}
            />
          )}

          {currentTab === 'input' && (
            <InspectionInputView
              pcAreas={pcAreas}
              locations={locations}
              currentUser={currentUser}
              pressureThresholds={pressureThresholds}
              onSubmitSuccess={handleAddInspection}
              onNavigateToDashboard={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'leakage' && (
            <NetworkLeakageInputView
              materials={materials}
              currentUser={currentUser}
              onSaveRecord={handleAddLeakageRecord}
              onNavigateToDashboard={() => setCurrentTab('dashboard')}
              onNavigateToMasterData={() => setCurrentTab('master')}
            />
          )}

          {currentTab === 'master' && (
            <MasterDataView
              pcAreas={pcAreas}
              locations={locations}
              currentUser={currentUser}
              materials={materials}
              pressureThresholds={pressureThresholds}
              onUpdatePressureThresholds={handleUpdatePressureThresholds}
              onAddLocation={handleAddLocation}
              onDeleteLocation={handleDeleteLocation}
              onAddPCArea={handleAddPCArea}
              onUpdatePCArea={handleUpdatePCArea}
              onDeletePCArea={handleDeletePCArea}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onSwitchRole={handleSwitchRole}
              lang={lang}
              setLang={setLang}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Smart Devices */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
      />

      {/* Mobile Slide-Over Navigation Drawer */}
      <MobileDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        lang={lang}
        setLang={setLang}
      />

      {/* Detail Inspection Modal */}
      <InspectionDetailModal
        record={selectedRecordForDetail}
        onClose={() => setSelectedRecordForDetail(null)}
      />

      {/* CAD Schematic Modal */}
      {showCADModal && <CADModal onClose={() => setShowCADModal(false)} />}

      {/* Calibration Schedule Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-[#00162d]">
                  Jadwal Kalibrasi Katup PC 3
                </h3>
                <p className="text-xs text-slate-500">Koridor Barat Ring-1 (Tomang & Slipi)</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
              Pemeriksaan berkala dijadwalkan besok pk. 08:30 WIB oleh Tim Kalibrasi SCADA Wilayah Barat.
              Teknisi akan melakukan kalibrasi ulang diafragma PRV Node Tomang untuk mengembalikan fluktuasi
              tekanan ke rentang normal 4.0 - 5.5 Bar.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="py-2 px-4 rounded-xl bg-[#00162d] text-white text-xs font-bold"
              >
                Tutup Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
