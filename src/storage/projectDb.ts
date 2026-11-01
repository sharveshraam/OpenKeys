import { ProjectData } from '../types/music';
import { DEMO_PROJECTS } from './demoProjects';

const DB_NAME = 'OpenKeysStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const FALLBACK_KEY = 'openkeys_projects_fallback_v1';
const memoryFallbackStore: Record<string, ProjectData> = {};

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFallbackMap(): Record<string, ProjectData> {
  try {
    if (typeof localStorage === 'undefined') return { ...memoryFallbackStore };
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : { ...memoryFallbackStore };
  } catch {
    return { ...memoryFallbackStore };
  }
}

function writeFallbackMap(map: Record<string, ProjectData>): void {
  Object.keys(memoryFallbackStore).forEach((k) => delete memoryFallbackStore[k]);
  Object.assign(memoryFallbackStore, map);
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

export async function saveProjectToDb(project: ProjectData): Promise<ProjectData> {
  const updated: ProjectData = {
    ...project,
    updatedAt: Date.now(),
  };

  // Always mirror in localStorage fallback for instant recovery
  const map = readFallbackMap();
  map[updated.id] = updated;
  writeFallbackMap(map);

  const db = await openDatabase();
  if (!db) return updated;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(updated);
      tx.oncomplete = () => {
        db.close();
        resolve(updated);
      };
      tx.onerror = () => {
        db.close();
        resolve(updated);
      };
    } catch {
      db.close();
      resolve(updated);
    }
  });
}

export async function listProjectsFromDb(): Promise<ProjectData[]> {
  const db = await openDatabase();
  const byId = new Map<string, ProjectData>();

  // Seed with demo projects first so user always has rich musical templates
  for (const demo of DEMO_PROJECTS) {
    byId.set(demo.id, JSON.parse(JSON.stringify(demo)));
  }

  // Merge fallback map
  const fallback = readFallbackMap();
  for (const p of Object.values(fallback)) {
    byId.set(p.id, p);
  }

  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = (req.result as ProjectData[]) || [];
          for (const r of rows) {
            byId.set(r.id, r);
          }
          db.close();
          resolve();
        };
        req.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  const map = readFallbackMap();
  delete map[projectId];
  writeFallbackMap(map);

  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(projectId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function exportProjectAsJsonFile(project: ProjectData): string {
  const json = JSON.stringify(project, null, 2);
  const safeName =
    (project.name || 'openkeys-project')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-|-$/g, '') || 'openkeys';
  const filename = `${safeName}.openkeys.json`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return filename;
}

export function validateImportedProjectJson(rawJson: string): ProjectData {
  const parsed = JSON.parse(rawJson);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.tracks) ||
    !Array.isArray(parsed.notes)
  ) {
    throw new Error(
      'Invalid OpenKeys project file: missing tracks or notes arrays.'
    );
  }
  return {
    ...DEMO_PROJECTS[0],
    ...parsed,
    id: parsed.id || `proj-${Date.now()}`,
    updatedAt: Date.now(),
  };
}
