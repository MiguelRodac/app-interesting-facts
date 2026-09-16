import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface PwaGuideModalProps {
  visible: boolean;
  deviceType: 'ios' | 'android' | 'desktop';
  onClose: () => void;
}

export const PwaGuideModal = React.memo(function PwaGuideModal({
  visible,
  deviceType,
  onClose,
}: PwaGuideModalProps) {
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
          <Ionicons
            name={deviceType === 'ios' ? 'logo-apple' : deviceType === 'android' ? 'logo-android' : 'laptop-outline'}
            size={36}
            color={theme.primary}
          />
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {t('landing:tabPwaTitle', { defaultValue: 'Instalar Web App' })}
          </ThemedText>

          <View style={styles.stepsContainer}>
            {deviceType === 'ios' ? (
              <>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaIosStep1', { defaultValue: '1. Toca el botón Compartir' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaIosStep1Desc', { defaultValue: 'En la barra inferior de Safari, presiona el icono de compartir (el cuadrado con la flecha hacia arriba).' })}
                  </ThemedText>
                </View>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaIosStep2', { defaultValue: '2. Agregar a pantalla de inicio' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaIosStep2Desc', { defaultValue: 'Desplázate hacia abajo en el menú y selecciona "Agregar a pantalla de inicio".' })}
                  </ThemedText>
                </View>
              </>
            ) : deviceType === 'android' ? (
              <>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaAndroidStep1', { defaultValue: '1. Abre el menú del navegador' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaAndroidStep1Desc', { defaultValue: 'Toca los tres puntos (⋮) en la esquina superior de Chrome o tu navegador.' })}
                  </ThemedText>
                </View>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaAndroidStep2', { defaultValue: '2. Instalar aplicación' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaAndroidStep2Desc', { defaultValue: 'Selecciona "Instalar aplicación" o "Agregar a la pantalla principal".' })}
                  </ThemedText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaDesktopStep1', { defaultValue: '1. Icono de instalación' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaDesktopStep1Desc', { defaultValue: 'En Chrome, Edge o Brave, haz clic en el icono de instalación (computadora o +) a la derecha de la barra de direcciones.' })}
                  </ThemedText>
                </View>
                <View style={styles.stepItem}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:pwaDesktopStep2', { defaultValue: '2. Confirmar instalación' })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.stepDesc}>
                    {t('landing:pwaDesktopStep2Desc', { defaultValue: 'Haz clic en "Instalar" en la ventana emergente para tener la app en tu escritorio.' })}
                  </ThemedText>
                </View>
              </>
            )}
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
  stepsContainer: {
    width: '100%',
    gap: Spacing.two,
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
    minHeight: 46,
    marginTop: Spacing.one,
  },
});
