import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useUIStore } from '@/shared/stores/uiStore';
import { useTheme } from '@/shared/hooks/use-theme';

export function ServerWarmingUpBanner() {
  const { t } = useTranslation(['common']);
  const isServerWakingUp = useUIStore((s) => s.isServerWakingUp);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const topOffset = Math.max(Spacing.four, insets.top + Spacing.three);

  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-16));

  useEffect(() => {
    if (isServerWakingUp) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: -16,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isServerWakingUp, opacity, translateY]);

  if (!isServerWakingUp) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, opacity, transform: [{ translateY }] },
      ]}>
      <ThemedView
        style={[
          styles.pill,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
          Shadows.md,
        ]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText type="small" themeColor="text" style={styles.text} numberOfLines={2}>
          {t('common:serverWakingUp', {
            defaultValue: 'Despertando el servidor... esto puede tardar unos segundos.',
          })}
        </ThemedText>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderRadius: Radii.full,
    borderWidth: 1,
    maxWidth: 420,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
