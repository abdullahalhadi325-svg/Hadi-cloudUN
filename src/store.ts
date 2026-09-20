import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { CloudFile, CloudFolder, TelegramAuthUser, AppTheme, IOProgressState } from './types';

interface HadiCloudState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  user: TelegramAuthUser | null;
  setUser: (user: TelegramAuthUser | null) => void;
  storageChannelId: string | null;
  setStorageChannelId: (id: string | null) => void;

  files: CloudFile[];
  folders: CloudFolder[];
  isLoadingFiles: boolean;

  // Real-time Top-Toast I/O Progress
  ioProgress: IOProgressState | null;
  setIoProgress: (progress: IOProgressState | null) => void;

  // Real-time Firestore sync
  unsubscribeFiles: (() => void) | null;
  unsubscribeFolders: (() => void) | null;
  initFirestoreSync: (telegramId: string) => void;
  stopFirestoreSync: () => void;

  // File & folder operations directly to Firestore
  addFileToFirestore: (file: CloudFile) => Promise<void>;
  deleteFileFromFirestore: (fileId: string) => Promise<void>;
  toggleStarFile: (fileId: string, currentStarred: boolean) => Promise<void>;
  moveFileToVaultInFirestore: (fileId: string, iv: string) => Promise<void>;
  addFolderToFirestore: (folder: CloudFolder) => Promise<void>;
}

const DEFAULT_DUMMY_FILES: CloudFile[] = [
  {
    id: 'doc-1',
    name: 'Project_Specification.pdf',
    title: 'Project_Specification.pdf',
    type: 'pdf',
    size: '4.2 MB',
    updatedAt: 'Today, 2:45 PM',
    chunk_msg_ids: [1001],
    total_chunks: 1,
    mimeType: 'application/pdf',
  },
  {
    id: 'doc-2',
    name: 'Financial_Report_2026.xlsx',
    title: 'Financial_Report_2026.xlsx',
    type: 'spreadsheet',
    size: '1.8 MB',
    updatedAt: 'Yesterday',
    chunk_msg_ids: [1002],
    total_chunks: 1,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'doc-3',
    name: 'Brand_Assets_Master.zip',
    title: 'Brand_Assets_Master.zip',
    type: 'archive',
    size: '48.5 MB',
    updatedAt: 'Sep 18, 2026',
    chunk_msg_ids: [1003, 1004, 1005],
    total_chunks: 3,
    mimeType: 'application/zip',
  },
  {
    id: 'doc-4',
    name: 'System_Architecture.png',
    title: 'System_Architecture.png',
    type: 'image',
    size: '3.4 MB',
    updatedAt: 'Sep 15, 2026',
    chunk_msg_ids: [1006],
    total_chunks: 1,
    mimeType: 'image/png',
    blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  },
  {
    id: 'doc-5',
    name: 'Mountain_Mist_Wallpaper.jpg',
    title: 'Mountain_Mist_Wallpaper.jpg',
    type: 'image',
    size: '5.1 MB',
    updatedAt: 'Sep 14, 2026',
    chunk_msg_ids: [1007],
    total_chunks: 1,
    mimeType: 'image/jpeg',
    blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
  },
  {
    id: 'doc-6',
    name: 'Modern_Interior_Design.jpg',
    title: 'Modern_Interior_Design.jpg',
    type: 'image',
    size: '2.8 MB',
    updatedAt: 'Sep 10, 2026',
    chunk_msg_ids: [1008],
    total_chunks: 1,
    mimeType: 'image/jpeg',
    blurhash: 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH',
  }
];

const DEFAULT_DUMMY_FOLDERS: CloudFolder[] = [
  { id: 'fld-1', name: 'Work Documents', fileCount: 14, updatedAt: 'Sep 19' },
  { id: 'fld-2', name: 'Personal Vault', fileCount: 6, updatedAt: 'Sep 17' },
];

