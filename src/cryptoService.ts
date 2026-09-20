// Web Crypto API (AES-GCM 256-bit) zero-knowledge encryption / decryption engine
// Derives a cryptographic key from user's 4-digit PIN via PBKDF2 (100,000 rounds of SHA-256)

const VAULT_SALT = new TextEncoder().encode('Hadi_Cloud_Vault_Zero_Knowledge_Salt_2026');
const PIN_STORAGE_KEY = 'hadi_vault_pin_hash';

/**
 * SHA-256 hash a 4-digit PIN for local lock verification
 */
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(pin));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks whether the user has set up a Vault PIN
 */
export function isVaultPinConfigured(): boolean {
  return !!localStorage.getItem(PIN_STORAGE_KEY);
}

/**
 * Saves a new 4-digit PIN hash
 */
export async function setupVaultPin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hashed);
}

/**
 * Verifies if entered PIN matches the stored hash
 */
export async function verifyVaultPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) {
    // Default PIN: 1234
    return pin === '1234';
  }
  const currentHash = await hashPin(pin);
  return currentHash === storedHash;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a PIN using PBKDF2
 */
export async function deriveKeyFromPin(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: VAULT_SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a binary Uint8Array using AES-GCM 256-bit
 * Returns encrypted buffer and base64 IV
 */
export async function encryptBufferAESGCM(
  data: Uint8Array,
  pin: string
): Promise<{ encryptedData: Uint8Array; ivBase64: string }> {
  const key = await deriveKeyFromPin(pin);
  // 12-byte IV for AES-GCM standard
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data as unknown as BufferSource
  );

  // Convert IV to Base64
  let binary = '';
  for (let i = 0; i < iv.byteLength; i++) {
    binary += String.fromCharCode(iv[i]);
  }
  const ivBase64 = btoa(binary);

  return {
    encryptedData: new Uint8Array(encryptedBuffer),
    ivBase64,
  };
}

/**
 * Decrypts a binary Uint8Array using AES-GCM 256-bit and base64 IV
 */
export async function decryptBufferAESGCM(
  encryptedData: Uint8Array,
  ivBase64: string,
  pin: string
): Promise<Uint8Array> {
  const key = await deriveKeyFromPin(pin);

  // Decode Base64 IV
  const binary = atob(ivBase64);
  const iv = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    iv[i] = binary.charCodeAt(i);
  }

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedData as unknown as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}
