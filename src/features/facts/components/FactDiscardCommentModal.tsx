import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface FactDiscardCommentModalProps {
  visible: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export const FactDiscardCommentModal = React.memo(function FactDiscardCommentModal({
  visible,
  onKeepEditing,
  onDiscard,
}: FactDiscardCommentModalProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepEditing}>
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={styles.modalContent}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {t('common:discardCommentTitle')}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
            {t('common:discardCommentMessage')}
          </ThemedText>
          <View style={styles.modalButtons}>
            <AppPressable
              onPress={onKeepEditing}
              style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.cancelModalText}>
                {t('common:keepEditing')}
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={onDiscard}
              style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
              <ThemedText type="smallBold" style={styles.confirmModalText}>
                {t('common:discard')}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
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
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalText: {
    opacity: 0.7,
  },
  confirmModalButton: {},
  confirmModalText: {
    color: '#FFFFFF',
  },
});
