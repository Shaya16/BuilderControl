import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme } from 'react-native';

import { ControlCard } from '@/components/control-card';
import { ControlModal } from '@/components/control-modal';
import { ControlViewModal } from '@/components/control-view-modal';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT, STORAGE_KEY } from '@/constants/controls';
import { Colors, Fonts } from '@/constants/theme';
import { ConcreteType, Control, ControlImage, ElementType, Project } from '@/types/project';

import ControlIcon from '@/assets/icons/control.svg';

export default function ControlsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [viewingControl, setViewingControl] = useState<Control | null>(null);
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

  const controls = project?.controls ?? [];
  const levels = project?.levels ?? [];
  const concreteTypes = project?.concreteTypes ?? [];
  const latestPrograms = (project?.programs ?? []).filter((p) => p.latestVersion);

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#E3F2FD', dark: '#0D2137' }}
        headerImage={<ControlIcon width={220} height={220} fill="white" />}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={18} color={ACCENT} />
          <Text style={[styles.backButtonText, { color: ACCENT }]}>Back to Projects</Text>
        </TouchableOpacity>

        <ThemedView style={styles.titleContainer}>
          <ThemedView>
            <ThemedText type="title" style={{ fontFamily: Fonts?.rounded }}>
              Controls
            </ThemedText>
            {project && (
              <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 14 }}>
                {project.name}
              </ThemedText>
            )}
          </ThemedView>
          {controls.length > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddControl} activeOpacity={0.8}>
              <IconSymbol name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {controls.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ControlIcon width={64} height={64} fill={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              No controls yet
            </ThemedText>
            <TouchableOpacity style={styles.bigAddButton} onPress={handleAddControl} activeOpacity={0.8}>
              <IconSymbol name="plus" size={24} color="#fff" />
              <Text style={styles.bigAddButtonText}>Add Control</Text>
            </TouchableOpacity>
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
});
