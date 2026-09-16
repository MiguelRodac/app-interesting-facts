import { useState, useCallback, useEffect, useMemo } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { changeEmail } from '@/features/auth/services/firebaseAuth';
import { isFirebaseAuthError, mapFirebaseError } from '@/features/auth/services/firebaseErrors';
import { useUIStore } from '@/shared/stores/uiStore';
import { isValidEmail, MAX_DISPLAY_NAME_LENGTH } from '@/utils/validation';
import { safeTruncate } from '@/utils/text';

export function useEditProfileScreen() {
  const { t } = useTranslation(['profile', 'auth', 'create', 'common']);
  const { user, updateProfile, isLoading } = useAuth();
  const showToast = useUIStore((s) => s.showToast);
  const setError = useUIStore((s) => s.setError);
  const router = useRouter();

  // Pending changes — only sent to backend on "Done"
  const [pendingDisplayName, setPendingDisplayName] = useState(user?.displayName ?? '');
  const [pendingEmail, setPendingEmail] = useState(user?.email ?? '');
  const [pendingAvatarColor, setPendingAvatarColor] = useState<string | null>(user?.avatarColor ?? null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  // Email change requires current password for re-authentication
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
  const [editingFocused, setEditingFocused] = useState(false);

  // Sync when user updates
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setPendingDisplayName(user.displayName);
      setPendingEmail(user.email ?? '');
      setPendingAvatarColor(user.avatarColor ?? null);
      setPendingAvatarUrl(user.avatarUrl ?? null);
    }
  }

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      pendingDisplayName !== user.displayName ||
      pendingEmail !== (user.email ?? '') ||
      pendingAvatarColor !== (user.avatarColor ?? null) ||
      pendingAvatarUrl !== (user.avatarUrl ?? null)
    );
  }, [user, pendingDisplayName, pendingEmail, pendingAvatarColor, pendingAvatarUrl]);

  // Intercept Android hardware back
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
    setPendingDisplayName(safeTruncate(trimmed, MAX_DISPLAY_NAME_LENGTH));
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
    if (!isValidEmail(trimmed) || trimmed === pendingEmail) {
      setIsEditingEmail(false);
      return;
    }
    setPendingEmail(trimmed);
    setIsEditingEmail(false);
  }, [editEmailValue, pendingEmail]);

  const handleSelectAvatarOption = useCallback((color: string | null, url: string | null) => {
    setPendingAvatarColor(color);
    setPendingAvatarUrl(url);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isValidEmail(pendingEmail)) {
      showToast(t('profile:validEmailRequired'), 'warning');
      return;
    }

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
      showToast(t('profile:profileUpdated'), 'success');
      router.replace('/(tabs)/profile');
    } catch {
      // Handled by uiStore
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingDisplayName, pendingEmail, pendingAvatarColor, pendingAvatarUrl, updateProfile, router, user, showToast, t]);

  const handleCancelPasswordPrompt = useCallback(() => {
    setIsPasswordPromptVisible(false);
    setPasswordValue('');
  }, []);

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
      showToast(t('profile:emailVerificationSent'), 'warning');
      router.replace('/(tabs)/profile');
    } catch (error) {
      setIsConfirmingEmail(false);
      setPasswordValue('');
      setIsPasswordPromptVisible(true);
      setError(isFirebaseAuthError(error) ? mapFirebaseError(error) : (error as never));
    }
  }, [pendingEmail, passwordValue, pendingDisplayName, pendingAvatarColor, pendingAvatarUrl, updateProfile, showToast, setError, router, t]);

  const handleCancel = useCallback(() => {
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

  return {
    user,
    isLoading,
    isSubmitting,
    hasChanges,
    pendingDisplayName,
    pendingEmail,
    pendingAvatarColor,
    pendingAvatarUrl,
    isEditingName,
    editNameValue,
    setEditNameValue,
    isEditingEmail,
    editEmailValue,
    setEditEmailValue,
    editingFocused,
    setEditingFocused,
    isAvatarModalVisible,
    setIsAvatarModalVisible,
    isPasswordPromptVisible,
    passwordValue,
    setPasswordValue,
    isConfirmingEmail,
    confirmLeaveVisible,
    handleStartEditName,
    handleCancelEditName,
    handleConfirmEditName,
    handleStartEditEmail,
    handleCancelEditEmail,
    handleConfirmEditEmail,
    handleSelectAvatarOption,
    handleSave,
    handleCancel,
    handleConfirmLeave,
    handleCancelLeave,
    handleCancelPasswordPrompt,
    handleConfirmEmailChange,
  };
}
