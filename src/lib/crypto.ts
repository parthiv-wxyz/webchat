// Web Crypto API End-to-End Encryption (E2EE) Module
// Algorithms: ECDH (Curve P-256) for Key Agreement + AES-256-GCM for Symmetric Encryption

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a new ECDH key pair for key agreement (P-256 curve)
 */
export async function generateECDHKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyJWK: JsonWebKey;
  privateKeyJWK: JsonWebKey;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJWK = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJWK = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { keyPair, publicKeyJWK, privateKeyJWK };
}

/**
 * Import a public key from JWK format
 */
export async function importPublicKey(jwk: JsonWebKey | string): Promise<CryptoKey> {
  const parsedJWK = typeof jwk === 'string' ? JSON.parse(jwk) : jwk;
  return await window.crypto.subtle.importKey(
    'jwk',
    parsedJWK,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Import a private key from JWK format
 */
export async function importPrivateKey(jwk: JsonWebKey | string): Promise<CryptoKey> {
  const parsedJWK = typeof jwk === 'string' ? JSON.parse(jwk) : jwk;
  return await window.crypto.subtle.importKey(
    'jwk',
    parsedJWK,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derives a shared AES-256-GCM symmetric key using the local private key and peer public key
 */
export async function deriveSharedSecretKey(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable so we can cache or serialize if needed
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random AES-256-GCM key (used for group conversations)
 */
export async function generateGroupRoomKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to JWK format
 */
export async function exportKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', key);
}

/**
 * Import an AES-GCM key from JWK format
 */
export async function importAESKeyFromJWK(jwk: JsonWebKey | string): Promise<CryptoKey> {
  const parsed = typeof jwk === 'string' ? JSON.parse(jwk) : jwk;
  return await window.crypto.subtle.importKey(
    'jwk',
    parsed,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary plaintext string with AES-256-GCM
 * Returns base64-encoded ciphertext and 12-byte IV
 */
export async function encryptMessage(
  plaintext: string,
  aesKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  // 96-bit (12 bytes) IV is optimal for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    aesKey,
    encodedPlaintext as unknown as BufferSource
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt base64-encoded ciphertext with AES-256-GCM and base64 IV
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  aesKey: CryptoKey
): Promise<string> {
  const ciphertextBytes = base64ToArrayBuffer(ciphertextBase64);
  const ivBytes = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as unknown as BufferSource,
    },
    aesKey,
    ciphertextBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generate WhatsApp-style 60-digit Safety Numbers / Verification Code
 * Computes SHA-512 over sorted concatenated public keys, formats into 12 blocks of 5 digits
 */
export async function generateSafetyNumber(
  pubKeyA: JsonWebKey | string,
  pubKeyB: JsonWebKey | string
): Promise<string> {
  const strA = typeof pubKeyA === 'string' ? pubKeyA : JSON.stringify(pubKeyA);
  const strB = typeof pubKeyB === 'string' ? pubKeyB : JSON.stringify(pubKeyB);

  // Deterministic sorting
  const combined = [strA, strB].sort().join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);

  // SHA-256 digest
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert bytes into numeric digits (12 blocks of 5 digits = 60 digits)
  let numericString = '';
  for (let i = 0; i < hashArray.length; i++) {
    // Expand byte to decimal string padded
    numericString += hashArray[i].toString().padStart(3, '0');
  }

  // Slice exactly 60 digits
  const padded = numericString.padEnd(60, '7').slice(0, 60);

  // Format into 12 chunks of 5 digits: "12345 67890 12345 ..."
  const chunks = [];
  for (let i = 0; i < 60; i += 5) {
    chunks.push(padded.slice(i, i + 5));
  }

  return chunks.join(' ');
}

/**
 * Generate a short hex fingerprint for an individual public key
 */
export async function getPublicKeyFingerprint(pubKey: JsonWebKey | string): Promise<string> {
  const str = typeof pubKey === 'string' ? pubKey : JSON.stringify(pubKey);
  const encoder = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(str) as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}
