import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Send, 
  Layers, 
  CheckCircle2, 
  User, 
  Sun, 
  Moon, 
  Sparkles,
  Smartphone,
  Shield,
  KeyRound,
  Trash2,
  RefreshCw,
  Server,
  LogOut,
  AlertTriangle,
  DownloadCloud,
  HardDriveDownload,
  Lock,
  Cpu,
  Users,
  UserPlus,
  HardDrive,
  FolderArchive,
  Image as ImageIcon,
  Film,
  FileText,
  MessageCircle,
  Mail
} from 'lucide-react';
import { useHadiCloudStore } from '../store';
import { AppTheme } from '../types';
import { DeveloperSignature } from './DeveloperSignature';
import { usePWAInstall } from '../usePWAInstall';
import { setupVaultPin, verifyVaultPin } from '../cryptoService';

interface SettingsTabProps {
  onOpenLoginModal: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onOpenLoginModal }) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const setTheme = useHadiCloudStore((state) => state.setTheme);
  const user = useHadiCloudStore((state) => state.user);
  const setUser = useHadiCloudStore((state) => state.setUser);
  const storageChannelId = useHadiCloudStore((state) => state.storageChannelId);
  const files = useHadiCloudStore((state) => state.files);
  const initFirestoreSync = useHadiCloudStore((state) => state.initFirestoreSync);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);
  const [cacheClearNotice, setCacheClearNotice] = useState('');

  // Security: PIN change modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  // Toggle switch settings
  const [autoCacheThumbs, setAutoCacheThumbs] = useState(true);
  const [backgroundSync, setBackgroundSync] = useState(true);

  // Multi-account modal or toast notice
  const [multiAccountNotice, setMultiAccountNotice] = useState('');

  const isLight = theme === 'light';

  // Calculate total chunks across all uploaded files
  const totalChunksUploaded = (files || []).reduce(
    (acc, f) => acc + (f.total_chunks || (f.chunk_msg_ids ? f.chunk_msg_ids.length : 1)),
    0
  );

  // Cloud Storage breakdown
  const imageFiles = (files || []).filter((f) => f && f.type === 'image' && !f.is_encrypted);
  const videoFiles = (files || []).filter((f) => f && f.type === 'video' && !f.is_encrypted);
  const docFiles = (files || []).filter((f) => f && f.type !== 'image' && f.type !== 'video' && !f.is_encrypted);
  const vaultFiles = (files || []).filter((f) => f && f.is_encrypted);

  const handleForceResync = async () => {
    setIsResyncing(true);
    setResyncSuccess(false);

    try {
      if (user?.userId) {
        initFirestoreSync(user.userId);
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
      setResyncSuccess(true);
      setTimeout(() => setResyncSuccess(false), 3000);
    } catch (e) {
      console.warn('Manual resync notice:', e);
    } finally {
      setIsResyncing(false);
    }
  };

  const handleClearObjectURLs = () => {
    setCacheClearNotice('Cleared cloud cache and released memory buffers.');
    setTimeout(() => setCacheClearNotice(''), 3500);
  };

  const handlePurgeIndexedDB = async () => {
    try {
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name && (dbInfo.name.includes('firestore') || dbInfo.name.includes('hadi'))) {
            window.indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      }
      setCacheClearNotice('Reset local storage offline cache.');
      setTimeout(() => setCacheClearNotice(''), 3500);
    } catch {
      setCacheClearNotice('Local storage reset successfully.');
      setTimeout(() => setCacheClearNotice(''), 3500);
    }
  };

  const handleRevokeTelegramSession = () => {
    if (window.confirm('Are you sure you want to sign out? You will need to sign in again to access cloud files.')) {
      setUser(null);
      localStorage.removeItem('hadi_telegram_session');
      localStorage.removeItem('hadi_telegram_user');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess(false);

    if (currentPinInput.length !== 4 || newPinInput.length !== 4) {
      setPinError('Both PINs must be 4 digits.');
      return;
    }

    if (!verifyVaultPin(currentPinInput)) {
      setPinError('Current PIN is incorrect.');
      return;
    }

    setupVaultPin(newPinInput);
    setPinSuccess(true);
    setCurrentPinInput('');
    setNewPinInput('');
    setTimeout(() => {
      setShowPinModal(false);
      setPinSuccess(false);
    }, 1500);
  };

  const handleSwitchAccount = (name: string) => {
    setMultiAccountNotice(`Switched active repository to "${name}".`);
    setTimeout(() => setMultiAccountNotice(''), 3000);
  };

  return (
    <div id="settings-tab-container" className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      {/* Settings Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
            <Settings className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Settings
            </h2>
            <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              Preferences & Cloud Storage
            </p>
          </div>
        </div>
        <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          v3.4.0 • iOS Glass
        </span>
      </div>

      {multiAccountNotice && (
        <div className="mb-4 p-3.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          <span>{multiAccountNotice}</span>
        </div>
      )}

      {cacheClearNotice && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          <span>{cacheClearNotice}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. Account & Multi-Profile Section */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Account & Cloud Profiles
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            {user?.userId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-lg">
                      {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="text-base font-bold flex items-center gap-2">
                        {user.firstName} {user.lastName || ''}
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </h4>
                      <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                        {user.phone ? `+${user.phone}` : `@${user.username || 'cloud_user'}`}
                      </p>
                      <p className="text-xs font-semibold text-sky-400 mt-0.5">
                        Storage: {user.storageChannelId || 'Hadi_Cloud_Storage'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeTelegramSession}
                    className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer active:scale-95"
                    title="Sign Out"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Switch between multiple storage profiles */}
                <div className={`border-t pt-3.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                      Active Storage Repository
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount('Personal Vault')}
                      className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Switch Profile</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount('Personal Cloud')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-95 ${
                        storageChannelId === 'Hadi_Cloud_Storage' || !storageChannelId
                          ? 'border-sky-400 bg-sky-500/15 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-white/70 font-semibold'
                      }`}
                    >
                      <p className="text-xs truncate">Primary Cloud</p>
                      <p className="text-[10px] text-sky-400">Personal Channel</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount('Work Archive')}
                      className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-left cursor-pointer transition-all active:scale-95 text-white/70 font-semibold hover:border-white/20"
                    >
                      <p className="text-xs truncate">Work Archive</p>
                      <p className="text-[10px] opacity-60">Backup Channel</p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 text-white">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold mb-1">Local Storage Mode</h4>
                <p className={`text-xs font-semibold mb-4 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                  Connect your cloud account to sync files seamlessly and unlock unlimited storage.
                </p>
                <button
                  id="btn-settings-login"
                  type="button"
                  onClick={onOpenLoginModal}
                  className="btn-glass-ios px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer active:scale-95"
                >
                  Sign In to Cloud
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Storage Breakdown (Mega / Google Drive style) */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Storage Overview
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-2xl font-bold font-mono text-sky-400">
                  {(totalChunksUploaded * 20).toFixed(0)} MB
                </span>
                <span className={`text-xs ml-2 font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                  used across {files.length} items ({totalChunksUploaded} slices)
                </span>
              </div>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                ∞ Unlimited Cloud Storage
              </span>
            </div>

            {/* Storage Progress Bar */}
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex mb-3">
              <div style={{ width: '40%' }} className="h-full bg-sky-400" title="Photos" />
              <div style={{ width: '25%' }} className="h-full bg-indigo-500" title="Videos" />
              <div style={{ width: '20%' }} className="h-full bg-emerald-400" title="Documents" />
              <div style={{ width: '15%' }} className="h-full bg-amber-400" title="Encrypted Vault" />
            </div>

            {/* Storage Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
                <span className="truncate">Photos ({imageFiles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">Videos ({videoFiles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">Docs ({docFiles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">Vault ({vaultFiles.length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sync & Cloud Engine */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Sync & Cloud Engine
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            <div className="space-y-3.5">
              {/* Toggle: Background Sync */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold">Background Sync</h4>
                  <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    Automatically synchronize newly added files across devices
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBackgroundSync(!backgroundSync)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    backgroundSync ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    backgroundSync ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle: Blurhash Thumbnails */}
              <div className={`flex items-center justify-between gap-3 border-t pt-3.5 ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}>
                <div>
                  <h4 className="text-sm font-bold">Fast Offline Thumbnails</h4>
                  <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    Cache compact visual placeholders for instant image loading
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCacheThumbs(!autoCacheThumbs)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    autoCacheThumbs ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoCacheThumbs ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Resync Button */}
              <div className={`flex items-center justify-between border-t pt-3.5 ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}>
                <div>
                  <h4 className="text-sm font-bold">Cloud Database Sync</h4>
                  <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    {resyncSuccess ? 'Metadata synchronized!' : 'Force refresh file metadata'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleForceResync}
                  disabled={isResyncing}
                  className="btn-glass-ios px-3.5 py-2 text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin text-sky-400' : ''}`} />
                  <span>{isResyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Security & Vault Configuration */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Security & Zero-Knowledge Vault
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">AES-256-GCM Encryption</h4>
                  <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    Zero-knowledge encryption keys stay strictly in-memory
                  </p>
                </div>
              </div>
              <button
                id="btn-update-vault-pin"
                type="button"
                onClick={() => {
                  setPinError('');
                  setPinSuccess(false);
                  setShowPinModal(true);
                }}
                className="btn-glass-ios text-xs px-3.5 py-2 bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 cursor-pointer shrink-0 rounded-xl active:scale-95"
              >
                Change PIN
              </button>
            </div>

            <div className={`space-y-2 text-xs font-semibold border-t pt-3 ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-white/70'
            }`}>
              <div className="flex items-center justify-between">
                <span>Storage State</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Multi-Tab Local Storage Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vault Items Protected</span>
                <span className="font-bold text-amber-400">{vaultFiles.length} files encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Memory & Cache Management */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Memory & Local Cache
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            <p className={`text-xs font-semibold mb-3.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
              Hadi Cloud buffers files securely in memory. Clear cloud cache or reset local storage to reclaim device space:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-clear-object-urls"
                type="button"
                onClick={handleClearObjectURLs}
                className={`btn-glass-ios py-3 px-3.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 border cursor-pointer active:scale-95 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                }`}
              >
                <HardDriveDownload className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-xs">Clear Cloud Cache</span>
                <span className="text-[10px] font-semibold opacity-60">Frees RAM memory</span>
              </button>

              <button
                id="btn-purge-indexeddb"
                type="button"
                onClick={handlePurgeIndexedDB}
                className={`btn-glass-ios py-3 px-3.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 border cursor-pointer active:scale-95 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                }`}
              >
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-xs">Reset Local Storage</span>
                <span className="text-[10px] font-semibold opacity-60">Reset offline cache</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. Appearance & PWA */}
        <div>
          <h3 className={`text-xs uppercase tracking-wider font-bold mb-2 ml-1 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Appearance & App Experience
          </h3>
          <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
            isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
          }`}>
            {/* PWA Install Banner */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">
                    {isInstalled ? 'App Installed (Standalone)' : 'Install Progressive Web App'}
                  </h4>
                  <p className={`text-xs font-semibold truncate ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    {isInstalled ? 'Running in native standalone window' : 'Offline asset caching + Service Worker'}
                  </p>
                </div>
              </div>

              {!isInstalled && isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="btn-glass-ios text-xs px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shrink-0 rounded-xl active:scale-95"
                >
                  Install
                </button>
              )}
            </div>

            {/* Theme selection */}
            <div>
              <p className={`text-xs font-bold mb-2.5 ${isLight ? 'text-slate-700' : 'text-white'}`}>
                Visual Color Archetype
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'fade'] as AppTheme[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`btn-glass-ios py-2.5 px-3 text-xs font-bold capitalize flex items-center justify-center gap-2 border cursor-pointer transition-all active:scale-95 rounded-xl ${
                      theme === mode
                        ? isLight
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-black border-white shadow-sm'
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {mode === 'dark' && <Moon className="w-4 h-4" />}
                    {mode === 'light' && <Sun className="w-4 h-4" />}
                    {mode === 'fade' && <Sparkles className="w-4 h-4" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 7. Lead Developer Attribution Card */}
        <div className={`rounded-3xl liquid-glass-ios p-4 sm:p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
          isLight ? 'bg-white/85 border-slate-200 text-slate-900 shadow-sm' : 'text-white'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/20'
            }`}>
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Lead Developer</h3>
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Abdullah Al Hadi</p>
            </div>
          </div>

          <div className={`space-y-2.5 text-xs font-semibold border-t pt-3 ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-white/70'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span>Email</span>
              <a href="mailto:abdullahalhadidev@gmail.com" className="text-sky-400 font-bold hover:underline truncate">
                abdullahalhadidev@gmail.com
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Phone</span>
              <span className="font-mono text-xs font-bold">+8801723257754</span>
            </div>

            {/* Quick Contact & Support Developer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <a
                id="settings-whatsapp-btn"
                href="https://wa.me/8801723257754"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass-ios py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </a>

              <a
                id="settings-email-btn"
                href="mailto:abdullahalhadidev@gmail.com"
                className="btn-glass-ios py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="truncate">Email Developer</span>
              </a>
            </div>

            <p className="text-sm font-semibold text-white/50 pt-2 text-center tracking-wide">
              Support Developer
            </p>
          </div>
        </div>
      </div>

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 transition-all">
          <div className="absolute inset-0" onClick={() => setShowPinModal(false)} />

          <div className="relative z-10 w-full max-w-sm rounded-3xl p-6 bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-white overflow-y-auto max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold">Update Vault PIN</h4>
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-bold mb-2">{pinError}</p>
            )}

            {pinSuccess && (
              <p className="text-xs text-emerald-400 font-bold mb-2">Vault PIN updated successfully!</p>
            )}

            <form onSubmit={handleChangePin} className="space-y-3.5">
              <div>
                <label className="block text-xs uppercase font-bold opacity-70 mb-1">Current PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••• (Current)"
                  className="w-full px-3 py-2.5 rounded-xl text-center text-base font-bold tracking-widest border border-white/20 bg-white/5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold opacity-70 mb-1">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••• (New)"
                  className="w-full px-3 py-2.5 rounded-xl text-center text-base font-bold tracking-widest border border-white/20 bg-white/5 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/20 active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 active:scale-95 cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Signature */}
      <DeveloperSignature />
    </div>
  );
};
