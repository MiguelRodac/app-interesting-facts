import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemeContext } from '@/shared/hooks/theme-provider';

interface LandingHeroProps {
  isNarrow: boolean;
  onScrollToGuide: () => void;
  onTryApp: () => void;
}

export const LandingHero = React.memo(function LandingHero({
  isNarrow,
  onScrollToGuide,
  onTryApp,
}: LandingHeroProps) {
  const { t } = useTranslation('landing');
  const theme = useTheme();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.hero}>
      <Image
        source={isDark ? require('@/assets/images/logo-light.png') : require('@/assets/images/logo-dark.png')}
        style={[styles.logoImage, isNarrow && styles.logoImageNarrow]}
        accessibilityLabel={t('landing:logoLabel')}
      />
      <ThemedText type="title" style={[styles.title, isNarrow && styles.titleNarrow]}>
        {t('landing:title')}
      </ThemedText>
      <ThemedText
        type="default"
        themeColor="textSecondary"
        style={[styles.tagline, isNarrow && styles.taglineNarrow]}>
        {t('landing:tagline')}
      </ThemedText>

      {/* CTAs */}
      <View style={[styles.ctas, isNarrow && styles.ctasNarrow]}>
        <AppPressable
          style={[styles.ctaPrimary, isNarrow && styles.ctaNarrow, { backgroundColor: theme.primary }]}
          onPress={onScrollToGuide}>
          <Ionicons name="download-outline" size={20} color="#FFFFFF" />
          <ThemedText type="default" style={styles.ctaPrimaryText}>
            {t('landing:downloadApp')}
          </ThemedText>
        </AppPressable>
        <AppPressable
          style={[styles.ctaGhost, isNarrow && styles.ctaNarrow, { borderColor: theme.border }]}
          onPress={onTryApp}>
          <Ionicons name="browsers-outline" size={20} color={theme.text} />
          <ThemedText type="default" style={{ color: theme.text }}>
            {t('landing:tryInBrowser')}
          </ThemedText>
        </AppPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: Radii.lg,
  },
  logoImageNarrow: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
  },
  titleNarrow: {
    fontSize: 28,
    lineHeight: 36,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 480,
    fontSize: 17,
    lineHeight: 26,
  },
  taglineNarrow: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  ctasNarrow: {
    flexDirection: 'column',
    width: '100%',
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    minWidth: 220,
  },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    borderWidth: 1,
    minWidth: 220,
  },
  ctaNarrow: {
    width: '100%',
    minWidth: 0,
  },
  ctaPrimaryText: {
    color: '#FFFFFF',
  },
});
