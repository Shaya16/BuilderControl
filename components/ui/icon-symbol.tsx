// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Tab bar icons
  'square.2.layers.3d.fill': 'layers',
  'list.bullet.rectangle.portrait.fill': 'format-list-bulleted',
  'checklist': 'checklist',
  // App icons
  'plus': 'add',
  'square.3.layers.3d': 'layers',
  'trash': 'delete',
  'folder': 'folder',
  'folder.fill': 'folder',
  'calendar': 'calendar-today',
  'xmark.circle.fill': 'cancel',
  'camera': 'camera-alt',
  'photo': 'photo',
  'doc.on.doc': 'content-copy',
  'checkmark': 'check',
  'mappin': 'place',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialName = MAPPING[name] ?? 'circle';
  return <MaterialIcons color={color} size={size} name={materialName} style={style} />;
}
