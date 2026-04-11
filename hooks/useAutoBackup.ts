import { useEffect, useRef } from 'react';

import { useBackupProgress } from '@/contexts/BackupProgressContext';
import { runAutoBackup, shouldAutoBackup } from '@/utils/autoBackup';

/**
 * Hook that triggers an automatic Google Drive backup on app open
 * if the user is signed in and the last backup was >30 days ago.
 *
 * Must be used inside a BackupProgressProvider.
 * Runs once on mount (app open), non-blocking.
 */
export function useAutoBackup() {
  const backup = useBackupProgress();
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per app session
    if (hasRun.current) return;
    hasRun.current = true;

    shouldAutoBackup()
      .then((should) => {
        if (should) {
          runAutoBackup(backup);
        }
      })
      .catch((err) => {
        console.warn('[useAutoBackup] check failed:', err);
      });
  }, []);
}
