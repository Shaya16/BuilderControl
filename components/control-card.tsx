import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  DEFAULT_ELEMENT_TYPE_COLOR,
  ELEMENT_TYPE_COLORS,
  ELEMENT_TYPE_LABELS,
} from '@/constants/controls';
import { Colors } from '@/constants/theme';
import { Control } from '@/types/project';

type Props = {
  control: Control;
  onPress: (control: Control) => void;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

export function ControlCard({ control, onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const typeColor =
    ELEMENT_TYPE_COLORS[control.elementType as keyof typeof ELEMENT_TYPE_COLORS] ??
    DEFAULT_ELEMENT_TYPE_COLOR;

  const timestampValue = control.updatedAt
    ? formatTimestamp(control.updatedAt)
    : control.createdAt
      ? formatTimestamp(control.createdAt)
      : null;

  return (
    <TouchableOpacity onPress={() => onPress(control)} activeOpacity={0.7}>
      <ThemedView style={styles.controlCard}>
        <View style={[styles.typeStripe, { backgroundColor: typeColor }]} />
        <ThemedView style={styles.cardContent}>
          <ThemedView style={styles.cardHeader}>
            <ThemedText style={styles.elementName}>{control.elementName}</ThemedText>
            <View style={[styles.typeBadge, { borderColor: typeColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {ELEMENT_TYPE_LABELS[control.elementType as keyof typeof ELEMENT_TYPE_LABELS] ?? control.elementType}
              </Text>
            </View>
          </ThemedView>

          <ThemedView style={styles.metaRow}>
            <ThemedView style={styles.metaChip}>
              <IconSymbol name="square.2.layers.3d.fill" size={11} color={Colors[colorScheme].icon} />
              <ThemedText style={[styles.metaValue, { color: Colors[colorScheme].icon }]}>
                {control.Level.name}
              </ThemedText>
            </ThemedView>
            {control.elementLocation ? (
              <>
                <View style={styles.metaDot} />
                <ThemedView style={styles.metaChip}>
                  <IconSymbol name="mappin" size={11} color={Colors[colorScheme].icon} />
                  <ThemedText style={[styles.metaValue, { color: Colors[colorScheme].icon }]}>
                    {control.elementLocation}
                  </ThemedText>
                </ThemedView>
              </>
            ) : null}
            {timestampValue && (
              <>
                <View style={styles.metaDot} />
                <ThemedView style={styles.metaChip}>
                  <IconSymbol name="clock" size={10} color={Colors[colorScheme].icon} />
                  <ThemedText style={[styles.metaValue, styles.timestampText, { color: Colors[colorScheme].icon }]}>
                    {timestampValue}
                  </ThemedText>
                </ThemedView>
              </>
            )}
            {control.programs.length > 0 && (
              <>
                <View style={styles.metaDot} />
                <ThemedView style={styles.metaChip}>
                  <IconSymbol name="list.bullet.rectangle.portrait.fill" size={11} color={Colors[colorScheme].icon} />
                  <ThemedText style={[styles.metaValue, { color: Colors[colorScheme].icon }]}>
                    {control.programs.length}
                  </ThemedText>
                </ThemedView>
              </>
            )}
          </ThemedView>

          <View style={styles.concreteBadge}>
            <Text style={styles.concreteBadgeText}>
              {control.concreateType.name}
            </Text>
          </View>
        </ThemedView>
        <IconSymbol name="chevron.left" size={16} color={Colors[colorScheme].icon} />
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  controlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    overflow: 'hidden',
    gap: 12,
    paddingRight: 16,
  },
  typeStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  elementName: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaValue: {
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
  },
  concreteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  concreteBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
  },
  timestampText: {
    fontSize: 11,
  },
});
