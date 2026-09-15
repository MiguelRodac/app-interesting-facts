import { useEffect, useState } from 'react';
import { StyleSheet, Animated, Platform } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlertColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useUIStore } from '@/data/stores/uiStore';

const AUTO_DISMISS_MS = 5000;

export function ErrorBanner() {
  const { t, i18n } = useTranslation(['errors', 'common']);
  const error = useUIStore((s) => s.error);
  const clearError = useUIStore((s) => s.clearError);
  const insets = useSafeAreaInsets();
  // Below the status bar/notch on native, with breathing room on web
  const topOffset = Math.max(Spacing.four, insets.top + Spacing.three);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-24));

  useEffect(() => {
    if (!error) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    const timer = setTimeout(clearError, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error, opacity, translateY, clearError]);

  if (!error) return null;

  const colors = AlertColors.error;
  const displayMessage =
    error.userMessage ||
    (error.code && i18n.exists(`errors:${error.code}`)
      ? t(`errors:${error.code}`)
      : error.message);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, opacity, transform: [{ translateY }] },
      ]}>
      <ThemedView style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }, Shadows.lg]}>
        <Ionicons name="alert-circle" size={22} color={colors.icon} />
        <ThemedText type="small" style={[styles.message, { color: colors.text }]} numberOfLines={4}>
          {displayMessage}
        </ThemedText>
        <AppPressable onPress={clearError} hitSlop={8} style={styles.dismiss}>
          <Ionicons name="close" size={18} color={colors.text} />
        </AppPressable>
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