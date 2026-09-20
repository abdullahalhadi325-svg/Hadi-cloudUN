import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  KeyRound, 
  ShieldAlert, 
  FileText, 
  Download, 
  Eye, 
  Layers, 
  X,
  Loader2,
  Trash2
} from 'lucide-react';
import { useHadiCloudStore } from '../store';
import { DeveloperSignature } from './DeveloperSignature';
import { verifyVaultPin, setupVaultPin, isVaultPinConfigured } from '../cryptoService';
import { downloadAndReassembleFile } from '../telegramService';
import { CloudFile } from '../types';

export const VaultTab: React.FC = () => {
  const theme = useHadiCloudStore((state) => state.theme);
  const files = useHadiCloudStore((state) => state.files);
  const user = useHadiCloudStore((state) => state.user);
  const storageChannelId = useHadiCloudStore((state) => state.storageChannelId);
  const deleteFileFromFirestore = useHadiCloudStore((state) => state.deleteFileFromFirestore);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  const isLight = theme === 'light';

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [unlockedPin, setUnlockedPin] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected file modal inside Vault
  const [selectedVaultFile, setSelectedVaultFile] = useState<CloudFile | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Filter encrypted vault files from Firestore
  const vaultFiles = (files || []).filter((f) => f && f.is_encrypted);

  // Fallback demo vault entries if none moved yet
  const dummyVaultEntries: CloudFile[] = [
    {
      id: 'v-1',
      name: 'Server_Recovery_Keys.asc',
      title: 'Server_Recovery_Keys.asc',
      size: '12 KB',
      type: 'code',
      updatedAt: 'Sep 19',
      chunk_msg_ids: [2001],
      total_chunks: 1,
      is_encrypted: true,
      iv: 'dGVzdF9pdl8xMjM=',
      mimeType: 'text/plain',
    },
    {
      id: 'v-2',
      name: 'Identity_Passport_Backup.pdf',
      title: 'Identity_Passport_Backup.pdf',
      size: '2.1 MB',
      type: 'pdf',
      updatedAt: 'Sep 17',
      chunk_msg_ids: [2002],
      total_chunks: 1,
      is_encrypted: true,
      iv: 'dGVzdF9pdl80NTY=',
      mimeType: 'application/pdf',
    },
    {
      id: 'v-3',
      name: 'Cold_Storage_Seed_Phrase.dat',
      title: 'Cold_Storage_Seed_Phrase.dat',
      size: '4 KB',
      type: 'code',
      updatedAt: 'Sep 14',
      chunk_msg_ids: [2003],
      total_chunks: 1,
      is_encrypted: true,
      iv: 'dGVzdF9pdl83ODk=',
      mimeType: 'text/plain',
    },
  ];

  const displayVaultItems = vaultFiles.length > 0 ? vaultFiles : dummyVaultEntries;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setShowError(true);
      setErrorMessage('Please enter a 4-digit PIN');
      return;
    }

    const hasConfigured = isVaultPinConfigured();
    if (!hasConfigured) {
      // First time setting PIN
      await setupVaultPin(pin);
      setIsUnlocked(true);
      setUnlockedPin(pin);
      return;
    }

    const isValid = await verifyVaultPin(pin);
    if (isValid) {
      setIsUnlocked(true);
      setUnlockedPin(pin);
      setShowError(false);
    } else {
      setShowError(true);
      setErrorMessage('Incorrect PIN. (Default: 1234)');
    }
  };

  /**
   * ZERO-KNOWLEDGE IN-MEMORY DECRYPTION:
   * Downloads chunk messages from Telegram.
   * Decrypts binary buffer in-memory using AES-GCM 256-bit with unlocked PIN and file IV.
   * NEVER stores decrypted buffer on disk or server.
   */
  const handleDecryptAndAccess = async (file: CloudFile, action: 'download' | 'preview') => {
    setIsDecrypting(true);
    const channelId = user?.storageChannelId || storageChannelId || 'Hadi_Cloud_Storage';
    const msgIds = file.chunk_msg_ids && file.chunk_msg_ids.length > 0 ? file.chunk_msg_ids : [2001];

    setIoProgress({
      active: true,
      type: 'decrypt',
      fileName: file.name,
      currentChunk: 1,
      totalChunks: msgIds.length,
      statusText: `Fetching & decrypting AES-GCM chunks...`,
      percentage: 15,
      isBackingOff: false,
    });

    try {
      const { blobUrl } = await downloadAndReassembleFile(
        file.name,
        file.mimeType || 'application/octet-stream',
        msgIds,
        channelId,
        (p) => {
          setIoProgress({
            active: true,
            type: 'decrypt',
            fileName: file.name,
            currentChunk: p.currentChunk,
            totalChunks: p.totalChunks,
            statusText: p.statusText,
            percentage: p.percentage,
            isBackingOff: p.isBackingOff,
            backoffSeconds: p.backoffSeconds,
          });
        },
        {
          isEncrypted: true,
          decryptWithPin: unlockedPin,
          ivBase64: file.iv || 'default_iv',
        }
      );

      if (action === 'download') {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(blobUrl, '_blank');
      }

      setIoProgress({
        active: true,
        type: 'decrypt',
        fileName: file.name,
        currentChunk: msgIds.length,
        totalChunks: msgIds.length,
        statusText: 'In-memory decryption complete!',
        percentage: 100,
        isBackingOff: false,
      });

      setTimeout(() => {
        setIoProgress(null);
      }, 2000);

      setSelectedVaultFile(null);
    } catch (err: any) {
      console.error('Vault decryption error:', err);
      alert(`Decryption notice: ${err.message || 'Error decrypting zero-knowledge payload'}`);
      setIoProgress(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div id="vault-tab-container" className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className={`text-xs uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
            Secure Vault (AES-GCM 256)
          </h2>
        </div>
        <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          Zero-Knowledge
        </span>
      </div>

      {!isUnlocked ? (
        <div className={`rounded-3xl liquid-glass-ios p-6 sm:p-8 text-center ${
          isLight ? 'bg-white/80 border-slate-200 text-slate-900 shadow-xs' : 'text-white'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/20 text-white'
          }`}>
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm sm:text-base font-bold mb-1">Encrypted Enclave Locked</h3>
          <p className={`text-xs mb-5 max-w-xs mx-auto ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
            Enter your 4-digit PIN to derive AES-256 decryption key in-memory. (Default PIN: 1234)
          </p>

          <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-3">
            <div>
              <input
                id="vault-pin-input"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setShowError(false);
                }}
                placeholder="PIN (1234)"
                className={`w-full px-4 py-2.5 rounded-2xl text-center text-lg tracking-widest border focus:outline-none transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' 
                    : 'bg-white/10 border-white/20 text-white focus:border-emerald-400'
                }`}
              />
              {showError && (
                <p className="text-[11px] text-rose-400 mt-1.5 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </p>
              )}
            </div>

            <button
              id="btn-unlock-vault"
              type="submit"
              className={`w-full py-2.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock Vault</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Status banner */}
          <div className={`rounded-2xl p-3.5 flex items-center justify-between border ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">Vault Unlocked (AES-GCM 256)</p>
                <p className={`text-[10px] truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400/80'}`}>
                  Key derived via PBKDF2 • Strict in-memory access
                </p>
              </div>
            </div>
            <button
              id="btn-lock-vault"
              type="button"
              onClick={() => {
                setIsUnlocked(false);
                setUnlockedPin('');
                setPin('');
              }}
              className="btn-glass-ios text-[11px] px-3 py-1 border border-emerald-500/30 font-medium cursor-pointer text-emerald-400"
            >
              Lock Vault
            </button>
          </div>

          {/* Encrypted Vault items list */}
          <div className="space-y-2 animate-ios-fade-up">
            {displayVaultItems.map((item, idx) => (
              <div
                key={item.id}
                id={`vault-item-${item.id}`}
                className={`rounded-2xl liquid-glass-ios p-3 sm:p-3.5 flex items-center justify-between gap-3 animate-ios-fade-up stagger-${Math.min((idx % 9) + 1, 9)} active:scale-95 transition-transform duration-200 ${
                  isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isLight ? 'bg-slate-100 border-slate-200 text-emerald-600' : 'bg-white/10 border-white/20 text-emerald-300'
                  }`}>
                    <Lock className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-tight truncate text-white">{item.name}</p>
                    <p className={`text-[11px] font-medium truncate ${isLight ? 'text-slate-500' : 'text-white/70'}`}>
                      AES-GCM Encrypted • {item.size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedVaultFile(item)}
                    className={`btn-glass-ios text-xs px-3 py-1.5 border font-semibold shrink-0 cursor-pointer active:scale-90 transition-transform ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/15 border-white/25 text-white hover:bg-white/25'
                    }`}
                  >
                    Options
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vault File Decryption Centered Modal */}
      {selectedVaultFile && (
        <div className="hadi-backdrop transition-all">
          <div className="absolute inset-0" onClick={() => !isDecrypting && setSelectedVaultFile(null)} />

          <div 
            id="vault-file-modal"
            className="hadi-modal animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate text-white">{selectedVaultFile.name}</h3>
                  <p className="text-[10px] text-white/60 truncate">
                    {selectedVaultFile.size} • Zero-Knowledge Encrypted
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDecrypting}
                onClick={() => setSelectedVaultFile(null)}
                className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isDecrypting}
                onClick={() => handleDecryptAndAccess(selectedVaultFile, 'preview')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer active:scale-[0.98] transition-all bg-white/5 hover:bg-white/15 border border-white/10 text-white"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>In-Memory Decrypt & Preview</span>
                </div>
                {isDecrypting && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              </button>

              <button
                type="button"
                disabled={isDecrypting}
                onClick={() => handleDecryptAndAccess(selectedVaultFile, 'download')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer active:scale-[0.98] transition-all bg-white/5 hover:bg-white/15 border border-white/10 text-white"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>Decrypt & Download Plaintext</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteFileFromFirestore(selectedVaultFile.id);
                  setSelectedVaultFile(null);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer active:scale-[0.98] transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete from Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Signature */}
      <DeveloperSignature />
    </div>
  );
};
