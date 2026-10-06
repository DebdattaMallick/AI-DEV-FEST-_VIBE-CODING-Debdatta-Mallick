/**
 * Client-side persistence using IndexedDB.
 * Autosaves the tender project (including file buffers as ArrayBuffers) with debouncing.
 */

import { Requirement, TenderInfo, UploadedFile } from '../types';

export interface SavedProject {
  id: string;
  updatedAt: string;
  tender: TenderInfo | null;
  requirements: Requirement[];
  uploadedFiles: Array<{
    id: string;
    name: string;
    size: number;
    pageCount: number;
    sha256: string;
    thumbnailDataUrl: string;
    buffer: ArrayBuffer;
  }>;
  matches: Record<string, string | null>;
  expiryDates: Record<string, string>;
  language: 'en' | 'bn';
  includeIndexPage: boolean;
  sealConfig?: any;
}

const DB_NAME = 'TenderPackageBuilderDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_store';
const PROJECT_KEY = 'active_project';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToStorage(project: SavedProject): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project, PROJECT_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('Failed to save project to IndexedDB (possible quota limit)', req.error);
        resolve(false);
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Storage save error', err);
    return false;
  }
}

export async function loadProjectFromStorage(): Promise<SavedProject | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PROJECT_KEY);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        resolve(null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Storage load error', err);
    return null;
  }
}

export async function clearProjectFromStorage(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(PROJECT_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}
