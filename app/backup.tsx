import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
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
import {
  DRIVE_SCOPE,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '@/constants/google';
import { Colors, Fonts } from '@/constants/theme';
import { useBackupProgress } from '@/contexts/BackupProgressContext';
import { exportBackupZip, importBackupFile } from '@/utils/backupManager';
import {
  clearTokens,
  exchangeCodeForTokens,
  getUserEmail,
  isSignedIn as checkSignedIn,
} from '@/utils/googleAuth';
import { clearFolderCache } from '@/utils/googleDriveApi';
import { getLastBackupDate, runAutoBackup } from '@/utils/autoBackup';
import { loadProjects, saveProjects } from '@/utils/projectStorage';

import ArrowTriangleIcon from '@/assets/icons/arrow_triangle.svg';
import CheckmarkIcon from '@/assets/icons/checkmark.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import LeftIcon from '@/assets/icons/left.svg';

export default function BackupScreen() {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const backupProgress = useBackupProgress();

  // Google OAuth setup
  const redirectUri = AuthSession.makeRedirectUri();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: [DRIVE_SCOPE, 'openid', 'email'],
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    responseType: 'code',
    redirectUri,
  });

  // Load sign-in state
  const refreshState = useCallback(async () => {
    const [signed, email, backup] = await Promise.all([
      checkSignedIn(),
      getUserEmail(),
      getLastBackupDate(),
    ]);
    setSignedIn(signed);
    setUserEmail(email);
    setLastBackup(backup);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Handle OAuth response
  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      (async () => {
        try {
          setBusy(true);
          setBusyLabel('מתחבר...');
          await exchangeCodeForTokens(response.params.code, redirectUri);
          await refreshState();
          Alert.alert('התחברת בהצלחה', 'הגיבויים יעלו אוטומטית לגוגל דרייב');
        } catch (e: any) {
          Alert.alert('שגיאה', e?.message ?? 'לא ניתן להתחבר');
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [response]);

  const handleSignIn = () => {
    promptAsync();
  };

  const handleSignOut = () => {
    Alert.alert('ניתוק גוגל דרייב', 'הגיבויים האוטומטיים יפסקו. להמשיך?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'נתק',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          clearFolderCache();
          setSignedIn(false);
          setUserEmail(null);
        },
      },
    ]);
  };

  const handleDriveBackupNow = () => {
    runAutoBackup(backupProgress).then(() => refreshState());
  };

  const handleExportZip = async () => {
    setBusy(true);
    setBusyLabel('מייצא גיבוי...');
    setProgress({ current: 0, total: 0 });
    try {
      const projects = await loadProjects();
      if (projects.length === 0) {
        setBusy(false);
        Alert.alert('אין פרויקטים', 'אין פרויקטים לייצוא');
        return;
      }
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

  const formatDate = (date: Date) =>
    `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;

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
        {/* Google Drive section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
            ]}>
            גיבוי אוטומטי - גוגל דרייב
          </Text>

          {signedIn ? (
            // Connected state
            <View
              style={[
                styles.driveCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#11181C' : '#FFFFFF',
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)',
                },
              ]}>
              <View style={styles.driveConnected}>
                <View
                  style={[
                    styles.driveStatusDot,
                    { backgroundColor: '#2E7D32' },
                  ]}
                />
                <View style={styles.driveTextWrap}>
                  <Text
                    style={[
                      styles.driveEmail,
                      {
                        color:
                          colorScheme === 'dark' ? '#fff' : '#11181C',
                      },
                    ]}
                    numberOfLines={1}>
                    {userEmail ?? 'מחובר'}
                  </Text>
                  <Text
                    style={[
                      styles.driveLastBackup,
                      { color: Colors[colorScheme].icon },
                    ]}>
                    {lastBackup
                      ? `גיבוי אחרון: ${formatDate(lastBackup)}`
                      : 'טרם בוצע גיבוי'}
                  </Text>
                </View>
              </View>

              <View style={styles.driveActions}>
                <TouchableOpacity
                  style={[styles.driveButton, { backgroundColor: ACCENT }]}
                  onPress={handleDriveBackupNow}
                  activeOpacity={0.85}>
                  <Text style={styles.driveButtonText}>גבה עכשיו</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSignOut}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.disconnectText,
                      { color: Colors[colorScheme].icon },
                    ]}>
                    נתק
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Not connected
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#4285F4' }]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={busy || !request}>
              <CheckmarkIcon width={22} height={22} fill="#fff" />
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>חבר את גוגל דרייב</Text>
                <Text style={styles.actionSubtitle}>
                  גיבוי אוטומטי כל 30 יום
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Manual backup section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colorScheme === 'dark' ? '#fff' : '#11181C' },
            ]}>
            גיבוי ידני
          </Text>

          {/* Export */}
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

          {/* Import */}
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
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text
            style={[styles.infoText, { color: Colors[colorScheme].icon }]}>
            כשגוגל דרייב מחובר, האפליקציה תגבה אוטומטית כל 30 יום בפתיחת
            האפליקציה. נשמרים עד 5 גיבויים אחרונים.
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

  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  // Google Drive connected card
  driveCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  driveConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driveStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  driveTextWrap: {
    flex: 1,
    gap: 2,
  },
  driveEmail: {
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  driveLastBackup: {
    fontSize: 13,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  driveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  driveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  disconnectText: {
    fontSize: 14,
    writingDirection: 'rtl',
    textDecorationLine: 'underline',
  },

  // Action cards
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
