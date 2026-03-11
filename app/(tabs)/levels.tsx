import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { Level, Project } from '@/types/project';

const ACCENT = '#0a7ea4';
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
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <IconSymbol
            size={310}
            color="white"
            name="square.3.layers.3d"
            style={styles.headerImage}
          />
        }>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={18} color={ACCENT} />
          <Text style={[styles.backButtonText, { color: ACCENT }]}>Back to Projects</Text>
        </TouchableOpacity>

        {/* Title row */}
        <ThemedView style={styles.titleContainer}>
          <ThemedView>
            <ThemedText type="title" style={{ fontFamily: Fonts?.rounded }}>
              Levels
            </ThemedText>
            {project && (
              <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 14 }}>
                {project.name}
              </ThemedText>
            )}
          </ThemedView>
          {levels.length > 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddLevel}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Empty state */}
        {levels.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="square.3.layers.3d" size={64} color={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              No levels yet
            </ThemedText>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={handleAddLevel}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={24} color="#fff" />
              <Text style={styles.bigAddButtonText}>Add Level</Text>
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
                  <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme].icon} />
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
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingLevel ? 'Edit Level' : 'New Level'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              placeholder="Description (optional)"
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
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !newName.trim() && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={!newName.trim()}>
                <Text style={styles.confirmButtonText}>
                  {editingLevel ? 'Save' : 'Add'}
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
                  <IconSymbol name="trash" size={16} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Level</Text>
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
  headerImage: {
    color: '#808080',
    bottom: -120,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  levelCardContent: {
    flex: 1,
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
