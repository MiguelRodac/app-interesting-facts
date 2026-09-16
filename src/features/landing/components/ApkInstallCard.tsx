import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface ApkInstallCardProps {
  isNarrow: boolean;
  isActive: boolean;
  isDownloading: boolean;
  onToggle: () => void;
  onDownload: () => void;
}

export const ApkInstallCard = React.memo(function ApkInstallCard({
  isNarrow,
  isActive,
  isDownloading,
  onToggle,
  onDownload,
}: ApkInstallCardProps) {
  const { t } = useTranslation('landing');
  const theme = useTheme();

  return (
    <View style={[styles.accordionItem, { borderColor: theme.border }]}>
      <AppPressable
        style={[
          styles.accordionHeader,
          isActive && { borderBottomWidth: 1, borderBottomColor: theme.border },
        ]}
        onPress={onToggle}>
        <View style={styles.accordionHeaderLeft}>
          <Ionicons name="logo-android" size={22} color={theme.primary} />
          <View style={styles.accordionTitleWrap}>
            <ThemedText type="smallBold" themeColor="text">
              {t('landing:tabApkTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('landing:tabApkSubtitle')}
            </ThemedText>
          </View>
        </View>
        <Ionicons
          name={isActive ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color={theme.textSecondary}
        />
      </AppPressable>

      {isActive && (
        <View style={styles.accordionBody}>
          <View style={[styles.guideSteps, isNarrow && styles.guideStepsNarrow]}>
            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>1</ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:installStep1Title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:installStep1Desc')}
              </ThemedText>
            </View>

            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>2</ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:installStep2Title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:installStep2Desc')}
              </ThemedText>
            </View>

            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>3</ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:installStep3Title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:installStep3Desc')}
              </ThemedText>
            </View>
          </View>

          <AppPressable
            style={[
              styles.ctaPrimary,
              isNarrow && styles.ctaNarrow,
              {
                backgroundColor: theme.primary,
                alignSelf: 'center',
                marginTop: Spacing.three,
                opacity: isDownloading ? 0.7 : 1,
              },
            ]}
            disabled={isDownloading}
            onPress={onDownload}>
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            )}
            <ThemedText type="default" style={styles.ctaPrimaryText}>
              {isDownloading ? t('landing:downloading') : t('landing:downloadApk')}
            </ThemedText>
          </AppPressable>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  accordionItem: {
    width: '100%',
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  accordionTitleWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  accordionBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  guideSteps: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  guideStepsNarrow: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  guideStepItem: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  guideStepNumber: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  guideStepTitle: {
    fontSize: 14,
  },
  guideStepDesc: {
    lineHeight: 18,
    fontSize: 12,
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
  ctaNarrow: {
    width: '100%',
    minWidth: 0,
  },
  ctaPrimaryText: {
    color: '#FFFFFF',
  },
});
