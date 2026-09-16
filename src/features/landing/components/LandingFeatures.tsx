import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface LandingFeaturesProps {
  isNarrow: boolean;
}

export const LandingFeatures = React.memo(function LandingFeatures({ isNarrow }: LandingFeaturesProps) {
  const { t } = useTranslation('landing');
  const theme = useTheme();

  const features = useMemo(
    () => [
      {
        icon: 'bulb-outline' as const,
        title: t('landing:feature1Title'),
        description: t('landing:feature1Desc'),
      },
      {
        icon: 'heart-outline' as const,
        title: t('landing:feature2Title'),
        description: t('landing:feature2Desc'),
      },
      {
        icon: 'search-outline' as const,
        title: t('landing:feature3Title'),
        description: t('landing:feature3Desc'),
      },
    ],
    [t]
  );

  return (
    <View style={[styles.features, isNarrow && styles.featuresNarrow]}>
      {features.map((feature) => (
        <ThemedView
          key={feature.title}
          type="backgroundElement"
          style={[styles.featureCard, isNarrow && styles.featureCardNarrow, Shadows.sm]}>
          <Ionicons name={feature.icon} size={28} color={theme.primary} />
          <ThemedText type="smallBold" style={styles.featureTitle}>
            {feature.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.featureDescription}>
            {feature.description}
          </ThemedText>
        </ThemedView>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  featuresNarrow: {
    flexDirection: 'column',
  },
  featureCard: {
    width: 200,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  featureCardNarrow: {
    width: '100%',
  },
  featureTitle: {
    marginTop: Spacing.one,
  },
  featureDescription: {
    lineHeight: 20,
  },
});
