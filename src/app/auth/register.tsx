import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TextInput, View, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { isValidEmail, isValidUsername, USERNAME_ERROR_MESSAGE } from '@/utils/validation';
import type { ApiUsernameCheck } from '@/data/api/types';

const client = createApiClient(getIdToken);

export default function RegisterScreen() {
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
      setUsernameError(USERNAME_ERROR_MESSAGE);
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
        setUsernameError('Username is already taken');
      }
    } catch {
      setUsernameStatus('idle');
      setUsernameError(null);
    }
  }, []);

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
      setUsernameError(USERNAME_ERROR_MESSAGE);
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
  }, [username, checkUsername]);

  const isValid =
    isValidEmail(email) &&
    password.length > 0 &&
    displayName.trim().length > 0 &&
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
    if (usernameStatus === 'available') return 'Username is available';
    return null;
  };

  const helperText = getUsernameHelperText();
  const helperColor = usernameStatus === 'available' ? theme.success : theme.destructive;

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
              router.replace('/');
            }
          }}
          style={styles.closeButton}
          hitSlop={8}>
          <Ionicons name="close" size={28} color={theme.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Create Account</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Join the community
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Display Name
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
              placeholder="Your name"
              placeholderTextColor={theme.muted}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              autoCorrect={false}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Username
            </ThemedText>
            <View style={styles.usernameRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.usernameInput,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: getUsernameBorderColor(),
                  },
                ]}
                placeholder="your_username"
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
              editable={!isSubmitting}
            />
            {emailInvalid && (
              <ThemedText type="small" style={{ color: theme.destructive }}>
                {'Enter a valid email'}
              </ThemedText>
            )}
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Password
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
              placeholder="Choose a password"
              placeholderTextColor={theme.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isSubmitting}
            />
          </View>

          <Pressable
            onPress={isValid && !isSubmitting ? handleSubmit : undefined}
            style={[
              styles.submitButton,
              {
                backgroundColor: isValid ? theme.primary : theme.muted,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.submitText}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={goToLogin} style={styles.linkButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account?{' '}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Sign In
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
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
