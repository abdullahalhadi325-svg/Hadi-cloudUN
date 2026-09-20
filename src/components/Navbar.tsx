import React from 'react';
import { Cloud, Send, Sun, Moon, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { useHadiCloudStore } from '../store';
import { AppTheme } from '../types';

interface NavbarProps {
  currentTab: string;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onOpenLogin }) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const setTheme = useHadiCloudStore((state) => state.setTheme);
  const user = useHadiCloudStore((state) => state.user);
  const setUser = useHadiCloudStore((state) => state.setUser);
  const stopFirestoreSync = useHadiCloudStore((state) => state.stopFirestoreSync);

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('fade');
    else setTheme('dark');
  };

  const handleLogout = () => {
    stopFirestoreSync();
    setUser(null);
  };

  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-40 px-3.5 py-3 sm:px-6">
      <div 
        id="app-navbar"
        className={`max-w-3xl mx-auto rounded-2xl liquid-glass-ios px-4 py-2.5 flex items-center justify-between transition-all ${
          isLight ? 'bg-white/80 border-slate-200 shadow-sm' : ''
        }`}
      >
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isLight 
              ? 'bg-slate-100 border-slate-200 text-slate-800' 
              : 'bg-white/10 border-white/20 text-white'
          }`}>
            <Cloud className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs sm:text-sm font-semibold tracking-tight truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Hadi Cloud
              </span>
              <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded-full border shrink-0 ${
                isLight 
                  ? 'bg-slate-100 text-slate-600 border-slate-300' 
                  : 'bg-white/10 text-white/70 border-white/15'
              }`}>
                PWA
              </span>
            </div>
            <p className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              {currentTab}
            </p>
          </div>
        </div>

        {/* Right: Theme Toggle & Telegram Auth Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Cycler (Dark -> Light -> Fade) */}
          <button
            id="btn-cycle-theme"
            type="button"
            onClick={cycleTheme}
            className={`btn-glass-ios px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] border cursor-pointer ${
              isLight 
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                : 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15'
            }`}
            title={`Current: ${theme.toUpperCase()} (Click to toggle)`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' && <Moon className="w-3.5 h-3.5" />}
            {theme === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
            {theme === 'fade' && <Sparkles className="w-3.5 h-3.5 text-slate-400" />}
            <span className="capitalize hidden xs:inline">{theme}</span>
          </button>

          {/* Telegram MTProto Auth Button */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <div 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium truncate max-w-[130px] sm:max-w-[170px] ${
                  isLight 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                }`}
                title={`Logged in as ${user.firstName} (Storage: ${user.storageChannelId || 'Provisioned'})`}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                <span className="truncate">{user.firstName}</span>
              </div>
              <button
                id="btn-logout-tg"
                type="button"
                onClick={handleLogout}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' 
                    : 'bg-white/10 border-white/15 text-white/60 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
                }`}
                title="Log out of Telegram"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-open-telegram-login"
              type="button"
              onClick={onOpenLogin}
              className={`btn-glass-ios px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium border cursor-pointer shadow-sm ${
                isLight 
                  ? 'bg-slate-900 text-white border-transparent hover:bg-slate-800' 
                  : 'bg-white text-black border-white/40 hover:bg-white/90'
              }`}
            >
              <Send className="w-3 h-3 -translate-x-0.5" />
              <span className="hidden sm:inline">Connect</span> Telegram
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
