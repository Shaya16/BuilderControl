import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

import { ControlCard } from '@/components/control-card';
import { ControlModal } from '@/components/control-modal';
import { ControlViewModal } from '@/components/control-view-modal';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT, STORAGE_KEY } from '@/constants/controls';
import { Colors } from '@/constants/theme';
import { ConcreteType, Control, ControlImage, ElementType, Project } from '@/types/project';

import ControlIcon from '@/assets/icons/control.svg';

export default function ControlsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [viewingControl, setViewingControl] = useState<Control | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useFocusEffect(loadProject);

  const saveProject = async (updated: Project) => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const next = projects.map((p) => (p.id === updated.id ? updated : p));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setProject(updated);
  };

  const handleAddControl = () => {
    setEditingControl(null);
    setModalVisible(true);
  };

  const handleViewControl = (control: Control) => {
    setViewingControl(control);
  };

  const handleEditFromView = () => {
    if (!viewingControl) return;
    setEditingControl(viewingControl);
    setViewingControl(null);
    setModalVisible(true);
  };

  const handleEditControl = (control: Control) => {
    setEditingControl(control);
    setModalVisible(true);
  };

  const handleSave = (data: {
    levelId: string;
    elementName: string;
    elementLocation: string;
    elementType: ElementType | string;
    programIds: string[];
    concreteType: ConcreteType;
    ironControlImages: ControlImage[];
    electricControlImages: ControlImage[];
    installationControlImages: ControlImage[];
    waterControlImages: ControlImage[];
    concreteControlImages: ControlImage[];
    otherControlImages: ControlImage[];
    electricNeeded: boolean;
    installationNeeded: boolean;
    waterNeeded: boolean;
  }) => {
    if (!project) return;
    const level = (project.levels ?? []).find((l) => l.id === data.levelId);
    if (!level) return;

    const latestPrograms = (project.programs ?? []).filter((p) => p.latestVersion);
    const selectedPrograms = latestPrograms.filter((p) => data.programIds.includes(p.id));

    const controlData = {
      Level: level,
      elementName: data.elementName,
      elementLocation: data.elementLocation,
      elementType: data.elementType,
      programs: selectedPrograms,
      concreateType: data.concreteType,
      IronControlImages: data.ironControlImages.length > 0 ? data.ironControlImages : undefined,
      ElectricalControlImages: data.electricControlImages.length > 0 ? data.electricControlImages : undefined,
      InstallationControlImages: data.installationControlImages.length > 0 ? data.installationControlImages : undefined,
      WaterControlImages: data.waterControlImages.length > 0 ? data.waterControlImages : undefined,
      ConcreteControlImages: data.concreteControlImages.length > 0 ? data.concreteControlImages : undefined,
      otherControlImages: data.otherControlImages.length > 0 ? data.otherControlImages : undefined,
      electricNeeded: data.electricNeeded,
      installationNeeded: data.installationNeeded,
      waterNeeded: data.waterNeeded,
    };

    const now = new Date().toISOString();

    if (editingControl) {
      const updated = (project.controls ?? []).map((c) =>
        c.id === editingControl.id ? { ...c, ...controlData, updatedAt: now } : c
      );
      saveProject({ ...project, controls: updated });
    } else {
      const newControl: Control = { id: Date.now().toString(), ...controlData, createdAt: now };
      saveProject({ ...project, controls: [...(project.controls ?? []), newControl] });
    }
  };

  const handleDelete = () => {
    if (!editingControl || !project) return;
    const updated = (project.controls ?? []).filter((c) => c.id !== editingControl.id);
    saveProject({ ...project, controls: updated });
    setModalVisible(false);
    setEditingControl(null);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingControl(null);
  };

  const allControls = project?.controls ?? [];
  const controls = allControls
    .filter(
      (control) =>
        !searchQuery.trim() ||
        control.elementName.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    .sort((a, b) => {
      const dateA = a.updatedAt ?? a.createdAt ?? '';
      const dateB = b.updatedAt ?? b.createdAt ?? '';
      return dateB.localeCompare(dateA);
    });
  const levels = project?.levels ?? [];
  const concreteTypes = project?.concreteTypes ?? [];
  const latestPrograms = (project?.programs ?? []).filter((p) => p.latestVersion);

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FE9F39', dark: '#0D2137' }}
        headerImage={<ControlIcon width={220} height={220} fill="white" />}>

        <TabHeader
          backLabel="חזרה לפרוייקטים"
          title="בקרות יציקה"
          projectName={project?.name}
          showAddButton={allControls.length > 0}
          onAddPress={handleAddControl}
        />

        {allControls.length > 0 && (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.filterInput}
              placeholder="חפש לפי שם האלמנט..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {controls.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ControlIcon width={64} height={64} fill={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              {allControls.length === 0 ? 'No controls yet' : 'No matching controls'}
            </ThemedText>
            {allControls.length === 0 ? (
              <TouchableOpacity style={styles.bigAddButton} onPress={handleAddControl} activeOpacity={0.8}>
                <IconSymbol name="plus" size={24} color="#fff" />
                <Text style={styles.bigAddButtonText}>Add Control</Text>
              </TouchableOpacity>
            ) : null}
          </ThemedView>
        ) : (
          <ThemedView style={styles.listContainer}>
            {controls.map((control) => (
              <ControlCard key={control.id} control={control} onPress={handleViewControl} />
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      <ControlViewModal
        visible={!!viewingControl}
        control={viewingControl}
        onClose={() => setViewingControl(null)}
        onEdit={handleEditFromView}
      />

      <ControlModal
        visible={modalVisible}
        editingControl={editingControl}
        levels={levels}
        concreteTypes={concreteTypes}
        latestPrograms={latestPrograms}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={handleCloseModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    marginBottom: 12,
  },
  filterInput: {
    flex: 1,
    writingDirection: 'rtl',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
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
});
