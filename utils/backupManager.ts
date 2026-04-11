import * as FileSystem from 'expo-file-system/legacy';
import { File as FSFile } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { Control, ControlImage, Program, Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUPS_DIR = 'backups';
const META_FILE = 'meta.json';
const PROJECTS_FILE = 'projects.json';

/** Image sub-directories that exist under documentDirectory */
const IMAGE_DIRS = ['control-images', 'program-images', 'project-logos'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BackupMeta = {
  id: string;
  timestamp: string; // ISO 8601
  projectCount: number;
  imageCount: number;
  sizeBytes: number;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getBackupsRoot(): string {
  const doc = FileSystem.documentDirectory;
  if (!doc) throw new Error('No documentDirectory available');
  return `${doc}${BACKUPS_DIR}/`;
}

function getBackupDir(backupId: string): string {
  return `${getBackupsRoot()}${backupId}/`;
}

/** Collect every image URI referenced by a project. */
function collectImageUris(project: Project): string[] {
  const uris: string[] = [];

  if (project.logoUri) uris.push(project.logoUri);

  const pushControlImages = (images?: ControlImage[]) => {
    images?.forEach((img) => {
      if (img.uri) uris.push(img.uri);
    });
  };

  const pushPrograms = (programs?: Program[]) => {
    programs?.forEach((p) => {
      if (p.imageUri) uris.push(p.imageUri);
    });
  };

  pushPrograms(project.programs);

  project.controls?.forEach((c) => {
    pushControlImages(c.IronControlImages);
    pushControlImages(c.ElectricalControlImages);
    pushControlImages(c.InstallationControlImages);
    pushControlImages(c.WaterControlImages);
    pushControlImages(c.ConcreteControlImages);
    pushControlImages(c.otherControlImages);
    pushPrograms(c.programs);
  });

  return uris;
}

/**
 * Given an absolute file URI, return a relative path like
 * "images/control-images/1234_abc.jpg".
 */
function toRelativePath(uri: string): string {
  const docDir = FileSystem.documentDirectory ?? '';
  if (uri.startsWith(docDir)) {
    return `images/${uri.slice(docDir.length)}`;
  }
  // Fallback — just use the filename
  const name = uri.split('/').pop() ?? `img_${Date.now()}.jpg`;
  return `images/${name}`;
}

/**
 * Given a relative path, return the absolute file URI under documentDirectory.
 */
function toAbsolutePath(relativePath: string): string {
  const docDir = FileSystem.documentDirectory ?? '';
  // Strip the "images/" prefix to get the original path under documentDirectory
  const stripped = relativePath.replace(/^images\//, '');
  return `${docDir}${stripped}`;
}

/**
 * Deep-rewrite all image URIs in a project using a mapping function.
 */
function rewriteProjectUris(
  project: Project,
  mapper: (uri: string) => string,
): Project {
  const mapImages = (images?: ControlImage[]): ControlImage[] | undefined =>
    images?.map((img) => ({ ...img, uri: img.uri ? mapper(img.uri) : img.uri }));

  const mapPrograms = (programs?: Program[]): Program[] | undefined =>
    programs?.map((p) => ({
      ...p,
      imageUri: p.imageUri ? mapper(p.imageUri) : undefined,
    }));

  const mapControl = (control: Control): Control => ({
    ...control,
    programs: mapPrograms(control.programs) ?? control.programs,
    IronControlImages: mapImages(control.IronControlImages),
    ElectricalControlImages: mapImages(control.ElectricalControlImages),
    InstallationControlImages: mapImages(control.InstallationControlImages),
    WaterControlImages: mapImages(control.WaterControlImages),
    ConcreteControlImages: mapImages(control.ConcreteControlImages),
    otherControlImages: mapImages(control.otherControlImages),
  });

  return {
    ...project,
    logoUri: project.logoUri ? mapper(project.logoUri) : undefined,
    programs: mapPrograms(project.programs),
    controls: project.controls?.map(mapControl),
  };
}

// ---------------------------------------------------------------------------
// LOCAL BACKUP (fast, stored in documentDirectory/backups/)
// ---------------------------------------------------------------------------

/**
 * Create a local backup snapshot. Copies all referenced image files into
 * a timestamped backup folder and writes a projects.json with relative paths.
 */
export async function createLocalBackup(
  projects: Project[],
): Promise<BackupMeta> {
  const backupId = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = getBackupDir(backupId);
  const imagesDir = `${backupDir}images/`;

  // Create directories
  await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
  for (const subDir of IMAGE_DIRS) {
    await FileSystem.makeDirectoryAsync(`${imagesDir}${subDir}`, {
      intermediates: true,
    });
  }

  // Collect all image URIs and copy them
  let imageCount = 0;
  const copiedUris = new Set<string>();

  for (const project of projects) {
    const uris = collectImageUris(project);
    for (const uri of uris) {
      if (!uri || copiedUris.has(uri)) continue;
      copiedUris.add(uri);

      const relativePath = toRelativePath(uri);
      const destPath = `${backupDir}${relativePath}`;

      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.copyAsync({ from: uri, to: destPath });
          imageCount++;
        }
      } catch {
        // Skip broken image refs
      }
    }
  }

  // Rewrite URIs to relative paths and save projects.json
  const rewritten = projects.map((p) => rewriteProjectUris(p, toRelativePath));
  const json = JSON.stringify(rewritten);
  await FileSystem.writeAsStringAsync(`${backupDir}${PROJECTS_FILE}`, json);

  // Compute size
  let sizeBytes = json.length;
  // Approximate image sizes from the copy count (exact would require stat on each)
  // We'll update this in listLocalBackups if needed

  // Write metadata
  const meta: BackupMeta = {
    id: backupId,
    timestamp: new Date().toISOString(),
    projectCount: projects.length,
    imageCount,
    sizeBytes,
  };
  await FileSystem.writeAsStringAsync(
    `${backupDir}${META_FILE}`,
    JSON.stringify(meta),
  );

  return meta;
}

/**
 * List all local backups, newest first.
 */
export async function listLocalBackups(): Promise<BackupMeta[]> {
  const root = getBackupsRoot();

  try {
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    const dirs = await FileSystem.readDirectoryAsync(root);

    const metas: BackupMeta[] = [];
    for (const dir of dirs) {
      try {
        const metaPath = `${root}${dir}/${META_FILE}`;
        const metaInfo = await FileSystem.getInfoAsync(metaPath);
        if (!metaInfo.exists) continue;

        const content = await FileSystem.readAsStringAsync(metaPath);
        metas.push(JSON.parse(content));
      } catch {
        // Skip corrupted backup entries
      }
    }

    // Sort newest first
    metas.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return metas;
  } catch {
    return [];
  }
}

/**
 * Restore projects and images from a local backup.
 * Returns the restored projects array (caller decides whether to merge/replace).
 */
export async function restoreFromLocalBackup(
  backupId: string,
): Promise<Project[]> {
  const backupDir = getBackupDir(backupId);
  const projectsPath = `${backupDir}${PROJECTS_FILE}`;

  const content = await FileSystem.readAsStringAsync(projectsPath);
  const projects: Project[] = JSON.parse(content);

  // Copy images back to their original locations
  const docDir = FileSystem.documentDirectory ?? '';
  const imagesDir = `${backupDir}images/`;

  for (const subDir of IMAGE_DIRS) {
    const srcDir = `${imagesDir}${subDir}`;
    const destDir = `${docDir}${subDir}`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(srcDir);
      if (!dirInfo.exists) continue;

      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const files = await FileSystem.readDirectoryAsync(srcDir);

      for (const file of files) {
        try {
          await FileSystem.copyAsync({
            from: `${srcDir}/${file}`,
            to: `${destDir}/${file}`,
          });
        } catch {
          // Skip individual file failures
        }
      }
    } catch {
      // Skip missing directories
    }
  }

  // Rewrite relative paths back to absolute paths
  const restored = projects.map((p) =>
    rewriteProjectUris(p, toAbsolutePath),
  );

  return restored;
}

/**
 * Delete a single local backup.
 */
export async function deleteLocalBackup(backupId: string): Promise<void> {
  const backupDir = getBackupDir(backupId);
  await FileSystem.deleteAsync(backupDir, { idempotent: true });
}

/**
 * Remove the oldest backups to keep at most `keepCount` backups.
 */
export async function pruneOldBackups(keepCount: number): Promise<void> {
  const metas = await listLocalBackups();
  if (metas.length <= keepCount) return;

  const toDelete = metas.slice(keepCount);
  for (const meta of toDelete) {
    await deleteLocalBackup(meta.id);
  }
}

// ---------------------------------------------------------------------------
// ZIP EXPORT (for sharing externally — Google Drive, email, etc.)
// ---------------------------------------------------------------------------

/**
 * Create a ZIP backup and open the share sheet so the user can save it
 * to Google Drive, email, WhatsApp, etc.
 */
export async function exportBackupZip(
  projects: Project[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();

  // Collect all unique image URIs
  const allUris: string[] = [];
  for (const project of projects) {
    allUris.push(...collectImageUris(project));
  }
  const uniqueUris = [...new Set(allUris.filter(Boolean))];
  const total = uniqueUris.length + 1; // +1 for the JSON write

  // Add images to zip as raw bytes (no base64)
  for (let i = 0; i < uniqueUris.length; i++) {
    const uri = uniqueUris[i];
    onProgress?.(i + 1, total);

    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) continue;

      const imgBytes = new FSFile(uri).bytes();
      const relativePath = toRelativePath(uri);
      zip.file(relativePath, imgBytes);
    } catch {
      // Skip broken refs
    }
  }

  // Rewrite URIs and add projects.json
  const rewritten = projects.map((p) => rewriteProjectUris(p, toRelativePath));
  zip.file(PROJECTS_FILE, JSON.stringify(rewritten));
  onProgress?.(total, total);

  // Generate zip as raw bytes and write via JSI (no string size limits)
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) throw new Error('No cache directory available');

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipPath = `${cacheDir}backup_${dateStr}.zip`;

  const outFile = new FSFile(zipPath);
  const handle = outFile.open();
  handle.writeBytes(zipBytes);
  handle.close();

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'ייצוא גיבוי',
      UTI: 'public.zip-archive',
    });
  } else {
    throw new Error('שיתוף לא זמין במכשיר הזה');
  }
}

