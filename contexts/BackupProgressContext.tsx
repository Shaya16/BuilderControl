import { createContext, useCallback, useContext, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BackupStatus = 'idle' | 'active' | 'success' | 'error';

type BackupProgressState = {
  status: BackupStatus;
  label: string;
  /** 0 – 1 */
  progress: number;
};

type BackupProgressActions = {
  startBackup: (label: string) => void;
  updateProgress: (current: number, total: number) => void;
  finishBackup: () => void;
  failBackup: (error: string) => void;
};

type BackupProgressContextValue = BackupProgressState & BackupProgressActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BackupProgressContext = createContext<BackupProgressContextValue | null>(
  null,
);

export function useBackupProgress(): BackupProgressContextValue {
  const ctx = useContext(BackupProgressContext);
  if (!ctx) {
    throw new Error(
      'useBackupProgress must be used within a BackupProgressProvider',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BackupProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<BackupProgressState>({
    status: 'idle',
    label: '',
    progress: 0,
  });

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = (ms: number) => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      setState({ status: 'idle', label: '', progress: 0 });
    }, ms);
  };

  const startBackup = useCallback((label: string) => {
    clearHideTimer();
    setState({ status: 'active', label, progress: 0 });
  }, []);

  const updateProgress = useCallback((current: number, total: number) => {
    setState((prev) => ({
      ...prev,
      progress: total > 0 ? current / total : 0,
    }));
  }, []);

  const finishBackup = useCallback(() => {
    setState({ status: 'success', label: 'גיבוי הושלם', progress: 1 });
    scheduleHide(3000);
  }, []);

  const failBackup = useCallback((error: string) => {
    setState({ status: 'error', label: error, progress: 0 });
    scheduleHide(4000);
  }, []);

  return (
    <BackupProgressContext.Provider
      value={{
        ...state,
        startBackup,
        updateProgress,
        finishBackup,
        failBackup,
      }}>
      {children}
    </BackupProgressContext.Provider>
  );
}
