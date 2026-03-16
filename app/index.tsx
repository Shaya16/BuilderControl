import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { Project } from '@/types/project';
import { exportProjectsToJSON, importProjectsFromJSON } from '@/utils/exportProjectsJSON';

import FolderIcon from '@/assets/icons/folder.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import LeftIcon from '@/assets/icons/left.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import ArrowTriangleIcon from '@/assets/icons/arrow_triangle.svg';
import { ACCENT, STORAGE_KEY } from '@/constants/controls';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [jsonBusy, setJsonBusy] = useState(false);
  const [jsonProgress, setJsonProgress] = useState({ label: '', current: 0, total: 0 });
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

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

  const handleExportJSON = async () => {
    if (projects.length === 0) {
      Alert.alert('אין פרויקטים', 'אין פרויקטים לייצוא');
      return;
    }
    setJsonBusy(true);
    setJsonProgress({ label: 'מייצא פרויקטים...', current: 0, total: projects.length });
    try {
      await exportProjectsToJSON(projects, (current, total) => {
        setJsonProgress({ label: 'מייצא פרויקטים...', current, total });
      });
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'לא ניתן לייצא את הפרויקטים');
    } finally {
      setJsonBusy(false);
    }
  };

  const handleImportJSON = async () => {
    try {
      setJsonBusy(true);
      setJsonProgress({ label: 'מייבא פרויקטים...', current: 0, total: 0 });
      const imported = await importProjectsFromJSON((current, total) => {
        setJsonProgress({ label: 'מייבא פרויקטים...', current, total });
      });
      setJsonBusy(false);
      if (!imported) return;

      Alert.alert(
        'ייבוא פרויקטים',
        `נמצאו ${imported.length} פרויקטים. האם לייבא אותם?`,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'החלף הכל',
            style: 'destructive',
            onPress: () => {
              setProjects(imported);
            },
          },
          {
            text: 'מזג',
            onPress: () => {
              setProjects((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const newOnes = imported.filter((p) => !existingIds.has(p.id));
                const updated = prev.map((p) => {
                  const match = imported.find((ip) => ip.id === p.id);
                  return match ?? p;
                });
                return [...updated, ...newOnes];
              });
            },
          },
        ],
      );
    } catch (e: any) {
      setJsonBusy(false);
      Alert.alert('שגיאה', e?.message ?? 'לא ניתן לייבא את הקובץ');
    }
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FFD4B7', dark: '#FFB380' }}
        headerImage={
          <FolderIcon
            width={220}
            height={220}
            fill={colorScheme === 'dark' ? '#1E3A45' : '#FF6A06'}
          />
        }>
        <ThemedView style={styles.content}>
          {/* Hero */}
          <ThemedView style={styles.hero}>
            <View style={styles.heroText}>
              <ThemedText type="title" style={styles.heroTitle}>
                הפרויקטים שלי
              </ThemedText>
              <ThemedText
                style={[
                  styles.heroSubtitle,
                  { color: Colors[colorScheme].icon },
                ]}>
                {projects.length === 0
                  ? 'אפשר להתחיל ביצירת הפרויקט הראשון שלך'
                  : `${projects.length} פרויקטים שמורים`}
              </ThemedText>
            </View>
  
            {projects.length > 0 && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,106,6,0.18)'
                        : 'rgba(255,106,6,0.10)',
                  },
                ]}>
                <Text style={styles.countBadgeText}>{projects.length}</Text>
              </View>
            )}
          </ThemedView>
  
          {/* Import / Export */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(17,24,28,0.08)',
                },
              ]}
              onPress={handleImportJSON}
              activeOpacity={0.8}>
              <ArrowTriangleIcon width={16} height={16} fill={ACCENT} />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
                ]}>
                ייבוא
              </Text>
            </TouchableOpacity>

            {projects.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                    borderColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(17,24,28,0.08)',
                  },
                ]}
                onPress={handleExportJSON}
                activeOpacity={0.8}>
                <DownloadIcon width={16} height={16} fill={ACCENT} />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
                  ]}>
                  ייצוא
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Empty state */}
          {projects.length === 0 ? (
            <ThemedView
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(17,24,28,0.08)',
                },
              ]}>
              <View
                style={[
                  styles.emptyIconWrap,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,106,6,0.18)'
                        : 'rgba(255,106,6,0.10)',
                  },
                ]}>
                <FolderIcon width={38} height={38} fill={ACCENT} />
              </View>
  
              <ThemedText style={styles.emptyTitle}>אין פרויקטים עדיין</ThemedText>
              <ThemedText
                style={[
                  styles.emptySubtitle,
                  { color: Colors[colorScheme].icon },
                ]}>
                צור פרויקט חדש כדי להתחיל לנהל תוכניות, בקרות ורמות
              </ThemedText>
  
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddProject}
                activeOpacity={0.85}>
                <PlusIcon width={18} height={18} fill="#fff" />
                <Text style={styles.primaryButtonText}>פרויקט חדש</Text>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedView style={styles.listContainer}>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => handleSelectProject(project)}
                  activeOpacity={0.82}>
                  <ThemedView
                    style={[
                      styles.projectCard,
                      {
                        backgroundColor:
                          colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                        borderColor:
                          colorScheme === 'dark'
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(17,24,28,0.08)',
                      },
                    ]}>
                    <View style={styles.projectMain}>
                      <View
                        style={[
                          styles.folderIconWrap,
                          {
                            backgroundColor:
                              colorScheme === 'dark'
                                ? 'rgba(255,106,6,0.18)'
                                : 'rgba(255,106,6,0.10)',
                          },
                        ]}>
                        <FolderIcon width={20} height={20} fill={ACCENT} />
                      </View>
  
                      <View style={styles.projectTextWrap}>
                        <ThemedText style={styles.projectName} numberOfLines={1}>
                          {project.name}
                        </ThemedText>
                        <Text
                          style={[
                            styles.projectMeta,
                            { color: Colors[colorScheme].icon },
                          ]}>
                          לחץ לפתיחת הפרויקט
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={[
                        styles.chevronWrap,
                        {
                          backgroundColor:
                            colorScheme === 'dark'
                              ? 'rgba(255,255,255,0.05)'
                              : '#F4F7F8',
                        },
                      ]}>
                      <LeftIcon width={16} height={16} fill={Colors[colorScheme].icon} />
                    </View>
                  </ThemedView>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ParallaxScrollView>
  
      {/* Floating add button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 12 }]}
        onPress={handleAddProject}
        activeOpacity={0.9}>
        <PlusIcon width={20} height={20} fill="#fff" />
        <Text style={styles.fabText}>פרויקט חדש</Text>
      </TouchableOpacity>
  
      {/* Add Project Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor:
                  colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
              },
            ]}>
            <Text
              style={[
                styles.modalTitle,
                { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
              ]}>
              פרויקט חדש
            </Text>
  
            <Text
              style={[
                styles.modalSubtitle,
                { color: Colors[colorScheme].icon },
              ]}>
              תן לפרויקט שם ברור שיהיה קל לזהות אחר כך
            </Text>
  
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#11181C',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.10)'
                      : '#D9E0E3',
                  backgroundColor:
                    colorScheme === 'dark' ? '#0B1114' : '#F8FAFB',
                },
              ]}
              placeholder="שם הפרויקט"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleConfirm}
              returnKeyType="done"
            />
  
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    borderColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.10)'
                        : '#D9E0E3',
                    backgroundColor:
                      colorScheme === 'dark' ? '#0B1114' : '#fff',
                  },
                ]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: Colors[colorScheme].icon },
                  ]}>
                  ביטול
                </Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !newName.trim() && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                activeOpacity={0.85}
                disabled={!newName.trim()}>
                <Text style={styles.confirmButtonText}>יצירה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {jsonBusy && (
        <View style={styles.jsonOverlay}>
          <View style={styles.jsonOverlayBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.jsonOverlayTitle}>{jsonProgress.label}</Text>
            {jsonProgress.total > 0 && (
              <>
                <Text style={styles.jsonOverlayProgress}>
                  {jsonProgress.current} / {jsonProgress.total}
                </Text>
                <View style={styles.jsonProgressTrack}>
                  <View
                    style={[
                      styles.jsonProgressFill,
                      {
                        width: `${(jsonProgress.current / jsonProgress.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  headerImage: {
    bottom: -70,
    left: -10,
    position: 'absolute',
    opacity: 0.95,
  },

  content: {
    paddingBottom: 110,
    gap: 18,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  heroText: {

    alignItems: 'flex-start',
  },
  heroTitle: {
    fontFamily: Fonts?.rounded,
    fontSize: 30,
    lineHeight: 36,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  countBadge: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 15,
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'center',
    maxWidth: 280,
  },

  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: ACCENT,
    paddingHorizontal: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  listContainer: {
    gap: 12,
    marginTop: 4,
  },
  projectCard: {
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  projectMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  folderIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTextWrap: {
    alignItems: 'flex-start',
    minWidth: 0,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  projectMeta: {
    marginTop: 4,
    fontSize: 13,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  fab: {
    position: 'absolute',
    right: 20,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: ACCENT,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: -4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  confirmButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    writingDirection: 'rtl',
  },

  jsonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  jsonOverlayBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  jsonOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    writingDirection: 'rtl',
  },
  jsonOverlayProgress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  jsonProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  jsonProgressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
});