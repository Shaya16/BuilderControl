import * as FileSystem from 'expo-file-system/legacy';
import { File as FSFile } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { Control, ControlImage, Program, Project } from '@/types/project';
import { StreamingZipWriter, textToBytes } from './streamingZip';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECTS_FILE = 'projects.json';

/** Image sub-directories that exist under documentDirectory */
const IMAGE_DIRS = ['control-images', 'program-images', 'project-logos'] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
// ZIP EXPORT (for sharing externally — Google Drive, email, etc.)
// ---------------------------------------------------------------------------

/**
 * Create a ZIP backup and open the share sheet so the user can save it
 * to Google Drive, email, WhatsApp, etc.
 */
export async function exportBackupZip(
  projects: Project[],
  onProgress?: (current: number, total: number) => void,
  onStatus?: (status: string) => void,
): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) throw new Error('No cache directory available');

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipPath = `${cacheDir}backup_${dateStr}.zip`;

  // Collect all unique image URIs
  onStatus?.('אוסף תמונות...');
  const allUris: string[] = [];
  for (const project of projects) {
    allUris.push(...collectImageUris(project));
  }
  const uniqueUris = [...new Set(allUris.filter(Boolean))];
  const total = uniqueUris.length + 1; // +1 for JSON write

  // Stream directly to disk — each image is read, written to ZIP, then freed.
  // Unlike JSZip, this never holds the full ZIP in memory.
  const writer = new StreamingZipWriter(zipPath);

  try {
    onStatus?.(`מוסיף ${uniqueUris.length} תמונות...`);
    for (let i = 0; i < uniqueUris.length; i++) {
      const uri = uniqueUris[i];
      onProgress?.(i + 1, total);

      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) continue;

        const imgBytes = new FSFile(uri).bytesSync();
        const relativePath = toRelativePath(uri);
        writer.addFile(relativePath, imgBytes);
      } catch {
        // Skip broken refs
      }
    }

    // Add projects.json with rewritten relative URIs
    onStatus?.('שומר נתוני פרויקטים...');
    const rewritten = projects.map((p) => rewriteProjectUris(p, toRelativePath));
    const jsonBytes = textToBytes(JSON.stringify(rewritten));
    writer.addFile(PROJECTS_FILE, jsonBytes);
    onProgress?.(total, total);

    // Finalize ZIP (writes central directory + closes file)
    onStatus?.('מסיים קובץ ZIP...');
    writer.finalize();
  } catch (error) {
    // Ensure file handle is closed on any error
    writer.close();
    throw error;
  }

  onStatus?.('פותח שיתוף...');
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
  const zipBytes = new FSFile(zipUri).bytesSync();
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
