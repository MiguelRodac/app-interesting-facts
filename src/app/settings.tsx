import { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useThemeContext, type ThemePreference } from '@/hooks/theme-provider';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { useAuth } from '@/data/hooks/useAuth';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline', iconFocused: 'phone-portrait' },
  { value: 'light', label: 'Light', icon: 'sunny-outline', iconFocused: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline', iconFocused: 'moon' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const topInset = useTopInset();
  const router = useRouter();
  const { preference, setPreference } = useThemeContext();
  const { user, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
        <ThemedText type="subtitle">Settings</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            Appearance
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {THEME_OPTIONS.map((option, index) => {
              const isSelected = preference === option.value;
              const iconName = isSelected ? option.iconFocused : option.icon;
              return (
                <AppPressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={[
                    styles.row,
                    index < THEME_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
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

        {/* Account */}
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            Account
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <AppPressable
              onPress={handleOpenPassword}
              style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <Ionicons name="key-outline" size={20} color={theme.textSecondary} />
              <ThemedText type="default">Change Password</ThemedText>
              <View style={styles.flexSpacer} />
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </AppPressable>
            {user && (
              <AppPressable onPress={() => setLogoutModalVisible(true)} style={styles.row}>
                <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
                <ThemedText type="default" style={{ color: theme.destructive }}>
                  Logout
                </ThemedText>
                <View style={styles.flexSpacer} />
              </AppPressable>
            )}
          </ThemedView>
          {!user && (
            <ThemedText type="small" themeColor="textSecondary">
              Sign in to manage your account settings.
            </ThemedText>
          )}
        </View>
      </ScrollView>

      {/* Logout confirmation modal */}
      <AppModal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Log out?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              Are you sure you want to log out?
            </ThemedText>
            <View style={styles.modalActions}>
              <AppPressable
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleLogout}
                style={[styles.modalButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.modalButtonText}>
                  Log Out
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
</AppModal>
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
});