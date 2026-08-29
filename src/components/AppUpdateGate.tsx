import { useState, useCallback, useEffect } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setAppUpdateHandler } from '@/data/api/client';
import { useUpdateStore } from '@/data/stores/updateStore';
import { useTheme } from '@/hooks/use-theme';
import { Radii, Spacing, Shadows } from '@/constants/theme';

const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '0.0.8';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://app-interesting-facts.vercel.app/landing';
const APK_URL = process.env.EXPO_PUBLIC_APK_URL ?? 'https://app-interesting-facts.vercel.app/app-interesting-facts.apk';

/**
 * Full-screen blocker rendered by the root layout. Stays hidden until the
 * API client flags an outdated/missing app version, then covers every
 * screen with a clear notice, current version indicator, reassurance message,
 * and direct actions (web landing and consent-guarded APK download).
 */
export function AppUpdateGate() {
  const { t } = useTranslation(['common']);
  const theme = useTheme();
  const updateRequired = useUpdateStore((s) => s.updateRequired);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [guideModalVisible, setGuideModalVisible] = useState(false);

  useEffect(() => {
    setAppUpdateHandler(() => useUpdateStore.getState().flagUpdateRequired());
  }, []);

  const handleGoToWeb = useCallback(() => {
    if (!WEB_URL) return;
    Linking.openURL(WEB_URL).catch(() => {});
  }, []);

  const handleConfirmDownload = useCallback(async () => {
    setConfirmModalVisible(false);
    if (!APK_URL) return;
    try {
      if (Platform.OS === 'web') {
        window.open(APK_URL, '_blank');
      } else {
        await Linking.openURL(APK_URL);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!updateRequired) return null;

  return (
    <ThemedView style={styles.backdrop}>
      <View style={styles.card}>
        <Ionicons name="cloud-download-outline" size={56} color="#FB8C00" />

        <View style={[styles.versionBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('common:currentVersion', { version: APP_VERSION })}
          </ThemedText>
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          {t('common:updateTitle')}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {t('common:updateMessage')}
        </ThemedText>

        <View style={[styles.infoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} style={styles.infoIcon} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
            {t('common:updateReinstallHint')}
          </ThemedText>
        </View>

        <View style={styles.buttonsContainer}>
          {WEB_URL ? (
            <AppPressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleGoToWeb}
              hitSlop={6}>
              <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {t('common:updateGoToWeb')}
              </ThemedText>
            </AppPressable>
          ) : null}

          {APK_URL ? (
            <AppPressable
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={() => setConfirmModalVisible(true)}
              hitSlop={6}>
              <Ionicons name="download-outline" size={16} color={theme.text} />
              <ThemedText type="small" themeColor="text">
                {t('common:updateDownloadDirect')}
              </ThemedText>
            </AppPressable>
          ) : null}

          <AppPressable
            style={styles.guideLink}
            onPress={() => setGuideModalVisible(true)}
            hitSlop={8}>
            <Ionicons name="help-circle-outline" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, textDecorationLine: 'underline' }}>
              {t('common:howToInstallButton')}
            </ThemedText>
          </AppPressable>
        </View>
      </View>

      {/* Explicit User Consent Modal */}
      <AppModal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: theme.border }, Shadows.lg]}>
            <Ionicons name="download-outline" size={40} color={theme.primary} />
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('common:downloadApkTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.modalMessage}>
              {t('common:downloadApkConsent')}
            </ThemedText>
            <View style={styles.modalButtons}>
              <AppPressable
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setConfirmModalVisible(false)}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleConfirmDownload}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('common:download')}
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      </AppModal>

      {/* How to Install Guide Modal */}
      <AppModal
        visible={guideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: theme.border }, Shadows.lg]}>
            <Ionicons name="phone-portrait-outline" size={36} color={theme.primary} />
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('common:howToInstallTitle')}
            </ThemedText>

            <View style={styles.stepsContainer}>
              <View style={styles.stepItem}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common:installStep1Title')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                  {t('common:installStep1Desc')}
                </ThemedText>
              </View>

              <View style={styles.stepItem}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common:installStep2Title')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                  {t('common:installStep2Desc')}
                </ThemedText>
              </View>

              <View style={styles.stepItem}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common:installStep3Title')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                  {t('common:installStep3Desc')}
                </ThemedText>
              </View>
            </View>

            <AppPressable
              style={[styles.modalButton, { backgroundColor: theme.primary, width: '100%', marginTop: Spacing.one }]}
              onPress={() => setGuideModalVisible(false)}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {t('common:understand')}
              </ThemedText>
            </AppPressable>
          </ThemedView>
        </View>
      </AppModal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 360,
    width: '100%',
  },
  versionBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    width: '100%',
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginTop: Spacing.two,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  stepsContainer: {
    width: '100%',
    gap: Spacing.three,
    marginVertical: Spacing.one,
  },
  stepItem: {
    gap: Spacing.half,
  },
  stepDesc: {
    lineHeight: 18,
    fontSize: 13,
  },
});