export const useHadiCloudStore = create<HadiCloudState>((set, get) => ({
  theme: (localStorage.getItem('hadi_theme') as AppTheme) || 'dark',
  setTheme: (theme: AppTheme) => {
    localStorage.setItem('hadi_theme', theme);
    set({ theme });
  },

  user: (() => {
    try {
      const stored = localStorage.getItem('hadi_telegram_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('hadi_telegram_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hadi_telegram_user');
      localStorage.removeItem('hadi_telegram_session');
    }
    set({ user });
  },

  storageChannelId: localStorage.getItem('hadi_storage_channel_id') || null,
  setStorageChannelId: (id) => {
    if (id) {
      localStorage.setItem('hadi_storage_channel_id', id);
    } else {
      localStorage.removeItem('hadi_storage_channel_id');
    }
    set({ storageChannelId: id });
  },

  files: DEFAULT_DUMMY_FILES,
  folders: DEFAULT_DUMMY_FOLDERS,
  isLoadingFiles: false,

  ioProgress: null,
  setIoProgress: (progress) => set({ ioProgress: progress }),

  unsubscribeFiles: null,
  unsubscribeFolders: null,

  initFirestoreSync: (telegramId: string) => {
    const { unsubscribeFiles, unsubscribeFolders } = get();
    if (unsubscribeFiles) unsubscribeFiles();
    if (unsubscribeFolders) unsubscribeFolders();

    set({ isLoadingFiles: true });

    try {
      // Map authenticated user_id to: users/{telegram_id}/files
      const filesColRef = collection(db, 'users', telegramId, 'files');
      const unsubFiles = onSnapshot(
        filesColRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteFiles: CloudFile[] = snapshot.docs.map((d) => {
              const data = d.data();
              const fileName = data.name || data.title || 'Untitled';
              return {
                id: d.id,
                name: fileName,
                title: fileName,
                type: data.type || 'doc',
                size: data.size || '1.0 MB',
                bytes: data.bytes,
                mimeType: data.mimeType,
                updatedAt: data.updatedAt || 'Recent',
                thumbnailUrl: data.thumbnailUrl,
                isStarred: !!data.isStarred,
                chunk_msg_ids: Array.isArray(data.chunk_msg_ids) ? data.chunk_msg_ids : [],
                total_chunks: data.total_chunks || (data.chunk_msg_ids ? data.chunk_msg_ids.length : 1),
                blurhash: data.blurhash,
                is_encrypted: !!data.is_encrypted,
                iv: data.iv,
              };
            });
            set({ files: remoteFiles, isLoadingFiles: false });
          } else {
            // Seed defaults with chunk_msg_ids into Firestore
            DEFAULT_DUMMY_FILES.forEach((f) => {
              setDoc(doc(db, 'users', telegramId, 'files', f.id), f).catch(() => {});
            });
            set({ files: DEFAULT_DUMMY_FILES, isLoadingFiles: false });
          }
        },
        (error) => {
          console.warn('Firestore files sync (IndexedDB offline active):', error.message);
          set({ isLoadingFiles: false });
        }
      );

      // Map authenticated user_id to: users/{telegram_id}/folders
      const foldersColRef = collection(db, 'users', telegramId, 'folders');
      const unsubFolders = onSnapshot(
        foldersColRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteFolders: CloudFolder[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || 'Folder',
                fileCount: data.fileCount || 0,
                updatedAt: data.updatedAt || 'Recent',
              };
            });
            set({ folders: remoteFolders });
          } else {
            DEFAULT_DUMMY_FOLDERS.forEach((fld) => {
              setDoc(doc(db, 'users', telegramId, 'folders', fld.id), fld).catch(() => {});
            });
            set({ folders: DEFAULT_DUMMY_FOLDERS });
          }
        },
        (error) => {
          console.warn('Firestore folders sync notice:', error.message);
        }
      );

      set({
        unsubscribeFiles: unsubFiles,
        unsubscribeFolders: unsubFolders,
      });
    } catch (err) {
      console.warn('Error setting up Firestore listeners:', err);
      set({ isLoadingFiles: false });
    }
  },

  stopFirestoreSync: () => {
    const { unsubscribeFiles, unsubscribeFolders } = get();
    if (unsubscribeFiles) unsubscribeFiles();
    if (unsubscribeFolders) unsubscribeFolders();
    set({
      unsubscribeFiles: null,
      unsubscribeFolders: null,
      files: DEFAULT_DUMMY_FILES,
      folders: DEFAULT_DUMMY_FOLDERS,
    });
  },

  // PHASE 3 & 4: Commit metadata to Firestore (id, name, size, type, chunk_msg_ids[], blurhash, is_encrypted, iv)
  addFileToFirestore: async (file: CloudFile) => {
    const { user } = get();
    set((state) => ({
      files: [file, ...state.files.filter((f) => f.id !== file.id)],
    }));

    if (user?.userId) {
      try {
        const payload: any = {
          id: file.id,
          name: file.name,
          title: file.name,
          size: file.size,
          type: file.type,
          mimeType: file.mimeType || 'application/octet-stream',
          chunk_msg_ids: file.chunk_msg_ids || [],
          total_chunks: file.total_chunks || (file.chunk_msg_ids ? file.chunk_msg_ids.length : 1),
          updatedAt: file.updatedAt,
          isStarred: !!file.isStarred,
        };
        if (file.blurhash) payload.blurhash = file.blurhash;
        if (file.is_encrypted !== undefined) payload.is_encrypted = file.is_encrypted;
        if (file.iv) payload.iv = file.iv;

        await setDoc(doc(db, 'users', user.userId, 'files', file.id), payload);
      } catch (err) {
        console.warn('Firestore add file error, saved locally:', err);
      }
    }
  },

  deleteFileFromFirestore: async (fileId: string) => {
    const { user } = get();
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    }));

    if (user?.userId) {
      try {
        await deleteDoc(doc(db, 'users', user.userId, 'files', fileId));
      } catch (err) {
        console.warn('Firestore delete file error:', err);
      }
    }
  },

  toggleStarFile: async (fileId: string, currentStarred: boolean) => {
    const { user } = get();
    const newStarred = !currentStarred;

    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, isStarred: newStarred } : f
      ),
    }));

    if (user?.userId) {
      try {
        await updateDoc(doc(db, 'users', user.userId, 'files', fileId), {
          isStarred: newStarred,
        });
      } catch (err) {
        console.warn('Firestore update star error:', err);
      }
    }
  },

  // PHASE 4: Update Firestore is_encrypted: true and IV when moving to Vault
  moveFileToVaultInFirestore: async (fileId: string, iv: string) => {
    const { user } = get();
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, is_encrypted: true, iv } : f
      ),
    }));

    if (user?.userId) {
      try {
        await updateDoc(doc(db, 'users', user.userId, 'files', fileId), {
          is_encrypted: true,
          iv,
        });
      } catch (err) {
        console.warn('Firestore move to vault error:', err);
      }
    }
  },

  addFolderToFirestore: async (folder: CloudFolder) => {
    const { user } = get();
    set((state) => ({
      folders: [folder, ...state.folders.filter((f) => f.id !== folder.id)],
    }));

    if (user?.userId) {
      try {
        await setDoc(doc(db, 'users', user.userId, 'folders', folder.id), folder);
      } catch (err) {
        console.warn('Firestore add folder error:', err);
      }
    }
  },
}));
