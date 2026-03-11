import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useGlobalSearchParams } from 'expo-router';
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

import ConcreteIcon from '@/assets/icons/concrete.svg';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { ConcreteType, Project } from '@/types/project';

const ACCENT = '#0a7ea4';
const STORAGE_KEY = 'projects';

export default function ConcreteScreen() {
  const { projectId } = useGlobalSearchParams<{ projectId?: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConcreteType, setEditingConcreteType] = useState<ConcreteType | null>(null);
  const [newName, setNewName] = useState('');
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

  const handleAddConcrete = () => {
    setEditingConcreteType(null);
    setNewName('');
    setModalVisible(true);
  };

  const handleEditConcreteType = (concreteType: ConcreteType) => {
    setEditingConcreteType(concreteType);
    setNewName(concreteType.name);
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const trimmed = newName.trim();
    if (!trimmed || !project) return;

    if (editingConcreteType) {
      const updatedConcreteTypes = (project.concreteTypes ?? []).map((ct) =>
        ct.id === editingConcreteType.id ? { ...ct, name: trimmed } : ct
      );
      saveProject({ ...project, concreteTypes: updatedConcreteTypes });
    } else {
      const concreteType: ConcreteType = { id: Date.now().toString(), name: trimmed };
      saveProject({ ...project, concreteTypes: [...(project.concreteTypes ?? []), concreteType] });
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    if (!editingConcreteType || !project) return;
    const updatedConcreteTypes = (project.concreteTypes ?? []).filter(
      (ct) => ct.id !== editingConcreteType.id
    );
    saveProject({ ...project, concreteTypes: updatedConcreteTypes });
    setModalVisible(false);
  };

  const concreteTypes = project?.concreteTypes ?? [];

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <ConcreteIcon width={220} height={220} fill="white" />
        }>

        {/* Title row */}
        <ThemedView style={styles.titleContainer}>
          <ThemedView>
            <ThemedText type="title" style={{ fontFamily: Fonts?.rounded }}>
              Concrete
            </ThemedText>
            {project && (
              <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 14 }}>
                {project.name}
              </ThemedText>
            )}
          </ThemedView>
          {concreteTypes.length > 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddConcrete}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Empty state */}
        {concreteTypes.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="square.3.layers.3d" size={64} color={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              No concrete types yet
            </ThemedText>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={handleAddConcrete}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={24} color="#fff" />
              <Text style={styles.bigAddButtonText}>Add Concrete Type</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          /* Concrete types list */
          <ThemedView style={styles.listContainer}>
            {concreteTypes.map((concreteType) => (
              <TouchableOpacity
                key={concreteType.id}
                onPress={() => handleEditConcreteType(concreteType)}
                activeOpacity={0.7}>
                <ThemedView style={styles.concreteTypeCard}>
                  <ThemedView style={styles.concreteTypeCardContent}>
                    <ThemedText style={styles.concreteTypeName}>{concreteType.name}</ThemedText>
                  </ThemedView>
                  <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme].icon} />
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      {/* Add Concrete Type Modal */}
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
              {editingConcreteType ? 'Edit Concrete Type' : 'New Concrete Type'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
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
                  {editingConcreteType ? 'Save' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
            {editingConcreteType && (
              <>
                <View style={styles.modalDivider} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  activeOpacity={0.8}>
                  <IconSymbol name="trash" size={16} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Concrete Type</Text>
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
  concreteTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  concreteTypeCardContent: {
    flex: 1,
    gap: 4,
  },
  concreteTypeName: {
    fontSize: 16,
    fontWeight: '600',
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
