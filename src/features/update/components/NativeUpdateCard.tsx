import { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { useTheme } from '@/shared/hooks/use-theme';
import { Radii, Spacing } from '@/constants/theme';

interface NativeUpdateCardProps {
  appVersion: string;
  webUrl: string;
  onOpenGuide: () => void;
}

export function NativeUpdateCard({ appVersion, webUrl, onOpenGuide }: NativeUpdateCardProps) {
  const { t } = useTranslation(['common']);
  const theme = useTheme();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoToWeb = useCallback(async () => {
    if (!webUrl) return;
    setIsRedirecting(true);
    try {
      if (Platform.OS === 'web') {
        window.open(webUrl, '_blank');
      } else {
        // Direct Linking.openURL opens the external system browser (Chrome/etc.),
        // leaving the app process so the user can complete the web download flow
        // without being bounced back by an in-app WebBrowser tab.
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert(
        t('common:error', { defaultValue: 'Error' }),
        t('common:openWebError', { defaultValue: 'No se pudo abrir el navegador. Por favor ingresa manualmente a: ' }) + webUrl,
      );
    } finally {
      setTimeout(() => {
        setIsRedirecting(false);
      }, 1500);
    }
  }, [t, webUrl]);

  return (
    <View style={styles.card}>
      <Ionicons name="cloud-download-outline" size={56} color="#FB8C00" />

      <View style={[styles.versionBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('common:currentVersion', { version: appVersion, defaultValue: `Versión actual: v${appVersion}` })}
        </ThemedText>
      </View>

      <ThemedText type="subtitle" style={styles.title}>
        {t('common:updateTitle', { defaultValue: 'Versión desactualizada' })}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {t('common:updateMessage', { defaultValue: 'Estás usando una versión que ya no es compatible. Visita nuestra página oficial para actualizar a la última versión.' })}
      </ThemedText>

      <View style={[styles.infoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={20} color={theme.primary} style={styles.infoIcon} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
          {t('common:updateWebHint', { defaultValue: 'Serás redirigido a nuestra página web oficial donde podrás descargar e instalar la versión más reciente sin perder tu sesión ni tus datos.' })}
        </ThemedText>
      </View>

      <View style={styles.buttonsContainer}>
        <AppPressable
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: isRedirecting ? 0.7 : 1 }]}
          onPress={handleGoToWeb}
          disabled={isRedirecting}
          hitSlop={6}>
          {isRedirecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          )}
          <ThemedText type="smallBold" style={styles.primaryButtonText}>
            {isRedirecting
              ? t('common:openingBrowser', { defaultValue: 'Abriendo navegador...' })
              : t('common:updateGoToWeb', { defaultValue: 'Actualizar en la página web' })}
          </ThemedText>
        </AppPressable>

        <AppPressable
          style={styles.guideLink}
          onPress={onOpenGuide}
          hitSlop={8}>
          <Ionicons name="help-circle-outline" size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, textDecorationLine: 'underline' }}>
            {t('common:howToInstallButton', { defaultValue: '¿Cómo instalar el APK?' })}
          </ThemedText>
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
});
