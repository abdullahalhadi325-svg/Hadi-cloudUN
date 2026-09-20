import React from 'react';
import { Loader2, UploadCloud, DownloadCloud, AlertTriangle, X } from 'lucide-react';
import { useHadiCloudStore } from '../store';

export const ProgressToast: React.FC = () => {
  const theme = useHadiCloudStore((state) => state.theme);
  const ioProgress = useHadiCloudStore((state) => state.ioProgress);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  if (!ioProgress || !ioProgress.active) return null;

  const isLight = theme === 'light';
  const isUpload = ioProgress.type === 'upload';

  return (
    <div 
      id="liquid-glass-progress-toast"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      <div 
        className={`rounded-2xl liquid-glass-ios p-3.5 shadow-xl border transition-all ${
          isLight 
            ? 'bg-white/90 text-slate-900 border-slate-300/80 shadow-slate-200' 
            : 'text-white border-white/20 shadow-black/60'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Animated Status Icon */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              ioProgress.isBackingOff
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 animate-bounce'
                : isUpload
                  ? 'bg-sky-500/20 border-sky-500/30 text-sky-400'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}>
              {ioProgress.isBackingOff ? (
                <AlertTriangle className="w-4 h-4" />
              ) : isUpload ? (
                <UploadCloud className="w-4 h-4 animate-pulse" />
              ) : (
                <DownloadCloud className="w-4 h-4 animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold truncate max-w-[170px] sm:max-w-[220px]">
                  {ioProgress.fileName}
                </span>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/10 border-white/15 text-white/70'
                }`}>
                  {ioProgress.type}
                </span>
              </div>
              <p className={`text-[11px] font-medium leading-tight truncate mt-0.5 ${
                ioProgress.isBackingOff 
                  ? 'text-amber-400' 
                  : isLight ? 'text-slate-600' : 'text-white/70'
              }`}>
                {ioProgress.statusText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono">
              {ioProgress.percentage}%
            </span>
            <button
              type="button"
              onClick={() => setIoProgress(null)}
              className={`w-6 h-6 rounded-full flex items-center justify-center border cursor-pointer ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200' : 'bg-white/10 border-white/15 text-white/60 hover:text-white'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Progress Bar with 20MB Chunk Markers */}
        <div className={`h-2 w-full rounded-full overflow-hidden p-0.5 border relative ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
        }`}>
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              ioProgress.isBackingOff
                ? 'bg-amber-400'
                : isUpload
                  ? 'bg-sky-500'
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, ioProgress.percentage))}%` }}
          />
        </div>

        <div className={`flex justify-between items-center text-[10px] mt-1.5 ${
          isLight ? 'text-slate-500' : 'text-white/50'
        }`}>
          <span>Chunk {ioProgress.currentChunk} of {ioProgress.totalChunks} (20MB Slices)</span>
          <span>{ioProgress.isBackingOff ? 'Exponential Backoff' : 'MTProto Safe'}</span>
        </div>
      </div>
    </div>
  );
};
