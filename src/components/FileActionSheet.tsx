import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Trash2, 
  Star, 
  Share2, 
  Lock, 
  FileText, 
  Loader2, 
  Check, 
  Layers,
  Eye,
  AlertCircle
} from 'lucide-react';
import { CloudFile } from '../types';
import { useHadiCloudStore } from '../store';
import { downloadAndReassembleFile } from '../telegramService';

interface FileActionSheetProps {
  file: CloudFile | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onMoveToVault?: (file: CloudFile) => void;
}

export const FileActionSheet: React.FC<FileActionSheetProps> = ({
  file,
  onClose,
  onDelete,
  onToggleStar,
  onMoveToVault,
}) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const triggerHaptic = (ms = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors
    }
  };

  React.useEffect(() => {
    if (file) {
      triggerHaptic(20);
    }
  }, [file]);

  if (!file) return null;

  const isLight = theme === 'light';
  const effectiveTitle = file.name || file.title || 'Untitled Document';
  const chunkCount = file.total_chunks || (file.chunk_msg_ids ? file.chunk_msg_ids.length : 1);

  const handleDownloadAndReassemble = async (action: 'download' | 'preview') => {
    setIsDownloading(true);
    setErrorMessage('');
    setDownloadSuccess(false);

    const channelId = user?.storageChannelId || 'Hadi_Cloud_Storage';
    const chunkMsgIds = file.chunk_msg_ids || [];

    setIoProgress({
      active: true,
      type: 'download',
      fileName: effectiveTitle,
      currentChunk: 1,
      totalChunks: chunkCount,
      statusText: `Preparing slices for ${effectiveTitle}...`,
      percentage: 5,
      isBackingOff: false,
    });

    try {
      const mimeType = file.type === 'pdf' ? 'application/pdf' :
                       file.type === 'image' ? 'image/jpeg' :
                       file.type === 'video' ? 'video/mp4' :
                       file.type === 'code' ? 'text/plain' :
                       file.type === 'spreadsheet' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                       file.type === 'archive' ? 'application/zip' : 'application/octet-stream';

      const { blobUrl } = await downloadAndReassembleFile(
        effectiveTitle,
        mimeType,
        chunkMsgIds,
        channelId,
        (progress) => {
          setIoProgress({
            active: true,
            type: 'download',
            fileName: effectiveTitle,
            currentChunk: progress.currentChunk,
            totalChunks: progress.totalChunks,
            statusText: progress.isBackingOff
              ? `Waiting before slice ${progress.currentChunk}/${progress.totalChunks}...`
              : `Downloading slice ${progress.currentChunk} of ${progress.totalChunks} (${progress.percentage}%)...`,
            percentage: progress.percentage,
            isBackingOff: progress.isBackingOff,
          });
        }
      );

      if (action === 'preview') {
        const previewWindow = window.open(blobUrl, '_blank');
        if (!previewWindow) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.target = '_blank';
          a.click();
        }
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = effectiveTitle;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setDownloadSuccess(true);
      setIoProgress({
        active: true,
        type: 'download',
        fileName: effectiveTitle,
        currentChunk: chunkCount,
        totalChunks: chunkCount,
        statusText: 'File ready!',
        percentage: 100,
        isBackingOff: false,
      });

      setTimeout(() => {
        setIoProgress({
          active: false,
          type: 'download',
          fileName: '',
          currentChunk: 0,
          totalChunks: 0,
          statusText: '',
          percentage: 0,
          isBackingOff: false,
        });
        setIsDownloading(false);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sequential download failed.';
      setErrorMessage(msg);
      setIsDownloading(false);
      setIoProgress({
        active: false,
        type: 'download',
        fileName: '',
        currentChunk: 0,
        totalChunks: 0,
        statusText: '',
        percentage: 0,
        isBackingOff: false,
      });
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/#file=${file.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-all">
      <div className="absolute inset-0" onClick={() => !isDownloading && onClose()} />

      <div id="file-action-modal" className="w-full max-w-sm rounded-3xl p-6 bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 shadow-2xl text-white overflow-hidden transform-gpu animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate leading-tight tracking-tight text-white">{effectiveTitle}</h3>
              <p className="text-xs font-semibold mt-0.5 text-white/70">
                {file.size} • {file.updatedAt}
              </p>
            </div>
          </div>
          <button
            id="btn-close-action-sheet"
            type="button"
            disabled={isDownloading}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/20 bg-white/10 text-white transition-all cursor-pointer active:scale-90"
            aria-label="Close action sheet"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* File info banner */}
        <div className="mb-3.5 p-3 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-between text-xs font-semibold text-white/90">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>File Info</span>
          </div>
          <span className="font-mono text-sky-400 font-bold">{chunkCount} × 20MB slices</span>
        </div>

        {errorMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5">
          {/* Download File */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => handleDownloadAndReassemble('download')}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.98] hover:bg-white/15 text-white bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4.5 h-4.5 text-sky-400" />
              <span>Download File</span>
            </div>
            {isDownloading && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
            {downloadSuccess && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Preview File */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => handleDownloadAndReassemble('preview')}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer active:scale-[0.98] hover:bg-white/15 text-white bg-white/5 border border-white/10"
          >
            <Eye className="w-4.5 h-4.5 text-white" />
            <span>Preview File</span>
          </button>

          {/* Move to Secure Vault */}
          {onMoveToVault && !file.is_encrypted && (
            <button
              id="btn-move-to-vault"
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onMoveToVault(file);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer active:scale-[0.98] hover:bg-emerald-500/20 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
            >
              <Lock className="w-4.5 h-4.5 text-emerald-400" />
              <span>Move to Secure Vault</span>
            </button>
          )}

          {/* Star / Unstar */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onToggleStar(file.id);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer active:scale-[0.98] hover:bg-white/15 text-white"
          >
            <Star className={`w-4.5 h-4.5 ${file.isStarred ? 'text-amber-400 fill-amber-400' : 'text-white/70'}`} />
            <span>{file.isStarred ? 'Remove from Starred' : 'Star this file'}</span>
          </button>

          {/* Share Link */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              handleCopyShareLink();
            }}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.98] hover:bg-white/15 text-white"
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-4.5 h-4.5 text-white/70" />
              <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Share File Link'}</span>
            </div>
            {copiedLink && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Delete File */}
          <button
            id="btn-delete-file-action"
            type="button"
            disabled={isDownloading}
            onClick={() => {
              triggerHaptic(25);
              if (window.confirm(`Delete "${effectiveTitle}" permanently?`)) {
                onDelete(file.id);
                onClose();
              }
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer active:scale-[0.98] hover:bg-rose-500/20 text-rose-400"
          >
            <Trash2 className="w-4.5 h-4.5" />
            <span>Delete File Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
};
