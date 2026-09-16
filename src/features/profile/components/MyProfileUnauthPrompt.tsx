import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface MyProfileUnauthPromptProps {
  topInset: number;
  onSettings: () => void;
  onSignIn: () => void;
}

export function MyProfileUnauthPrompt({
  topInset,
  onSettings,
  onSignIn,
}: MyProfileUnauthPromptProps) {
  const { t } = useTranslation(['profile', 'auth']);
  const theme = useTheme();

  return (
    <ThemedView style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.unauthTopBar}>
        <LanguageToggle />
        <AppPressable onPress={onSettings} hitSlop={8} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </AppPressable>
      </View>
      <ThemedView style={styles.loginPrompt}>
        <Ionicons name="person-circle-outline" size={80} color={theme.primary} />
        <ThemedText type="subtitle" style={styles.loginTitle}>
          {t('profile:anonymousTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.loginSubtitle}>
          {t('profile:anonymousSubtitle')}
        </ThemedText>
        <AppPressable
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={onSignIn}>
          <ThemedText type="small" style={styles.loginButtonText}>
            {t('auth:signInTitle')}
          </ThemedText>
        </AppPressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unauthTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  settingsButton: {
    padding: Spacing.one,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.six,
    gap: Spacing.three,
  },
  loginTitle: {
    textAlign: 'center',
  },
  loginSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  loginButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
