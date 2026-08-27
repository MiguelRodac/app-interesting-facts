import { useState } from 'react';
import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { sendPasswordReset } from '@/data/auth/firebaseAuth';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { isValidEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation(['auth', 'common']);
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
      // Firebase sends the reset email directly — no backend involved.
      await sendPasswordReset(emailValue);
      router.back();
      uiStore.showToast(t('auth:resetEmailSent'), 'success');
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
        uiStore.showToast(t('auth:resetEmailSent'), 'success');
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
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + Spacing.three }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <AppPressable
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
            </AppPressable>
            <LanguageToggle />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title">{t('auth:resetPasswordTitle')}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:resetPasswordSubtitle')}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('auth:email')}
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
                placeholder={t('auth:emailPlaceholder')}
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
                  {t('auth:invalidEmail')}
                </ThemedText>
              )}
            </View>

            <AppPressable
              onPress={isValid ? handleSend : undefined}
              style={[
                styles.submitButton,
                {
                  backgroundColor: isValid ? theme.primary : theme.muted,
                  opacity: isSending ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.submitText}>
                {isSending ? t('auth:sending') : t('auth:sendResetLink')}
              </ThemedText>
            </AppPressable>
          </View>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  closeButton: {
    padding: Spacing.one,
  },
  header: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
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