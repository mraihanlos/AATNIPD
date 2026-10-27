import React, { useState } from 'react';
import {
  Home,
  ChevronRight,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Radio,
  UserCheck,
  RefreshCw,
  Menu,
  Gauge,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { MAN_SILHOUETTE_AVATAR, sanitizeAvatar } from '../constants/avatars.ts';

interface HeaderProps {
  currentTab: string;
  currentUser: UserProfile;
  onSwitchRole: (newRole: 'inspector' | 'manager') => void;
  lang: 'ID' | 'EN';
  setLang: (l: 'ID' | 'EN') => void;
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentUser,
  onSwitchRole,
  lang,
  setLang,
  onOpenMobileDrawer,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Peringatan Tekanan Fluktuatif (PC 3)',
      time: '12 menit lalu',
      desc: 'Node Tomang Ring-1 membaca tekanan 3.62 Bar (di bawah batas 4.0 Bar).',
      unread: true,
      type: 'warning',
    },
    {
      id: 'n2',
      title: 'Sinkronisasi Geofence Satelit Selesai',
      time: '45 menit lalu',
      desc: 'Deviasi WGS84 seluruh katup PC 1 - PC 5 telah terkalibrasi otomatis (±1.5m).',
      unread: false,
      type: 'info',
    },
    {
      id: 'n3',
      title: 'Jadwal Patroli Shift Malam',
      time: '2 jam lalu',
      desc: 'Inspeksi berkala katup transmisi pesisir pantai Marunda terjadwal pk. 20:00 WIB.',
      unread: false,
      type: 'info',
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getPageBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Ringkasan & Dashboard';
      case 'input':
        return 'Input Inspeksi Manometer';
      case 'leakage':
        return 'Perbaikan Kebocoran Jaringan Pipa';
      case 'master':
        return 'Master Data Area & Material';
      case 'profile':
        return 'Profil Pengguna & Keamanan';
      default:
        return 'Monitoring Lapangan';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20 w-full max-w-full">
      {/* Left: Mobile Hamburger & Breadcrumbs */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile App Branding */}
        <div className="flex md:hidden items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#00162d] flex items-center justify-center text-sky-400 shadow-xs shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-heading font-extrabold text-xs sm:text-sm text-[#00162d] tracking-tight block leading-tight truncate">
              Network Inspector
            </span>
            <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[100px] xs:max-w-[160px]">
              {getPageBreadcrumb()}
            </span>
          </div>
        </div>

        {/* Desktop Breadcrumbs */}
        <div className="hidden md:flex items-center space-x-2 text-sm">
          <Home className="w-4 h-4 text-slate-400" />
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-500 font-medium">Monitoring Lapangan</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[#00162d] font-semibold">{getPageBreadcrumb()}</span>
        </div>
      </div>

      {/* Right: Telemetry pill, Notifications, Language, User */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Telemetry Status Pill */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>99.8% Online</span>
        </div>

        {/* Quick Role Switcher Pill for reviewer ease */}
        <button
          onClick={() => onSwitchRole(currentUser.role === 'inspector' ? 'manager' : 'inspector')}
          title="Klik untuk beralih peran testing antara Inspector dan Manager"
          className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 rounded-lg border border-slate-200 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">Role:</span>
          <span className="font-bold text-sky-700 uppercase text-[10px] sm:text-xs">{currentUser.role}</span>
          <RefreshCw className="w-3 h-3 text-slate-400 hidden sm:inline ml-0.5" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-3 top-16 md:absolute md:inset-auto md:right-0 md:top-full mt-1 sm:w-80 bg-white rounded-2xl md:rounded-xl shadow-2xl border border-slate-200 p-4 text-xs z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-heading font-bold text-slate-800 text-sm">
                  Notifikasi SCADA ({unreadCount} Baru)
                </span>
                <button
                  onClick={() =>
                    setNotifications(notifications.map((n) => ({ ...n, unread: false })))
                  }
                  className="text-sky-600 hover:text-sky-800 font-medium"
                >
                  Tandai Dibaca
                </button>
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.unread
                        ? 'bg-sky-50/70 border-sky-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                      <span className="flex items-center gap-1.5">
                        {item.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {item.title}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed mb-1">{item.desc}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language selector */}
        <div className="hidden xs:flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
          <button
            onClick={() => setLang('ID')}
            className={`px-2 py-1 rounded-md transition-all ${
              lang === 'ID'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ID
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => setLang('EN')}
            className={`px-2 py-1 rounded-md transition-all ${
              lang === 'EN'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>

        {/* User avatar small */}
        <img
          src={sanitizeAvatar(currentUser.avatar, currentUser.role, currentUser.name)}
          alt={currentUser.name}
          onError={(e) => {
            e.currentTarget.src = MAN_SILHOUETTE_AVATAR;
          }}
          className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-2xs bg-[#00162d]"
        />
      </div>
    </header>
  );
};