/**
 * Import a backup from a ZIP file (or JSON for backward compatibility).
 * Returns the restored projects array, or null if the user cancelled.
 */
export async function importBackupFile(
  onProgress?: (current: number, total: number) => void,
): Promise<Project[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/zip',
      'application/json',
      'public.json',
      'public.text',
      'public.zip-archive',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const file = result.assets?.[0];
  if (!file?.uri) return null;

  const isZip =
    file.mimeType?.includes('zip') ||
    file.name?.endsWith('.zip') ||
    file.uri.endsWith('.zip');

  if (isZip) {
    return importFromZip(file.uri, onProgress);
  } else {
    // Backward compatibility: import old JSON format
    return importFromJSON(file.uri, onProgress);
  }
}

// ---------------------------------------------------------------------------
// ZIP import
// ---------------------------------------------------------------------------

async function importFromZip(
  zipUri: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Project[]> {
  // Read ZIP as raw bytes via JSI (no string size limits)
  const zipBytes = new FSFile(zipUri).bytes();
  const zip = await JSZip.loadAsync(zipBytes);

  // Read projects.json
  const projectsFile = zip.file(PROJECTS_FILE);
  if (!projectsFile) {
    throw new Error('קובץ גיבוי לא תקין: חסר projects.json');
  }

  const projectsJson = await projectsFile.async('string');
  const projects: Project[] = JSON.parse(projectsJson);

  // Validate
  if (!Array.isArray(projects)) {
    throw new Error('פורמט גיבוי לא תקין: נדרש מערך של פרויקטים');
  }
  for (const item of projects) {
    if (!item.id || !item.name) {
      throw new Error('פורמט פרויקט לא תקין: כל פרויקט חייב לכלול id ו-name');
    }
  }

  // Extract images
  const docDir = FileSystem.documentDirectory ?? '';
  const imageFiles = Object.keys(zip.files).filter(
    (path) => path.startsWith('images/') && !zip.files[path].dir,
  );
  const total = imageFiles.length;

  for (let i = 0; i < imageFiles.length; i++) {
    const relativePath = imageFiles[i];
    onProgress?.(i + 1, total);

    try {
      // Strip "images/" prefix to get path under documentDirectory
      const stripped = relativePath.replace(/^images\//, '');
      const destPath = `${docDir}${stripped}`;

      // Ensure parent directory exists
      const parentDir = destPath.substring(0, destPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });

      const imgBytes = await zip.files[relativePath].async('uint8array');
      const imgFile = new FSFile(destPath);
      const imgHandle = imgFile.open();
      imgHandle.writeBytes(imgBytes);
      imgHandle.close();
    } catch {
      // Skip individual file failures
    }
  }

  // Rewrite relative paths to absolute
  const restored = projects.map((p) =>
    rewriteProjectUris(p, toAbsolutePath),
  );

  return restored;
}

// ---------------------------------------------------------------------------
// Legacy JSON import (backward compatibility)
// ---------------------------------------------------------------------------

async function importFromJSON(
  jsonUri: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Project[]> {
  // Re-use the existing importProjectsFromJSON logic inline
  const content = await FileSystem.readAsStringAsync(jsonUri);
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error('פורמט JSON לא תקין: נדרש מערך של פרויקטים');
  }

  for (const item of parsed) {
    if (!item.id || !item.name) {
      throw new Error('פורמט פרויקט לא תקין: כל פרויקט חייב לכלול id ו-name');
    }
  }

  const total = parsed.length;
  const restored: Project[] = [];

  for (let i = 0; i < parsed.length; i++) {
    onProgress?.(i + 1, total);
    restored.push(await convertProjectFromBase64(parsed[i]));
  }

  return restored;
}

/**
 * Convert a single project from the old base64 JSON format to file URIs.
 * Walks every image URI — if it's a data: URI, writes it to disk.
 */
async function convertProjectFromBase64(project: Project): Promise<Project> {
  const mapUri = async (uri: string): Promise<string> => {
    if (!uri || !uri.startsWith('data:')) return uri ?? '';

    const mimeMatch = uri.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) return uri;

    const mime = mimeMatch[1];
    const ext =
      mime === 'image/png'
        ? 'png'
        : mime === 'image/gif'
          ? 'gif'
          : mime === 'image/webp'
            ? 'webp'
            : 'jpg';

    const raw = uri.replace(/^data:image\/\w+;base64,/, '');
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return '';

    const filename = `imported_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const fileUri = `${docDir}control-images/${filename}`;

    await FileSystem.makeDirectoryAsync(`${docDir}control-images`, {
      intermediates: true,
    });
    await FileSystem.writeAsStringAsync(fileUri, raw, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  };

  // We need an async version of rewriteProjectUris for base64 conversion
  const mapImages = async (
    images?: ControlImage[],
  ): Promise<ControlImage[] | undefined> => {
    if (!images) return undefined;
    const results: ControlImage[] = [];
    for (const img of images) {
      results.push({ ...img, uri: img.uri ? await mapUri(img.uri) : img.uri });
    }
    return results;
  };

  const mapPrograms = async (
    programs?: Program[],
  ): Promise<Program[] | undefined> => {
    if (!programs) return undefined;
    const results: Program[] = [];
    for (const p of programs) {
      results.push({
        ...p,
        imageUri: p.imageUri ? await mapUri(p.imageUri) : undefined,
      });
    }
    return results;
  };

  const mapControl = async (control: Control): Promise<Control> => ({
    ...control,
    programs: (await mapPrograms(control.programs)) ?? control.programs,
    IronControlImages: await mapImages(control.IronControlImages),
    ElectricalControlImages: await mapImages(control.ElectricalControlImages),
    InstallationControlImages: await mapImages(
      control.InstallationControlImages,
    ),
    WaterControlImages: await mapImages(control.WaterControlImages),
    ConcreteControlImages: await mapImages(control.ConcreteControlImages),
    otherControlImages: await mapImages(control.otherControlImages),
  });

  const controls: Control[] = [];
  if (project.controls) {
    for (const c of project.controls) {
      controls.push(await mapControl(c));
    }
  }

  return {
    ...project,
    logoUri: project.logoUri ? await mapUri(project.logoUri) : undefined,
    programs: await mapPrograms(project.programs),
    controls: project.controls ? controls : undefined,
  };
}
