import * as FileSystem from 'expo-file-system/legacy';

const CONTROL_IMAGES_DIR = 'control-images';

/**
 * Copies a picked image from a temporary/cache location to
 * `documentDirectory/control-images/` so it survives cache clears
 * and is included in ADB / cloud backups.
 *
 * Falls back to the original URI if the copy fails.
 */
export async function persistImage(tempUri: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return tempUri;

  try {
    const dir = `${docDir}${CONTROL_IMAGES_DIR}`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const permanentPath = `${dir}/${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: permanentPath });
    return permanentPath;
  } catch {
    return tempUri;
  }
}

/**
 * Persist multiple picked images in parallel.
 */
export async function persistImages(
  assets: { uri: string }[],
): Promise<{ uri: string; description: string }[]> {
  return Promise.all(
    assets.map(async (a) => ({
      uri: await persistImage(a.uri),
      description: '',
    })),
  );
}
