import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { ACCENT } from '@/constants/controls';
import { Colors } from '@/constants/theme';
import { Project } from '@/types/project';

import SettingsIcon from '@/assets/icons/settings.svg';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import XmarkIcon from '@/assets/icons/xmark.svg';
import PhotoIcon from '@/assets/icons/photo.svg';
import ArrowTriangleIcon from '@/assets/icons/arrow_triangle.svg';
import CheckmarkIcon from '@/assets/icons/checkmark.svg';

const STORAGE_KEY = 'projects';

export default function SettingsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [saved, setSaved] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';

  const loadProject = useCallback(() => {
    if (!projectId) return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      const projects: Project[] = JSON.parse(stored);
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        setName(found.name);
        setCompanyName(found.companyName ?? '');
        setLogoUri(found.logoUri ?? '');
      }
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

  const handleSave = async () => {
    if (!project || !name.trim()) return;
    const updated: Project = {
      ...project,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      logoUri: logoUri || undefined,
    };
    await saveProject(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePickLogo = () => {
    Alert.alert('הוסף לוגו', 'בחר מקור', [
      { text: 'מצלמה', onPress: () => pickImage('camera') },
      { text: 'גלריה', onPress: () => pickImage('gallery') },
      { text: 'ביטול', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });

    if (!result.canceled && result.assets[0]) {
      const tempUri = result.assets[0].uri;
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        try {
          const permanentPath = `${docDir}project-logos/${Date.now()}.jpg`;
          await FileSystem.makeDirectoryAsync(`${docDir}project-logos`, { intermediates: true });
          await FileSystem.copyAsync({ from: tempUri, to: permanentPath });
          setLogoUri(permanentPath);
          return;
        } catch {}
      }
      setLogoUri(tempUri);
    }
  };

  const isFormValid = name.trim().length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#6C757D', dark: '#495057' }}
        headerImage={<SettingsIcon width={200} height={200} fill="white" />}>
        <TabHeader
          backLabel="חזרה לפרוייקטים"
          title="הגדרות"
          projectName={project?.name}
          showAddButton={false}
          onAddPress={() => {}}
        />

        <ThemedView style={styles.container}>
          {/* Logo section */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>לוגו פרוייקט</ThemedText>
            <View style={styles.logoRow}>
              {logoUri ? (
                <View style={styles.logoPreviewContainer}>
                  <Image
                    source={{ uri: logoUri }}
                    style={styles.logoPreview}
                    contentFit="contain"
                  />
                  <TouchableOpacity
                    style={styles.logoRemoveButton}
                    onPress={() => setLogoUri('')}
                    activeOpacity={0.8}>
                    <XmarkIcon width={24} height={24} fill="#e53935" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.logoPlaceholder}
                  onPress={handlePickLogo}
                  activeOpacity={0.7}>
                  <PhotoIcon width={32} height={32} fill={Colors[colorScheme].icon} />
                  <Text style={[styles.logoPlaceholderText, { color: Colors[colorScheme].icon }]}>
                    הוסף לוגו
                  </Text>
                </TouchableOpacity>
              )}
              {logoUri ? (
                <TouchableOpacity
                  style={styles.changeLogoButton}
                  onPress={handlePickLogo}
                  activeOpacity={0.7}>
                  <ArrowTriangleIcon width={16} height={16} fill={ACCENT} />
                  <Text style={styles.changeLogoText}>החלף לוגו</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ThemedView>

          {/* Project name */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>שם הפרוייקט</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon + '44' },
              ]}
              placeholder="שם הפרוייקט"
              placeholderTextColor={Colors[colorScheme].icon}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </ThemedView>

          {/* Company name */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>שם החברה</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon + '44' },
              ]}
              placeholder="שם החברה"
              placeholderTextColor={Colors[colorScheme].icon}
              value={companyName}
              onChangeText={setCompanyName}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </ThemedView>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, (!isFormValid || saved) && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!isFormValid}>
            {saved ? (
              <>
                <CheckmarkIcon width={18} height={18} fill="#fff" />
                <Text style={styles.saveButtonText}>נשמר!</Text>
              </>
            ) : (
              <Text style={styles.saveButtonText}>שמור שינויים</Text>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  logoPreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  logoRemoveButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  changeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  changeLogoText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
