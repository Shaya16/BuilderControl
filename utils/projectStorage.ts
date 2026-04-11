import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '@/constants/controls';
import { Project } from '@/types/project';
import { createLocalBackup, pruneOldBackups } from './backupManager';

const BACKUP_DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes
const MAX_LOCAL_BACKUPS = 20;

let lastBackupTime = 0;

/**
 * Load all projects from AsyncStorage.
 */
export async function loadProjects(): Promise<Project[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save the full projects array to AsyncStorage and trigger an auto-backup
 * in the background (debounced so we don't flood the filesystem).
 */
export async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  scheduleAutoBackup(projects);
}

/**
 * Save a single updated project into the full list (read-modify-write).
 * This is the pattern every tab screen uses.
 */
export async function saveProject(updated: Project): Promise<void> {
  const projects = await loadProjects();
  const next = projects.map((p) => (p.id === updated.id ? updated : p));
  await saveProjects(next);
}

// ---------------------------------------------------------------------------
// Auto-backup (fire-and-forget, debounced)
// ---------------------------------------------------------------------------

function scheduleAutoBackup(projects: Project[]): void {
  const now = Date.now();
  if (now - lastBackupTime < BACKUP_DEBOUNCE_MS) return;
  lastBackupTime = now;

  createLocalBackup(projects)
    .then(() => pruneOldBackups(MAX_LOCAL_BACKUPS))
    .catch((err) => console.warn('[auto-backup] failed:', err));
}
