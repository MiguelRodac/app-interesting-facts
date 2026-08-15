import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useUIStore, type ToastType } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';

const AUTO_DISMISS_MS = 3500;

const TYPE_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  warning: 'alert-circle',
};

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);
  const theme = useTheme();
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

  const accentColor =
    toast.type === 'success' ? theme.success : toast.type === 'warning' ? theme.warning : theme.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}>
      <ThemedView style={[styles.card, { borderColor: accentColor }, Shadows.lg]}>
        <Ionicons name={TYPE_ICONS[toast.type]} size={22} color={accentColor} />
        <ThemedText type="small" style={styles.message} numberOfLines={3}>
          {toast.message}
        </ThemedText>
        <Pressable onPress={clearToast} hitSlop={8} style={styles.dismiss}>
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