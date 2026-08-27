import { useState } from 'react';
import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PasswordField } from '@/components/PasswordField';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/utils/validation';

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();

  const isValid = isValidEmail(email) && password.length >= MIN_PASSWORD_LENGTH;

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToRegister = () => {
    router.push('/auth/register');
  };

  const goToForgotPassword = () => {
    router.push('/forgot-password');
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
                  router.replace('/');
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
            <ThemedText type="title">{t('auth:welcomeBack')}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:signInToContinue')}
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
                editable={!isSubmitting}
              />
              {emailInvalid && (
                <ThemedText type="small" style={{ color: theme.destructive }}>
                  {t('auth:invalidEmail')}
                </ThemedText>
              )}
            </View>

            <PasswordField
              value={password}
              onChangeText={setPassword}
              label={t('auth:password')}
              placeholder={t('auth:passwordPlaceholder')}
              editable={!isSubmitting}
            />

            <AppPressable
              onPress={goToForgotPassword}
              style={styles.forgotButton}
              hitSlop={6}>
              <ThemedText type="small" style={{ color: theme.primary }}>
                {t('auth:forgotPasswordLink')}
              </ThemedText>
            </AppPressable>

            <AppPressable
              onPress={isValid && !isSubmitting ? handleSubmit : undefined}
              style={[
                styles.submitButton,
                {
                  backgroundColor: isValid ? theme.primary : theme.muted,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.submitText}>
                {isSubmitting ? t('auth:signingIn') : t('auth:signInTitle')}
              </ThemedText>
            </AppPressable>

            <AppPressable onPress={goToRegister} style={styles.linkButton}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('auth:noAccountPrompt')}{' '}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {t('auth:signUpLink')}
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.one,
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
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});