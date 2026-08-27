import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PasswordField } from '@/components/PasswordField';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { changePassword } from '@/data/auth/firebaseAuth';
import { isFirebaseAuthError, mapFirebaseError } from '@/data/auth/firebaseErrors';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';

export default function ChangePasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const uiStore = useUIStore();

  const passwordInvalid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    newPassword === currentPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    !passwordInvalid &&
    !passwordsMismatch &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings');
      }
      uiStore.showToast(t('auth:passwordUpdated'), 'success');
    } catch (error) {
      uiStore.setError(isFirebaseAuthError(error) ? mapFirebaseError(error) : (error as never));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ThemedView style={[styles.container, { paddingTop: topInset }]}>
        {/* Close button - go back to previous screen */}
        <AppPressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/settings');
            }
          }}
          style={styles.closeButton}
          hitSlop={8}>
          <Ionicons name="close" size={28} color={theme.text} />
        </AppPressable>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">{t('auth:changePasswordTitle')}</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {t('auth:changePasswordSubtitle')}
          </ThemedText>
        </View>

        {/* Form */}
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled">
          <PasswordField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            label={t('auth:currentPassword')}
            placeholder={t('auth:currentPasswordPlaceholder')}
            editable={!isSubmitting}
          />
          <PasswordField
            value={newPassword}
            onChangeText={setNewPassword}
            label={t('auth:newPassword')}
            placeholder={t('auth:newPasswordPlaceholder')}
            editable={!isSubmitting}
            showStrength
          />
          <PasswordField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth:confirmNewPasswordPlaceholder')}
            editable={!isSubmitting}
            label={t('auth:confirmNewPassword')}
          />

          {passwordInvalid && (
            <ThemedText type="small" style={{ color: theme.destructive }}>
              {t('auth:passwordsDoNotMatch')}
            </ThemedText>
          )}
          {passwordsMismatch && (
            <ThemedText type="small" style={{ color: theme.destructive }}>
              {t('auth:passwordsDoNotMatch')}
            </ThemedText>
          )}

          <AppPressable
            onPress={isValid ? handleSubmit : undefined}
            style={[
              styles.submitButton,
              {
                backgroundColor: isValid ? theme.primary : theme.muted,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.submitText}>
              {isSubmitting ? t('auth:updating') : t('auth:updatePassword')}
            </ThemedText>
          </AppPressable>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: Spacing.one,
  },
  header: {
    marginTop: Spacing.five,
    marginBottom: Spacing.five,
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitText: {
    color: '#FFFFFF',
  },
});