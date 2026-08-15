import { useState } from 'react';
import { StyleSheet, TextInput, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { isValidEmail } from '@/utils/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const isValid = isValidEmail(email) && password.length > 0;

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ThemedView style={styles.container}>
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
          <ThemedText type="title">Welcome Back</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Sign in to continue
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
                  borderColor: theme.border,
                },
              ]}
              placeholder="your@email.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
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
              placeholder="Your password"
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
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={goToRegister} style={styles.linkButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Don't have an account?{' '}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Sign Up
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
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
