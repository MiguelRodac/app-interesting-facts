import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface ApkDownloadConsentModalProps {
  visible: boolean;
  isDownloading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ApkDownloadConsentModal = React.memo(function ApkDownloadConsentModal({
  visible,
  isDownloading,
  onClose,
  onConfirm,
}: ApkDownloadConsentModalProps) {
  const { t } = useTranslation(['landing', 'common']);
  const theme = useTheme();

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: theme.border }, Shadows.lg]}>
          <Ionicons name="download-outline" size={40} color={theme.primary} />
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {t('landing:downloadModalTitle', { defaultValue: 'Descargar aplicación' })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.modalMessage}>
            {t('landing:downloadModalConsent', { defaultValue: '¿Deseas descargar el archivo APK de instalación en tu dispositivo?' })}
          </ThemedText>
          <View style={styles.modalButtons}>
            <AppPressable
              style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.border }]}
              onPress={onClose}>
              <ThemedText type="smallBold" themeColor="text">
                {t('common:cancel', { defaultValue: 'Cancelar' })}
              </ThemedText>
            </AppPressable>
            <AppPressable
              style={[styles.modalButton, { backgroundColor: theme.primary, opacity: isDownloading ? 0.7 : 1 }]}
              disabled={isDownloading}
              onPress={onConfirm}>
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
              ) : null}
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {isDownloading ? t('landing:downloading') : t('common:download', { defaultValue: 'Descargar' })}
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
      </View>
    </AppModal>
  );
});

const styles = StyleSheet.create({
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
  primaryButtonText: {
    color: '#FFFFFF',
  },
});
