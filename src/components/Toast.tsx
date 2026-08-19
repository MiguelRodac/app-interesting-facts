import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlertColors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useUIStore, type ToastType } from '@/data/stores/uiStore';

const AUTO_DISMISS_MS = 3500;

const TYPE_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  warning: 'alert-circle',
};

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);
  const error = useUIStore((s) => s.error);
  const insets = useSafeAreaInsets();
  // Below the status bar/notch on native, with breathing room on web
  const baseTop = Math.max(Spacing.four, insets.top + Spacing.three);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    if (!toast) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(clearToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast?.id, opacity, translateY, clearToast]);

  if (!toast) return null;

  const colors = AlertColors[toast.type];

  // Stack below the error banner when both are visible
  const topOffset = error ? baseTop + 56 : baseTop;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, opacity, transform: [{ translateY }] },
      ]}>
      <ThemedView style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }, Shadows.lg]}>
        <Ionicons name={TYPE_ICONS[toast.type]} size={22} color={colors.icon} />
        <ThemedText type="small" style={[styles.message, { color: colors.text }]} numberOfLines={3}>
          {toast.message}
        </ThemedText>
        <Pressable onPress={clearToast} hitSlop={8} style={styles.dismiss}>
          <Ionicons name="close" size={18} color={colors.text} />
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