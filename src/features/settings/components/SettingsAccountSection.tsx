import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface SettingsAccountSectionProps {
  isSignedIn: boolean;
  onOpenPassword: () => void;
  onRequestLogout: () => void;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
}

export function SettingsAccountSection({
  isSignedIn,
  onOpenPassword,
  onRequestLogout,
  onGoToLogin,
  onGoToRegister,
}: SettingsAccountSectionProps) {
  const { t } = useTranslation(['settings', 'auth']);
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {t('settings:sectionAccount')}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {isSignedIn ? (
          <>
            <AppPressable
              onPress={onOpenPassword}
              style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <Ionicons name="key-outline" size={20} color={theme.textSecondary} />
              <ThemedText type="default">{t('settings:changePassword')}</ThemedText>
              <View style={styles.flexSpacer} />
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </AppPressable>
            <AppPressable onPress={onRequestLogout} style={styles.row}>
              <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
              <ThemedText type="default" style={{ color: theme.destructive }}>
                {t('settings:logout')}
              </ThemedText>
              <View style={styles.flexSpacer} />
            </AppPressable>
          </>
        ) : (
          <>
            <AppPressable
              onPress={onGoToLogin}
              style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <Ionicons name="log-in-outline" size={20} color={theme.primary} />
              <ThemedText type="default" style={{ color: theme.text }}>
                {t('auth:signInTitle')}
              </ThemedText>
              <View style={styles.flexSpacer} />
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </AppPressable>
            <AppPressable onPress={onGoToRegister} style={styles.row}>
              <Ionicons name="person-add-outline" size={20} color={theme.primary} />
              <ThemedText type="default" style={{ color: theme.text }}>
                {t('auth:createAccountTitle')}
              </ThemedText>
              <View style={styles.flexSpacer} />
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </AppPressable>
          </>
        )}
      </ThemedView>
      {!isSignedIn && (
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings:anonymousNotice')}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  flexSpacer: {
    flex: 1,
  },
});
