import { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFacts } from './useFacts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateScreenGuard } from '../guards/createScreenGuard';
import { useUIStore } from '@/shared/stores/uiStore';
import { cleanSurrogates } from '@/utils/text';
import { useFactEditor } from './useFactEditor';

export function useCreateFactScreen() {
  const { t } = useTranslation(['create', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);

  const { addFact } = useFacts();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const showToast = useUIStore((s) => s.showToast);

  const {
    setHasUnsavedChanges,
    clearGuard,
    formResetCount,
    hasUnsavedChanges,
    triggerFormReset,
  } = useCreateScreenGuard();

  const editor = useFactEditor();

  // Clear form when user confirms leaving via tab guard
  const [prevFormResetCount, setPrevFormResetCount] = useState(formResetCount);
  if (formResetCount !== prevFormResetCount) {
    setPrevFormResetCount(formResetCount);
    if (formResetCount > 0) {
      editor.resetForm();
    }
  }

  useEffect(() => {
    if (formResetCount === 0) return;
    editor.closeMentions();
    editor.closeHashtags();
    clearGuard();
  }, [formResetCount, clearGuard, editor.closeMentions, editor.closeHashtags]);

  // Redirect to login when unauthenticated
  useEffect(() => {
    const isOnAuthScreen = (segments as string[]).includes('auth');
    if (!isAuthenticated && !isOnAuthScreen && !isLoading) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    return () => {
      clearGuard();
    };
  }, [clearGuard]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      editor.title.length > 0 ||
      editor.content.length > 0 ||
      editor.showMentions ||
      editor.showHashtags;
    setHasUnsavedChanges(hasChanges);
  }, [editor.title, editor.content, editor.showMentions, editor.showHashtags, setHasUnsavedChanges]);

  // Android hardware back
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges) {
        setConfirmLeaveVisible(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [hasUnsavedChanges]);

  const isValid = editor.content.trim().length > 0;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedLength = editor.content.trim().length;
    if (trimmedLength === 0) {
      showToast(t('create:contentRequired'), 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanTitle = editor.title.trim() ? cleanSurrogates(editor.title.trim()) : undefined;
      const cleanContent = cleanSurrogates(editor.content.trim());
      await addFact({
        title: cleanTitle,
        content: cleanContent,
      });
      editor.resetForm();
      clearGuard();
      showToast(t('create:factSharedSuccess'), 'success');
      router.navigate('/(tabs)');
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    editor.resetForm();
    clearGuard();
    router.navigate('/(tabs)');
  };

  const handleConfirmLeave = () => {
    setConfirmLeaveVisible(false);
    triggerFormReset();
    clearGuard();
    router.navigate('/(tabs)');
  };

  return {
    editor,
    isSubmitting,
    isLoading,
    isValid,
    confirmLeaveVisible,
    setConfirmLeaveVisible,
    handleSubmit,
    handleCancel,
    handleConfirmLeave,
  };
}
