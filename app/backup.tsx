import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENT } from '@/constants/controls';
import { Colors, Fonts } from '@/constants/theme';
import { exportBackupZip, importBackupFile } from '@/utils/backupManager';
import { loadProjects, saveProjects } from '@/utils/projectStorage';

import ArrowTriangleIcon from '@/assets/icons/arrow_triangle.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import LeftIcon from '@/assets/icons/left.svg';

export default function BackupScreen() {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusLine, setStatusLine] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const handleExportZip = async () => {
    setBusy(true);
    setBusyLabel('מייצא גיבוי...');
    setProgress({ current: 0, total: 0 });
    setStatusLine('טוען פרויקטים...');
    try {
      const projects = await loadProjects();
      if (projects.length === 0) {
        setBusy(false);
        Alert.alert('אין פרויקטים', 'אין פרויקטים לייצוא');
        return;
      }
      await exportBackupZip(
        projects,
        (current, total) => {
          setProgress({ current, total });
        },
        (status) => {
          setStatusLine(status);
        },
      );
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'לא ניתן לייצא גיבוי');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setBusyLabel('מייבא גיבוי...');
    setProgress({ current: 0, total: 0 });
    try {
      const imported = await importBackupFile((current, total) => {
        setProgress({ current, total });
      });
      setBusy(false);
      if (!imported) return;

      Alert.alert(
        'ייבוא גיבוי',
        `נמצאו ${imported.length} פרויקטים. האם לייבא אותם?`,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'החלף הכל',
            style: 'destructive',
            onPress: async () => {
              await saveProjects(imported);
              Alert.alert('הושלם', 'הפרויקטים שוחזרו בהצלחה');
            },
          },
          {
            text: 'מזג',
            onPress: async () => {
              const existing = await loadProjects();
              const existingIds = new Set(existing.map((p) => p.id));
              const newOnes = imported.filter((p) => !existingIds.has(p.id));
              const updated = existing.map((p) => {
                const match = imported.find((ip) => ip.id === p.id);
                return match ?? p;
              });
              await saveProjects([...updated, ...newOnes]);
              Alert.alert('הושלם', 'הפרויקטים מוזגו בהצלחה');
            },
          },
        ],
      );
    } catch (e: any) {
      setBusy(false);
      Alert.alert('שגיאה', e?.message ?? 'לא ניתן לייבא את הקובץ');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? '#0B1114' : '#F4F7F8',
          paddingTop: insets.top,
        },
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
            borderBottomColor:
              colorScheme === 'dark'
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.06)',
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <LeftIcon
            width={20}
            height={20}
            fill={colorScheme === 'dark' ? '#fff' : '#11181C'}
            style={{ transform: [{ scaleX: -1 }] }}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
          ]}>
          גיבויים
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Export button */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: ACCENT }]}
          onPress={handleExportZip}
          activeOpacity={0.85}
          disabled={busy}>
          <DownloadIcon width={22} height={22} fill="#fff" />
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>ייצוא גיבוי</Text>
            <Text style={styles.actionSubtitle}>
              שמור קובץ ZIP בגוגל דרייב, אימייל או מקום בטוח אחר
            </Text>
          </View>
        </TouchableOpacity>

        {/* Import button */}
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor:
                colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
              borderWidth: 1,
              borderColor:
                colorScheme === 'dark'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
            },
          ]}
          onPress={handleImport}
          activeOpacity={0.85}
          disabled={busy}>
          <ArrowTriangleIcon width={22} height={22} fill={ACCENT} />
          <View style={styles.actionTextWrap}>
            <Text
              style={[
                styles.actionTitle,
                { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
              ]}>
              ייבוא גיבוי
            </Text>
            <Text
              style={[
                styles.actionSubtitle,
                { color: Colors[colorScheme].icon },
              ]}>
              שחזר פרויקטים מקובץ ZIP או JSON
            </Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text
            style={[styles.infoText, { color: Colors[colorScheme].icon }]}>
            ייצא גיבוי באופן קבוע ושמור אותו בגוגל דרייב, אימייל או מקום
            בטוח אחר כדי להגן על הנתונים שלך.
          </Text>
        </View>
      </View>

      {/* Busy overlay */}
      {busy && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.overlayTitle}>{busyLabel}</Text>
            {progress.total > 0 && (
              <>
                <Text style={styles.overlayProgress}>
                  {Math.round(progress.current)} / {progress.total}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(progress.current / progress.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </>
            )}
            {statusLine !== '' && (
              <Text style={styles.overlayStatus}>{statusLine}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts?.rounded,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  infoSection: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayBox: {
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
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    writingDirection: 'rtl',
  },
  overlayProgress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  overlayStatus: {
    fontSize: 13,
    color: '#999',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
