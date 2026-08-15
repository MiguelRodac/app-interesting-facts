import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AvatarPickerModal } from '@/components/AvatarPickerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { isValidEmail } from '@/utils/validation';

export default function EditProfileScreen() {
  const { user, updateProfile, isLoading } = useAuth();
  const showToast = useUIStore((s) => s.showToast);
  const router = useRouter();
  const theme = useTheme();

  // Pending changes — only sent to backend on "Done"
  const [pendingDisplayName, setPendingDisplayName] = useState(user?.displayName ?? '');
  const [pendingEmail, setPendingEmail] = useState(user?.email ?? '');
  const [pendingAvatarColor, setPendingAvatarColor] = useState<string | null>(user?.avatarColor ?? null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with user changes (only on initial load or user refresh)
  useEffect(() => {
    if (user) {
      setPendingDisplayName(user.displayName);
      setPendingEmail(user.email ?? '');
      setPendingAvatarColor(user.avatarColor ?? null);
      setPendingAvatarUrl(user.avatarUrl ?? null);
    }
  }, [user]);

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

    setPendingDisplayName(trimmed);
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

  const handleSelectColor = useCallback((color: string | null) => {
    // Only changes the color — keeps the URL if the user has one
    setPendingAvatarColor(color);
  }, []);

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

    setIsSubmitting(true);
    try {
      // Only send the email if it actually changed — avoids a needless 409 on PATCH /auth/me
      const emailChanged = user != null && pendingEmail.trim() !== (user.email ?? '').trim();
      await updateProfile({
        displayName: pendingDisplayName,
        avatarColor: pendingAvatarColor,
        avatarUrl: pendingAvatarUrl,
        ...(emailChanged && pendingEmail.trim() ? { email: pendingEmail.trim() } : {}),
      });
      showToast('Profile updated successfully', 'success');
      router.replace('/(tabs)/profile');
    } catch {
      // Error handled by uiStore
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingDisplayName, pendingEmail, pendingAvatarColor, pendingAvatarUrl, updateProfile, router, user]);

  const handleCancel = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

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
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Edit Profile
          </ThemedText>
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSubmitting}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {isSubmitting ? 'Saving...' : 'Done'}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <Pressable onPress={() => setIsAvatarModalVisible(true)} style={styles.avatarContainer}>
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
            </Pressable>
            <Pressable onPress={() => setIsAvatarModalVisible(true)}>
              <ThemedText type="small" themeColor="primary">
                Tap to change
              </ThemedText>
            </Pressable>
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
                      borderColor: theme.primary,
                    },
                  ]}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  maxLength={50}
                  autoFocus
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
                <Pressable
                  onPress={handleConfirmEditName}
                  style={[styles.iconButton, { backgroundColor: theme.success }]}
                  disabled={isSubmitting}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={handleCancelEditName}
                  style={[styles.iconButton, { backgroundColor: theme.muted }]}
                  disabled={isSubmitting}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleStartEditName} style={styles.nameDisplayRow}>
                <ThemedText type="default" style={styles.nameDisplayText}>
                  {pendingDisplayName}
                </ThemedText>
                <Ionicons name="pencil" size={18} color={theme.muted} />
              </Pressable>
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
                      borderColor: theme.primary,
                    },
                  ]}
                  value={editEmailValue}
                  onChangeText={setEditEmailValue}
                  maxLength={100}
                  autoFocus
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isSubmitting}
                />
                <Pressable
                  onPress={handleConfirmEditEmail}
                  style={[styles.iconButton, { backgroundColor: theme.success }]}
                  disabled={isSubmitting}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={handleCancelEditEmail}
                  style={[styles.iconButton, { backgroundColor: theme.muted }]}
                  disabled={isSubmitting}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleStartEditEmail} style={styles.nameDisplayRow}>
                <ThemedText type="default" style={styles.nameDisplayText}>
                  {pendingEmail}
                </ThemedText>
                <Ionicons name="pencil" size={18} color={theme.muted} />
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Avatar picker modal */}
        <AvatarPickerModal
          visible={isAvatarModalVisible}
          currentColor={pendingAvatarColor}
          currentAvatarUrl={pendingAvatarUrl}
          onClose={() => setIsAvatarModalVisible(false)}
          onSelectColor={handleSelectColor}
          onSelectAvatarOption={handleSelectAvatarOption}
        />
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
    borderWidth: 1,
    borderRadius: Radii.md,
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
});
