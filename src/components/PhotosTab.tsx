import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  Download, 
  Loader2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Film,
  AlertCircle
} from 'lucide-react';
import { useHadiCloudStore } from '../store';
import { DeveloperSignature } from './DeveloperSignature';
import { BlurhashCanvas } from './BlurhashCanvas';
import { CloudFile } from '../types';
import { downloadAndReassembleFile } from '../telegramService';

// Fallback sample blurhashes for default demo photos
const FALLBACK_BLURHASHES = [
  'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
  'LKO2:N%2Tw=w]~RBVZRi};RPxuwH',
  'L9AB*#?b~qIU_3t7%Mt700ofD%WB',
  'L5H2EC=~00Rj~qofofay00ay-;j[',
  'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
];

export const PhotosTab: React.FC = () => {
  const theme = useHadiCloudStore((state) => state.theme);
  const files = useHadiCloudStore((state) => state.files);
  const user = useHadiCloudStore((state) => state.user);
  const storageChannelId = useHadiCloudStore((state) => state.storageChannelId);
  const setIoProgress = useHadiCloudStore((state) => state.setIoProgress);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loadedImagesMap, setLoadedImagesMap] = useState<Record<string, string>>({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaErrorToast, setMediaErrorToast] = useState<string | null>(null);

  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  // Safe filter for image and video media files from state
  const rawMedia = (files || []).filter(
    (f) => f && (f.type === 'image' || f.type === 'video') && !f.is_encrypted
  );

  // Default demo photos if no media exists yet
  const photos: CloudFile[] = rawMedia.length > 0 ? rawMedia : [
    {
      id: 'demo-photo-1',
      name: 'Neon_Nebula.png',
      title: 'Neon Nebula',
      type: 'image',
      size: '3.4 MB',
      updatedAt: 'Today',
      chunk_msg_ids: [1006],
      total_chunks: 1,
      mimeType: 'image/png',
      blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    },
    {
      id: 'demo-photo-2',
      name: 'Mountain_Mist.jpg',
      title: 'Mountain Mist',
      type: 'image',
      size: '5.1 MB',
      updatedAt: 'Yesterday',
      chunk_msg_ids: [1007],
      total_chunks: 1,
      mimeType: 'image/jpeg',
      blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    },
    {
      id: 'demo-photo-3',
      name: 'Glass_Horizon.jpg',
      title: 'Glass Horizon',
      type: 'image',
      size: '2.8 MB',
      updatedAt: 'Sep 17',
      chunk_msg_ids: [1008],
      total_chunks: 1,
      mimeType: 'image/jpeg',
      blurhash: 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH',
    },
    {
      id: 'demo-photo-4',
      name: 'Urban_Architecture.jpg',
      title: 'Urban Architecture',
      type: 'image',
      size: '4.2 MB',
      updatedAt: 'Sep 12',
      chunk_msg_ids: [1009],
      total_chunks: 1,
      mimeType: 'image/jpeg',
      blurhash: 'L9AB*#?b~qIU_3t7%Mt700ofD%WB',
    },
    {
      id: 'demo-photo-5',
      name: 'Cosmic_Galaxy.png',
      title: 'Cosmic Galaxy',
      type: 'image',
      size: '6.0 MB',
      updatedAt: 'Sep 10',
      chunk_msg_ids: [1010],
      total_chunks: 1,
      mimeType: 'image/png',
      blurhash: 'L5H2EC=~00Rj~qofofay00ay-;j[',
    },
    {
      id: 'demo-photo-6',
      name: 'Aurora_Lights.jpg',
      title: 'Aurora Lights',
      type: 'image',
      size: '3.9 MB',
      updatedAt: 'Sep 08',
      chunk_msg_ids: [1011],
      total_chunks: 1,
      mimeType: 'image/jpeg',
      blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    },
  ];

  // Circuit breaker: fetch high-res chunk logic with strict try/catch & timeout
  const loadMediaAt = async (index: number) => {
    if (index < 0 || index >= photos.length) return;
    const file = photos[index];
    if (!file) {
      setIsLoadingMedia(false);
      return;
    }

    // Already cached
    if (loadedImagesMap[file.id]) {
      setIsLoadingMedia(false);
      return;
    }

    // Demo images: generate instant data URI
    if (file.id.startsWith('demo-photo-')) {
      const demoSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><rect width="900" height="650" fill="%23090D16"/><circle cx="450" cy="300" r="180" fill="%230284C7" opacity="0.3"/><text x="450" y="310" font-family="system-ui,-apple-system,sans-serif" font-size="30" fill="%23FFFFFF" text-anchor="middle" font-weight="bold">${encodeURIComponent(file.title || file.name)}</text><text x="450" y="355" font-family="system-ui,-apple-system,sans-serif" font-size="16" fill="%2338BDF8" text-anchor="middle">Hadi Cloud Storage High-Resolution Media</text></svg>`;
      setLoadedImagesMap((prev) => ({ ...prev, [file.id]: demoSvg }));
      setIsLoadingMedia(false);
      return;
    }

    const msgIds = file.chunk_msg_ids || (file as any).chunks || [];
    const channelId = user?.storageChannelId || storageChannelId || 'Hadi_Cloud_Storage';

    // Circuit Breaker: instantly break if array is missing or empty
    if (!Array.isArray(msgIds) || msgIds.length === 0) {
      setIsLoadingMedia(false);
      setMediaErrorToast('Preview unavailable. File might be corrupted or offline.');
      return;
    }

    try {
      setIsLoadingMedia(true);
      setMediaErrorToast(null);

      // Strict 10-second timeout to prevent infinite Promise hang
      const timeoutPromise = new Promise<{ blobUrl: string }>((_, reject) => {
        setTimeout(() => reject(new Error('Download timeout exceeded')), 10000);
      });

      const fetchPromise = downloadAndReassembleFile(
        file.name,
        file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        msgIds,
        channelId,
        (p) => {
          setIoProgress({
            active: true,
            type: 'download',
            fileName: file.name,
            currentChunk: p.currentChunk,
            totalChunks: p.totalChunks,
            statusText: `Loading Media (${p.percentage}%)`,
            percentage: p.percentage,
            isBackingOff: p.isBackingOff,
          });
        }
      );

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      if (res && res.blobUrl) {
        setLoadedImagesMap((prev) => ({ ...prev, [file.id]: res.blobUrl }));
      } else {
        throw new Error('No valid blobUrl received');
      }
    } catch (err) {
      console.warn('PhotosTab circuit breaker triggered:', err);
      setMediaErrorToast('Preview unavailable. File might be corrupted or offline.');
    } finally {
      // Guaranteed to exit loading state
      setIsLoadingMedia(false);
      setIoProgress(null);
    }
  };

  const openMediaIndex = (index: number) => {
    setSelectedPhotoIndex(index);
    loadMediaAt(index);
  };

  // Scroll gallery container when selectedPhotoIndex changes
  useEffect(() => {
    if (selectedPhotoIndex !== null && galleryScrollRef.current) {
      const container = galleryScrollRef.current;
      const targetScroll = selectedPhotoIndex * container.clientWidth;
      if (Math.abs(container.scrollLeft - targetScroll) > 10) {
        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }, [selectedPhotoIndex]);

  // Track swiping scroll position to keep selectedPhotoIndex synced
  const handleGalleryScroll = () => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const width = container.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(container.scrollLeft / width);
      if (newIndex !== selectedPhotoIndex && newIndex >= 0 && newIndex < photos.length) {
        setSelectedPhotoIndex(newIndex);
        loadMediaAt(newIndex);
      }
    }
  };

  const handleCloseModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPhotoIndex(null);
    setIsLoadingMedia(false);
    setMediaErrorToast(null);
  };

  const currentPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <div 
      id="photos-tab-container" 
      className="w-full max-w-3xl mx-auto px-2 sm:px-4 pt-2 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/20 text-white'
          }`}>
            <ImageIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className={`text-xs uppercase tracking-wider font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
              Photos & Media ({(photos || []).length})
            </h2>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              Hardware Accelerated Gallery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-sky-500/15 text-sky-400 border border-sky-500/25 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Swipeable Modal</span>
        </div>
      </div>

      {/* STRICT SAFEGUARD: Wrap grid mapping in (photos || []).map(...) */}
      <div 
        id="photos-masonry-grid" 
        className="grid grid-cols-3 gap-[2px] sm:gap-1 rounded-2xl overflow-hidden bg-black/20 p-[2px]"
      >
        {(photos || []).map((photo, index) => {
          if (!photo) return null;
          const displayTitle = photo.name || photo.title || 'Untitled';
          const isVideo = photo.type === 'video';
          const blurhashVal = photo.blurhash || FALLBACK_BLURHASHES[index % FALLBACK_BLURHASHES.length];
          const hasLoadedRealImage = !!(loadedImagesMap[photo.id] && loadedImagesMap[photo.id].length > 0);
          const rawSrc = hasLoadedRealImage ? loadedImagesMap[photo.id] : null;

          return (
            <div
              key={photo.id || `photo-card-${index}`}
              id={`photo-thumb-${photo.id}`}
              onClick={() => openMediaIndex(index)}
              className="relative aspect-square cursor-pointer group overflow-hidden bg-slate-900/80 select-none active:scale-95 transition-transform duration-200"
            >
              {/* Image Rendering Safeguard: NEVER render <img> without a valid non-empty src */}
              {rawSrc ? (
                <img
                  src={rawSrc}
                  alt={displayTitle}
                  className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : blurhashVal ? (
                /* Layer 1: Blurhash Canvas placeholder */
                <div className="absolute inset-0 w-full h-full">
                  <BlurhashCanvas
                    hash={blurhashVal}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                /* Fallback Gray Placeholder with Icon */
                <div className="absolute inset-0 w-full h-full bg-slate-800 flex flex-col items-center justify-center text-white/30">
                  <ImageIcon className="w-8 h-8 stroke-[1.5px]" />
                </div>
              )}

              {/* Video Badge indicator */}
              {isVideo && (
                <div className="absolute bottom-1.5 right-1.5 z-20 w-6 h-6 rounded-md bg-black/70 backdrop-blur-md flex items-center justify-center text-white">
                  <Play className="w-3 h-3 fill-current" />
                </div>
              )}

              {/* Hover Dark Glass Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col justify-end p-2 pointer-events-none">
                <p className="text-[11px] text-white font-bold truncate drop-shadow-sm">
                  {displayTitle}
                </p>
                <p className="text-[9px] text-white/80 font-medium truncate">
                  {photo.size || ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(photos || []).length === 0 && (
        <div className={`py-20 text-center rounded-2xl border liquid-glass-ios mt-4 ${
          isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-white/50'
        }`}>
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold">No photos or videos uploaded yet.</p>
          <p className="text-[10px] opacity-70 mt-0.5">Upload media from the Drive tab to view them here.</p>
        </div>
      )}

      {/* NATIVE CSS SWIPEABLE GALLERY MODAL (flex overflow-x-auto snap-x snap-mandatory) */}
      {selectedPhotoIndex !== null && currentPhoto && (
        <div 
          id="gallery-fullscreen-modal"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-3xl select-none animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          {/* Top Bar Header */}
          <div 
            className="w-full h-16 px-4 sm:px-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {currentPhoto.name || currentPhoto.title || 'Media File'}
              </h3>
              <p className="text-xs font-medium text-white/60">
                {selectedPhotoIndex + 1} of {(photos || []).length} • {currentPhoto.size || ''}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {loadedImagesMap[currentPhoto.id] && (
                <a
                  href={loadedImagesMap[currentPhoto.id]}
                  download={currentPhoto.name || 'photo'}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer border border-white/20 shadow-md"
                  title="Download Media"
                >
                  <Download className="w-4.5 h-4.5" />
                </a>
              )}
              {/* Standalone Clickable Close Button with high z-index */}
              <button
                id="gallery-close-btn"
                type="button"
                onClick={handleCloseModal}
                className="z-[100] w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-90 text-white transition-all cursor-pointer border border-white/30 shadow-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-white stroke-[2.5px]" />
              </button>
            </div>
          </div>

          {/* Swipeable Container: native CSS flex overflow-x-auto snap-x snap-mandatory */}
          <div 
            id="gallery-swipe-container"
            ref={galleryScrollRef}
            onScroll={handleGalleryScroll}
            className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar relative items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Desktop Left Nav Chevron */}
            {selectedPhotoIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaIndex(selectedPhotoIndex - 1);
                }}
                className="hidden sm:flex absolute left-4 z-40 w-12 h-12 rounded-full items-center justify-center bg-white/15 hover:bg-white/25 active:scale-90 backdrop-blur-xl text-white border border-white/20 transition-all cursor-pointer shadow-xl"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-7 h-7 text-white" />
              </button>
            )}

            {/* Render slides for swipe container */}
            {(photos || []).map((p, idx) => {
              if (!p) return null;
              const isCurrent = idx === selectedPhotoIndex;
              const photoSrc = loadedImagesMap[p.id];
              const pBlurhash = p.blurhash || FALLBACK_BLURHASHES[idx % FALLBACK_BLURHASHES.length];

              return (
                <div 
                  key={`slide-${p.id || idx}`}
                  className="w-full h-full min-w-full snap-center snap-always flex items-center justify-center p-3 sm:p-6 shrink-0 relative"
                >
                  <div className="relative max-w-4xl max-h-full flex items-center justify-center">
                    {/* Fallback Blurhash or Gray Placeholder */}
                    {!photoSrc && (
                      <div className="w-[85vw] max-w-lg aspect-4/3 rounded-2xl overflow-hidden bg-slate-900/90 border border-white/10 flex items-center justify-center">
                        {pBlurhash ? (
                          <BlurhashCanvas
                            hash={pBlurhash}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain opacity-75"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                            <ImageIcon className="w-16 h-16 stroke-[1.5px]" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Spinner if downloading */}
                    {isCurrent && isLoadingMedia && !photoSrc && (
                      <div className="absolute z-30 flex flex-col items-center gap-2.5 p-5 rounded-3xl bg-black/75 backdrop-blur-xl border border-white/20 shadow-2xl">
                        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                        <p className="text-xs text-white font-bold">Loading high resolution...</p>
                      </div>
                    )}

                    {/* Circuit breaker error toast */}
                    {isCurrent && mediaErrorToast && !photoSrc && !isLoadingMedia && (
                      <div className="absolute z-30 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/25 text-white shadow-2xl text-xs font-semibold">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                        <span>{mediaErrorToast}</span>
                      </div>
                    )}

                    {/* Safeguard: ONLY render img if photoSrc is valid non-empty string */}
                    {photoSrc && typeof photoSrc === 'string' && photoSrc.length > 0 && (
                      p.type === 'video' ? (
                        <video
                          src={photoSrc}
                          controls
                          autoPlay
                          className="relative z-20 max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain"
                        />
                      ) : (
                        <img
                          src={photoSrc}
                          alt={p.name || 'Photo'}
                          className="relative z-20 max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain transition-all"
                        />
                      )
                    )}
                  </div>
                </div>
              );
            })}

            {/* Desktop Right Nav Chevron */}
            {selectedPhotoIndex < (photos || []).length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaIndex(selectedPhotoIndex + 1);
                }}
                className="hidden sm:flex absolute right-4 z-40 w-12 h-12 rounded-full items-center justify-center bg-white/15 hover:bg-white/25 active:scale-90 backdrop-blur-xl text-white border border-white/20 transition-all cursor-pointer shadow-xl"
                aria-label="Next photo"
              >
                <ChevronRight className="w-7 h-7 text-white" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip for Quick Jump */}
          <div 
            className="w-full h-20 px-4 py-2 z-40 flex items-center justify-center gap-2.5 overflow-x-auto no-scrollbar bg-gradient-to-t from-black/95 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {(photos || []).map((p, idx) => {
              if (!p) return null;
              const isSelected = idx === selectedPhotoIndex;
              const thumbSrc = loadedImagesMap[p.id];
              const pBlurhash = p.blurhash || FALLBACK_BLURHASHES[idx % FALLBACK_BLURHASHES.length];

              return (
                <button
                  key={`bottom-strip-${p.id || idx}`}
                  type="button"
                  onClick={() => openMediaIndex(idx)}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer active:scale-90 ${
                    isSelected 
                      ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/30' 
                      : 'border-white/20 opacity-50 hover:opacity-90'
                  }`}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : pBlurhash ? (
                    <BlurhashCanvas
                      hash={pBlurhash}
                      width={16}
                      height={16}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/40">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  {p.type === 'video' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Film className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Developer Signature */}
      <DeveloperSignature />
    </div>
  );
};
