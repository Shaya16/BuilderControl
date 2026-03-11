import { Text, TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT } from '@/constants/controls';
import { Program } from '@/types/project';

import { styles } from './styles';

type Props = {
  latestPrograms: Program[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function StepPrograms({ latestPrograms, selectedIds, onToggle }: Props) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.fieldLabel}>
        Latest Programs{selectedIds.length > 0 ? `  ·  ${selectedIds.length} selected` : ''}
      </Text>
      {latestPrograms.length === 0 ? (
        <Text style={styles.emptyHint}>No latest programs in this project yet</Text>
      ) : (
        <View style={styles.programList}>
          {latestPrograms.map((program) => {
            const selected = selectedIds.includes(program.id);
            return (
              <TouchableOpacity
                key={program.id}
                style={[styles.programRow, selected && styles.programRowSelected]}
                onPress={() => onToggle(program.id)}
                activeOpacity={0.7}>
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected && <IconSymbol name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={styles.programInfo}>
                  <Text style={[styles.programRowName, selected && { color: ACCENT }]}>
                    {program.name}
                  </Text>
                  <Text style={styles.programRowMeta}>
                    No. {program.number}  ·  v{program.version}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
