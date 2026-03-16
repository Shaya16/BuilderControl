import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { Control, ControlImage, Program, Project } from '@/types/project';

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
  return Promise.all(
    images.map(async (img) => ({ ...img, uri: await converter(img.uri) })),
  );
}

async function convertPrograms(
  programs: Program[] | undefined,
  converter: (uri: string) => Promise<string>,
): Promise<Program[] | undefined> {
  if (!programs || programs.length === 0) return programs;
  return Promise.all(
    programs.map(async (p) => ({
      ...p,
      imageUri: p.imageUri ? await converter(p.imageUri) : undefined,
    })),
  );
}

async function convertControl(
  control: Control,
  converter: (uri: string) => Promise<string>,
): Promise<Control> {
  const [
    programs,
    ironImages,
    electricImages,
    installationImages,
    waterImages,
    concreteImages,
    otherImages,
  ] = await Promise.all([
    convertPrograms(control.programs, converter),
    convertControlImages(control.IronControlImages, converter),
    convertControlImages(control.ElectricalControlImages, converter),
    convertControlImages(control.InstallationControlImages, converter),
    convertControlImages(control.WaterControlImages, converter),
    convertControlImages(control.ConcreteControlImages, converter),
    convertControlImages(control.otherControlImages, converter),
  ]);

  return {
    ...control,
    programs: programs ?? control.programs,
    IronControlImages: ironImages,
    ElectricalControlImages: electricImages,
    InstallationControlImages: installationImages,
    WaterControlImages: waterImages,
    ConcreteControlImages: concreteImages,
    otherControlImages: otherImages,
  };
}

async function convertProject(
  project: Project,
  converter: (uri: string) => Promise<string>,
): Promise<Project> {
  const [logoUri, programs, controls] = await Promise.all([
    project.logoUri ? converter(project.logoUri) : Promise.resolve(undefined),
    convertPrograms(project.programs, converter),
    project.controls
      ? Promise.all(project.controls.map((c) => convertControl(c, converter)))
      : Promise.resolve(undefined),
  ]);

  return {
    ...project,
    logoUri,
    programs,
    controls,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportProjectsToJSON(
  projects: Project[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const total = projects.length;
  const converted: Project[] = [];

  for (let i = 0; i < projects.length; i++) {
    onProgress?.(i + 1, total);
    converted.push(await convertProject(projects[i], fileUriToBase64));
  }

  const json = JSON.stringify(converted, null, 2);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `projects_backup_${dateStr}.json`;

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) throw new Error('No cache or document directory available');

  const fileUri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

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

  const content = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

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
