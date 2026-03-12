import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  ELEMENT_TYPE_COLORS,
  ELEMENT_TYPE_LABELS,
} from '@/constants/controls';
import { ElementType, Level } from '@/types/project';

import { styles } from './styles';

export const ELEMENT_TYPE_OTHER = 'other' as const;

export type Step1Form = {
  levelId: string;
  elementName: string;
  elementLocation: string;
  elementType: ElementType | typeof ELEMENT_TYPE_OTHER | '';
  elementTypeOther?: string;
};

export const EMPTY_STEP1: Step1Form = {
  levelId: '',
  elementName: '',
  elementLocation: '',
  elementType: '',
  elementTypeOther: '',
};

type Props = {
  form: Step1Form;
  levels: Level[];
  onChange: (update: Partial<Step1Form>) => void;
};

export function StepElementDetails({ form, levels, onChange }: Props) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>מפלס</Text>
        {levels.length === 0 ? (
          <Text style={styles.emptyHint}>אין מפלסים בפרוייקט זה</Text>
        ) : (
          <View style={styles.chipGrid}>
            {levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.chip, form.levelId === level.id && styles.chipSelected]}
                onPress={() => onChange({ levelId: level.id })}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, form.levelId === level.id && styles.chipTextSelected]}>
                  {level.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>שם האלמנט</Text>
        <TextInput
          style={styles.input}
          placeholder="דוגמה: עמוד C1"
          placeholderTextColor="#999"
          value={form.elementName}
          onChangeText={(v) => onChange({ elementName: v })}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Axis A/1"
          placeholderTextColor="#999"
          value={form.elementLocation}
          onChangeText={(v) => onChange({ elementLocation: v })}
          returnKeyType="done"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>סוג האלמנט</Text>
        <View style={styles.chipGrid}>
          {Object.values(ElementType).map((type) => {
            const color = ELEMENT_TYPE_COLORS[type];
            const selected = form.elementType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
                onPress={() => onChange({ elementType: type, elementTypeOther: '' })}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {ELEMENT_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            key={ELEMENT_TYPE_OTHER}
            style={[
              styles.chip,
              form.elementType === ELEMENT_TYPE_OTHER && {
                backgroundColor: '#757575',
                borderColor: '#757575',
              },
            ]}
            onPress={() => onChange({ elementType: ELEMENT_TYPE_OTHER })}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.chipText,
                form.elementType === ELEMENT_TYPE_OTHER && styles.chipTextSelected,
              ]}>
              אחר
            </Text>
          </TouchableOpacity>
        </View>
        {form.elementType === ELEMENT_TYPE_OTHER && (
          <TextInput
            style={styles.input}
            placeholder="Specify element type..."
            placeholderTextColor="#999"
            value={form.elementTypeOther ?? ''}
            onChangeText={(v) => onChange({ elementTypeOther: v })}
            returnKeyType="done"
          />
        )}
      </View>
    </View>
  );
}
