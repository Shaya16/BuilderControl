import { File as FSFile } from 'expo-file-system';

import { BACKUP_FOLDER_NAME, BACKUP_MAX_COUNT } from '@/constants/google';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DriveFile = {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
};

// ---------------------------------------------------------------------------
// Folder cache
// ---------------------------------------------------------------------------

let cachedFolderId: string | null = null;

/**
 * Clear the cached folder ID (e.g., on sign-out).
 */
export function clearFolderCache(): void {
  cachedFolderId = null;
}

// ---------------------------------------------------------------------------
// Folder management
// ---------------------------------------------------------------------------

/**
 * Find or create the backup folder on Google Drive.
 * Returns the folder ID.
 */
export async function ensureBackupFolder(
  accessToken: string,
): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  // Search for existing folder
  const query = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error('שגיאה בחיפוש תיקיית גיבוי בדרייב');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id;
    return cachedFolderId!;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('שגיאה ביצירת תיקיית גיבוי בדרייב');
  }

  const createData = await createRes.json();
  cachedFolderId = createData.id;
  return cachedFolderId!;
}

// ---------------------------------------------------------------------------
// File upload (resumable)
// ---------------------------------------------------------------------------

/**
 * Upload a file to Google Drive using the resumable upload protocol.
 * Supports large files and provides progress callbacks.
 */
export async function uploadFile(
  accessToken: string,
  filePath: string,
  fileName: string,
  folderId: string,
  onProgress?: (bytesSent: number, totalBytes: number) => void,
): Promise<string> {
  // Step 1: Initiate resumable upload session
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/zip',
  };

  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/zip',
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`שגיאה בהתחלת העלאה: ${err}`);
  }

  const sessionUri = initRes.headers.get('Location');
  if (!sessionUri) {
    throw new Error('שגיאה: לא התקבל URI להעלאה');
  }

  // Step 2: Read file bytes via JSI
  const fileBytes = await new FSFile(filePath).bytes();
  const totalBytes = fileBytes.byteLength;

  // Step 3: Upload in chunks for progress reporting
  const CHUNK_SIZE = 256 * 1024; // 256 KB chunks
  let bytesSent = 0;

  while (bytesSent < totalBytes) {
    const end = Math.min(bytesSent + CHUNK_SIZE, totalBytes);
    const chunk = fileBytes.slice(bytesSent, end);
    const isLast = end === totalBytes;

    const uploadRes = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.byteLength.toString(),
        'Content-Range': `bytes ${bytesSent}-${end - 1}/${totalBytes}`,
      },
      body: chunk,
    });

    bytesSent = end;
    onProgress?.(bytesSent, totalBytes);

    if (isLast) {
      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`שגיאה בהעלאה: ${err}`);
      }
      const result = await uploadRes.json();
      return result.id;
    }

    // For non-final chunks, 308 Resume Incomplete is expected
    if (uploadRes.status !== 308 && !uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`שגיאה בהעלאת חלק: ${err}`);
    }
  }

  throw new Error('שגיאה בהעלאה: לא נשלחו נתונים');
}

// ---------------------------------------------------------------------------
// List & cleanup
// ---------------------------------------------------------------------------

/**
 * List all backup files in the backup folder, newest first.
 */
export async function listBackups(
  accessToken: string,
  folderId: string,
): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return data.files ?? [];
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Keep only the N most recent backups, delete the rest.
 */
export async function cleanupOldBackups(
  accessToken: string,
  folderId: string,
  keepCount: number = BACKUP_MAX_COUNT,
): Promise<void> {
  const files = await listBackups(accessToken, folderId);
  if (files.length <= keepCount) return;

  const toDelete = files.slice(keepCount);
  for (const file of toDelete) {
    try {
      await deleteFile(accessToken, file.id);
    } catch {
      // Skip individual delete failures
    }
  }
}
