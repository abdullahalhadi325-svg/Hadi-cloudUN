export type TabType = 'Home' | 'Drive' | 'Photos' | 'Vault' | 'Settings';
export type AppTheme = 'dark' | 'light' | 'fade';

export interface CloudFile {
  id: string;
  name: string; // File name (e.g. video.mp4, archive.zip)
  title?: string; // backwards-compatible alias
  type: 'pdf' | 'spreadsheet' | 'archive' | 'image' | 'code' | 'doc' | 'video' | 'audio' | 'other';
  size: string;
  bytes?: number;
  mimeType?: string;
  updatedAt: string;
  thumbnailUrl?: string;
  isStarred?: boolean;
  chunk_msg_ids: number[]; // Array of message IDs in 'Hadi_Cloud_Storage' Telegram channel
  total_chunks: number;
  blurhash?: string; // Blurhash offline preview string for images
  is_encrypted?: boolean; // Zero-knowledge AES-GCM flag
  iv?: string; // Base64 Initialization Vector for AES-GCM 256
}

export interface CloudFolder {
  id: string;
  name: string;
  fileCount: number;
  updatedAt: string;
}

export interface TelegramAuthUser {
  userId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone: string;
  sessionString: string;
  storageChannelId?: string;
}

export interface IOProgressState {
  active: boolean;
  type: 'upload' | 'download' | 'encrypt' | 'decrypt';
  fileName: string;
  currentChunk: number;
  totalChunks: number;
  statusText: string;
  percentage: number;
  isBackingOff?: boolean;
  backoffSeconds?: number;
}
