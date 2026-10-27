import React from 'react';
import {
  LayoutDashboard,
  Gauge,
  MapPin,
  User,
  LogOut,
  ShieldCheck,
  X,
  Radio,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Wrench,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { MAN_SILHOUETTE_AVATAR, sanitizeAvatar } from '../constants/avatars.ts';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile';
  setCurrentTab: (tab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile') => void;
  currentUser: UserProfile;
  onLogout: () => void;
  onSwitchRole: (newRole: 'inspector' | 'manager') => void;
  lang: 'ID' | 'EN';
  setLang: (l: 'ID' | 'EN') => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  onSwitchRole,
  lang,
  setLang,
}) => {
  if (!isOpen) return null;

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Ringkasan & Dashboard',
      subtitle: 'Metrik tekanan & status telemetri',
      icon: LayoutDashboard,
    },
    {
      id: 'input' as const,
      label: 'Input Inspeksi Manometer',
      subtitle: 'Foto bukti & validasi geofence GPS',
      icon: Gauge,
      highlight: true,
    },
    {
      id: 'leakage' as const,
      label: 'Perbaikan Kebocoran Pipa',
      subtitle: 'SOP berita acara & alokasi material',
      icon: Wrench,
      highlight: true,
    },
    {
      id: 'master' as const,
      label: 'Master Data Area & Material',
      subtitle: 'Tabel PC Area, titik pipa & material',
      icon: MapPin,
    },
    {
      id: 'profile' as const,
      label: 'Profil Petugas',
      subtitle: 'Pengaturan akun & sertifikasi',
      icon: User,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-[85%] max-w-xs bg-[#00162d] text-slate-300 h-full flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-250 border-r border-[#0f2b48]">
        {/* Top Header */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-[#0f2b48]">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-950/40">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-sm text-white leading-tight">
                  Network Inspector
                </h2>
                <p className="text-[10px] text-sky-400 font-medium">Sistem Monitoring Pipa</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Card */}
          <div className="p-4 mx-3 my-3 rounded-xl bg-[#002242] border border-[#0f3a63]">
            <div className="flex items-center space-x-3 mb-2.5">
              <img
                src={sanitizeAvatar(currentUser.avatar, currentUser.role, currentUser.name)}
                alt={currentUser.name}
                onError={(e) => {
                  e.currentTarget.src = MAN_SILHOUETTE_AVATAR;
                }}
                className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shrink-0 bg-[#00162d]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold text-xs text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-300 font-mono">
                  {currentUser.inspectorId}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="capitalize font-semibold">{currentUser.role}</span>
              </div>
              <button
                onClick={() =>
                  onSwitchRole(currentUser.role === 'inspector' ? 'manager' : 'inspector')
                }
                className="text-[10px] font-bold text-sky-300 hover:text-white bg-sky-900/60 px-2 py-0.5 rounded border border-sky-500/40 flex items-center gap-1 active:scale-95 transition-all"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Ganti Role</span>
              </button>
            </div>
          </div>

          {/* Section: Menu Nav */}
          <div className="px-4 pt-1 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Navigasi
            </p>
          </div>

          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-[#006591] text-white shadow-md font-bold'
                      : 'text-slate-300 hover:bg-[#0f2b48] hover:text-white font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-200' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-tight truncate">{item.label}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                  {item.highlight && currentUser.role === 'inspector' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Telemetry pill */}
          <div className="mx-4 mt-4 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            <span className="font-semibold truncate">Telemetri Online • Latensi 18ms</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#0f2b48] bg-[#001326] space-y-3">
          {/* Language selector */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Bahasa Sistem:</span>
            <div className="flex items-center bg-[#071d33] border border-slate-700/60 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLang('ID')}
                className={`px-2.5 py-1 rounded transition-all ${
                  lang === 'ID' ? 'bg-[#006591] text-white font-bold' : 'text-slate-400'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 rounded transition-all ${
                  lang === 'EN' ? 'bg-[#006591] text-white font-bold' : 'text-slate-400'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-rose-800/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun (Sign Out)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
