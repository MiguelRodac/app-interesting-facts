import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface PwaInstallCardProps {
  isNarrow: boolean;
  isActive: boolean;
  onToggle: () => void;
  onInstall: () => void;
}

export const PwaInstallCard = React.memo(function PwaInstallCard({
  isNarrow,
  isActive,
  onToggle,
  onInstall,
}: PwaInstallCardProps) {
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
          <Ionicons name="globe-outline" size={22} color={theme.primary} />
          <View style={styles.accordionTitleWrap}>
            <ThemedText type="smallBold" themeColor="text">
              {t('landing:tabPwaTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('landing:tabPwaSubtitle')}
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
          <ThemedText type="small" themeColor="textSecondary" style={styles.pwaIntroText}>
            {t('landing:pwaIntro')}
          </ThemedText>

          <View style={[styles.guideSteps, isNarrow && styles.guideStepsNarrow]}>
            {/* iOS */}
            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Ionicons name="logo-apple" size={24} color={theme.text} style={{ marginBottom: Spacing.half }} />
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:pwaIosTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:pwaIosDesc')}
              </ThemedText>
            </View>

            {/* Android Browser */}
            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Ionicons name="logo-android" size={24} color="#3DDC84" style={{ marginBottom: Spacing.half }} />
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:pwaAndroidTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:pwaAndroidDesc')}
              </ThemedText>
            </View>

            {/* Desktop */}
            <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Ionicons name="laptop-outline" size={24} color={theme.primary} style={{ marginBottom: Spacing.half }} />
              <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                {t('landing:pwaDesktopTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                {t('landing:pwaDesktopDesc')}
              </ThemedText>
            </View>
          </View>

          {Platform.OS === 'web' && (
            <AppPressable
              style={[
                styles.ctaPrimary,
                isNarrow && styles.ctaNarrow,
                { backgroundColor: theme.primary, alignSelf: 'center', marginTop: Spacing.three },
              ]}
              onPress={onInstall}>
              <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
              <ThemedText type="default" style={styles.ctaPrimaryText}>
                {t('landing:installDirectlyButton', { defaultValue: 'Instalar en este dispositivo' })}
              </ThemedText>
            </AppPressable>
          )}
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
  pwaIntroText: {
    lineHeight: 20,
    marginBottom: Spacing.two,
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
