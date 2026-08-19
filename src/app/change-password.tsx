import { useState } from 'react';
import { StyleSheet, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
      uiStore.showToast('Password updated successfully.', 'success');
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
        <Pressable
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
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Change Password</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Enter your current password and a new one.
          </ThemedText>
        </View>

        {/* Form */}
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled">
          {!user && (
            <ThemedText type="small" style={{ color: theme.destructive }}>
              You are not signed in. Changes can't be saved until you sign in.
            </ThemedText>
          )}

          <PasswordField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            editable={!isSubmitting}
          />
          <PasswordField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (6-16 characters)"
            editable={!isSubmitting}
            showStrength
          />
          <PasswordField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            editable={!isSubmitting}
            label="Confirm New Password"
          />

          {passwordInvalid && (
            <ThemedText type="small" style={{ color: theme.destructive }}>
              New password must be different from the current one.
            </ThemedText>
          )}
          {passwordsMismatch && (
            <ThemedText type="small" style={{ color: theme.destructive }}>
              Passwords do not match.
            </ThemedText>
          )}

          <Pressable
            onPress={isValid ? handleSubmit : undefined}
            style={[
              styles.submitButton,
              {
                backgroundColor: isValid ? theme.primary : theme.muted,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.submitText}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </ThemedText>
          </Pressable>
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