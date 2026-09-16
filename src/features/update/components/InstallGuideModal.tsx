import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { useTheme } from '@/shared/hooks/use-theme';
import { Radii, Spacing, Shadows } from '@/constants/theme';

interface InstallGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ visible, onClose }: InstallGuideModalProps) {
  const { t } = useTranslation(['common']);
  const theme = useTheme();

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: theme.border }, Shadows.lg]}>
          <Ionicons name="phone-portrait-outline" size={36} color={theme.primary} />
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {t('common:howToInstallTitle', { defaultValue: '¿Cómo instalar la actualización?' })}
          </ThemedText>

          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <ThemedText type="smallBold" themeColor="text">
                {t('common:installStep1Title', { defaultValue: '1. Ir a la página web' })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                {t('common:installStep1Desc', { defaultValue: 'Presiona el botón "Actualizar en la página web" para abrir el sitio oficial en tu navegador.' })}
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <ThemedText type="smallBold" themeColor="text">
                {t('common:installStep2Title', { defaultValue: '2. Descargar el APK' })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                {t('common:installStep2Desc', { defaultValue: 'En la página, toca en "Descargar APK" y espera que finalice la descarga. Si Android te lo solicita, activa "Permitir desde esta fuente".' })}
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <ThemedText type="smallBold" themeColor="text">
                {t('common:installStep3Title', { defaultValue: '3. Instalar la actualización' })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                {t('common:installStep3Desc', { defaultValue: 'Abre la notificación de descarga o busca el archivo en tu carpeta de Descargas y presiona "Instalar". Tu sesión y tus datos se conservan intactos.' })}
              </ThemedText>
            </View>
          </View>

          <AppPressable
            style={[styles.guideCloseButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common:understand', { defaultValue: 'Entendido' })}>
            <ThemedText type="smallBold" style={{ color: '#FFFFFF', textAlign: 'center' }}>
              {t('common:understand', { defaultValue: 'Entendido' })}
            </ThemedText>
          </AppPressable>
        </ThemedView>
      </View>
    </AppModal>
  );
}

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
  guideCloseButton: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: Spacing.one,
  },
});
