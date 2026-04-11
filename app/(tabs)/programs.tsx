import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { Program, Project } from '@/types/project';
import { loadProjects, saveProject as persistProject } from '@/utils/projectStorage';

import CalendarIcon from '@/assets/icons/calendar.svg';
import CheckmarkIcon from '@/assets/icons/checkmark.svg';
import { default as DocIcon, default as PlanIcon } from '@/assets/icons/docs.svg';
import LeftIcon from '@/assets/icons/left.svg';
import ListIcon from '@/assets/icons/list.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import XmarkIcon from '@/assets/icons/xmark.svg';
import { ACCENT } from '@/constants/controls';

const EMPTY_FORM = { name: '', number: '', version: '', date: '', imageUri: '', latestVersion: true };

export default function ProgramsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme() ?? 'light';

  console.log('projectId', projectId);

  const loadProject = useCallback(() => {
    if (!projectId) return;
    loadProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    });
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useFocusEffect(loadProject);

  const saveProject = async (updated: Project) => {
    await persistProject(updated);
    setProject(updated);
  };

  const closeModal = () => {
    setModalVisible(false);
    setIsNewVersion(false);
  };

  const handleAddProgram = () => {
    setEditingProgram(null);
    setIsNewVersion(false);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsNewVersion(false);
    setForm({
      name: program.name,
      number: program.number,
      version: program.version,
      date: program.date,
      imageUri: program.imageUri ?? '',
      latestVersion: program.latestVersion ?? false,
    });
    setModalVisible(true);
  };

  const handleNewVersion = () => {
    if (!editingProgram) return;
    setIsNewVersion(true);
    setForm({
      name: editingProgram.name,
      number: editingProgram.number,
      version: '',
      date: '',
      imageUri: '',
      latestVersion: true,
    });
  };

  const pickImage = () => {
    Alert.alert('הוסף תמונה', 'בחר מקור', [
      { text: 'מצלמה', onPress: () => handlePickImage('camera') },
      { text: 'גלריה', onPress: () => handlePickImage('gallery') },
      { text: 'ביטול', style: 'cancel' },
    ]);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        try {
          const permanentPath = `${docDir}program-images/${Date.now()}.jpg`;
          await FileSystem.makeDirectoryAsync(`${docDir}program-images`, { intermediates: true });
          await FileSystem.copyAsync({ from: tempUri, to: permanentPath });
          setForm((f) => ({ ...f, imageUri: permanentPath }));
          return;
        } catch {

        }
      }
      setForm((f) => ({ ...f, imageUri: tempUri }));
    }
  };

  const handleConfirm = () => {
    const name = form.name.trim();
    if (!name || !project) return;


    const programData = {
      name,
      number: form.number.trim(),
      version: form.version.trim(),
      date: form.date.trim(),
      imageUri: form.imageUri || undefined,
      latestVersion: form.latestVersion,
    };
    console.log('programData', programData);

    if (isNewVersion && editingProgram) {
      // Mark original as not latest, add new program as latest
      const demoted = (project.programs ?? []).map((p) =>
        p.id === editingProgram.id ? { ...p, latestVersion: false } : p
      );
      const newProgram: Program = { id: Date.now().toString(), ...programData };
      saveProject({ ...project, programs: [...demoted, newProgram] });
    } else if (editingProgram) {
      const updatedPrograms = (project.programs ?? []).map((p) =>
        p.id === editingProgram.id ? { ...p, ...programData } : p
      );
      saveProject({ ...project, programs: updatedPrograms });
    } else {
      const program: Program = { id: Date.now().toString(), ...programData };
      saveProject({ ...project, programs: [...(project.programs ?? []), program] });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editingProgram || !project) return;
    const updatedPrograms = (project.programs ?? []).filter((p) => p.id !== editingProgram.id);
    saveProject({ ...project, programs: updatedPrograms });
    setModalVisible(false);
  };

  const programs = project?.programs ?? [];
  const q = searchQuery.trim().toLowerCase();
  const filteredPrograms = q
    ? programs.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.number.toLowerCase().includes(q)
      )
    : programs;
  const isFormValid = form.name.trim().length > 0;

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FE9F39', dark: '#FFB380' }}
        headerImage={
          <PlanIcon width={220} height={220} fill="white" />
        }>

        <TabHeader
          backLabel="חזרה לפרוייקטים"
          title="תוכניות"
          projectName={project?.name}
          showAddButton={programs.length > 0}
          onAddPress={handleAddProgram}
        />

        {programs.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <TextInput
                style={[styles.searchInput, { color: Colors[colorScheme].text }]}
                placeholder="חפש לפי שם או מס׳..."
                placeholderTextColor={Colors[colorScheme].icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <XmarkIcon width={16} height={16} fill={Colors[colorScheme].icon} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Empty state */}
        {programs.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ListIcon width={64} height={64} fill={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              אין תוכניות עדיין
            </ThemedText>
            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={handleAddProgram}
              activeOpacity={0.8}>
              <PlusIcon width={24} height={24} fill="#fff" />
              <Text style={styles.bigAddButtonText}>הוסף תוכנית</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          /* Programs list */
          <ThemedView style={styles.listContainer}>
            {filteredPrograms.length === 0 ? (
              <ThemedText style={styles.noResultsText}>לא נמצאו תוכניות</ThemedText>
            ) : null}
            {filteredPrograms.map((program) => (
              <TouchableOpacity
                key={program.id}
                onPress={() => handleEditProgram(program)}
                activeOpacity={0.7}>
                <ThemedView style={styles.programCard}>
                  {program.imageUri && (
                    <Image
                      source={{ uri: program.imageUri }}
                      style={styles.cardThumbnail}
                      contentFit="cover"
                    />
                  )}
                  <ThemedView style={styles.cardContent}>
                    <ThemedText style={styles.programName} numberOfLines={2}>{program.name}</ThemedText>
                    {program.latestVersion && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>אחרון</Text>
                        </View>
                      )}
                    <ThemedView style={styles.metaRow}>
                      {/* Number */}
                      <ThemedView style={styles.metaChip}>
                        <ThemedText style={[styles.metaLabel, { color: Colors[colorScheme].icon }]}>
                          מס׳
                        </ThemedText>
                        <ThemedText style={styles.metaValue}>{program.number || '—'}</ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.metaSeparator} />
                      {/* Version */}
                      <ThemedView style={styles.metaChip}>
                        <ThemedText style={[styles.metaLabel, { color: Colors[colorScheme].icon }]}>
                          גרסה
                        </ThemedText>
                        <ThemedText style={styles.metaValue}>{program.version || '—'}</ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.metaSeparator} />
                      {/* Date */}
                      <ThemedView style={styles.metaChip}>
                        <CalendarIcon width={12} height={12} fill={Colors[colorScheme].icon} />
                        <ThemedText style={styles.metaValue}>{program.date || '—'}</ThemedText>
                      </ThemedView>
                    </ThemedView>
                  </ThemedView>
                  <LeftIcon width={16} height={16} fill={Colors[colorScheme].icon} />
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      {/* Add / Edit Program Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeModal} />
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled">
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {isNewVersion ? 'גרסה חדשה' : editingProgram ? 'ערוך תוכנית' : 'הוסף תוכנית'}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>שם</Text>
                <TextInput
                  style={[styles.modalInput, isNewVersion && styles.modalInputLocked]}
                  placeholder="שם תוכנית"
                  placeholderTextColor="#999"
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  autoFocus={!isNewVersion}
                  editable={!isNewVersion}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>מספר</Text>
                  <TextInput
                    style={[styles.modalInput, isNewVersion && styles.modalInputLocked]}
                    placeholder="מספר תוכנית"
                    placeholderTextColor="#999"
                    value={form.number}
                    onChangeText={(v) => setForm((f) => ({ ...f, number: v }))}
                    editable={!isNewVersion}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>גרסה</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="גרסה תוכנית"
                    placeholderTextColor="#999"
                    value={form.version}
                    onChangeText={(v) => setForm((f) => ({ ...f, version: v }))}
                    autoFocus={isNewVersion}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>תאריך</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="תאריך תוכנית"
                  placeholderTextColor="#999"
                  value={form.date}
                  onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
                  returnKeyType="done"
                />
              </View>

              {/* Image picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>תמונה</Text>
                {form.imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: form.imageUri }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={() => setForm((f) => ({ ...f, imageUri: '' }))}
                      activeOpacity={0.8}>
                      <XmarkIcon width={24} height={24} fill="#e53935" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={pickImage}
                    activeOpacity={0.7}>
                    <PlusIcon width={18} height={18} fill={ACCENT} />
                    <Text style={styles.addImageButtonText}>הוסף תמונה</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Latest version checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setForm((f) => ({ ...f, latestVersion: !f.latestVersion }))}
                activeOpacity={0.7}>
                <CheckmarkIcon width={24} height={24} fill={form.latestVersion ? ACCENT : '#999'} />
                <Text style={styles.checkboxLabel}>גרסה אחרונה</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, !isFormValid && styles.confirmButtonDisabled]}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                  disabled={!isFormValid}>
                  <Text style={styles.confirmButtonText}>
                    {isNewVersion ? 'צור' : editingProgram ? 'שמור' : 'הוסף'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingProgram && !isNewVersion && (
                <>
                  <View style={styles.modalDivider} />
                  <View style={styles.bottomActions}>
                    <TouchableOpacity
                      style={styles.newVersionButton}
                      onPress={handleNewVersion}
                      activeOpacity={0.8}>
                      <DocIcon width={16} height={16} fill={ACCENT} />
                      <Text style={styles.newVersionButtonText}>גרסה חדשה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDelete}
                      activeOpacity={0.8}>
                      <TrashIcon width={16} height={16} fill="#fff" />

                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: 0,
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
  searchContainer: {
    marginBottom: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  searchClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    paddingVertical: 24,
  },
  listContainer: {

    display: 'flex',
    flexDirection: 'column',

    gap: 10,
  },
  programCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,

  },
  programName: {
    maxWidth: 200,
    display: 'flex',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,

  },
  latestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  latestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#388e3c',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
  },
  metaSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#ccc',
    marginHorizontal: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
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
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    writingDirection: 'rtl',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#11181C',
    fontWeight: '500',
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
  modalInputLocked: {
    backgroundColor: '#f5f5f5',
    color: '#888',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginTop: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
  },
  newVersionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  newVersionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
  // Card thumbnail
  cardThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  // Image picker
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    backgroundColor: 'white',
  },
  addImageButtonText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 160,

    borderRadius: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});
