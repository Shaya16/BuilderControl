import { ConcreateType, ElementType } from '@/types/project';

export const ACCENT = '#0a7ea4';
export const STORAGE_KEY = 'projects';

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  [ElementType.COLUMN]: 'Column',
  [ElementType.WALL]: 'Wall',
  [ElementType.CEILLING_FLOOR]: 'Ceiling / Floor',
  [ElementType.BEAM]: 'Beam',
};

export const ELEMENT_TYPE_COLORS: Record<ElementType, string> = {
  [ElementType.COLUMN]: '#1565C0',
  [ElementType.WALL]: '#6A1B9A',
  [ElementType.CEILLING_FLOOR]: '#E65100',
  [ElementType.BEAM]: '#2E7D32',
};

export const CONCREATE_TYPE_LABELS: Record<ConcreateType, string> = {
  [ConcreateType.CONCRETE]: 'Concrete',
  [ConcreateType.REINFORCED_CONCRETE]: 'Reinforced',
  [ConcreateType.PRECAST_CONCRETE]: 'Precast',
  [ConcreateType.MIXED_CONCRETE]: 'Mixed',
};
