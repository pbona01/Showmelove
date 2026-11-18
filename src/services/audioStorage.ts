const DB_NAME = 'showmelove_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'voice_notes';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open audio DB'));
  });
}

export interface AudioStorageAdapter {
  saveVoiceNote(key: string, blob: Blob): Promise<void>;
  getVoiceNote(key: string): Promise<Blob | null>;
  deleteVoiceNote(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

class IndexedDbAudioStorage implements AudioStorageAdapter {
  async saveVoiceNote(key: string, blob: Blob): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save voice note'));
    });
  }

  async getVoiceNote(key: string): Promise<Blob | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result instanceof Blob ? result : null);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to read voice note'));
    });
  }

  async deleteVoiceNote(key: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete voice note'));
    });
  }

  async clearAll(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear audio store'));
    });
  }
}

export const audioStorage: AudioStorageAdapter = new IndexedDbAudioStorage();
