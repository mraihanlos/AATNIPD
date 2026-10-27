import React from 'react';
import { LayoutDashboard, Gauge, MapPin, User } from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface MobileBottomNavProps {
  currentTab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile';
  setCurrentTab: (tab: 'dashboard' | 'input' | 'leakage' | 'master' | 'profile') => void;
  currentUser: UserProfile;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
}) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'input' as const,
      label: 'Input Foto',
      icon: Gauge,
    },
    {
      id: 'master' as const,
      label: 'Master Data',
      icon: MapPin,
    },
    {
      id: 'profile' as const,
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#00162d]/95 backdrop-blur-md border-t border-[#0f2b48] md:hidden px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0.375rem))' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer min-h-[48px] focus:outline-none active:scale-95 ${
              isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label={tab.label}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-sky-400' : 'text-slate-400'
                }`}
              />
              {tab.id === 'input' && currentUser.role === 'inspector' && !isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#00162d] animate-pulse"></span>
              )}
              {isActive && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 tracking-tight transition-all truncate max-w-full ${
                isActive ? 'font-bold text-white' : 'font-medium text-slate-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
