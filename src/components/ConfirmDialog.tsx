import { StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  const finalConfirmLabel = confirmLabel ?? t('confirm');
  const finalCancelLabel = cancelLabel ?? t('cancel');

  return (
    <AppModal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {message}
          </ThemedText>
          <View style={styles.buttons}>
            <AppPressable
              onPress={onCancel}
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.cancelText}>
                {finalCancelLabel}
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={onConfirm}
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? theme.destructive : theme.primary },
              ]}>
              <ThemedText type="smallBold" style={styles.confirmText}>
                {finalConfirmLabel}
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.xl,
    padding: Spacing.four,
    gap: Spacing.two + 2,
    borderWidth: 1,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.one,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    opacity: 0.8,
  },
  confirmButton: {},
  confirmText: {
    color: '#FFFFFF',
  },
});