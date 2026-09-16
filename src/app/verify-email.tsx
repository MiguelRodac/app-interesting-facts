import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { PasswordField } from '@/features/auth';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import {
  applyEmailActionCode,
  confirmPasswordResetAction,
} from '@/features/auth/services/firebaseAuth';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTheme } from '@/shared/hooks/use-theme';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/utils/validation';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

/** Firebase action-code modes handled by this public page. */
const RESET_PASSWORD_MODE = 'resetPassword';
const VERIFY_EMAIL_MODES = ['verifyBeforeUpdateEmail', 'verifyEmail'];

export default function VerifyEmailScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ mode?: string; oobCode?: string }>();

  const actionMode = String(params.mode ?? '');
  const code = String(params.oobCode ?? '');


  const isVerifyEmailMode = VERIFY_EMAIL_MODES.includes(actionMode);
  const isResetPasswordMode = actionMode === RESET_PASSWORD_MODE;
  const isSupported = isVerifyEmailMode || isResetPasswordMode;
  const isLinkInvalid = !isSupported || !code;
  const isAutoVerifying = isVerifyEmailMode && !isLinkInvalid;

  const [status, setStatus] = useState<ActionStatus>(() => {
    if (isLinkInvalid) return 'error';
    if (isAutoVerifying) return 'loading';
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState(() => (
    isLinkInvalid ? (!code ? t('auth:invalidLink') : t('auth:actionNotSupported')) : ''
  ));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation consistent with the app's auth screens (see change-password.tsx):
  // both fields must meet the MIN/MAX range and match each other.
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const isValid =
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length <= MAX_PASSWORD_LENGTH &&
    confirmPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === newPassword;

  // Fire the verify-before-update flow automatically once the code is valid.
  useEffect(() => {
    if (!isAutoVerifying) return;
    let cancelled = false;

    applyEmailActionCode(code)
      .then(async (newEmail) => {
        if (cancelled) return;
        try {
          if (newEmail) {
            await useAuthStore.getState().updateProfile({ email: newEmail });
          }
        } catch {
          // No session / backend unreachable — verification still succeeded.
        }
        setStatus('success');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [isAutoVerifying, code]);

  const handleResetPassword = async () => {
    if (!isValid || status === 'loading') return;
    setStatus('loading');
    setErrorMessage('');
    try {
      await confirmPasswordResetAction(code, newPassword);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    }
  };

  const goToSignIn = () => {
    router.replace('/auth/login');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <View style={styles.center}>
            <Ionicons name="sync-outline" size={40} color={theme.primary} />
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:processing')}
            </ThemedText>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={44} color={theme.destructive} />
            <ThemedText type="title" style={styles.title}>
              {t('common:error')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {errorMessage}
            </ThemedText>
            <AppPressable
              onPress={goToSignIn}
              style={[styles.button, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {t('auth:goToSignIn')}
              </ThemedText>
            </AppPressable>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={44} color={theme.success} />
            <ThemedText type="title" style={styles.title}>
              {isResetPasswordMode ? t('auth:passwordUpdated') : t('auth:emailVerified')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {isResetPasswordMode
                ? t('auth:passwordUpdatedMessage')
                : t('auth:emailVerifiedMessage')}
            </ThemedText>
            <AppPressable
              onPress={goToSignIn}
              style={[styles.button, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {t('auth:goToSignIn')}
              </ThemedText>
            </AppPressable>
          </View>
        )}

        {/* Password reset form — shown while idle & supported */}
        {status === 'idle' && isResetPasswordMode && (
          <View>
            <ThemedText type="title" style={styles.title}>
              {t('auth:resetPasswordTitle')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {t('auth:chooseNewPassword')}
            </ThemedText>
            <View style={styles.form}>
              <PasswordField
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('auth:newPasswordPlaceholder')}
                label={t('auth:newPassword')}
                showStrength
              />
              <PasswordField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth:confirmNewPasswordPlaceholder')}
                label={t('auth:confirmNewPassword')}
              />
              {passwordsMismatch && (
                <ThemedText type="small" style={{ color: theme.destructive }}>
                  {t('auth:passwordsDoNotMatch')}
                </ThemedText>
              )}
              <AppPressable
                onPress={isValid ? handleResetPassword : undefined}
                style={[
                  styles.button,
                  { backgroundColor: isValid ? theme.primary : theme.muted },
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  {t('auth:resetPasswordTitle')}
                </ThemedText>
              </AppPressable>
            </View>
          </View>
        )}

        {/* Verify-email mode is processed automatically; wait for it. */}
        {status === 'idle' && isVerifyEmailMode && (
          <View style={styles.center}>
            <Ionicons name="sync-outline" size={40} color={theme.primary} />
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:processing')}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
      return 'This link is invalid or has expired. Please request a new link.';
    }
    if (code === 'auth/weak-password') {
      return 'Your new password is too weak.';
    }
  }
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 380,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
