import { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DevLogsModal } from '@/components/DevLogsModal';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useThemeContext, type ThemePreference } from '@/hooks/theme-provider';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { useAuth } from '@/data/hooks/useAuth';
import { useLanguage } from '@/hooks/use-language';
import { useUIStore } from '@/data/stores/uiStore';
import type { LanguagePreference } from '@/i18n';

const REQUIRED_TAPS = 10;
const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? '0.0.3';

export default function SettingsScreen() {
  const { t } = useTranslation(['settings', 'auth', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();
  const router = useRouter();
  const { preference: themePreference, setPreference: setThemePreference } = useThemeContext();
  const { preference: langPreference, setLanguagePreference } = useLanguage();
  const { user, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const showToast = useUIStore((s) => s.showToast);

  const themeOptions: {
    value: ThemePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconFocused: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: 'system', label: t('settings:themeSystem'), icon: 'phone-portrait-outline', iconFocused: 'phone-portrait' },
    { value: 'light', label: t('settings:themeLight'), icon: 'sunny-outline', iconFocused: 'sunny' },
    { value: 'dark', label: t('settings:themeDark'), icon: 'moon-outline', iconFocused: 'moon' },
  ];

  const languageOptions: {
    value: LanguagePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: 'system', label: t('settings:langSystem'), icon: 'globe-outline' },
    { value: 'en', label: t('settings:langEn'), icon: 'language-outline' },
    { value: 'es', label: t('settings:langEs'), icon: 'language-outline' },
  ];

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
    router.replace('/auth/login');
  };

  const handleVersionTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);
    if (nextCount >= REQUIRED_TAPS) {
      setTapCount(0);
      showToast('Consola de Logs abierta 🛠️', 'success');
      setLogsModalVisible(true);
    } else if (nextCount >= 6) {
      showToast(`Estás a ${REQUIRED_TAPS - nextCount} toques de ver los logs 🛠️`, 'info');
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
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
        <ThemedText type="subtitle">{t('settings:title')}</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('settings:sectionAppearance')}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {themeOptions.map((option, index) => {
              const isSelected = themePreference === option.value;
              const iconName = isSelected ? option.iconFocused : option.icon;
              return (
                <AppPressable
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  style={[
                    styles.row,
                    index < themeOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}>
                  <Ionicons name={iconName} size={20} color={isSelected ? theme.primary : theme.muted} />
                  <ThemedText type="default" style={{ color: isSelected ? theme.primary : theme.text }}>
                    {option.label}
                  </ThemedText>
                  <View style={styles.flexSpacer} />
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? theme.primary : theme.muted}
                  />
                </AppPressable>
              );
            })}
          </ThemedView>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('settings:sectionLanguage')}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {languageOptions.map((option, index) => {
              const isSelected = langPreference === option.value;
              return (
                <AppPressable
                  key={option.value}
                  onPress={() => setLanguagePreference(option.value)}
                  style={[
                    styles.row,
                    index < languageOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}>
                  <Ionicons name={option.icon} size={20} color={isSelected ? theme.primary : theme.muted} />
                  <ThemedText type="default" style={{ color: isSelected ? theme.primary : theme.text }}>
                    {option.label}
                  </ThemedText>
                  <View style={styles.flexSpacer} />
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? theme.primary : theme.muted}
                  />
                </AppPressable>
              );
            })}
          </ThemedView>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('settings:sectionAccount')}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {user ? (
              <>
                <AppPressable
                  onPress={handleOpenPassword}
                  style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Ionicons name="key-outline" size={20} color={theme.textSecondary} />
                  <ThemedText type="default">{t('settings:changePassword')}</ThemedText>
                  <View style={styles.flexSpacer} />
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </AppPressable>
                <AppPressable onPress={() => setLogoutModalVisible(true)} style={styles.row}>
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
                  onPress={() => router.push('/auth/login')}
                  style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Ionicons name="log-in-outline" size={20} color={theme.primary} />
                  <ThemedText type="default" style={{ color: theme.text }}>
                    {t('auth:signInTitle')}
                  </ThemedText>
                  <View style={styles.flexSpacer} />
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </AppPressable>
                <AppPressable
                  onPress={() => router.push('/auth/register')}
                  style={styles.row}>
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
          {!user && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('settings:anonymousNotice')}
            </ThemedText>
          )}
        </View>

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

      {/* Logout confirmation modal */}
      <AppModal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('settings:logoutTitle')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              {t('settings:logoutMessage')}
            </ThemedText>
            <View style={styles.modalActions}>
              <AppPressable
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleLogout}
                style={[styles.modalButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.modalButtonText}>
                  {t('settings:logout')}
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      </AppModal>

      {/* Developer Logs & Diagnostics Modal */}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
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
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
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