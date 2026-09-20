import React, { useState, useRef } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  FileArchive, 
  Image as ImageIcon, 
  Code2, 
  Video, 
  Music, 
  MoreVertical, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Folder, 
  Send, 
  Layers, 
  Sparkles, 
  Lock,
  X,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Share2,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import { CloudFile, CloudFolder } from '../types';
import { useHadiCloudStore } from '../store';
import { DeveloperSignature } from './DeveloperSignature';
import { FileActionSheet } from './FileActionSheet';
import { UploadModal } from './UploadModal';
import { MoveToVaultModal } from './MoveToVaultModal';

interface DriveTabProps {
  onOpenLoginModal: () => void;
}

export const DriveTab: React.FC<DriveTabProps> = ({ onOpenLoginModal }) => {
  const theme = useHadiCloudStore((state) => state.theme);
  const user = useHadiCloudStore((state) => state.user);
  const files = useHadiCloudStore((state) => state.files);
  const folders = useHadiCloudStore((state) => state.folders);
  const addFileToFirestore = useHadiCloudStore((state) => state.addFileToFirestore);
  const deleteFileFromFirestore = useHadiCloudStore((state) => state.deleteFileFromFirestore);
  const toggleStarFile = useHadiCloudStore((state) => state.toggleStarFile);
  const initFirestoreSync = useHadiCloudStore((state) => state.initFirestoreSync);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'doc' | 'image' | 'media' | 'starred'>('all');

  // Modals & Action Sheet
  const [selectedFileForActions, setSelectedFileForActions] = useState<CloudFile | null>(null);
  const [fileToVault, setFileToVault] = useState<CloudFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Multi-Select Mode
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [batchActionNotice, setBatchActionNotice] = useState<string | null>(null);

  // Pull to refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const isLight = theme === 'light';

  // Haptic feedback safely triggered
  const triggerHaptic = (ms = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors gracefully
    }
  };

  const getFileIcon = (type: CloudFile['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-7 h-7 text-rose-400 shrink-0" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-7 h-7 text-emerald-400 shrink-0" />;
      case 'archive':
        return <FileArchive className="w-7 h-7 text-amber-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-7 h-7 text-sky-400 shrink-0" />;
      case 'video':
        return <Video className="w-7 h-7 text-indigo-400 shrink-0" />;
      case 'audio':
        return <Music className="w-7 h-7 text-pink-400 shrink-0" />;
      case 'code':
        return <Code2 className="w-7 h-7 text-purple-400 shrink-0" />;
      default:
        return <FileText className="w-7 h-7 text-slate-400 shrink-0" />;
    }
  };

  // Filter out vault files from standard Drive view + Apply Category & Search
  const filteredFiles = files.filter((f) => {
    if (f.is_encrypted) return false;
    const title = (f.name || f.title || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = title.includes(query);

    if (!matchesSearch) return false;

    if (activeCategory === 'starred') return !!f.isStarred;
    if (activeCategory === 'doc') return ['pdf', 'spreadsheet', 'code'].includes(f.type || '');
    if (activeCategory === 'image') return f.type === 'image';
    if (activeCategory === 'media') return ['video', 'audio'].includes(f.type || '');

    return true;
  });

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY <= 5 && touchStartY.current > 0) {
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0) {
        setPullDistance(Math.min(deltaY * 0.4, 75));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 45) {
      triggerHaptic(25);
      setIsRefreshing(true);
      if (user?.userId) {
        initFirestoreSync(user.userId);
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 700);
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  // Multi-select handlers
  const toggleSelectFile = (id: string) => {
    triggerHaptic(12);
    setSelectedFileIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    triggerHaptic(15);
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFileIds.length === 0) return;
    triggerHaptic(30);
    const count = selectedFileIds.length;
    for (const id of selectedFileIds) {
      await deleteFileFromFirestore(id);
    }
    setSelectedFileIds([]);
    setIsMultiSelect(false);
    setBatchActionNotice(`Deleted ${count} ${count === 1 ? 'file' : 'files'}`);
    setTimeout(() => setBatchActionNotice(null), 2500);
  };

  const handleBatchShare = () => {
    if (selectedFileIds.length === 0) return;
    triggerHaptic(20);
    const count = selectedFileIds.length;
    const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));
    const textList = selectedFiles.map((f) => f.name || f.title).join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`Shared from Hadi Cloud Storage:\n${textList}`);
    }
    setBatchActionNotice(`Copied links for ${count} ${count === 1 ? 'item' : 'items'}`);
    setTimeout(() => setBatchActionNotice(null), 2500);
  };

  return (
    <div 
      id="drive-tab-container" 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out"
    >
      {/* Pull To Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          style={{ height: isRefreshing ? '48px' : `${pullDistance}px`, opacity: Math.min((pullDistance || 40) / 45, 1) }}
          className="overflow-hidden flex items-center justify-center transition-all duration-100 mb-2"
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-md">
            <RefreshCw 
              className={`w-3.5 h-3.5 ${pullDistance > 45 || isRefreshing ? 'animate-spin text-sky-400' : 'text-white'}`} 
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            />
            <span>{isRefreshing ? 'Refreshing Cloud Storage...' : pullDistance > 45 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      {/* Real-Time Global Search Bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl liquid-glass-ios transition-all ${
          isLight ? 'bg-white/80 text-slate-900 border-slate-200 shadow-xs' : 'text-white'
        }`}>
          <Search className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/40'}`} />
          <input
            id="drive-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cloud files & documents..."
            className="w-full bg-transparent text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-inherit placeholder:opacity-40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white shrink-0 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          id="btn-filter-options"
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setActiveCategory('all');
          }}
          className={`btn-glass-ios w-10 h-10 flex items-center justify-center cursor-pointer border ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-white/15 text-white/70'
          }`}
          aria-label="Filter documents"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
        {[
          { id: 'all', label: 'All Files' },
          { id: 'doc', label: 'Documents' },
          { id: 'image', label: 'Images' },
          { id: 'media', label: 'Media' },
          { id: 'starred', label: 'Starred' },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setActiveCategory(chip.id as any);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              activeCategory === chip.id
                ? 'bg-sky-500 text-black font-bold shadow-sm'
                : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Batch Action Notice Toast */}
      {batchActionNotice && (
        <div className="mb-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{batchActionNotice}</span>
        </div>
      )}

      {/* Cloud Drive Status Banner */}
      <div className={`p-3 rounded-2xl mb-4 border flex items-center justify-between transition-all ${
        user?.userId
          ? isLight 
            ? 'bg-sky-50 border-sky-200 text-sky-900' 
            : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
          : isLight 
            ? 'bg-slate-100 border-slate-200 text-slate-700' 
            : 'bg-white/5 border-white/10 text-white/70'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            user?.userId
              ? 'bg-sky-500/20 border-sky-500/30 text-sky-400'
              : isLight ? 'bg-slate-200 border-slate-300 text-slate-500' : 'bg-white/10 border-white/20 text-white/50'
          }`}>
            <Send className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate">
                {user?.userId ? 'Cloud Drive Connected' : 'Local Storage Mode'}
              </p>
              {user?.userId && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <p className={`text-[10px] font-semibold truncate ${
              user?.userId 
                ? isLight ? 'text-sky-700' : 'text-sky-300/80' 
                : isLight ? 'text-slate-500' : 'text-white/40'
            }`}>
              {user?.userId 
                ? `Storage: ${user.storageChannelId || 'Personal Cloud'} • Unlimited Space`
                : 'Sign in to access unlimited cloud storage'}
            </p>
          </div>
        </div>

        {!user?.userId && (
          <button
            id="btn-drive-connect-telegram"
            type="button"
            onClick={onOpenLoginModal}
            className="btn-glass-ios text-[11px] px-2.5 py-1.5 border border-sky-400/40 text-sky-400 font-bold cursor-pointer shrink-0 ml-2"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Folders Section */}
      {folders.length > 0 && !searchQuery && activeCategory === 'all' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-xs uppercase tracking-wider font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              Folders
            </h3>
            <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
              {folders.length} directories
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`p-3 rounded-2xl liquid-glass-ios border flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all ${
                  isLight ? 'bg-white/80 border-slate-200 text-slate-800' : 'border-white/10 text-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Folder className="w-4 h-4 fill-amber-400/30" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{folder.name}</p>
                  <p className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    {folder.fileCount} items
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List Header & Multi-Select Toggle */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <h3 className={`text-xs uppercase tracking-wider font-bold ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
            Files & Media
          </h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/70'
          }`}>
            {filteredFiles.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setIsMultiSelect(!isMultiSelect);
            setSelectedFileIds([]);
          }}
          className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
            isMultiSelect
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-sky-400 hover:text-sky-300'
          }`}
        >
          {isMultiSelect ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Multi-Select Action Toolbar */}
      {isMultiSelect && (
        <div className="mb-3 p-3 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              {selectedFileIds.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-semibold text-white/70 truncate">
              {selectedFileIds.length} chosen
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={selectedFileIds.length === 0}
              onClick={handleBatchShare}
              className="p-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-sky-500/30 cursor-pointer"
              title="Share Selected"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={selectedFileIds.length === 0}
              onClick={handleBatchDelete}
              className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-500/30 cursor-pointer"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        {filteredFiles.map((file) => {
          const displayTitle = file.name || file.title || 'Untitled Document';
          const chunks = file.total_chunks || (file.chunk_msg_ids ? file.chunk_msg_ids.length : 1);
          const isSelected = selectedFileIds.includes(file.id);

          return (
            <div
              key={file.id}
              id={`file-item-${file.id}`}
              onClick={() => {
                triggerHaptic(20);
                if (isMultiSelect) {
                  toggleSelectFile(file.id);
                } else {
                  setSelectedFileForActions(file);
                }
              }}
              className={`p-3 sm:p-3.5 rounded-2xl liquid-glass-ios border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                isSelected
                  ? 'border-sky-400/80 bg-sky-500/15 text-white shadow-md'
                  : isLight 
                    ? 'bg-white/80 border-slate-200/80 text-slate-900 hover:bg-white' 
                    : 'border-white/10 text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {isMultiSelect ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectFile(file.id);
                    }}
                    className="shrink-0 text-sky-400 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 fill-sky-400 text-black" />
                    ) : (
                      <Square className="w-5 h-5 opacity-40 text-white" />
                    )}
                  </button>
                ) : (
                  getFileIcon(file.type)
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold truncate leading-tight">
                      {displayTitle}
                    </h4>
                    {file.isStarred && (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
                    )}
                    {file.is_encrypted && (
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] font-semibold mt-0.5 ${
                    isLight ? 'text-slate-500' : 'text-white/60'
                  }`}>
                    <span>{file.size}</span>
                    <span>•</span>
                    <span className="font-mono text-sky-400 text-[10px]">
                      {chunks} {chunks === 1 ? 'slice' : 'slices'}
                    </span>
                    <span>•</span>
                    <span>{file.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions / More button */}
              {!isMultiSelect && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      setSelectedFileForActions(file);
                    }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-90 ${
                      isLight 
                        ? 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200' 
                        : 'bg-white/10 border-white/15 text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                    aria-label={`Open file actions for ${displayTitle}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className={`py-16 text-center text-xs font-semibold ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          <p className="mb-2">No files found matching "{searchQuery}"</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Floating '+' Button Just Above the Nav Deck */}
      <button
        id="btn-floating-plus"
        type="button"
        onClick={() => {
          triggerHaptic(20);
          setIsUploadModalOpen(true);
        }}
        className="fixed bottom-24 right-6 z-[60] flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ffffff]/15 backdrop-blur-xl border border-white/20 text-white shadow-lg active:scale-95 transition-all"
        aria-label="Add new file"
        title="Upload File to Hadi Cloud"
      >
        <Plus className="w-6 h-6 text-white stroke-[2.5px]" />
      </button>

      {/* File Action Centered Modal */}
      <FileActionSheet
        file={selectedFileForActions}
        onClose={() => setSelectedFileForActions(null)}
        onDelete={(id) => deleteFileFromFirestore(id)}
        onToggleStar={(id) => {
          const target = files.find((f) => f.id === id);
          if (target) toggleStarFile(id, !!target.isStarred);
        }}
        onMoveToVault={(targetFile) => setFileToVault(targetFile)}
      />

      {/* Move to Zero-Knowledge Vault Modal */}
      <MoveToVaultModal
        file={fileToVault}
        isOpen={!!fileToVault}
        onClose={() => setFileToVault(null)}
      />

      {/* Upload Modal with 20MB Slicing */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddFile={(newFile) => addFileToFirestore(newFile)}
      />

      {/* Developer Signature */}
      <DeveloperSignature />
    </div>
  );
};
