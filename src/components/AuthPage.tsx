import React, { useState } from 'react';
import {
  Gauge,
  Droplets,
  BarChart3,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase.ts';
import { firebaseService } from '../services/firebaseService.ts';
import { storage } from '../services/storage.ts';
import { UserProfile, UserRole } from '../types/index.ts';
import moyaLogoSimpled from '../assets/images/moya-logo-simpled (1).jpg';
import {
  OFFICIAL_SILHOUETTE_AVATAR,
  getSilhouetteAvatar,
  sanitizeAvatar,
} from '../constants/avatars.ts';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [activeRole, setActiveRole] = useState<UserRole>('inspector');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Form fields - default to empty
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick switch role
  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
  };

  // Google Sign-In with Firebase Auth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;

      // Check existing profile or create new
      let profile = await firebaseService.getUserProfile(fbUser.uid);
      if (!profile) {
        profile = {
          id: fbUser.uid,
          name: fbUser.displayName || (activeRole === 'manager' ? 'Hendra Wijaya, S.T.' : 'Budi Santoso, S.T.'),
          email: fbUser.email || email,
          role: activeRole,
          avatar: sanitizeAvatar(fbUser.photoURL, activeRole, fbUser.displayName || ''),
          inspectorId: activeRole === 'manager' ? 'MGR-1042' : 'NI-8841',
          department:
            activeRole === 'manager'
              ? 'Direktorat Pengawasan Aset & Manajemen SCADA'
              : 'Divisi Pemeliharaan Jaringan & Telemetri',
          verified: true,
          activeSector: activeRole === 'manager' ? 'Pusat Kontrol SCADA' : 'Sektor Barat (PC 1 & 2)',
          notifications: storage.getNotificationPreferences(fbUser.uid),
        };
        await firebaseService.saveUserProfile(profile);
      } else {
        profile.avatar = sanitizeAvatar(profile.avatar, profile.role, profile.name);
        if (!profile.notifications) {
          profile.notifications = storage.getNotificationPreferences(profile.id);
        }
      }
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMessage(err.message || 'Gagal masuk dengan akun Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Auth (with fallback notice if email provider not enabled in console)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Mohon lengkapi email dan kata sandi operasional.');
      return;
    }

    if (activeTab === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Nama lengkap wajib diisi untuk pendaftaran.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Konfirmasi kata sandi tidak sesuai.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Kata sandi minimal 6 karakter.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (activeTab === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = res.user;

        const newProfile: UserProfile = {
          id: fbUser.uid,
          name,
          email: fbUser.email || email,
          role: activeRole,
          avatar: OFFICIAL_SILHOUETTE_AVATAR,
          inspectorId: activeRole === 'manager' ? `MGR-${Math.floor(1000 + Math.random() * 9000)}` : `NI-${Math.floor(1000 + Math.random() * 9000)}`,
          department:
            activeRole === 'manager'
              ? 'Direktorat Pengawasan Aset & Manajemen SCADA'
              : 'Divisi Pemeliharaan Jaringan & Telemetri',
          verified: true,
          activeSector: activeRole === 'manager' ? 'Pusat Kontrol SCADA' : 'Sektor Barat (PC 1 & 2)',
          notifications: storage.getNotificationPreferences(fbUser.uid),
        };
        await firebaseService.saveUserProfile(newProfile);
        onLoginSuccess(newProfile);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = res.user;
        let profile = await firebaseService.getUserProfile(fbUser.uid);

        if (!profile) {
          profile = {
            id: fbUser.uid,
            name: activeRole === 'manager' ? 'Hendra Wijaya, S.T., M.Eng.' : 'Budi Santoso, S.T.',
            email: fbUser.email || email,
            role: activeRole,
            avatar: OFFICIAL_SILHOUETTE_AVATAR,
            inspectorId: activeRole === 'manager' ? 'MGR-1042' : 'NI-8841',
            department:
              activeRole === 'manager'
                ? 'Direktorat Pengawasan Aset & Manajemen SCADA'
                : 'Divisi Pemeliharaan Jaringan & Telemetri',
            verified: true,
            activeSector: activeRole === 'manager' ? 'Pusat Kontrol SCADA' : 'Sektor Barat (PC 1 & 2)',
            notifications: storage.getNotificationPreferences(fbUser.uid),
          };
          await firebaseService.saveUserProfile(profile);
        } else {
          profile.avatar = sanitizeAvatar(profile.avatar, profile.role, profile.name);
          if (!profile.notifications) {
            profile.notifications = storage.getNotificationPreferences(profile.id);
          }
        }
        onLoginSuccess(profile);
      }
    } catch (err: any) {
      console.warn('Firebase Auth error:', err);
      // If Email/Password is not enabled in Firebase console, provide clear guidance
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage(
          'Email/Password belum diaktifkan di Firebase Console. Anda dapat menggunakan tombol "Masuk dengan Akun Google" di bawah, atau aktifkan Email/Password di tab Authentication Firebase.'
        );
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Email atau kata sandi tidak cocok. Silakan periksa kembali atau gunakan tab "Daftar Akun Baru".');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih tab "Masuk (Sign In)".');
      } else {
        setErrorMessage(err.message || 'Terjadi kesalahan autentikasi Firebase.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eff4ff] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-sky-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
          <img 
              src={moyaLogoSimpled} 
              alt="MOYA Logo" 
              className="h-7 md:h-9 object-contain select-none" 
              referrerPolicy="no-referrer"
            />
            <h1 className="font-heading font-extrabold text-2xl text-[#00162d] tracking-tight">
              Network Inspector Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Sistem Pemantauan Tekanan dan Kebocoran Pipa
            </p>
          </div>

          {/* Role Selector matching Image 10.jpeg */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pilih Peran Operasional (Role)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectRole('inspector')}
                className={`text-left p-3 rounded-xl transition-all duration-200 border cursor-pointer ${
                  activeRole === 'inspector'
                    ? 'bg-[#dce9ff] border-sky-400 text-[#00162d] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Droplets
                    className={`w-4 h-4 ${
                      activeRole === 'inspector' ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-heading font-bold text-sm text-[#00162d]">Network Inspektor</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Petugas Lapangan & Input Tekanan
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('manager')}
                className={`text-left p-3 rounded-xl transition-all duration-200 border cursor-pointer ${
                  activeRole === 'manager'
                    ? 'bg-[#dce9ff] border-sky-400 text-[#00162d] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3
                    className={`w-4 h-4 ${
                      activeRole === 'manager' ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-heading font-bold text-sm text-[#00162d]">Manager</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Admin & Analisis Kualitas
                </p>
              </button>
            </div>
          </div>

          {/* Sign In / Sign Up Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-[#00162d] shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-[#00162d] shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {activeTab === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="cth: Budi Setiawan"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Section to select role as "Network Inspektor" or "Manager" */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Pilih Peran Akun (Role) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectRole('inspector')}
                      className={`text-left p-2.5 sm:p-3 rounded-xl transition-all duration-200 border cursor-pointer ${
                        activeRole === 'inspector'
                          ? 'bg-[#dce9ff] border-sky-400 text-[#00162d] shadow-xs ring-2 ring-sky-300/50'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Droplets
                          className={`w-4 h-4 shrink-0 ${
                            activeRole === 'inspector' ? 'text-sky-700' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-heading font-bold text-xs sm:text-sm text-[#00162d]">
                          Network Inspektor
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Petugas Lapangan & Inspeksi Tekanan
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRole('manager')}
                      className={`text-left p-2.5 sm:p-3 rounded-xl transition-all duration-200 border cursor-pointer ${
                        activeRole === 'manager'
                          ? 'bg-[#dce9ff] border-sky-400 text-[#00162d] shadow-xs ring-2 ring-sky-300/50'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <BarChart3
                          className={`w-4 h-4 shrink-0 ${
                            activeRole === 'manager' ? 'text-sky-700' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-heading font-bold text-xs sm:text-sm text-[#00162d]">
                          Manager
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Admin & Supervisi SCADA
                      </p>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Alamat Email Operasional <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: nama@network.id"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeTab === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                    required
                  />
                </div>
              </div>
            )}

            {activeTab === 'login' && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00162d] accent-[#00162d]"
                  />
                  <span className="text-slate-600">Ingat Saya</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert('Gunakan Google Sign-in atau periksa email terdaftar untuk reset kata sandi.')
                  }
                  className="text-sky-700 hover:underline font-semibold"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00162d] hover:bg-[#00274e] text-white font-heading font-bold text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{activeTab === 'login' ? 'Masuk ke Sistem' : 'Daftarkan Akun Baru'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-medium tracking-tight">
              Terkoneksi Firebase Firestore & Auth TLS 1.3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
