import React from 'react';
import { Home, HardDrive, Image as ImageIcon, Lock, Settings } from 'lucide-react';
import { TabType } from '../types';
import { useHadiCloudStore } from '../store';

interface NavDeckProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const NavDeck: React.FC<NavDeckProps> = ({ currentTab, onSelectTab }) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const isLight = theme === 'light';

  const triggerHaptic = (ms = 12) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore
    }
  };

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Drive', label: 'Drive', icon: HardDrive },
    { id: 'Photos', label: 'Photos', icon: ImageIcon },
    { id: 'Vault', label: 'Vault', icon: Lock },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      id="floating-nav-deck"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] w-[92%] max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-3xl p-1.5 flex items-center justify-between gap-1 transition-all duration-300 animate-in slide-in-from-bottom-12 fade-in"
      role="navigation"
      aria-label="Main Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id.toLowerCase()}`}
            type="button"
            onClick={() => {
              triggerHaptic(12);
              onSelectTab(tab.id);
            }}
            className={`btn-glass-ios relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isActive
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon 
              className={`w-5 h-5 transition-all duration-200 ${
                isActive 
                  ? 'scale-105 text-white stroke-[2.4px] drop-shadow-sm' 
                  : 'stroke-[1.8px]'
              }`} 
            />
            <span 
              className={`text-[10px] sm:text-[11px] mt-1 tracking-tight whitespace-nowrap ${
                isActive ? 'font-bold text-white' : 'font-semibold'
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
