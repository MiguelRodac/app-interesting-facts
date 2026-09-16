import { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFactsStore } from '../stores/factsStore';
import { useUIStore } from '@/shared/stores/uiStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Fact } from '@/types';
import { cleanSurrogates } from '@/utils/text';
import { useFactEditor } from './useFactEditor';

export function useEditFactScreen() {
  const { t } = useTranslation(['create', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const showToast = useUIStore((s) => s.showToast);

  const facts = useFactsStore((s) => s.facts);
  const userFacts = useFactsStore((s) => s.userFacts);
  const fetchFactById = useFactsStore((s) => s.fetchFactById);
  const updateFact = useFactsStore((s) => s.updateFact);

  const initialFact = (id ? (facts.find((f) => f.id === id) ?? userFacts.find((f) => f.id === id)) : null) ?? null;

  const [fact, setFact] = useState<Fact | null>(initialFact);
  const [loading, setLoading] = useState(!initialFact);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);

  const editor = useFactEditor({
    initialTitle: initialFact?.title ?? '',
    initialContent: initialFact?.content ?? '',
  });

  useEffect(() => {
    if (!id || fact) return;
    let active = true;
    fetchFactById(id)
      .then((fetched) => {
        if (active) {
          setFact(fetched);
          editor.resetForm(fetched.title ?? '', fetched.content);
        }
      })
      .catch(() => {
        if (active) setFact(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, fact, fetchFactById, editor.resetForm]);

  useEffect(() => {
    const isOnAuthScreen = (segments as string[]).includes('auth');
    if (!isAuthenticated && !isOnAuthScreen && !isLoading) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  const hasChanges =
    fact !== null &&
    (editor.title.trim() !== (fact.title ?? '') || editor.content.trim() !== fact.content);

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

  const isValid = editor.content.trim().length > 0;

  const handleSubmit = async () => {
    if (isSubmitting || !fact) return;

    const trimmedLength = editor.content.trim().length;
    if (trimmedLength === 0) {
      showToast(t('create:contentRequired'), 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanTitle = editor.title.trim() ? cleanSurrogates(editor.title.trim()) : undefined;
      const cleanContent = cleanSurrogates(editor.content.trim());
      await updateFact(fact.id, {
        title: cleanTitle,
        content: cleanContent,
      });
      showToast(t('create:factUpdatedSuccess', { defaultValue: 'Fact updated successfully' }), 'success');
      router.back();
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setConfirmLeaveVisible(true);
    } else {
      router.back();
    }
  };

  const handleConfirmLeave = () => {
    setConfirmLeaveVisible(false);
    router.back();
  };

  return {
    fact,
    loading: loading || isLoading,
    isSubmitting,
    hasChanges,
    isValid,
    confirmLeaveVisible,
    setConfirmLeaveVisible,
    editor,
    handleSubmit,
    handleCancel,
    handleConfirmLeave,
    router,
  };
}
