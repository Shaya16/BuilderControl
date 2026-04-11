import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '@/constants/controls';
import { Project } from '@/types/project';

/**
 * Load all projects from AsyncStorage.
 */
export async function loadProjects(): Promise<Project[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save the full projects array to AsyncStorage.
 */
export async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
