import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { Control, ControlImage, Program, Project } from '@/types/project';

const EXPORT_IMAGE_MAX_WIDTH = 800;
const EXPORT_IMAGE_COMPRESS = 0.5;

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

async function fileUriToBase64(uri: string): Promise<string> {
  try {
    if (!uri || uri.startsWith('data:')) return uri;

    let localUri = uri;
    if (!uri.startsWith('file://')) {
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) return '';
      const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const dest = `${cacheDir}json_img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      localUri = dest;
    }

    try {
      const result = await manipulateAsync(
        localUri,
        [{ resize: { width: EXPORT_IMAGE_MAX_WIDTH } }],
        {
          format: SaveFormat.JPEG,
          compress: EXPORT_IMAGE_COMPRESS,
          base64: true,
        },
      );
      if (result.base64) {
        return `data:image/jpeg;base64,${result.base64}`;
      }
    } catch (err) {
      console.warn('[exportProjectsJSON] image compression failed, using original:', uri, err);
    }

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime =
      ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
            : 'image/jpeg';

    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.warn('[exportProjectsJSON] failed to encode image:', uri, e);
    return '';
  }
}

async function base64ToFileUri(dataUri: string): Promise<string> {
  if (!dataUri || !dataUri.startsWith('data:')) return dataUri ?? '';

  const mimeMatch = dataUri.match(/^data:(image\/\w+);base64,/);
  if (!mimeMatch) return dataUri;

  const mime = mimeMatch[1];
  const ext =
    mime === 'image/png' ? 'png'
      : mime === 'image/gif' ? 'gif'
        : mime === 'image/webp' ? 'webp'
          : 'jpg';

  const raw = dataUri.replace(/^data:image\/\w+;base64,/, '');
  const cacheDir = FileSystem.documentDirectory;
  if (!cacheDir) return '';

  const filename = `imported_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const fileUri = `${cacheDir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, raw, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}

// ---------------------------------------------------------------------------
// Deep-convert helpers (export: file→base64, import: base64→file)
// ---------------------------------------------------------------------------

async function convertControlImages(
  images: ControlImage[] | undefined,
  converter: (uri: string) => Promise<string>,
): Promise<ControlImage[] | undefined> {
  if (!images || images.length === 0) return images;
  const results: ControlImage[] = [];
  for (const img of images) {
    results.push({ ...img, uri: await converter(img.uri) });
  }
  return results;
}

async function convertPrograms(
  programs: Program[] | undefined,
  converter: (uri: string) => Promise<string>,
): Promise<Program[] | undefined> {
  if (!programs || programs.length === 0) return programs;
  const results: Program[] = [];
  for (const p of programs) {
    results.push({
      ...p,
      imageUri: p.imageUri ? await converter(p.imageUri) : undefined,
    });
  }
  return results;
}

async function convertControl(
  control: Control,
  converter: (uri: string) => Promise<string>,
): Promise<Control> {
  return {
    ...control,
    programs: (await convertPrograms(control.programs, converter)) ?? control.programs,
    IronControlImages: await convertControlImages(control.IronControlImages, converter),
    ElectricalControlImages: await convertControlImages(control.ElectricalControlImages, converter),
    InstallationControlImages: await convertControlImages(control.InstallationControlImages, converter),
    WaterControlImages: await convertControlImages(control.WaterControlImages, converter),
    ConcreteControlImages: await convertControlImages(control.ConcreteControlImages, converter),
    otherControlImages: await convertControlImages(control.otherControlImages, converter),
  };
}

async function convertProject(
  project: Project,
  converter: (uri: string) => Promise<string>,
): Promise<Project> {
  const logoUri = project.logoUri ? await converter(project.logoUri) : undefined;
  const programs = await convertPrograms(project.programs, converter);
  const controls = project.controls
    ? await sequentialMap(project.controls, (c) => convertControl(c, converter))
    : undefined;

  return { ...project, logoUri, programs, controls };
}

async function sequentialMap<T, R>(arr: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const item of arr) {
    results.push(await fn(item));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportProjectsToJSON(
  projects: Project[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const total = projects.length;

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) throw new Error('No cache or document directory available');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `projects_backup_${dateStr}.json`;
  const fileUri = `${cacheDir}${filename}`;

  // Convert each project to a temp file to avoid OOM from holding all base64 data in memory
  const tempFiles: string[] = [];
  for (let i = 0; i < projects.length; i++) {
    onProgress?.(i + 1, total);
    const converted = await convertProject(projects[i], fileUriToBase64);
    const tempPath = `${cacheDir}proj_chunk_${i}_${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(converted));
    tempFiles.push(tempPath);
    // converted object is now eligible for GC
  }

  // Combine temp files incrementally: read current output + one chunk at a time
  await FileSystem.writeAsStringAsync(fileUri, '[');

  for (let i = 0; i < tempFiles.length; i++) {
    const chunk = await FileSystem.readAsStringAsync(tempFiles[i]);
    const existing = await FileSystem.readAsStringAsync(fileUri);
    await FileSystem.writeAsStringAsync(fileUri, existing + (i > 0 ? ',' : '') + chunk);
    await FileSystem.deleteAsync(tempFiles[i], { idempotent: true });
  }

  const final = await FileSystem.readAsStringAsync(fileUri);
  await FileSystem.writeAsStringAsync(fileUri, final + ']');

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'ייצוא פרויקטים',
      UTI: 'public.json',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function importProjectsFromJSON(
  onProgress?: (current: number, total: number) => void,
): Promise<Project[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', 'public.text'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const file = result.assets?.[0];
  if (!file?.uri) return null;

  const content = await FileSystem.readAsStringAsync(file.uri);

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
    restored.push(await convertProject(parsed[i], base64ToFileUri));
  }

  return restored;
}
