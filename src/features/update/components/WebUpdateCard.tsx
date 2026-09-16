import { useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radii, Spacing } from '@/constants/theme';

export function WebUpdateCard() {
  const { t } = useTranslation(['common']);
  const theme = useTheme();

  const handleReloadWeb = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const globalWindow = window as any;
    if ('caches' in globalWindow && globalWindow.caches) {
      globalWindow.caches
        .keys()
        .then((names: string[]) => {
          Promise.all(names.map((name: string) => globalWindow.caches.delete(name))).finally(() => {
            globalWindow.location.reload();
          });
        })
        .catch(() => {
          globalWindow.location.reload();
        });
    } else {
      globalWindow.location.reload();
    }
  }, []);

  return (
    <View style={styles.card}>
      <Ionicons name="sync-outline" size={56} color="#FB8C00" />

      <View style={[styles.versionBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('common:webUpdateBadge', { defaultValue: 'Nueva versión disponible' })}
        </ThemedText>
      </View>

      <ThemedText type="subtitle" style={styles.title}>
        {t('common:webUpdateTitle', { defaultValue: 'Actualizando la plataforma' })}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {t('common:webUpdateMessage', {
          defaultValue: 'Estamos actualizando la versión. La plataforma se actualizará automáticamente con las últimas mejoras.',
        })}
      </ThemedText>

      <View style={[styles.infoBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={20} color={theme.primary} style={styles.infoIcon} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
          {t('common:webUpdateHint', {
            defaultValue: 'Los datos de tu cuenta y sesión están seguros. Presiona el botón para aplicar la actualización.',
          })}
        </ThemedText>
      </View>

      <View style={styles.buttonsContainer}>
        <AppPressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleReloadWeb}
          hitSlop={6}>
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <ThemedText type="smallBold" style={styles.primaryButtonText}>
            {t('common:webUpdateAction', { defaultValue: 'Actualizar ahora' })}
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
});
