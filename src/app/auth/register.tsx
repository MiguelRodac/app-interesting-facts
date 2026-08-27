import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { PasswordField } from '@/components/PasswordField';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import {
  isValidEmail,
  isValidUsername,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  USERNAME_ERROR_MESSAGE,
} from '@/utils/validation';
import type { ApiUsernameCheck } from '@/data/api/types';

const client = createApiClient(getIdToken);

export default function RegisterScreen() {
  const { t } = useTranslation(['auth', 'profile', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    // Local format check — avoids hitting the API with an invalid pattern
    if (!isValidUsername(value)) {
      setUsernameStatus('invalid');
      setUsernameError(t('auth:invalidUsername'));
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    try {
      const response = await client.get<ApiUsernameCheck>('/users/check-username', { username: value.trim() });
      if (response.available) {
        setUsernameStatus('available');
        setUsernameError(null);
      } else {
        setUsernameStatus('taken');
        setUsernameError(t('auth:usernameTaken'));
      }
    } catch {
      setUsernameStatus('idle');
      setUsernameError(null);
    }
  }, [t]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (username.trim().length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    // Invalid pattern — skip the API call and show the error immediately
    if (!isValidUsername(username)) {
      setUsernameStatus('invalid');
      setUsernameError(t('auth:invalidUsername'));
      return;
    }

    debounceRef.current = setTimeout(() => {
      checkUsername(username);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username, checkUsername, t]);

const isValid =
    isValidEmail(email) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    displayName.trim().length > 0 &&
    displayName.trim().length <= MAX_DISPLAY_NAME_LENGTH &&
    isValidUsername(username) &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'checking';

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim(),
      });
      router.replace('/(tabs)');
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    router.push('/auth/login');
  };

  const getUsernameBorderColor = () => {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return theme.destructive;
    if (usernameStatus === 'available') return theme.success;
    return theme.border;
  };

  const getUsernameHelperText = () => {
    if (usernameStatus === 'checking') return null;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return usernameError;
    if (usernameStatus === 'available') return t('auth:usernameAvailable');
    return null;
  };

  const helperText = getUsernameHelperText();
  const helperColor = usernameStatus === 'available' ? theme.success : theme.destructive;

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
          {/* Close button - go back to previous screen */}
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

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title">{t('auth:createAccountTitle')}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:joinCommunity')}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('profile:displayName')}
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
                placeholder={t('profile:displayNamePlaceholder')}
                placeholderTextColor={theme.muted}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('auth:username')}
              </ThemedText>
              <View
                style={[
                  styles.usernameInputShell,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: getUsernameBorderColor(),
                  },
                ]}>
                {/* Visual @ prefix — the stored username has no @ */}
                <ThemedText type="smallBold" style={[styles.usernamePrefix, { color: theme.text }]}>
                  @
                </ThemedText>
                <TextInput
                  style={[styles.usernameField, { color: theme.text }]}
                  placeholder={t('auth:usernamePlaceholder')}
                  placeholderTextColor={theme.muted}
                  value={username}
                  onChangeText={setUsername}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                {usernameStatus === 'checking' && (
                  <ActivityIndicator size="small" color={theme.primary} style={styles.usernameIndicator} />
                )}
                {usernameStatus === 'available' && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} style={styles.usernameIndicator} />
                )}
                {usernameStatus === 'taken' && (
                  <Ionicons name="close-circle" size={20} color={theme.destructive} style={styles.usernameIndicator} />
                )}
                {usernameStatus === 'invalid' && (
                  <Ionicons name="close-circle" size={20} color={theme.destructive} style={styles.usernameIndicator} />
                )}
              </View>
              {helperText && (
                <ThemedText type="small" style={{ color: helperColor }}>
                  {helperText}
                </ThemedText>
              )}
            </View>

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
              showStrength
            />

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
                {isSubmitting ? t('auth:creatingAccount') : t('auth:createAccountTitle')}
              </ThemedText>
            </AppPressable>

            <AppPressable onPress={goToLogin} style={styles.linkButton}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('auth:hasAccountPrompt')}{' '}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {t('auth:signInLink')}
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
  closeButton: {
    alignSelf: 'flex-end',
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
  usernameInputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  usernamePrefix: {
    paddingLeft: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
  },
  usernameField: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  usernameIndicator: {
    position: 'absolute',
    right: Spacing.three,
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
