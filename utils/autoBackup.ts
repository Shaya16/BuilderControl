import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { BACKUP_INTERVAL_DAYS } from '@/constants/google';
import { loadProjects } from './projectStorage';
import { createBackupZip } from './backupManager';
import { getValidAccessToken, isSignedIn } from './googleAuth';
import {
  cleanupOldBackups,
  ensureBackupFolder,
  uploadFile,
} from './googleDriveApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASYNC_KEY_LAST_BACKUP = 'lastDriveBackupDate';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether an auto-backup should run.
 * Returns true if signed in AND last backup was >BACKUP_INTERVAL_DAYS ago (or never).
 */
export async function shouldAutoBackup(): Promise<boolean> {
  const signedIn = await isSignedIn();
  if (!signedIn) return false;

  const lastStr = await AsyncStorage.getItem(ASYNC_KEY_LAST_BACKUP);
  if (!lastStr) return true; // Never backed up

  const lastDate = new Date(lastStr).getTime();
  const daysSince = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
  return daysSince >= BACKUP_INTERVAL_DAYS;
}

/**
 * Run a full backup to Google Drive.
 *
 * Progress is split into two phases:
 *   Phase 1 (0% – 50%):  Creating the ZIP file
 *   Phase 2 (50% – 100%): Uploading to Google Drive
 */
export async function runAutoBackup(ctx: {
  startBackup: (label: string) => void;
  updateProgress: (current: number, total: number) => void;
  finishBackup: () => void;
  failBackup: (error: string) => void;
}): Promise<void> {
  try {
    ctx.startBackup('מגבה לגוגל דרייב...');

    // 1. Load projects
    const projects = await loadProjects();
    if (projects.length === 0) {
      ctx.finishBackup();
      return;
    }

    // 2. Get valid access token
    const accessToken = await getValidAccessToken();

    // 3. Create ZIP (phase 1: 0-50%)
    const zipPath = await createBackupZip(projects, (current, total) => {
      // Map to 0-50% of overall progress
      ctx.updateProgress(current, total * 2);
    });

    // 4. Ensure backup folder exists on Drive
    const folderId = await ensureBackupFolder(accessToken);

    // 5. Upload ZIP (phase 2: 50-100%)
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date()
      .toISOString()
      .slice(11, 16)
      .replace(':', '-');
    const fileName = `backup_${dateStr}_${timeStr}.zip`;

    // Get total bytes for progress calculation
    const fileInfo = await FileSystem.getInfoAsync(zipPath);
    const totalBytes =
      fileInfo.exists && 'size' in fileInfo ? fileInfo.size ?? 0 : 0;

    await uploadFile(
      accessToken,
      zipPath,
      fileName,
      folderId,
      (bytesSent, total) => {
        // Map to 50-100% of overall progress
        const uploadFraction = total > 0 ? bytesSent / total : 1;
        ctx.updateProgress(50 + uploadFraction * 50, 100);
      },
    );

    // 6. Cleanup old backups on Drive
    try {
      await cleanupOldBackups(accessToken, folderId);
    } catch {
      // Non-critical, don't fail the backup
    }

    // 7. Store backup date
    await AsyncStorage.setItem(ASYNC_KEY_LAST_BACKUP, new Date().toISOString());

    // 8. Clean up temp ZIP
    try {
      await FileSystem.deleteAsync(zipPath, { idempotent: true });
    } catch {
      // Non-critical
    }

    ctx.finishBackup();
  } catch (error: any) {
    console.warn('[autoBackup] failed:', error);
    ctx.failBackup(error?.message ?? 'שגיאה בגיבוי');
  }
}

/**
 * Get the date of the last successful backup, or null if never.
 */
export async function getLastBackupDate(): Promise<Date | null> {
  const str = await AsyncStorage.getItem(ASYNC_KEY_LAST_BACKUP);
  return str ? new Date(str) : null;
}
