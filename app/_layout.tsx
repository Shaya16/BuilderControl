import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components/loading-screen';
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
      <View style={styles.rtlWrapper}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="reset-to-root" options={{ headerShown: false }} />
        </Stack>
      </View>
      <StatusBar style="dark" />
    </ThemeProvider>
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
