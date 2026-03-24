import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';


import { ACCENT } from '@/constants/controls';
import { Program } from '@/types/project';

import { styles } from './styles';
import CheckmarkIcon from '@/assets/icons/checkmark.svg';

type Props = {
  latestPrograms: Program[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function StepPrograms({ latestPrograms, selectedIds, onToggle }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  const filteredPrograms = latestPrograms.filter((program) =>
    !q ||
    program.number.toLowerCase().includes(q) ||
    program.name.toLowerCase().includes(q)
  );

  return (
    <View style={styles.stepBody}>
      <TextInput
        style={[styles.input, { backgroundColor: '#fafafa' }]}
        placeholder="חפש לפי שם או מס׳..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.fieldLabel}>
        תוכניות אחרונות{selectedIds.length > 0 ? `  ·  ${selectedIds.length} נבחרו` : ''}
      </Text>
      {filteredPrograms.length === 0 ? (
        <Text style={styles.emptyHint}>
          {latestPrograms.length === 0
            ? 'אין תוכניות בפרוייקט זה'
            : 'אין תוכניות שמתאימות לחיפוש'}
        </Text>
      ) : (
        <View style={styles.programList}>
          {filteredPrograms.map((program) => {
            const selected = selectedIds.includes(program.id);
            return (
              <TouchableOpacity
                key={program.id}
                style={[styles.programRow, selected && styles.programRowSelected]}
                onPress={() => onToggle(program.id)}
                activeOpacity={0.7}>
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected && <CheckmarkIcon width={12} height={12} color="#fff" />}
                </View>
                <View style={styles.programInfo}>
                  <Text style={[styles.programRowName, selected && { color: ACCENT }]}>
                    {program.name}
                  </Text>
                  <Text style={styles.programRowMeta}>
                    מס׳: {program.number}  ·  גרסה: v{program.version}  ·  תאריך: {program.date}
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
