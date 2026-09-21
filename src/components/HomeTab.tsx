import React from 'react';
import { HardDrive, ShieldCheck, Zap, ArrowUpRight, FileText, Image as ImageIcon, Send, MessageCircle, Mail } from 'lucide-react';
import { TabType } from '../types';
import { useHadiCloudStore } from '../store';
import { DeveloperSignature } from './DeveloperSignature';

interface HomeTabProps {
  onNavigate: (tab: TabType) => void;
  onOpenLogin: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onNavigate, onOpenLogin }) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const files = useHadiCloudStore((state) => state.files);
  const isLight = theme === 'light';

  return (
    <div id="home-tab-container" className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {/* Welcome Card */}
      <div className={`rounded-3xl liquid-glass-ios p-5 sm:p-6 mb-5 animate-ios-fade-up ${
        isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/20 text-white'
            }`}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-700' : 'text-white'
            }`}>
              Hadi Cloud Engine
            </span>
          </div>

          {user ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              Telegram Synced
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold hover:bg-sky-500/30 active:scale-95 transition-transform cursor-pointer"
            >
              Connect MTProto
            </button>
          )}
        </div>

        <h2 className={`text-xl sm:text-2xl font-bold tracking-tight mb-1.5 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Hadi Cloud Storage v1.0.0
        </h2>
        <p className={`text-xs font-semibold leading-relaxed max-w-md mb-4 ${
          isLight ? 'text-slate-600' : 'text-white/80'
        }`}>
          {user 
            ? `Active repository: ${user.storageChannelId || 'Hadi_Cloud_Storage'}. Real-time Firestore sync enabled.` 
            : 'Secure, lightning-fast personal cloud.'}
        </p>

        {/* Storage Usage Bar */}
        <div className="space-y-1.5">
          <div className={`flex justify-between text-xs font-semibold ${
            isLight ? 'text-slate-700' : 'text-white'
          }`}>
            <span>57.9 MB Used</span>
            <span className="text-sky-400">Unlimited Cloud Space</span>
          </div>
          <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/20'
          }`}>
            <div className={`h-full rounded-full ${
              isLight ? 'bg-slate-900 w-[12%]' : 'bg-white w-[12%]'
            }`} />
          </div>
        </div>
      </div>

      {/* Quick Portals */}
      <div className="mb-5 animate-ios-fade-up stagger-1">
        <h3 className={`text-xs uppercase tracking-wider font-bold mb-2.5 ${
          isLight ? 'text-slate-600' : 'text-white'
        }`}>
          Navigation Portals
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('Drive')}
            className={`rounded-2xl liquid-glass-ios p-3.5 text-left hover:scale-[1.01] active:scale-95 transition-transform duration-200 cursor-pointer ${
              isLight ? 'bg-white/80 border-slate-200' : ''
            }`}
          >
            <HardDrive className={`w-5 h-5 mb-2 text-white`} />
            <p className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Drive</p>
            <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/70'}`}>{files.length} items</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('Photos')}
            className={`rounded-2xl liquid-glass-ios p-3.5 text-left hover:scale-[1.01] active:scale-95 transition-transform duration-200 cursor-pointer ${
              isLight ? 'bg-white/80 border-slate-200' : ''
            }`}
          >
            <ImageIcon className={`w-5 h-5 mb-2 text-white`} />
            <p className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Photos</p>
            <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/70'}`}>Gallery</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('Vault')}
            className={`rounded-2xl liquid-glass-ios p-3.5 text-left hover:scale-[1.01] active:scale-95 transition-transform duration-200 cursor-pointer ${
              isLight ? 'bg-white/80 border-slate-200' : ''
            }`}
          >
            <ShieldCheck className={`w-5 h-5 mb-2 text-white`} />
            <p className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Vault</p>
            <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/70'}`}>Locked</p>
          </button>
        </div>
      </div>

      {/* Recent Files List */}
      <div className="animate-ios-fade-up stagger-2">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className={`text-xs uppercase tracking-wider font-bold ${
            isLight ? 'text-slate-600' : 'text-white'
          }`}>
            Recent Documents
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('Drive')}
            className={`text-xs flex items-center gap-1 font-bold cursor-pointer active:scale-95 transition-transform ${
              isLight ? 'text-slate-800 hover:text-slate-950' : 'text-white hover:text-white/90'
            }`}
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          {files.slice(0, 4).map((file, i) => (
            <div
              key={file.id}
              onClick={() => onNavigate('Drive')}
              className={`rounded-2xl liquid-glass-ios p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-transform duration-200 ${
                isLight ? 'bg-white/80 border-slate-200 hover:bg-white' : 'hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 mr-2">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/20 text-white'
                }`}>
                  <FileText className={`w-4.5 h-4.5 text-white`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate leading-snug tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {file.title}
                  </p>
                  <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-white/70'}`}>
                    {file.size} • {file.updatedAt}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border shrink-0 font-semibold ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/10 border-white/20 text-white'
              }`}>
                {file.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MARKETING & DEVELOPER CTA */}
      <div 
        id="developer-cta-card"
        className={`mt-6 rounded-3xl liquid-glass-ios p-5 sm:p-6 border transition-all ${
          isLight 
            ? 'bg-gradient-to-br from-white/90 to-sky-50/50 border-sky-200/60 shadow-md text-slate-900' 
            : 'bg-gradient-to-br from-white/10 to-sky-500/10 border-white/20 shadow-2xl text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
              Custom Development
            </span>
            <h3 className="text-base sm:text-lg font-bold tracking-tight mt-1.5">
              Need a Custom App like this?
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              Developed by Abdullah Al Hadi • High-Performance Web & PWA Solutions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            id="cta-whatsapp-btn"
            href="https://wa.me/8801723257754"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glass-ios py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">WhatsApp (+8801723257754)</span>
          </a>

          <a
            id="cta-email-btn"
            href="mailto:abdullahalhadidev@gmail.com"
            className={`btn-glass-ios py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-xs border transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
              isLight 
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0 text-sky-400" />
            <span className="truncate">Email (abdullahalhadidev@gmail.com)</span>
          </a>
        </div>

        <p className="text-sm font-semibold text-white/50 mt-4 text-center tracking-wide">Support Developer</p>
      </div>

      <DeveloperSignature />
    </div>
  );
};
