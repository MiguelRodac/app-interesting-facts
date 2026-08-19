import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { checkEmailExists } from '@/data/auth/authService';
import { sendPasswordReset } from '@/data/auth/firebaseAuth';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { isValidEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const uiStore = useUIStore();

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const isValid = isValidEmail(email) && !isSending;

  const handleSend = async () => {
    if (!isValid) return;
    const emailValue = email.trim();

    setIsSending(true);
    try {
      // Pre-check with the backend (when the endpoint exists) so we don't
      // call Firebase for emails that aren't registered anywhere.
      const emailAvailable = await checkEmailExists(emailValue);
      if (emailAvailable === true) {
        router.back();
        uiStore.showToast('No account found with this email.', 'info');
        return;
      }

      await sendPasswordReset(emailValue);
      router.back();
      uiStore.showToast('If an account exists for this email, a reset link was sent.', 'success');
    } catch (error) {
      // Don't reveal whether an email is registered: only surface real failures
      // (network, rate limit). Everything else responds like success.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        ((error as { code: string }).code === 'auth/network-request-failed' ||
          (error as { code: string }).code === 'auth/too-many-requests')
      ) {
        uiStore.setError(error as never);
      } else {
        router.back();
        uiStore.showToast('If an account exists for this email, a reset link was sent.', 'success');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ThemedView style={[styles.container, { paddingTop: topInset }]}>
        {/* Close button - go back to previous screen */}
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/auth/login');
            }
          }}
          style={styles.closeButton}
          hitSlop={8}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Reset Password</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Enter your email and we'll send you a link to reset your password.
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Email
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: emailInvalid ? theme.destructive : theme.border,
                },
              ]}
              placeholder="your@email.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSending}
            />
            {emailInvalid && (
              <ThemedText type="small" style={{ color: theme.destructive }}>
                {'Enter a valid email'}
              </ThemedText>
            )}
          </View>

          <Pressable
            onPress={isValid ? handleSend : undefined}
            style={[
              styles.submitButton,
              {
                backgroundColor: isValid ? theme.primary : theme.muted,
                opacity: isSending ? 0.7 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.submitText}>
              {isSending ? 'Sending...' : 'Send Reset Link'}
            </ThemedText>
          </Pressable>
        </View>
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