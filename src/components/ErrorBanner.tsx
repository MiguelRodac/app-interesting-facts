import { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';

const AUTO_DISMISS_MS = 5000;

export function ErrorBanner() {
  const error = useUIStore((s) => s.error);
  const clearError = useUIStore((s) => s.clearError);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Below the status bar/notch on native, with breathing room on web
  const topOffset = Math.max(Spacing.four, insets.top + Spacing.three);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    if (!error) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(clearError, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error, opacity, translateY, clearError]);

  if (!error) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, opacity, transform: [{ translateY }] },
      ]}>
      <ThemedView style={[styles.card, { borderColor: theme.destructive }, Shadows.lg]}>
        <Ionicons name="alert-circle" size={22} color={theme.destructive} />
        <ThemedText type="small" style={styles.message} numberOfLines={3}>
          {error.userMessage}
        </ThemedText>
        <Pressable onPress={clearError} hitSlop={8} style={styles.dismiss}>
          <Ionicons name="close" size={18} color={theme.muted} />
        </Pressable>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 100,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.lg,
    borderWidth: 1,
    maxWidth: 420,
    width: '100%',
  },
  message: {
    flex: 1,
  },
  dismiss: {
    padding: Spacing.one,
    marginLeft: Spacing.one,
  },
});