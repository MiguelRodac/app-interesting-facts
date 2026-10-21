import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, ServerWarmingColors, Shadows, Spacing } from '@/constants/theme';
import { useUIStore } from '@/shared/stores/uiStore';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';

export function ServerWarmingUpBanner() {
  const { t } = useTranslation(['common']);
  const isServerWakingUp = useUIStore((s) => s.isServerWakingUp);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = ServerWarmingColors[scheme];
  const topOffset = Math.max(Spacing.four, insets.top + Spacing.three);

  const [visible, setVisible] = useState(isServerWakingUp);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-16));

  useEffect(() => {
    if (isServerWakingUp) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: -16,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    }
  }, [isServerWakingUp, opacity, translateY, visible]);

  if (!visible) return null;

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
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
          Shadows.md,
        ]}>
        <ActivityIndicator size="small" color={colors.spinner} />
        <ThemedText type="small" style={[styles.text, { color: colors.text }]} numberOfLines={2}>
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
    fontWeight: '600',
    flexShrink: 1,
  },
});
