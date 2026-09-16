import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface SettingsLogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export function SettingsLogoutModal({
  visible,
  onClose,
  onConfirmLogout,
}: SettingsLogoutModalProps) {
  const { t } = useTranslation(['settings', 'common']);
  const theme = useTheme();

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={styles.modalCard}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {t('settings:logoutTitle')}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
            {t('settings:logoutMessage')}
          </ThemedText>
          <View style={styles.modalActions}>
            <AppPressable
              onPress={onClose}
              style={[styles.modalButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('common:cancel')}
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={onConfirmLogout}
              style={[styles.modalButton, { backgroundColor: theme.destructive }]}>
              <ThemedText type="smallBold" style={styles.modalButtonText}>
                {t('settings:logout')}
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
  },
});
