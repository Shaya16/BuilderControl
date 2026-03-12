import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { ACCENT } from '@/constants/controls';

const { width: SCREEN_W } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_W * 0.32;

export function LoadingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(18)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, [fadeAnim, scaleAnim, logoScale, logoOpacity, textSlide, textOpacity, shimmerAnim, footerOpacity]);

  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#0F0800' : '#FFF8F2';
  const titleColor = isDark ? '#FFFFFF' : '#1A0D05';
  const subtitleColor = isDark ? '#D4956A' : '#8A5A3B';
  const creditColor = 'black';
  const dividerColor = isDark ? 'rgba(255,106,6,0.25)' : 'rgba(255,106,6,0.20)';
  const dotColor = isDark ? 'rgba(255,106,6,0.35)' : 'rgba(255,106,6,0.25)';

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Decorative background shapes */}
      <View style={[styles.bgCircle, styles.bgCircle1, { backgroundColor: isDark ? 'rgba(255,106,6,0.06)' : 'rgba(255,106,6,0.06)' }]} />
      <View style={[styles.bgCircle, styles.bgCircle2, { backgroundColor: isDark ? 'rgba(255,150,84,0.04)' : 'rgba(255,150,84,0.08)' }]} />
      <View style={[styles.bgCircle, styles.bgCircle3, { backgroundColor: isDark ? 'rgba(255,106,6,0.03)' : 'rgba(255,106,6,0.04)' }]} />

      <Animated.View
        style={[
          styles.mainContent,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <View style={styles.logoShadow}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Text content */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textSlide }],
            },
          ]}>
          <Text style={[styles.title, { color: titleColor }]}>
            BuildControl
          </Text>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerDot, { backgroundColor: dotColor }]} />
            <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
            <View style={[styles.dividerDot, { backgroundColor: dotColor }]} />
          </View>

          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Structural Planning & Control
          </Text>
        </Animated.View>

        {/* Loader */}
        <Animated.View style={{ opacity: shimmerOpacity, marginTop: 32 }}>
          <ActivityIndicator size="small" color={ACCENT} />
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={[styles.footerDivider, { backgroundColor: dividerColor }]} />
        <Text style={[styles.credit, { color: creditColor }]}>
          BY SHAY AVIVI
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  bgCircle1: {
    width: 420,
    height: 420,
    top: -140,
    right: -120,
  },
  bgCircle2: {
    width: 340,
    height: 340,
    bottom: -80,
    left: -100,
  },
  bgCircle3: {
    width: 200,
    height: 200,
    top: '40%',
    left: -60,
  },

  mainContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  logoContainer: {
    marginBottom: 28,
  },
  logoShadow: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  dividerLine: {
    width: 48,
    height: 1.5,
    borderRadius: 1,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  footer: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    gap: 10,
  },
  footerDivider: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
  },
  credit: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});
