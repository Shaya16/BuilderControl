import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENT } from '@/constants/controls';
import { Colors, Fonts } from '@/constants/theme';
import {
  BackupMeta,
  createLocalBackup,
  deleteLocalBackup,
  exportBackupZip,
  importBackupFile,
  listLocalBackups,
  restoreFromLocalBackup,
} from '@/utils/backupManager';
import { loadProjects, saveProjects } from '@/utils/projectStorage';

import ArrowTriangleIcon from '@/assets/icons/arrow_triangle.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import LeftIcon from '@/assets/icons/left.svg';
import TrashIcon from '@/assets/icons/trash.svg';

export default function BackupScreen() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const refresh = useCallback(async () => {
    setLoading(true);
    const metas = await listLocalBackups();
    setBackups(metas);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleBackupNow = async () => {
    setBusy(true);
    setBusyLabel('יוצר גיבוי...');
    try {
      const projects = await loadProjects();
      await createLocalBackup(projects);
      await refresh();
      Alert.alert('גיבוי נוצר', 'הגיבוי נשמר בהצלחה');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'לא ניתן ליצור גיבוי');
    } finally {
      setBusy(false);
    }
  };

  const handleExportZip = async () => {
    setBusy(true);
    setBusyLabel('מייצא גיבוי...');
    setProgress({ current: 0, total: 0 });
    try {
      const projects = await loadProjects();
      await exportBackupZip(projects, (current, total) => {
        setProgress({ current, total });
      });
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

  const handleRestore = (backup: BackupMeta) => {
    const date = new Date(backup.timestamp);
    const formatted = `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;

    Alert.alert(
      'שחזור גיבוי',
      `האם לשחזר את הגיבוי מ-${formatted}?\n${backup.projectCount} פרויקטים, ${backup.imageCount} תמונות\n\nשים לב: פעולה זו תחליף את כל הנתונים הנוכחיים!`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'שחזר',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setBusyLabel('משחזר גיבוי...');
            try {
              const restored = await restoreFromLocalBackup(backup.id);
              await saveProjects(restored);
              setBusy(false);
              Alert.alert('הושלם', 'הגיבוי שוחזר בהצלחה', [
                {
                  text: 'אישור',
                  onPress: () => router.replace('/'),
                },
              ]);
            } catch (e: any) {
              setBusy(false);
              Alert.alert('שגיאה', e?.message ?? 'לא ניתן לשחזר את הגיבוי');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (backup: BackupMeta) => {
    Alert.alert('מחיקת גיבוי', 'האם למחוק את הגיבוי הזה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          await deleteLocalBackup(backup.id);
          await refresh();
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: ACCENT }]}
            onPress={handleBackupNow}
            activeOpacity={0.85}
            disabled={busy}>
            <ClockIcon width={22} height={22} fill="#fff" />
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>גיבוי עכשיו</Text>
              <Text style={styles.actionSubtitle}>שמור גיבוי מקומי במכשיר</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionCardSmall,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={handleExportZip}
              activeOpacity={0.85}
              disabled={busy}>
              <DownloadIcon width={18} height={18} fill={ACCENT} />
              <Text
                style={[
                  styles.actionCardSmallText,
                  { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
                ]}>
                ייצוא ZIP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCardSmall,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={handleImport}
              activeOpacity={0.85}
              disabled={busy}>
              <ArrowTriangleIcon width={18} height={18} fill={ACCENT} />
              <Text
                style={[
                  styles.actionCardSmallText,
                  { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
                ]}>
                ייבוא גיבוי
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backups list */}
        <View style={styles.listSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
            ]}>
            גיבויים מקומיים
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: Colors[colorScheme].icon },
            ]}>
            {backups.length === 0
              ? 'אין גיבויים עדיין'
              : `${backups.length} גיבויים שמורים`}
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={ACCENT}
              style={{ marginTop: 24 }}
            />
          ) : (
            <View style={styles.backupsList}>
              {backups.map((backup) => (
                <View
                  key={backup.id}
                  style={[
                    styles.backupCard,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                      borderColor:
                        colorScheme === 'dark'
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                    },
                  ]}>
                  <TouchableOpacity
                    style={styles.backupMain}
                    onPress={() => handleRestore(backup)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.backupIconWrap,
                        {
                          backgroundColor:
                            colorScheme === 'dark'
                              ? 'rgba(255,106,6,0.18)'
                              : 'rgba(255,106,6,0.10)',
                        },
                      ]}>
                      <ClockIcon width={18} height={18} fill={ACCENT} />
                    </View>
                    <View style={styles.backupTextWrap}>
                      <Text
                        style={[
                          styles.backupDate,
                          {
                            color:
                              colorScheme === 'dark' ? '#fff' : '#11181C',
                          },
                        ]}>
                        {formatDate(backup.timestamp)}
                      </Text>
                      <Text
                        style={[
                          styles.backupDetails,
                          { color: Colors[colorScheme].icon },
                        ]}>
                        {backup.projectCount} פרויקטים
                        {' \u2022 '}
                        {backup.imageCount} תמונות
                        {backup.sizeBytes > 0
                          ? ` \u2022 ${formatSize(backup.sizeBytes)}`
                          : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(backup)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <TrashIcon width={16} height={16} fill="#E53935" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info text */}
        <View style={styles.infoSection}>
          <Text
            style={[styles.infoText, { color: Colors[colorScheme].icon }]}>
            גיבויים מקומיים נשמרים במכשיר בלבד. לשמירה חיצונית, השתמש
            ב"ייצוא ZIP" ושמור את הקובץ בגוגל דרייב, אימייל או מקום
            בטוח אחר.
          </Text>
          <Text
            style={[styles.infoText, { color: Colors[colorScheme].icon }]}>
            נשמרים עד 20 גיבויים אוטומטיים. גיבויים ישנים נמחקים
            אוטומטית.
          </Text>
        </View>
      </ScrollView>

      {/* Busy overlay */}
      {busy && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.overlayTitle}>{busyLabel}</Text>
            {progress.total > 0 && (
              <>
                <Text style={styles.overlayProgress}>
                  {progress.current} / {progress.total}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },

  actionsSection: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
  },
  actionTextWrap: {
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCardSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionCardSmallText: {
    fontSize: 14,
    fontWeight: '600',
    writingDirection: 'rtl',
  },

  listSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sectionSubtitle: {
    fontSize: 14,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  backupsList: {
    gap: 10,
    marginTop: 8,
  },
  backupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingRight: 12,
    overflow: 'hidden',
  },
  backupMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  backupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupTextWrap: {
    flex: 1,
    gap: 2,
  },
  backupDate: {
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  backupDetails: {
    fontSize: 12,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,57,53,0.08)',
  },

  infoSection: {
    gap: 8,
    paddingHorizontal: 4,
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
});
