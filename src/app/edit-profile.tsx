import { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AvatarPickerModal } from '@/components/AvatarPickerModal';
import { PasswordField } from '@/components/PasswordField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { changeEmail } from '@/data/auth/firebaseAuth';
import { isFirebaseAuthError, mapFirebaseError } from '@/data/auth/firebaseErrors';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { isValidEmail, MAX_DISPLAY_NAME_LENGTH } from '@/utils/validation';

export default function EditProfileScreen() {
const { user, updateProfile, isLoading } = useAuth();
  const showToast = useUIStore((s) => s.showToast);
  const setError = useUIStore((s) => s.setError);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();

  // Pending changes — only sent to backend on "Done"
  const [pendingDisplayName, setPendingDisplayName] = useState(user?.displayName ?? '');
  const [pendingEmail, setPendingEmail] = useState(user?.email ?? '');
  const [pendingAvatarColor, setPendingAvatarColor] = useState<string | null>(user?.avatarColor ?? null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  // Email change requires the current password (Firebase re-authentication)
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  // Subtle focus indicator — only a bottom underline lights up, not the whole box.
  const [editingFocused, setEditingFocused] = useState(false);

  // Sync with user changes (only on initial load or user refresh)
  useEffect(() => {
    if (user) {
      setPendingDisplayName(user.displayName);
      setPendingEmail(user.email ?? '');
      setPendingAvatarColor(user.avatarColor ?? null);
      setPendingAvatarUrl(user.avatarUrl ?? null);
    }
  }, [user]);

  // Resolves whether the user has made any real edits relative to the saved profile.
  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      pendingDisplayName !== user.displayName ||
      pendingEmail !== (user.email ?? '') ||
      pendingAvatarColor !== (user.avatarColor ?? null) ||
      pendingAvatarUrl !== (user.avatarUrl ?? null)
    );
  }, [user, pendingDisplayName, pendingEmail, pendingAvatarColor, pendingAvatarUrl]);

  // Intercept Android hardware back button — confirm before leaving with unsaved changes
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasChanges) {
        setConfirmLeaveVisible(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [hasChanges]);

  const handleStartEditName = useCallback(() => {
    setEditNameValue(pendingDisplayName);
    setIsEditingName(true);
  }, [pendingDisplayName]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditNameValue('');
  }, []);

const handleConfirmEditName = useCallback(() => {
    const trimmed = editNameValue.trim();
    if (trimmed.length < 2 || trimmed === pendingDisplayName) {
      setIsEditingName(false);
      return;
    }

    // maxLength caps typing, but a pasted value could still exceed the limit
    setPendingDisplayName(trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH));
    setIsEditingName(false);
  }, [editNameValue, pendingDisplayName]);

  const handleStartEditEmail = useCallback(() => {
    setEditEmailValue(pendingEmail);
    setIsEditingEmail(true);
  }, [pendingEmail]);

  const handleCancelEditEmail = useCallback(() => {
    setIsEditingEmail(false);
    setEditEmailValue('');
  }, []);

  const handleConfirmEditEmail = useCallback(() => {
    const trimmed = editEmailValue.trim();
    // Basic email validation
    if (!isValidEmail(trimmed) || trimmed === pendingEmail) {
      setIsEditingEmail(false);
      return;
    }

    setPendingEmail(trimmed);
    setIsEditingEmail(false);
  }, [editEmailValue, pendingEmail]);

  const handleSelectAvatarOption = useCallback((color: string | null, url: string | null) => {
    if (url) {
      // Option with an image — override the image, keep color as fallback
      setPendingAvatarUrl(url);
      if (color) {
        setPendingAvatarColor(color);
      }
    } else if (color) {
      // Color-only option — remove any custom image
      setPendingAvatarColor(color);
      setPendingAvatarUrl(null);
    } else {
      // No avatar option — clear both so the backend receives null
      setPendingAvatarColor(null);
      setPendingAvatarUrl(null);
    }
  }, []);

