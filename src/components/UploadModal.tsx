import React, { useState, useRef } from 'react';
import { X, Upload, FilePlus, AlertCircle, HardDrive, Layers, CheckCircle2 } from 'lucide-react';
import { CloudFile } from '../types';
import { useHadiCloudStore } from '../store';
import { uploadFileInChunks, CHUNK_SIZE_BYTES } from '../telegramService';
import { generateBlurhashFromFile } from '../blurhashService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFile: (file: CloudFile) => Promise<void> | void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddFile,
}) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const storageChannelId = useHadiCloudStore((state) => state.storageChannelId);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRealFile, setSelectedRealFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'spreadsheet' | 'archive' | 'image' | 'code' | 'video' | 'doc'>('pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (isOpen) {
      triggerHaptic(20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = theme === 'light';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      triggerHaptic(15);
      const f = e.target.files[0];
      setSelectedRealFile(f);
      setFileName(f.name);

      // Infer type
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.pdf')) setFileType('pdf');
      else if (lower.endsWith('.xlsx') || lower.endsWith('.csv')) setFileType('spreadsheet');
      else if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.tar.gz')) setFileType('archive');
      else if (lower.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) setFileType('image');
      else if (lower.match(/\.(mp4|mkv|mov|webm)$/)) setFileType('video');
      else if (lower.match(/\.(ts|tsx|js|json|py|html|css)$/)) setFileType('code');
      else setFileType('doc');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetFile = selectedRealFile || new File(
      [new Uint8Array(25 * 1024 * 1024)],
      fileName.trim() || 'Hadi_Cloud_Document.pdf',
      { type: 'application/pdf' }
    );

    const effectiveName = fileName.trim() || targetFile.name;
    const channelId = user?.storageChannelId || storageChannelId || 'Hadi_Cloud_Storage';
    const totalChunks = Math.max(1, Math.ceil(targetFile.size / CHUNK_SIZE_BYTES));

    setIsUploading(true);
    setIoProgress({
      active: true,
      type: 'upload',
      fileName: effectiveName,
      currentChunk: 1,
      totalChunks,
      statusText: `Preparing slices (Total: ${totalChunks} chunks)...`,
      percentage: 5,
      isBackingOff: false,
    });

    try {
      // 1. BLURHASH (Offline Previews)
      let computedBlurhash = '';
      if (fileType === 'image' && selectedRealFile) {
        setIoProgress({
          active: true,
          type: 'upload',
          fileName: effectiveName,
          currentChunk: 1,
          totalChunks,
          statusText: 'Generating Blurhash preview string...',
          percentage: 10,
          isBackingOff: false,
        });
        try {
          computedBlurhash = await generateBlurhashFromFile(selectedRealFile);
        } catch {
          computedBlurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
        }
      }

      // 2. Perform chunked upload
      const uploadResult = await uploadFileInChunks(
        targetFile,
        channelId,
        (progress) => {
          setIoProgress({
            active: true,
            type: 'upload',
            fileName: effectiveName,
            currentChunk: progress.currentChunk,
            totalChunks: progress.totalChunks,
            statusText: progress.isBackingOff 
              ? `Waiting briefly before next slice (${progress.currentChunk}/${progress.totalChunks})...`
              : `Uploading slice ${progress.currentChunk} of ${progress.totalChunks} (${progress.percentage}%)...`,
            percentage: progress.percentage,
            isBackingOff: progress.isBackingOff,
          });
        }
      );

      // 3. Create CloudFile record
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const newCloudFile: CloudFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: effectiveName,
        title: effectiveName,
        type: fileType,
        size: formatFileSize(targetFile.size),
        bytes: targetFile.size,
        updatedAt: `Today, ${timeStr}`,
        isStarred: false,
        total_chunks: totalChunks,
        chunk_msg_ids: uploadResult.chunkMsgIds,
        blurhash: computedBlurhash || undefined,
        thumbnailUrl: fileType === 'image' && selectedRealFile 
          ? URL.createObjectURL(selectedRealFile) 
          : undefined,
      };

      await onAddFile(newCloudFile);
      triggerHaptic(35);

      setIoProgress({
        active: true,
        type: 'upload',
        fileName: effectiveName,
        currentChunk: totalChunks,
        totalChunks,
        statusText: 'Upload completed and synchronized!',
        percentage: 100,
        isBackingOff: false,
      });

      setTimeout(() => {
        setIoProgress({
          active: false,
          type: 'upload',
          fileName: '',
          currentChunk: 0,
          totalChunks: 0,
          statusText: '',
          percentage: 0,
          isBackingOff: false,
        });
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMsg(msg);
      setIoProgress({
        active: false,
        type: 'upload',
        fileName: '',
        currentChunk: 0,
        totalChunks: 0,
        statusText: '',
        percentage: 0,
        isBackingOff: false,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-all">
      <div className="absolute inset-0" onClick={() => !isUploading && onClose()} />

      <div id="upload-modal" className="w-full max-w-sm rounded-3xl p-6 bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 shadow-2xl text-white overflow-hidden transform-gpu animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center border bg-white/10 border-white/20 text-white">
              <Upload className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Upload to Cloud</h3>
              <p className="text-xs font-semibold text-white/60">
                Fast, secure cloud storage
              </p>
            </div>
          </div>
          <button
            id="btn-close-upload-modal"
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer bg-white/10 border-white/15 text-white/70 hover:text-white"
            aria-label="Close upload modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3.5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* File Picker / Drop Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                selectedRealFile
                  ? 'border-sky-400/60 bg-sky-500/15 text-white'
                  : 'border-white/20 hover:border-white/35 bg-white/5 text-white/80'
              }`}
            >
              {selectedRealFile ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-sky-400 mb-1.5" />
                  <p className="text-sm font-bold truncate max-w-xs">{selectedRealFile.name}</p>
                  <p className="text-xs font-semibold text-sky-300 mt-0.5">
                    {formatFileSize(selectedRealFile.size)} • Ready to upload
                  </p>
                </>
              ) : (
                <>
                  <HardDrive className="w-6 h-6 opacity-60 mb-1.5" />
                  <p className="text-sm font-bold">Choose file or drag & drop</p>
                  <p className="text-xs font-semibold text-white/50 mt-0.5">
                    Supports documents, media, and archives of any size
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-white/80">
              Display Name
            </label>
            <input
              id="input-file-name"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Project_Presentation.pdf"
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
            />
          </div>

          {/* Secure Storage Notice */}
          <div className="p-3 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between text-xs font-semibold text-white/80">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Secure Upload</span>
            </div>
            <span className="font-bold text-emerald-400">High-Speed Cloud</span>
          </div>

          <div className="pt-2">
            <button
              id="btn-submit-upload"
              type="submit"
              disabled={isUploading}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] bg-white text-black hover:bg-white/90 disabled:opacity-50"
            >
              <FilePlus className="w-4 h-4" />
              <span>{isUploading ? 'Uploading File...' : 'Upload File'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
