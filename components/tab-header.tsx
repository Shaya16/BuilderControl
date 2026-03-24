import { router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { ACCENT } from '@/constants/controls';
import { Colors, Fonts } from '@/constants/theme';
import RightIcon from '@/assets/icons/right.svg';
import PlusIcon from '@/assets/icons/plus.svg';

type Props = {
  backLabel: string;
  title: string;
  projectName?: string | null;
  showAddButton: boolean;
  onAddPress: () => void;
};

export function TabHeader({ backLabel, title, projectName, showAddButton, onAddPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/reset-to-root')}
        activeOpacity={0.7}>
        <RightIcon width={18} height={18} color={ACCENT} />
        <Text style={[styles.backButtonText, { color: ACCENT }]}>{backLabel}</Text>
      </TouchableOpacity>
      <ThemedView style={styles.titleContainer}>
      <ThemedView style={styles.titleBlock}>
        <ThemedText type="title" style={{ fontFamily: Fonts?.rounded }}>
          {title}
        </ThemedText>
        {projectName ? (
          <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 14 }}>
            {projectName}
          </ThemedText>
        ) : null}
      </ThemedView>
      {showAddButton && (
        <TouchableOpacity style={styles.addButton} onPress={onAddPress} activeOpacity={0.8}>
          <PlusIcon width={18} height={18} color="#fff" />
        </TouchableOpacity>
      )}
    </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleBlock: {
    alignItems: 'flex-start',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});
