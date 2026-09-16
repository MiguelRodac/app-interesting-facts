import { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { DevLogsModal } from '@/features/dev-logs';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useThemeContext } from '@/shared/hooks/theme-provider';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLanguage } from '@/shared/hooks/use-language';
import { useUIStore } from '@/shared/stores/uiStore';
import { SettingsThemeSection } from './SettingsThemeSection';
import { SettingsLanguageSection } from './SettingsLanguageSection';
import { SettingsAccountSection } from './SettingsAccountSection';
import { SettingsLogoutModal } from './SettingsLogoutModal';

const REQUIRED_TAPS = 10;
const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? '0.0.3';

export function SettingsScreen() {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();
  const router = useRouter();
  const { preference: themePreference, setPreference: setThemePreference } = useThemeContext();
  const { preference: langPreference, setLanguagePreference } = useLanguage();
  const { user, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const showToast = useUIStore((s) => s.showToast);

  const handleOpenPassword = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    router.push('/change-password');
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/(tabs)');
  };

  const handleVersionTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount === REQUIRED_TAPS) {
      setTapCount(0);
      setLogsModalVisible(true);
    } else if (nextCount >= 5) {
      const remaining = REQUIRED_TAPS - nextCount;
      showToast(t('devLogsTapCountdown', { count: remaining }));
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <AppPressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }}
          style={styles.backButton}
          hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>
        <ThemedText type="subtitle">{t('title')}</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(Spacing.six, bottomInset + Spacing.four) }]}
        keyboardShouldPersistTaps="handled">
        <SettingsThemeSection
          themePreference={themePreference}
          onSelectPreference={setThemePreference}
        />

        <SettingsLanguageSection
          languagePreference={langPreference}
          onSelectPreference={setLanguagePreference}
        />

        <SettingsAccountSection
          isSignedIn={!!user}
          onOpenPassword={handleOpenPassword}
          onRequestLogout={() => setLogoutModalVisible(true)}
          onGoToLogin={() => router.push('/auth/login')}
          onGoToRegister={() => router.push('/auth/register')}
        />

        {/* App Version Footer (tap 10 times to open logs) */}
        <View style={styles.versionFooter}>
          <AppPressable onPress={handleVersionTap} hitSlop={12} style={styles.versionPressable}>
            <Ionicons name="information-circle-outline" size={14} color={theme.muted} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.versionText}>
              Interesting Facts v{appVersion}
            </ThemedText>
          </AppPressable>
        </View>
      </ScrollView>

      <SettingsLogoutModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        onConfirmLogout={handleLogout}
      />

      <DevLogsModal visible={logsModalVisible} onClose={() => setLogsModalVisible(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  versionFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    marginTop: Spacing.two,
  },
  versionPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.two,
  },
  versionText: {
    fontSize: 12,
  },
});