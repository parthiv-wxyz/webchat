// Client-Side Secure Key Storage
// Stores ECDH Private Keys locally in browser IndexedDB / localStorage.
// The private key NEVER leaves the client device and is NEVER sent to Supabase.

const DB_NAME = 'WhatsAppE2EEKeyStore';
const STORE_NAME = 'user_private_keys';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePrivateKey(userId: string, privateKeyJWK: JsonWebKey): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({
        userId,
        privateKeyJWK,
        updatedAt: new Date().toISOString(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB is disabled or blocked (e.g. private mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`wa_pk_${userId}`, JSON.stringify(privateKeyJWK));
    }
  }
}

export async function getStoredPrivateKey(userId: string): Promise<JsonWebKey | null> {
  try {
    const db = await openDB();
    const result = await new Promise<{ userId: string; privateKeyJWK: JsonWebKey } | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (result && result.privateKeyJWK) {
      return result.privateKeyJWK;
    }
  } catch {
    // Check fallback
  }

  if (typeof window !== 'undefined') {
    const fallback = window.localStorage.getItem(`wa_pk_${userId}`);
    if (fallback) {
      try {
        return JSON.parse(fallback);
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function removeStoredPrivateKey(userId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(`wa_pk_${userId}`);
  }
}

/**
 * Cache for derived shared symmetric keys in memory during active session
 * Key: `${myUserId}:${peerUserId}` -> CryptoKey
 */
const sharedKeyMemoryCache = new Map<string, CryptoKey>();

export function getCachedSharedKey(myUserId: string, peerUserId: string): CryptoKey | undefined {
  const cacheKey = [myUserId, peerUserId].sort().join(':');
  return sharedKeyMemoryCache.get(cacheKey);
}

export function setCachedSharedKey(myUserId: string, peerUserId: string, key: CryptoKey): void {
  const cacheKey = [myUserId, peerUserId].sort().join(':');
  sharedKeyMemoryCache.set(cacheKey, key);
}

export function clearSharedKeyCache(): void {
  sharedKeyMemoryCache.clear();
}
