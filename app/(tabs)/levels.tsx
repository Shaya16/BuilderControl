import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useGlobalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Colors } from '@/constants/theme';
import { Level, Project } from '@/types/project';

import LeftIcon from '@/assets/icons/left.svg';
import LayersIcon from '@/assets/icons/levels.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { ACCENT } from '@/constants/controls';
const STORAGE_KEY = 'projects';

export default function LevelsScreen() {
  const { projectId } = useGlobalSearchParams<{ projectId?: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const colorScheme = useColorScheme() ?? 'light';

  const loadProject = useCallback(() => {
    if (!projectId) return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      const projects: Project[] = JSON.parse(stored);
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    });
  }, [projectId]);

  // Load project when projectId changes
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Reload project when tab gains focus (e.g. after creating a control on another tab)
  useFocusEffect(loadProject);

  // Persist updated project back to AsyncStorage
  const saveProject = async (updated: Project) => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const next = projects.map((p) => (p.id === updated.id ? updated : p));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProject(updated);
  };

  const handleAddLevel = () => {
    setEditingLevel(null);
    setNewName('');
    setNewDescription('');
    setModalVisible(true);
  };

  const handleEditLevel = (level: Level) => {
    setEditingLevel(level);
    setNewName(level.name);
    setNewDescription(level.description ?? '');
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const trimmed = newName.trim();
    if (!trimmed || !project) return;
    const description = newDescription.trim() || undefined;

    if (editingLevel) {
      // Update existing level
      const updatedLevels = (project.levels ?? []).map((l) =>
        l.id === editingLevel.id ? { ...l, name: trimmed, description } : l
      );
      saveProject({ ...project, levels: updatedLevels });
    } else {
      // Add new level
      const level: Level = { id: Date.now().toString(), name: trimmed, description };
      saveProject({ ...project, levels: [...(project.levels ?? []), level] });
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    if (!editingLevel || !project) return;
    const updatedLevels = (project.levels ?? []).filter((l) => l.id !== editingLevel.id);
    saveProject({ ...project, levels: updatedLevels });
    setModalVisible(false);
  };

  const levels = project?.levels ?? [];

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FE9F39', dark: '#1D3D47' }}
        headerImage={
          <LayersIcon width={310} height={310} fill="white" />
        }>

        <TabHeader
          backLabel="חזרה לפרוייקטים"
          title="מפלסים"
          projectName={project?.name}
          showAddButton={levels.length > 0}
          onAddPress={handleAddLevel}
        />

        {/* Empty state */}
        {levels.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <LayersIcon width={64} height={64} fill={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              אין מפלסים עדיין
            </ThemedText>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={handleAddLevel}
              activeOpacity={0.8}>
              <PlusIcon width={24} height={24} fill="#fff" />
              <Text style={styles.bigAddButtonText}>הוסף מפלס</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          /* Levels list */
          <ThemedView style={styles.listContainer}>
            {levels.map((level) => (
              <TouchableOpacity key={level.id} onPress={() => handleEditLevel(level)} activeOpacity={0.7}>
                <ThemedView style={styles.levelCard}>
                  <ThemedView style={styles.levelCardContent}>
                    <ThemedText style={styles.levelName}>{level.name}</ThemedText>
                    {level.description ? (
                      <ThemedText style={[styles.levelDescription, { color: Colors[colorScheme].icon }]}>
                        {level.description}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                  <LeftIcon width={16} height={16} fill={Colors[colorScheme].icon} />
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      {/* Add Level Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingLevel ? 'ערוך מפלס' : 'הוסף מפלס'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="שם"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder="תיאור (אופציונלי)"
              placeholderTextColor="#999"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !newName.trim() && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={!newName.trim()}>
                <Text style={styles.confirmButtonText}>
                  {editingLevel ? 'שמור' : 'הוסף'}
                </Text>
              </TouchableOpacity>
            </View>
            {editingLevel && (
              <>
                <View style={styles.modalDivider} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  activeOpacity={0.8}>
                  <TrashIcon width={16} height={16} fill="#fff" />
                  <Text style={styles.deleteButtonText}>מחק מפלס</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -120,
    left: -35,
    position: 'absolute',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  bigAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  bigAddButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContainer: {
    gap: 10,
  },
  levelCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    direction: 'rtl',
    textAlign: 'right',
    writingDirection: 'rtl',

  },
  levelCardContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 4,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  levelDescription: {
    fontSize: 13,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#11181C',
  },
  modalInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e53935',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
