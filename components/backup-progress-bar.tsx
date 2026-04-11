import { useEffect } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENT } from '@/constants/controls';
import { useBackupProgress } from '@/contexts/BackupProgressContext';

const BAR_HEIGHT = 4;
const ERROR_COLOR = '#E53935';
const SUCCESS_COLOR = '#2E7D32';

export function BackupProgressBar() {
  const { status, label, progress } = useBackupProgress();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';

  const widthAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);

  useEffect(() => {
    if (status === 'idle') {
      opacityAnim.value = withTiming(0, { duration: 300 });
    } else {
      opacityAnim.value = withTiming(1, { duration: 200 });
    }

    if (status === 'active') {
      widthAnim.value = withTiming(progress * 100, { duration: 300 });
    } else if (status === 'success') {
      widthAnim.value = withTiming(100, { duration: 200 });
    } else if (status === 'error') {
      widthAnim.value = withTiming(100, { duration: 200 });
    }
  }, [status, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  if (status === 'idle') return null;

  const barColor =
    status === 'error'
      ? ERROR_COLOR
      : status === 'success'
        ? SUCCESS_COLOR
        : ACCENT;

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { top: insets.top },
      ]}
      pointerEvents="none">
      {/* Progress bar track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)',
          },
        ]}>
        <Animated.View
          style={[styles.fill, barFillStyle, { backgroundColor: barColor }]}
        />
      </View>

      {/* Label */}
      {label ? (
        <View
          style={[
            styles.labelWrap,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(17,24,28,0.92)'
                  : 'rgba(255,255,255,0.92)',
            },
          ]}>
          <Text
            style={[
              styles.label,
              {
                color:
                  status === 'error'
                    ? ERROR_COLOR
                    : colorScheme === 'dark'
                      ? '#fff'
                      : '#11181C',
              },
            ]}
            numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  track: {
    height: BAR_HEIGHT,
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
  labelWrap: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
