import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Laptop,
  CheckCircle2,
  Camera,
  Globe,
  Bell,
  Lock,
  UserCheck,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  User,
  Check,
} from 'lucide-react';
import { UserProfile, UserNotificationPreferences } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import {
  OFFICIAL_SILHOUETTE_AVATAR,
  sanitizeAvatar,
} from '../constants/avatars.ts';

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onSwitchRole: (newRole: 'inspector' | 'manager') => void;
  lang: 'ID' | 'EN';
  setLang: (l: 'ID' | 'EN') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  onSwitchRole,
  lang,
  setLang,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'security'>('security');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // Password fields
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSuccessMessage, setPwSuccessMessage] = useState<string | null>(null);

  // Field notification preferences matching Image 7.jpeg & persisted across navigation/sessions
  const initialNotifs: UserNotificationPreferences =
    currentUser.notifications || storage.getNotificationPreferences(currentUser.id);

  const [alertSurge, setAlertSurge] = useState<boolean>(
    currentUser.notifications?.alertSurge ?? initialNotifs.alertSurge ?? true
  );
  const [alertPatrol, setAlertPatrol] = useState<boolean>(
    currentUser.notifications?.alertPatrol ?? initialNotifs.alertPatrol ?? true
  );
  const [alertAudio, setAlertAudio] = useState<boolean>(
    currentUser.notifications?.alertAudio ?? initialNotifs.alertAudio ?? false
  );

  // Synchronize state if currentUser.notifications is updated from parent or Firestore
  useEffect(() => {
    if (currentUser.notifications) {
      setAlertSurge(currentUser.notifications.alertSurge);
      setAlertPatrol(currentUser.notifications.alertPatrol);
      setAlertAudio(currentUser.notifications.alertAudio);
    }
  }, [currentUser.notifications]);

  const handleToggleNotification = (
    key: keyof UserNotificationPreferences,
    value: boolean
  ) => {
    if (key === 'alertSurge') setAlertSurge(value);
    if (key === 'alertPatrol') setAlertPatrol(value);
    if (key === 'alertAudio') setAlertAudio(value);

    const updatedNotifs: UserNotificationPreferences = {
      alertSurge: key === 'alertSurge' ? value : alertSurge,
      alertPatrol: key === 'alertPatrol' ? value : alertPatrol,
      alertAudio: key === 'alertAudio' ? value : alertAudio,
    };

    // Immediately persist to localStorage for instant tab-switching retention
    storage.saveNotificationPreferences(currentUser.id, updatedNotifs);

    // Notify parent to persist to currentUser and Firestore
    onUpdateUser({
      notifications: updatedNotifs,
    });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw) {
      alert('Masukkan kata sandi baru.');
      return;
    }
    if (newPw !== confirmPw) {
      alert('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setPwSuccessMessage('Kata sandi operasional berhasil diperbarui!');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwSuccessMessage(null), 3000);
  };

  const cleanAvatar = sanitizeAvatar(
    currentUser.avatar,
    currentUser.role,
    currentUser.name
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header matching Image 7.jpeg */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm bg-sky-100 text-sky-800">
              Konfigurasi Pengguna & Keamanan
            </span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#00162d] tracking-tight">
            Profil Pengguna & Akun
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Kelola informasi personal, peran akun (role), dan preferensi sistem telemetri jaringan.
          </p>
        </div>

        <div className="bg-[#eef5fe] border border-sky-200/80 rounded-full px-4 py-1.5 text-xs text-sky-900 font-medium flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sesi Aktif: Terproteksi TLS 1.3</span>
        </div>
      </div>

      {/* Top Banner Card matching Image 7.jpeg */}
      <div className="bg-gradient-to-r from-[#00162d] via-[#092a4a] to-[#01355a] rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-5 text-center sm:text-left w-full md:w-auto">
          <div className="relative group shrink-0">
            <img
              src={cleanAvatar}
              alt={currentUser.name}
              onError={(e) => {
                e.currentTarget.src = OFFICIAL_SILHOUETTE_AVATAR;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-sky-400/50 shadow-md bg-[#00162d]"
            />
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-400 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title="Ganti Foto Profil / Siluet Avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h3 className="font-heading font-bold text-base sm:text-lg text-white truncate max-w-full">
                {currentUser.name}
              </h3>
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                Aktif
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-0.5 truncate">{currentUser.email}</p>

            <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-200 font-medium text-[11px]">
                {currentUser.role === 'manager'
                  ? 'Manager (Admin)'
                  : 'Network Inspector'}
              </span>
              <span className="font-mono text-slate-400 text-[11px]">ID: {currentUser.inspectorId}</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Stats on Profile Card */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center w-full md:w-auto">
          <div>
            <p className="text-[9px] sm:text-[10px] text-sky-300 font-bold uppercase tracking-wider">
              Total Inspeksi
            </p>
            <p className="font-telemetry font-bold text-xl sm:text-2xl text-white">428</p>
            <p className="text-[9px] sm:text-[10px] text-emerald-400 font-medium mt-0.5 truncate">↗ Sektor Barat</p>
          </div>

          <div className="border-x border-white/10 px-1 sm:px-2">
            <p className="text-[9px] sm:text-[10px] text-sky-300 font-bold uppercase tracking-wider">
              Akurasi GPS
            </p>
            <p className="font-telemetry font-bold text-xl sm:text-2xl text-white">99.2%</p>
            <p className="text-[9px] sm:text-[10px] text-slate-300 font-medium mt-0.5 truncate">Presisi Tinggi</p>
          </div>

          <div>
            <p className="text-[9px] sm:text-[10px] text-sky-300 font-bold uppercase tracking-wider">
              Area Prioritas
            </p>
            <p className="font-telemetry font-bold text-xl sm:text-2xl text-sky-200">PC 1 &amp; 2</p>
            <p className="text-[9px] sm:text-[10px] text-slate-300 font-medium mt-0.5 truncate">Distrik Utama</p>
          </div>
        </div>
      </div>

      {/* Main Content: Left (Form tabs) + Right (Preferences & Notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tabs & Forms matching Image 7.jpeg */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6">
            {/* Tab navigation */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:space-x-2 border-b border-slate-100 pb-3 mb-5 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center justify-center space-x-1.5 px-2 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-[#00162d] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">Data Pribadi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className={`flex items-center justify-center space-x-1.5 px-2 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'roles'
                    ? 'bg-[#00162d] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">Peran &amp; Akses</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`flex items-center justify-center space-x-1.5 px-2 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#00162d] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Keamanan</span>
              </button>
            </div>

            {/* Tab Content: Keamanan & Sandi matching Image 7.jpeg */}
            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kata Sandi Saat Ini
                  </label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Minimal 8 karakter alfanumerik"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-xl bg-[#006591] hover:bg-[#005177] text-white text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Perbarui Kata Sandi</span>
                  </button>
                </div>

                {pwSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{pwSuccessMessage}</span>
                  </div>
                )}
              </form>
            )}

            {/* Tab Content: Data Pribadi */}
            {activeTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={currentUser.name}
                    onChange={(e) => onUpdateUser({ name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:bg-white focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Operasional
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Departemen Penugasan
                  </label>
                  <input
                    type="text"
                    value={currentUser.department}
                    onChange={(e) => onUpdateUser({ department: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Tab Content: Peran & Akses */}
            {activeTab === 'roles' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                  <h4 className="font-heading font-bold text-sm text-[#00162d] mb-1">
                    Kendali Akses Berbasis Peran (RBAC)
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Sistem membagi operasional ke dalam dua tingkat wewenang utama:
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="p-2.5 bg-white rounded-lg border border-sky-100">
                      <span className="font-bold text-sky-900 block">
                        1. Inspector (Petugas Lapangan)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Bertanggung jawab melakukan inspeksi manometer berkala di titik katup, mengambil foto bukti ber-watermark, dan mengunggah telemetri real-time.
                      </p>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-sky-100">
                      <span className="font-bold text-sky-900 block">
                        2. Manager (Administrator Sistem SCADA)
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        Memiliki wewenang mengelola master data PC Area dan koordinat lokasi geofence, memantau sebaran kualitas hidrolik, dan mengunduh laporan ekspor CSV.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSwitchRole(currentUser.role === 'inspector' ? 'manager' : 'inspector')
                    }
                    className="py-2.5 px-4 bg-[#00162d] hover:bg-[#00274e] text-white rounded-xl text-xs font-bold flex items-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      Ubah Peran Pengguna Menjadi:{' '}
                      <strong className="text-sky-300 uppercase">
                        {currentUser.role === 'inspector' ? 'Manager' : 'Inspector'}
                      </strong>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Preferences & Notifications matching Image 7.jpeg */}
        <div className="lg:col-span-4 space-y-6">
          {/* Preferensi Bahasa */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h4 className="font-heading font-bold text-sm text-[#00162d] flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-sky-700" />
              Preferensi Bahasa
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Pilih bahasa pengantar data instrumen dan log peringatan sistem.
            </p>

            <div className="space-y-2 text-xs">
              <label
                onClick={() => setLang('ID')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  lang === 'ID'
                    ? 'bg-sky-50/70 border-sky-300 text-sky-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>Bahasa Indonesia (Utama)</span>
                <input
                  type="radio"
                  name="lang"
                  checked={lang === 'ID'}
                  onChange={() => setLang('ID')}
                  className="accent-sky-700"
                />
              </label>

              <label
                onClick={() => setLang('EN')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  lang === 'EN'
                    ? 'bg-sky-50/70 border-sky-300 text-sky-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>English (Technical Terms)</span>
                <input
                  type="radio"
                  name="lang"
                  checked={lang === 'EN'}
                  onChange={() => setLang('EN')}
                  className="accent-sky-700"
                />
              </label>
            </div>
          </div>

          {/* Notifikasi Lapangan matching Image 7.jpeg */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h4 className="font-heading font-bold text-sm text-[#00162d] flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-sky-700" />
              Notifikasi Lapangan
            </h4>

            <div className="space-y-3 text-xs">
              {/* Option 1 */}
              <label className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Peringatan Surge Tekanan</span>
                  <span className="text-[11px] text-slate-500">
                    Kirim alert ketika tekanan &gt; 4.8 BAR
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alertSurge}
                  onChange={(e) => handleToggleNotification('alertSurge', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-sky-700 accent-[#00162d] cursor-pointer"
                />
              </label>

              {/* Option 2 */}
              <label className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Pengingat Jadwal Patroli</span>
                  <span className="text-[11px] text-slate-500">
                    Notifikasi 30 menit sebelum pergantian shift
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alertPatrol}
                  onChange={(e) => handleToggleNotification('alertPatrol', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-sky-700 accent-[#00162d] cursor-pointer"
                />
              </label>

              {/* Option 3 */}
              <label className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Suara Peringatan Audio</span>
                  <span className="text-[11px] text-slate-500">
                    Bunyi sirene digital pada status kritis
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alertAudio}
                  onChange={(e) => handleToggleNotification('alertAudio', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded text-sky-700 accent-[#00162d] cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#00162d]">
                    Pilih Siluet / Foto Profil
                  </h3>
                  <p className="text-xs text-slate-500">Siluet vektor beresolusi tinggi tanpa link eksternal</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Siluet Resmi Sistem
                </label>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUser({ avatar: OFFICIAL_SILHOUETTE_AVATAR });
                      setShowAvatarModal(false);
                    }}
                    className={`relative w-full p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 group ${
                      cleanAvatar === OFFICIAL_SILHOUETTE_AVATAR
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-300/50'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={OFFICIAL_SILHOUETTE_AVATAR}
                      alt="Siluet Resmi Petugas"
                      className="w-16 h-16 rounded-full border border-sky-400 shadow-sm"
                    />
                    <div>
                      <p className="font-heading font-bold text-xs text-slate-900">
                        Siluet Resmi Petugas
                      </p>
                      <p className="text-[10px] text-slate-500">Official Profile Silhouette</p>
                    </div>
                    {cleanAvatar === OFFICIAL_SILHOUETTE_AVATAR && (
                      <span className="absolute top-2 right-2 p-1 rounded-full bg-sky-500 text-white">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Image URL or upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Atau Masukkan URL Gambar Mandiri
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customAvatarInput.trim()) return;
                      if (customAvatarInput.includes('unsplash.com')) {
                        alert('Silakan gunakan siluet bawaan atau hosting foto resmi lain.');
                        return;
                      }
                      onUpdateUser({ avatar: customAvatarInput.trim() });
                      setShowAvatarModal(false);
                      setCustomAvatarInput('');
                    }}
                    className="px-3 py-2 bg-[#00162d] text-white rounded-lg text-xs font-semibold hover:bg-sky-950 transition-colors cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
