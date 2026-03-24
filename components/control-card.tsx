import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import CheckmarkIcon from '@/assets/icons/checkmark.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import LayersIcon from '@/assets/icons/levels.svg';
import ListIcon from '@/assets/icons/list.svg';
import LocationIcon from '@/assets/icons/location.svg';
import XmarkIcon from '@/assets/icons/xmark.svg';
import {
  ACCENT,
  DEFAULT_ELEMENT_TYPE_COLOR,
  ELEMENT_TYPE_COLORS,
  ELEMENT_TYPE_LABELS,
} from '@/constants/controls';
import { Colors } from '@/constants/theme';
import { Control } from '@/types/project';

type Props = {
  control: Control;
  onPress: (control: Control) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (control: Control) => void;
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

export function ControlCard({ control, onPress, selectionMode, selected, onToggleSelect }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const typeColor =
    ELEMENT_TYPE_COLORS[control.elementType as keyof typeof ELEMENT_TYPE_COLORS] ??
    DEFAULT_ELEMENT_TYPE_COLOR;

  const timestampValue = control.updatedAt
    ? formatTimestamp(control.updatedAt)
    : control.createdAt
      ? formatTimestamp(control.createdAt)
      : null;

  const handlePress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(control);
    } else {
      onPress(control);
    }
  };

  const handleLongPress = () => {
    if (!selectionMode && onToggleSelect) {
      onToggleSelect(control);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}>
      <ThemedView style={[styles.controlCard, selectionMode && selected && styles.controlCardSelected]}>
        {selectionMode && (
          <View style={styles.checkboxWrap}>
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
              {selected && <CheckmarkIcon width={12} height={12} color="#fff" />}
            </View>
          </View>
        )}
        <View style={[styles.typeStripe, { backgroundColor: typeColor }]} />
        <ThemedView style={styles.cardContent}>
          <ThemedText style={styles.elementName} numberOfLines={2}>{control.elementName}</ThemedText>

          <ThemedView style={styles.metaRow}>
            <ThemedView style={styles.metaChip}>
              <LayersIcon width={11} height={11} color={Colors[colorScheme].icon} />
              <ThemedText style={[styles.metaValue, { color: Colors[colorScheme].icon }]}>
                {control.Level.name}
              </ThemedText>
            </ThemedView>
            {control.elementLocation ? (
              <>
                <View style={styles.metaDot} />
                <ThemedView style={styles.metaChip}>
                  <LocationIcon width={11} height={11} color={Colors[colorScheme].icon} />
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
                  <ClockIcon width={10} height={10} color={Colors[colorScheme].icon} />
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
                  <ListIcon width={11} height={11} color={Colors[colorScheme].icon} />
                  <ThemedText style={[styles.metaValue, { color: Colors[colorScheme].icon }]}>
                    {control.programs.length}
                  </ThemedText>
                </ThemedView>
              </>
            )}
          </ThemedView>

          <View style={styles.badgesRow}>
            <View style={[styles.typeBadge, { borderColor: typeColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {ELEMENT_TYPE_LABELS[control.elementType as keyof typeof ELEMENT_TYPE_LABELS] ?? control.elementType}
              </Text>
            </View>
            <View style={styles.concreteBadge}>
              <Text style={styles.concreteBadgeText}>
                {control.concreateType.name}
              </Text>
            </View>

            {control.validated_concrete && control.validated_concrete_at ? (
              <View style={[styles.validationChip, styles.validationChipApproved]}>
                <CheckmarkIcon width={11} height={11} color="#2e7d32" />
                <Text style={[styles.validationChipText, { color: '#2e7d32' }]}>
                  היציקה אושרה
                </Text>
              </View>
            ) : (
              <View style={[styles.validationChip, styles.validationChipNotApproved]}>
                <XmarkIcon width={11} height={11} color="#c62828" />
                <Text style={[styles.validationChipText, { color: '#c62828' }]}>
                  היציקה לא אושרה
                </Text>
              </View>
            )}
          </View>
        </ThemedView>

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

    paddingVertical: 14,
    gap: 6,
    alignItems: 'flex-start',
  },
  elementName: {
    fontSize: 16,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
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
    alignSelf: 'stretch',
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    alignSelf: 'stretch',
  },
  concreteBadge: {
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
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  validationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  validationChipApproved: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  validationChipNotApproved: {
    backgroundColor: '#ffebee',
    borderColor: '#ef9a9a',
  },
  validationChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 11,
  },
  controlCardSelected: {
    borderColor: ACCENT,
    borderWidth: 1.5,
    backgroundColor: `${ACCENT}08`,
  },
  checkboxWrap: {
    paddingLeft: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
});
