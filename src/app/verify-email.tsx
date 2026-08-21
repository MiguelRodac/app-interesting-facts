import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import {
  applyEmailActionCode,
  confirmPasswordResetAction,
} from '@/data/auth/firebaseAuth';
import { useAuthStore } from '@/data/stores/authStore';
import { useTheme } from '@/hooks/use-theme';
import { MIN_PASSWORD_LENGTH } from '@/utils/validation';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

/** Firebase action-code modes handled by this public page. */
const RESET_PASSWORD_MODE = 'resetPassword';
const VERIFY_EMAIL_MODES = ['verifyBeforeUpdateEmail', 'verifyEmail'];

export default function VerifyEmailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ mode?: string; oobCode?: string }>();

  const actionMode = String(params.mode ?? '');
  const code = String(params.oobCode ?? '');

  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isVerifyEmailMode = VERIFY_EMAIL_MODES.includes(actionMode);
  const isResetPasswordMode = actionMode === RESET_PASSWORD_MODE;
  const isSupported = isVerifyEmailMode || isResetPasswordMode;

  // A valid password requires both fields to match and meet the minimum length.
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordValid = passwordsMatch && password.length >= MIN_PASSWORD_LENGTH;

  // Handle invalid / missing links before any side effects run.
  useEffect(() => {
    if (!isSupported || !code) {
      setStatus('error');
      setErrorMessage(
        !code ? 'Invalid or missing link. Please check the link and try again.' : 'This action is not supported.',
      );
    }
  }, [isSupported, code]);

  // Fire the verify-before-update flow automatically once the code is valid.
  useEffect(() => {
    if (!isVerifyEmailMode || !code || status !== 'idle') return;
    handleVerifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerifyEmailMode, code]);

  const handleVerifyEmail = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const newEmail = await applyEmailActionCode(code);

      // Best-effort backend sync. The browser session may not be signed in
      // (common when clicking the link in a fresh browser) — if the sync
      // fails because there's no session, the app reconciles the email on the
      // next sign-in. Never let a sync failure crash or block the flow.
      try {
        if (newEmail) {
          await useAuthStore.getState().updateProfile({ email: newEmail });
        }
      } catch {
        // No session / backend unreachable — verification still succeeded.
      }

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleResetPassword = async () => {
    if (!passwordValid || status === 'loading') return;
    setStatus('loading');
    setErrorMessage('');
    try {
      await confirmPasswordResetAction(code, password);
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
              Processing&hellip;
            </ThemedText>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={44} color={theme.destructive} />
            <ThemedText type="title" style={styles.title}>
              Something went wrong
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {errorMessage}
            </ThemedText>
            <AppPressable
              onPress={goToSignIn}
              style={[styles.button, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Go to Sign In
              </ThemedText>
            </AppPressable>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={44} color={theme.success} />
            <ThemedText type="title" style={styles.title}>
              {isResetPasswordMode ? 'Password updated' : 'Email verified'}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              {isResetPasswordMode
                ? 'Your password has been updated. You can now sign in.'
                : 'Your email has been verified and updated.'}
            </ThemedText>
            <AppPressable
              onPress={goToSignIn}
              style={[styles.button, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Go to Sign In
              </ThemedText>
            </AppPressable>
          </View>
        )}

        {/* Password reset form — shown while idle & supported */}
        {status === 'idle' && isResetPasswordMode && (
          <View>
            <ThemedText type="title" style={styles.title}>
              Reset Password
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
              Choose a new password for your account.
            </ThemedText>
            <View style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  New Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Confirm New Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor:
                        confirmPassword.length > 0 && !passwordsMatch ? theme.destructive : theme.border,
                    },
                  ]}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={theme.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <ThemedText type="small" style={{ color: theme.destructive }}>
                  Passwords do not match.
                </ThemedText>
              )}
              <AppPressable
                onPress={passwordValid ? handleResetPassword : undefined}
                style={[
                  styles.button,
                  { backgroundColor: passwordValid ? theme.primary : theme.muted },
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Reset Password
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
              Verifying your email&hellip;
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
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
