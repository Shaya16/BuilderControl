import { ElementType } from '@/types/project';

export const ACCENT = '#FF6A06';
export const STORAGE_KEY = 'projects';

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  [ElementType.COLUMN]: 'עמוד',
  [ElementType.WALL]: 'קיר',
  [ElementType.CEILLING_FLOOR]: 'רצפה/תקרה',
  [ElementType.BEAM]: 'עמודה',
};

export const ELEMENT_TYPE_COLORS: Record<ElementType, string> = {
  [ElementType.COLUMN]: '#FF6A06',
  [ElementType.WALL]: '#6A1B9A',
  [ElementType.CEILLING_FLOOR]: '#E65100',
  [ElementType.BEAM]: '#2E7D32',
};

/** Fallback color for custom/other element types */
export const DEFAULT_ELEMENT_TYPE_COLOR = '#6B7280';
