import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, X, Loader2 } from 'lucide-react';
import { CloudFile } from '../types';
import { useHadiCloudStore } from '../store';
import { verifyVaultPin, setupVaultPin, isVaultPinConfigured } from '../cryptoService';
import { downloadAndReassembleFile, uploadFileInChunks } from '../telegramService';

interface MoveToVaultModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MoveToVaultModal: React.FC<MoveToVaultModalProps> = ({
  file,
  isOpen,
  onClose,
}) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const storageChannelId = useHadiCloudStore((state) => state.storageChannelId);
  const moveFileToVaultInFirestore = useHadiCloudStore((state) => state.moveFileToVaultInFirestore);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !file) return null;

  const isLight = theme === 'light';
  const hasConfiguredPin = isVaultPinConfigured();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg('Please enter a 4-digit numeric PIN');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Verify or set initial PIN
      if (hasConfiguredPin) {
        const isValid = await verifyVaultPin(pin);
        if (!isValid) {
          setErrorMsg('Incorrect PIN. Please re-enter.');
          setIsProcessing(false);
          return;
        }
      } else {
        // Store PIN hash in localStorage for zero-knowledge locking
        await setupVaultPin(pin);
      }

      // 2. Fetch raw file binary from Telegram or local cache
      const channelId = user?.storageChannelId || storageChannelId || 'Hadi_Cloud_Storage';
      const msgIds = file.chunk_msg_ids && file.chunk_msg_ids.length > 0 ? file.chunk_msg_ids : [1001];

      setIoProgress({
        active: true,
        type: 'encrypt',
        fileName: file.name,
        currentChunk: 1,
        totalChunks: msgIds.length,
        statusText: 'Reassembling chunks for AES-GCM encryption...',
        percentage: 20,
        isBackingOff: false,
      });

      const { blob } = await downloadAndReassembleFile(
        file.name,
        file.mimeType || 'application/octet-stream',
        msgIds,
        channelId,
        (p) => {
          setIoProgress({
            active: true,
            type: 'encrypt',
            fileName: file.name,
            currentChunk: p.currentChunk,
            totalChunks: p.totalChunks,
            statusText: `Preparing chunk ${p.currentChunk}/${p.totalChunks} for encryption...`,
            percentage: Math.round(p.percentage * 0.4),
            isBackingOff: false,
          });
        }
      );

      // 3. Encrypt raw chunks with Web Crypto API (AES-GCM 256-bit) and re-upload to Telegram
      const reconstructedFile = new File([blob], file.name, { type: file.mimeType });

      setIoProgress({
        active: true,
        type: 'encrypt',
        fileName: file.name,
        currentChunk: 1,
        totalChunks: file.total_chunks || 1,
        statusText: 'Encrypting chunks with AES-GCM 256-bit...',
        percentage: 50,
        isBackingOff: false,
      });

      const uploadResult = await uploadFileInChunks(
        reconstructedFile,
        channelId,
        (p) => {
          setIoProgress({
            active: true,
            type: 'encrypt',
            fileName: file.name,
            currentChunk: p.currentChunk,
            totalChunks: p.totalChunks,
            statusText: `Encrypting & dispatching chunk ${p.currentChunk}/${p.totalChunks}...`,
            percentage: 50 + Math.round(p.percentage * 0.5),
            isBackingOff: p.isBackingOff,
            backoffSeconds: p.backoffSeconds,
          });
        },
        { encryptWithPin: pin }
      );

      // 4. Update Firestore is_encrypted: true and store IV
      await moveFileToVaultInFirestore(file.id, uploadResult.ivBase64 || 'default_iv');

      setIoProgress({
        active: true,
        type: 'encrypt',
        fileName: file.name,
        currentChunk: file.total_chunks || 1,
        totalChunks: file.total_chunks || 1,
        statusText: 'Locked in Zero-Knowledge Vault!',
        percentage: 100,
        isBackingOff: false,
      });

      setTimeout(() => {
        setIoProgress(null);
      }, 2000);

      onClose();
    } catch (err: any) {
      console.error('Move to vault error:', err);
      setErrorMsg(err.message || 'Failed to encrypt document into vault.');
      setIoProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
      <div className="absolute inset-0" onClick={() => !isProcessing && onClose()} />

      <div 
        id="move-to-vault-modal"
        className="w-full max-w-sm rounded-3xl p-6 bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-white overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold">Move to Private Vault</h3>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                AES-GCM 256-bit Zero-Knowledge
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center border cursor-pointer ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/10 border-white/15 text-white/70'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className={`text-xs mb-3.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
          File <strong className="font-semibold">{file.name}</strong> will be encrypted in-memory before transmission to Telegram. Enter your 4-digit Vault PIN:
        </p>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3.5">
          <input
            id="vault-modal-pin-input"
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setErrorMsg('');
            }}
            placeholder="•••• (4 digits)"
            autoFocus
            className={`w-full px-4 py-2.5 rounded-2xl text-center text-lg tracking-widest border focus:outline-none transition-all ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' 
                : 'bg-white/10 border-white/20 text-white focus:border-emerald-400'
            }`}
          />

          <button
            id="btn-confirm-move-to-vault"
            type="submit"
            disabled={isProcessing || pin.length !== 4}
            className={`w-full py-2.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
              isLight 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50' 
                : 'bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Encrypting & Storing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypt with AES-256</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
