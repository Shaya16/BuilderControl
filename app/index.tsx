import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { Project } from '@/types/project';

const ACCENT = '#0a7ea4';
const STORAGE_KEY = 'projects';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const colorScheme = useColorScheme() ?? 'light';

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setProjects(JSON.parse(stored));
    });
  }, []);

  // Save to AsyncStorage whenever projects change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const handleAddProject = () => {
    setNewName('');
    setModalVisible(true);
  };

  const handleConfirm = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project: Project = { id: Date.now().toString(), name: trimmed };
    setProjects((prev) => [...prev, project]);
    setModalVisible(false);
  };

  const handleSelectProject = (project: Project) => {
    router.push({ pathname: '/(tabs)', params: { projectId: project.id } });
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="folder.fill"
            style={styles.headerImage}
          />
        }>

        {/* Title row */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={{ fontFamily: Fonts?.rounded }}>
            Projects
          </ThemedText>
          {projects.length > 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddProject}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Empty state */}
        {projects.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="folder" size={64} color={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              No projects yet
            </ThemedText>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={handleAddProject}
              activeOpacity={0.8}>
              <IconSymbol name="plus" size={24} color="#fff" />
              <Text style={styles.bigAddButtonText}>Add Project</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          /* Projects list */
          <ThemedView style={styles.listContainer}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                onPress={() => handleSelectProject(project)}
                activeOpacity={0.7}>
                <ThemedView style={styles.projectCard}>
                  <IconSymbol name="folder.fill" size={20} color={ACCENT} />
                  <ThemedText style={styles.projectName}>{project.name}</ThemedText>
                  <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme].icon} />
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      {/* Add Project Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Project</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project name"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleConfirm}
              returnKeyType="done"
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
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
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
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  projectName: {
    flex: 1,
    fontSize: 16,
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
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
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
});
