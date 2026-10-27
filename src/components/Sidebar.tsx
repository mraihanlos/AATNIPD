import React from 'react';
import {
  LayoutDashboard,
  Gauge,
  MapPin,
  User,
  LogOut,
  ShieldCheck,
  Activity,
  Wrench,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { MAN_SILHOUETTE_AVATAR, sanitizeAvatar } from '../constants/avatars.ts';

interface SidebarProps {
  currentTab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile';
  setCurrentTab: (tab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile') => void;
  currentUser: UserProfile;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Ringkasan & Dashboard',
      icon: LayoutDashboard,
      roles: ['inspector', 'manager'],
    },
    {
      id: 'input',
      label: 'Input Inspeksi (Manometer)',
      icon: Gauge,
      roles: ['inspector', 'manager'],
      highlight: true,
    },
    {
      id: 'leakage',
      label: 'Perbaikan Kebocoran Pipa',
      icon: Wrench,
      roles: ['inspector', 'manager'],
      badge: 'SOP',
    },
    {
      id: 'master',
      label: 'Master Data & Material',
      icon: MapPin,
      roles: ['inspector', 'manager'],
    },
    {
      id: 'profile',
      label: 'Profil Pengguna',
      icon: User,
      roles: ['inspector', 'manager'],
    },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#00162d] text-slate-300 flex-col justify-between shrink-0 select-none border-r border-[#0f2b48]">
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center space-x-3 border-b border-[#0f2b48]/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-900/30">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
              Network Inspector
            </h1>
            <p className="text-xs text-sky-300/80 font-medium">Sistem Monitoring Tekanan</p>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Operasional
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as any)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#006591] text-white shadow-md shadow-sky-950/40 font-semibold'
                    : 'text-slate-300 hover:bg-[#0f2b48] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-200' : 'text-slate-400'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.id === 'input' && currentUser.role === 'inspector' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Role Indicator */}
        <div className="mx-4 mt-6 p-3 rounded-lg bg-[#071d33] border border-[#143659] text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Peran Saat Ini</span>
            <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
              Sesi Aktif
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-200 capitalize">
              {currentUser.role === 'manager' ? 'Manager (Admin SCADA)' : 'Network Inspector'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Profile Footer */}
      <div className="p-4 border-t border-[#0f2b48]/80 bg-[#001326]">
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={sanitizeAvatar(currentUser.avatar, currentUser.role, currentUser.name)}
            alt={currentUser.name}
            onError={(e) => {
              e.currentTarget.src = MAN_SILHOUETTE_AVATAR;
            }}
            className="w-10 h-10 rounded-full object-cover border-2 border-sky-600/50 shadow-sm bg-[#001326]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {currentUser.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentUser.role === 'manager' ? 'Manager' : 'Network Inspector'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-3 rounded-lg bg-[#142337] hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-slate-700/50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar (Sign Out)</span>
        </button>
      </div>
    </aside>
  );
};