const handleSave = useCallback(async () => {
    // Local email format check before hitting the backend (422 otherwise)
    if (!isValidEmail(pendingEmail)) {
      showToast('Please enter a valid email', 'warning');
      return;
    }

    // Email changes go through Firebase (identity) — ask for the password
    // first so we can re-authenticate before sending the verification link.
    const emailChanged = user != null && pendingEmail.trim() !== (user.email ?? '').trim();
    if (emailChanged) {
      setPasswordValue('');
      setIsPasswordPromptVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        displayName: pendingDisplayName,
        avatarColor: pendingAvatarColor,
        avatarUrl: pendingAvatarUrl,
      });
      showToast('Profile updated successfully', 'success');
      router.replace('/(tabs)/profile');
    } catch {
      // Error handled by uiStore
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingDisplayName, pendingEmail, pendingAvatarColor, pendingAvatarUrl, updateProfile, router, user, showToast]);

  const handleCancelPasswordPrompt = useCallback(() => {
    setIsPasswordPromptVisible(false);
    setPasswordValue('');
  }, []);

  // 1. Re-authenticate + send a verification link to the new email
  //    (verifyBeforeUpdateEmail — the email is NOT changed yet).
  // 2. Sync displayName/avatar only — the email must NOT be sent to the
  //    backend until the user clicks the link and Firebase applies it.
  const handleConfirmEmailChange = useCallback(async () => {
    const newEmail = pendingEmail.trim();
    setIsConfirmingEmail(true);
    try {
      await changeEmail(newEmail, passwordValue);
      await updateProfile({
        displayName: pendingDisplayName,
        avatarColor: pendingAvatarColor,
        avatarUrl: pendingAvatarUrl,
      });
      showToast(
        'We sent a verification link to your new email. Your email will update once you verify it.',
        'warning',
      );
      router.replace('/(tabs)/profile');
    } catch (error) {
      setIsConfirmingEmail(false);
      setPasswordValue('');
      setIsPasswordPromptVisible(true);
      setError(isFirebaseAuthError(error) ? mapFirebaseError(error) : (error as never));
    }
  }, [pendingEmail, passwordValue, pendingDisplayName, pendingAvatarColor, pendingAvatarUrl, updateProfile, showToast, setError, router]);

  const handleCancel = useCallback(() => {
    // With unsaved changes, block the in-screen back button and ask for confirmation.
    if (hasChanges) {
      setConfirmLeaveVisible(true);
      return;
    }
    router.replace('/(tabs)/profile');
  }, [router, hasChanges]);

  const handleConfirmLeave = useCallback(() => {
    setConfirmLeaveVisible(false);
    router.replace('/(tabs)/profile');
  }, [router]);

  const handleCancelLeave = useCallback(() => {
    setConfirmLeaveVisible(false);
  }, []);

  if (isLoading || !user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const hasUrlAvatar = pendingAvatarUrl != null && pendingAvatarUrl.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <AppPressable onPress={handleCancel} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </AppPressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Edit Profile
          </ThemedText>
          <AppPressable onPress={handleSave} hitSlop={8} disabled={isSubmitting}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {isSubmitting ? 'Saving...' : 'Done'}
            </ThemedText>
          </AppPressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <AppPressable onPress={() => setIsAvatarModalVisible(true)} style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <UserAvatar
                  user={{
                    displayName: pendingDisplayName,
                    avatarColor: pendingAvatarColor ?? undefined,
                    avatarUrl: hasUrlAvatar ? pendingAvatarUrl : null,
                  }}
                  size={96}
                />
              </View>
              <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </AppPressable>
            <AppPressable onPress={() => setIsAvatarModalVisible(true)}>
              <ThemedText type="small" themeColor="primary">
                Tap to change
              </ThemedText>
            </AppPressable>
          </View>

          {/* Display name row */}
          <View style={styles.fieldSection}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
              Display Name
            </ThemedText>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderBottomColor: editingFocused ? theme.primary : theme.border,
                    },
                  ]}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  autoFocus
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onFocus={() => setEditingFocused(true)}
                  onBlur={() => setEditingFocused(false)}
                />
                <AppPressable
                  onPress={handleConfirmEditName}
                  style={[styles.iconButton, { backgroundColor: theme.success }]}
                  disabled={isSubmitting}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </AppPressable>
                <AppPressable
                  onPress={handleCancelEditName}
                  style={[styles.iconButton, { backgroundColor: theme.muted }]}
                  disabled={isSubmitting}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </AppPressable>
              </View>
            ) : (
              <AppPressable onPress={handleStartEditName} style={styles.nameDisplayRow}>
                <ThemedText type="default" style={styles.nameDisplayText}>
                  {pendingDisplayName}
                </ThemedText>
                <Ionicons name="pencil" size={18} color={theme.muted} />
              </AppPressable>
            )}
          </View>

          {/* Username (read-only) */}
          <View style={styles.fieldSection}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
              Username
            </ThemedText>
            <View style={styles.readOnlyRow}>
              <ThemedText type="default" themeColor="muted">
                @{user.username}
              </ThemedText>
            </View>
          </View>

          {/* Email row */}
          <View style={styles.fieldSection}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
              Email
            </ThemedText>
            {isEditingEmail ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderBottomColor: editingFocused ? theme.primary : theme.border,
                    },
                  ]}
                  value={editEmailValue}
                  onChangeText={setEditEmailValue}
                  maxLength={254}
                  autoFocus
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isSubmitting}
                  onFocus={() => setEditingFocused(true)}
                  onBlur={() => setEditingFocused(false)}
                />
                <AppPressable
                  onPress={handleConfirmEditEmail}
                  style={[styles.iconButton, { backgroundColor: theme.success }]}
                  disabled={isSubmitting}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </AppPressable>
                <AppPressable
                  onPress={handleCancelEditEmail}
                  style={[styles.iconButton, { backgroundColor: theme.muted }]}
                  disabled={isSubmitting}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </AppPressable>
              </View>
            ) : (
              <AppPressable onPress={handleStartEditEmail} style={styles.nameDisplayRow}>
                <ThemedText type="default" style={styles.nameDisplayText}>
                  {pendingEmail}
                </ThemedText>
<Ionicons name="pencil" size={18} color={theme.muted} />
              </AppPressable>
            )}
          </View>

          {/* Password confirmation for email changes */}
          {isPasswordPromptVisible && (
            <View style={styles.passwordSection}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
                Confirm your email change
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Enter your current password. A verification link will be sent to your new email.
              </ThemedText>
              <PasswordField
                value={passwordValue}
                onChangeText={setPasswordValue}
                label="Current Password"
                placeholder="Your password"
                editable={!isConfirmingEmail}
              />
              <View style={styles.passwordButtons}>
                <AppPressable
                  style={[styles.passwordButton, styles.passwordCancelButton, { borderColor: theme.border }]}
                  onPress={handleCancelPasswordPrompt}
                  disabled={isConfirmingEmail}>
                  <ThemedText type="smallBold" style={styles.passwordCancelText}>
                    Cancel
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  style={[
                    styles.passwordButton,
                    styles.passwordConfirmButton,
                    { backgroundColor: isConfirmingEmail || passwordValue.length === 0 ? theme.muted : theme.primary },
                  ]}
                  onPress={handleConfirmEmailChange}
                  disabled={isConfirmingEmail || passwordValue.length === 0}>
                  <ThemedText type="smallBold" style={styles.passwordConfirmText}>
                    {isConfirmingEmail ? 'Confirming...' : 'Confirm'}
                  </ThemedText>
                </AppPressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Avatar picker modal */}
        <AvatarPickerModal
          visible={isAvatarModalVisible}
          currentColor={pendingAvatarColor}
          currentAvatarUrl={pendingAvatarUrl}
          onClose={() => setIsAvatarModalVisible(false)}
          onSelectAvatarOption={handleSelectAvatarOption}
        />

        {/* Unsaved changes confirmation — full-screen, no scroll (matches create tab guard) */}
        <AppModal visible={confirmLeaveVisible} transparent animationType="fade" onRequestClose={handleCancelLeave}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                ¿Perder los cambios?
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
                Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?
              </ThemedText>
              <View style={styles.modalButtons}>
                <AppPressable
                  onPress={handleCancelLeave}
                  style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={styles.cancelModalText}>
                    Cancelar
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  onPress={handleConfirmLeave}
                  style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
                  <ThemedText type="smallBold" style={styles.confirmModalText}>
                    Salir
                  </ThemedText>
                </AppPressable>
              </View>
            </ThemedView>
          </View>
        </AppModal>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  backButton: {
    padding: Spacing.one,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  fieldLabel: {
    marginBottom: Spacing.half,
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  nameDisplayText: {
    flex: 1,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
readOnlyRow: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  passwordSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.lg,
    borderColor: 'transparent',
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  passwordButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCancelButton: {
    borderWidth: 1,
  },
  passwordCancelText: {
    opacity: 0.7,
  },
  passwordConfirmButton: {},
  passwordConfirmText: {
    color: '#FFFFFF',
  },
  // Full-screen (flex:1), no-scroll confirm overlay — mirrors the create-tab guard
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalText: {
    opacity: 0.7,
  },
  confirmModalButton: {},
  confirmModalText: {
    color: '#FFFFFF',
  },
});
