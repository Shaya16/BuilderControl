import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { ControlCard } from '@/components/control-card';
import { ControlModal } from '@/components/control-modal';
import { ControlViewModal } from '@/components/control-view-modal';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { ACCENT } from '@/constants/controls';
import { Colors } from '@/constants/theme';
import { ConcreteType, Control, ControlImage, ElementType, Project } from '@/types/project';
import { generateControlPDFFile } from '@/utils/exportControlPDF';
import { loadProjects, saveProject as persistProject } from '@/utils/projectStorage';

import ControlIcon from '@/assets/icons/control.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import LeftIcon from '@/assets/icons/left.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import CheckmarkIcon from '@/assets/icons/checkmark.svg';
import XmarkIcon from '@/assets/icons/xmark.svg';
import DocIcon from '@/assets/icons/docs.svg';

export default function ControlsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [viewingControl, setViewingControl] = useState<Control | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchExporting, setBatchExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [exportStatus, setExportStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';

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
    validatedConcrete: boolean;
    validatedConcreteAt?: string;
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
      validated_concrete: data.validatedConcrete,
      validated_concrete_at: data.validatedConcreteAt,
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

  const handleToggleSelect = (control: Control) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(control.id)) {
        next.delete(control.id);
      } else {
        next.add(control.id);
      }
      return next;
    });
    if (!selectionMode) setSelectionMode(true);
  };

  const handleSelectAll = () => {
    const filteredIds = controls.map((c) => c.id);
    if (filteredIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (!project || selectedIds.size === 0) return;
    Alert.alert(
      'מחיקת בקרות',
      `האם למחוק ${selectedIds.size} בקרות?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            const updated = (project.controls ?? []).filter((c) => !selectedIds.has(c.id));
            saveProject({ ...project, controls: updated });
            handleExitSelectionMode();
          },
        },
      ]
    );
  };

  const handleBatchExport = async () => {
    if (!project || selectedIds.size === 0) return;
    const selected = (project.controls ?? []).filter((c) => selectedIds.has(c.id));
    setBatchExporting(true);
    setExportProgress({ current: 0, total: selected.length });

    try {
      const zip = new JSZip();

      for (let i = 0; i < selected.length; i++) {
        const control = selected[i];
        setExportProgress({ current: i + 1, total: selected.length });
        setExportStatus(`מייצר PDF: ${control.elementName}...`);

        const t0 = Date.now();
        const filePath = await generateControlPDFFile(control, {
          logoUri: project.logoUri,
        });
        console.log(`[Export] PDF "${control.elementName}" generated in ${Date.now() - t0}ms`);

        setExportStatus(`קורא קובץ ${i + 1}...`);
        const pdfBase64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log(`[Export] PDF "${control.elementName}" read: ${(pdfBase64.length / 1024).toFixed(0)}KB`);

        const fileName = filePath.split('/').pop() ?? `control_${i}.pdf`;
        zip.file(fileName, pdfBase64, { base64: true });
        // Free the PDF temp file immediately to reduce memory pressure
        await FileSystem.deleteAsync(filePath, { idempotent: true });

        // Small delay to let UI update and GC run
        if (i < selected.length - 1) {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      setExportStatus('יוצר קובץ ZIP...');
      console.log(`[Export] Generating ZIP from ${selected.length} PDFs...`);
      const tZip = Date.now();
      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      console.log(`[Export] ZIP generated in ${Date.now() - tZip}ms (${(zipBase64.length / 1024).toFixed(0)}KB)`);
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error('No cache directory');
      const dateStr = new Date().toISOString().slice(0, 10);
      const zipPath = `${cacheDir}controls_export_${dateStr}.zip`;
      await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setBatchExporting(false);
      setExportProgress({ current: 0, total: 0 });
      setExportStatus('');
      handleExitSelectionMode();

      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'ייצוא דוחות בקרה',
        UTI: 'public.zip-archive',
      });
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('OutOfMemory') || msg.includes('rejected')) {
        Alert.alert('שגיאה', 'אין מספיק זיכרון לייצוא. נסה לייצא פחות דוחות בכל פעם.');
      } else {
        Alert.alert('שגיאה', 'לא ניתן היה לייצא את הדוחות. אנא נסה שוב.');
      }
      setBatchExporting(false);
      setExportProgress({ current: 0, total: 0 });
      setExportStatus('');
      handleExitSelectionMode();
    }
  };

  const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];

  const allControls = project?.controls ?? [];

  // Derive available months from controls (newest first)
  const availableMonths = (() => {
    const monthSet = new Set<string>();
    for (const c of allControls) {
      const dateStr = c.updatedAt ?? c.createdAt;
      if (dateStr) monthSet.add(dateStr.slice(0, 7)); // "2025-01"
    }
    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a)) // newest first
      .map((value) => {
        const [year, month] = value.split('-');
        const monthName = HEBREW_MONTHS[parseInt(month, 10) - 1];
        return { label: `${monthName} ${year}`, value };
      });
  })();

  const controls = allControls
    .filter((control) => {
      // Text search
      const matchesSearch =
        !searchQuery.trim() ||
        control.elementName.toLowerCase().includes(searchQuery.trim().toLowerCase());
      // Month filter
      const matchesMonth =
        !selectedMonth ||
        (control.updatedAt ?? control.createdAt ?? '').startsWith(selectedMonth);
      return matchesSearch && matchesMonth;
    })
    .sort((a, b) => {
      const dateA = a.updatedAt ?? a.createdAt ?? '';
      const dateB = b.updatedAt ?? b.createdAt ?? '';
      return dateB.localeCompare(dateA);
    });
  const levels = project?.levels ?? [];
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
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <TextInput
                style={[styles.searchInput, { color: Colors[colorScheme].text }]}
                placeholder="חפש לפי שם האלמנט..."
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

            {/* Month filter button */}
            {availableMonths.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.monthFilterButton,
                  selectedMonth != null && styles.monthFilterButtonActive,
                ]}
                onPress={() => setMonthPickerVisible(true)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.monthFilterButtonText,
                    selectedMonth != null && styles.monthFilterButtonTextActive,
                  ]}>
                  {selectedMonth
                    ? availableMonths.find((m) => m.value === selectedMonth)?.label
                    : 'סנן לפי חודש'}
                </Text>
                {selectedMonth != null && (
                  <TouchableOpacity
                    onPress={() => setSelectedMonth(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <XmarkIcon width={14} height={14} fill={ACCENT} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Month picker modal */}
        <Modal
          visible={monthPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMonthPickerVisible(false)}>
          <TouchableOpacity
            style={styles.monthModalOverlay}
            activeOpacity={1}
            onPress={() => setMonthPickerVisible(false)}>
            <View
              style={[
                styles.monthModalBox,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#1C2830' : '#fff',
                },
              ]}>
              <Text
                style={[
                  styles.monthModalTitle,
                  { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
                ]}>
                סנן לפי חודש
              </Text>
              <ScrollView style={styles.monthModalList}>
                {availableMonths.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.monthModalItem,
                      selectedMonth === month.value &&
                        styles.monthModalItemActive,
                    ]}
                    onPress={() => {
                      setSelectedMonth(
                        selectedMonth === month.value ? null : month.value,
                      );
                      setMonthPickerVisible(false);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.monthModalItemText,
                        {
                          color:
                            selectedMonth === month.value
                              ? ACCENT
                              : colorScheme === 'dark'
                                ? '#fff'
                                : '#11181C',
                        },
                      ]}>
                      {month.label}
                    </Text>
                    {selectedMonth === month.value && (
                      <CheckmarkIcon width={16} height={16} fill={ACCENT} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {allControls.length > 0 && !selectionMode && (
          <TouchableOpacity
            style={styles.selectionModeButton}
            onPress={() => setSelectionMode(true)}
            activeOpacity={0.7}>
            <CheckmarkIcon width={16} height={16} fill={ACCENT} />
            <Text style={styles.selectionModeButtonText}>בחירה מרובה</Text>
          </TouchableOpacity>
        )}

        {selectionMode && (
          <View style={styles.selectionBar}>
            <View style={styles.selectionBarLeft}>
              <TouchableOpacity onPress={handleExitSelectionMode} activeOpacity={0.7}>
                <XmarkIcon width={16} height={16} fill="#666" />
              </TouchableOpacity>
              <Text style={styles.selectionCount}>
                {selectedIds.size} / {controls.length} נבחרו
              </Text>
            </View>
            <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
              <Text style={styles.selectAllText}>
                {controls.every((c) => selectedIds.has(c.id)) ? 'בטל הכל' : 'בחר הכל'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {controls.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ControlIcon width={64} height={64} fill={Colors[colorScheme].icon} />
            <ThemedText style={{ color: Colors[colorScheme].icon, fontSize: 16 }}>
              {allControls.length === 0 ? 'אין בקרות עדיין' : 'אין בקרות תואמות'}
            </ThemedText>
            {allControls.length === 0 ? (
              <TouchableOpacity style={styles.bigAddButton} onPress={handleAddControl} activeOpacity={0.8}>
                <PlusIcon width={24} height={24} fill="#fff" />
                <Text style={styles.bigAddButtonText}>הוסף בקרה</Text>
              </TouchableOpacity>
            ) : null}
          </ThemedView>
        ) : (
          <ThemedView style={styles.listContainer}>
            {controls.map((control) => (
              <ControlCard
                key={control.id}
                control={control}
                onPress={handleViewControl}
                selectionMode={selectionMode}
                selected={selectedIds.has(control.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </ThemedView>
        )}
      </ParallaxScrollView>

      <ControlViewModal
        visible={!!viewingControl}
        control={viewingControl}
        projectLogoUri={project?.logoUri}
        onClose={() => setViewingControl(null)}
        onEdit={handleEditFromView}
      />

      <ControlModal
        visible={modalVisible}
        editingControl={editingControl}
        levels={levels}
        latestPrograms={latestPrograms}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={handleCloseModal}
      />

      {selectionMode && selectedIds.size > 0 && !batchExporting && (
        <View style={styles.floatingBar}>
          <View style={styles.floatingBarRow}>
            <TouchableOpacity
              style={styles.batchExportButton}
              onPress={handleBatchExport}
              activeOpacity={0.8}>
              <DocIcon width={18} height={18} fill="#fff" />
              <Text style={styles.batchExportButtonText}>
                ייצא {selectedIds.size} PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.batchDeleteButton}
              onPress={handleBatchDelete}
              activeOpacity={0.8}>
              <TrashIcon width={18} height={18} fill="#fff" />
              <Text style={styles.batchDeleteButtonText}>
                מחק {selectedIds.size}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {batchExporting && (
        <View style={styles.exportOverlay}>
          <View style={styles.exportOverlayBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.exportOverlayTitle}>מייצא דוחות...</Text>
            <Text style={styles.exportOverlayProgress}>
              {exportProgress.current} / {exportProgress.total}
            </Text>
            {exportStatus ? (
              <Text style={styles.exportOverlayStatus}>{exportStatus}</Text>
            ) : null}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: exportProgress.total > 0
                      ? `${(exportProgress.current / exportProgress.total) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  monthFilterButtonActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(255, 106, 6, 0.08)',
  },
  monthFilterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#687076',
    writingDirection: 'rtl',
  },
  monthFilterButtonTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  monthModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthModalBox: {
    width: 280,
    maxHeight: 400,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  monthModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 14,
  },
  monthModalList: {
    maxHeight: 300,
  },
  monthModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  monthModalItemActive: {
    backgroundColor: 'rgba(255, 106, 6, 0.08)',
  },
  monthModalItemText: {
    fontSize: 15,
    fontWeight: '500',
    writingDirection: 'rtl',
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
  selectionModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACCENT,
    marginBottom: 8,
  },
  selectionModeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#f0f4f8',
  },
  selectionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  floatingBarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  batchExportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: ACCENT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  batchExportButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  batchDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#E53935',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  batchDeleteButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  exportOverlayBox: {
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
  exportOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  exportOverlayProgress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  exportOverlayStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
});
