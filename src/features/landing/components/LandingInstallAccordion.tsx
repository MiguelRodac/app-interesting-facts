import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ApkInstallCard } from './ApkInstallCard';
import { PwaInstallCard } from './PwaInstallCard';

interface LandingInstallAccordionProps {
  isNarrow: boolean;
  activeAccordion: 'apk' | 'pwa' | null;
  onToggleAccordion: (key: 'apk' | 'pwa') => void;
  isDownloading: boolean;
  onConfirmDownload: () => void;
  onInstallPwa: () => void;
  onLayoutGuide: (y: number) => void;
}

export const LandingInstallAccordion = React.memo(function LandingInstallAccordion({
  isNarrow,
  activeAccordion,
  onToggleAccordion,
  isDownloading,
  onConfirmDownload,
  onInstallPwa,
  onLayoutGuide,
}: LandingInstallAccordionProps) {
  const { t } = useTranslation('landing');
  const theme = useTheme();

  return (
    <ThemedView
      nativeID="installation-guide"
      onLayout={(e) => onLayoutGuide(e.nativeEvent.layout.y)}
      type="backgroundElement"
      style={[styles.guideCard, isNarrow && styles.guideCardNarrow, Shadows.sm]}>
      <View style={styles.guideHeader}>
        <Ionicons name="cloud-download-outline" size={26} color={theme.primary} />
        <View style={{ flex: 1, gap: Spacing.half }}>
          <ThemedText type="subtitle" style={styles.guideTitle}>
            {t('landing:installGuideTitle')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('landing:downloadZoneSubtitle')}
          </ThemedText>
        </View>
      </View>

      <ApkInstallCard
        isNarrow={isNarrow}
        isActive={activeAccordion === 'apk'}
        isDownloading={isDownloading}
        onToggle={() => onToggleAccordion('apk')}
        onDownload={onConfirmDownload}
      />

      <PwaInstallCard
        isNarrow={isNarrow}
        isActive={activeAccordion === 'pwa'}
        onToggle={() => onToggleAccordion('pwa')}
        onInstall={onInstallPwa}
      />
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  guideCard: {
    width: '100%',
    maxWidth: 640,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    gap: Spacing.three,
  },
  guideCardNarrow: {
    padding: Spacing.three,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  guideTitle: {
    fontSize: 18,
  },
});
