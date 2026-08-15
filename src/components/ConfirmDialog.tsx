import { Modal, Pressable, StyleSheet, View } from 'react-native';

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
            {message}
          </ThemedText>
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.cancelText}>
                {cancelLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: destructive ? theme.destructive : theme.primary },
              ]}>
              <ThemedText type="smallBold" style={styles.confirmText}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    opacity: 0.7,
  },
  confirmButton: {},
  confirmText: {
    color: '#FFFFFF',
  },
});