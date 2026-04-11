import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { BackupProgressBar } from '@/components/backup-progress-bar';
import { LoadingScreen } from '@/components/loading-screen';
import { BackupProgressProvider } from '@/contexts/BackupProgressContext';
import { useAutoBackup } from '@/hooks/useAutoBackup';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Set to true to keep loading screen visible in emulator for design review
const DEBUG_LOADING_SCREEN = __DEV__ && false;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (DEBUG_LOADING_SCREEN) return;

    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LoadingScreen />
        <StatusBar style="dark" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <BackupProgressProvider>
        <AppContent />
      </BackupProgressProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

/** Inner component so useAutoBackup can access BackupProgressProvider */
function AppContent() {
  useAutoBackup();

  return (
    <View style={styles.rtlWrapper}>
      <BackupProgressBar />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="backup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reset-to-root" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  rtlWrapper: {
    flex: 1,
    direction: 'rtl',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
