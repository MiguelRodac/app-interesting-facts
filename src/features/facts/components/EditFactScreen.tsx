import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { CharCounter } from '@/shared/ui/CharCounter';
import { EmojiPicker, EmojiButton } from '@/shared/ui/EmojiPicker';
import { MentionDropdown } from './MentionDropdown';
import { HashtagDropdown } from './HashtagDropdown';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useFactsStore } from '../stores/factsStore';
import { useUIStore } from '@/shared/stores/uiStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';
import { useMentionSearch } from '@/features/search/hooks/useMentionSearch';
import { useHashtagSearch } from '@/features/search/hooks/useHashtagSearch';
import type { ApiUserSearchResult, ApiHashtag } from '@/shared/api/types';
import type { Fact } from '@/types';
import { safeInsertText, cleanSurrogates } from '@/utils/text';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

export function EditFactScreen() {

  const { t } = useTranslation(['create', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const hasCheckedAuth = useRef(false);

  const facts = useFactsStore((s) => s.facts);
  const userFacts = useFactsStore((s) => s.userFacts);
  const fetchFactById = useFactsStore((s) => s.fetchFactById);
  const updateFact = useFactsStore((s) => s.updateFact);

  const initialFact = (id ? (facts.find((f) => f.id === id) ?? userFacts.find((f) => f.id === id)) : null) ?? null;

  const [fact, setFact] = useState<Fact | null>(initialFact);
  const [loading, setLoading] = useState(!initialFact);
  const [title, setTitle] = useState(initialFact?.title ?? '');
  const [content, setContent] = useState(initialFact?.content ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const cursorPositionRef = useRef(0);
  const previousTextLengthRef = useRef(0);
  const contentInputRef = useRef<TextInput>(null);

  const {
    showMentions,
    setShowMentions,
    mentionResults,
    isSearchingMentions,
    selectedMentionIndex,
    setSelectedMentionIndex,
    searchMentions,
    closeMentions,
    applyMention,
  } = useMentionSearch();

  const {
    showHashtags,
    setShowHashtags,
    hashtagResults,
    isSearchingHashtags,
    selectedHashtagIndex,
    setSelectedHashtagIndex,
    searchHashtags,
    closeHashtags,
    applyHashtag,
  } = useHashtagSearch();

  useEffect(() => {
    if (!id || fact) return;
    let active = true;
    fetchFactById(id)
      .then((fetched) => {
        if (active) {
          setFact(fetched);
          setTitle(fetched.title ?? '');
          setContent(fetched.content);
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
  }, [id, fact, fetchFactById]);

  useEffect(() => {
    return () => {
      closeMentions();
      closeHashtags();
    };
  }, [closeMentions, closeHashtags]);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      if (!hasCheckedAuth.current) {
        hasCheckedAuth.current = true;
        router.replace('/auth/login');
      }
    } else if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated, isLoading, router, segments]);

  const hasChanges =
    fact !== null &&
    (title.trim() !== (fact.title ?? '') || content.trim() !== fact.content);

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

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);

      const rawCursorPos = cursorPositionRef.current;
      const cursorPos =
        rawCursorPos >= text.length ||
        (rawCursorPos === 0 && text.length > 0) ||
        rawCursorPos === previousTextLengthRef.current
          ? text.length
          : rawCursorPos;
      previousTextLengthRef.current = text.length;

      const lastAtIndex = text.lastIndexOf('@', cursorPos);
      if (lastAtIndex !== -1) {
        const textAfterAt = text.substring(lastAtIndex + 1, cursorPos);
        if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
          setShowMentions(true);
          closeHashtags();
          searchMentions(textAfterAt);
          return;
        }
      }

      const lastHashIndex = text.lastIndexOf('#', cursorPos);
      if (lastHashIndex !== -1) {
        const textAfterHash = text.substring(lastHashIndex + 1, cursorPos);
        if (!textAfterHash.includes(' ') && textAfterHash.length <= 30) {
          setShowHashtags(true);
          closeMentions();
          searchHashtags(textAfterHash);
          return;
        }
      }

      closeMentions();
      closeHashtags();
    },
    [searchMentions, searchHashtags, closeMentions, closeHashtags, setShowMentions, setShowHashtags]
  );

  const handleSelectionChange = useCallback(
    (event: { nativeEvent: { selection: { start: number; end: number } } }) => {
      cursorPositionRef.current = event.nativeEvent.selection.start;
    },
    []
  );

  const handleContentBlur = useCallback(() => {
    setTimeout(() => {
      closeMentions();
      closeHashtags();
    }, 150);
  }, [closeMentions, closeHashtags]);

  const handleSelectMention = useCallback(
    (user: ApiUserSearchResult) => {
      const { newContent, newCursor } = applyMention(content, cursorPositionRef.current, user);
      setContent(newContent);
      cursorPositionRef.current = newCursor;
      requestAnimationFrame(() => contentInputRef.current?.focus());
    },
    [content, applyMention]
  );

  const handleSelectHashtag = useCallback(
    (hashtag: ApiHashtag) => {
      const { newContent, newCursor } = applyHashtag(content, cursorPositionRef.current, hashtag);
      setContent(newContent);
      cursorPositionRef.current = newCursor;
      requestAnimationFrame(() => contentInputRef.current?.focus());
    },
    [content, applyHashtag]
  );

  const handleEmojiSelected = useCallback((emoji: string) => {
    const pos = cursorPositionRef.current;
    setContent((prev) => {
      const { text, newCursor } = safeInsertText(prev, emoji, pos);
      cursorPositionRef.current = newCursor;
      previousTextLengthRef.current = text.length;
      return text;
    });
  }, []);

  const isValid = content.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting || !fact || !hasChanges) return;

    setIsSubmitting(true);
    try {
      const cleanTitle = title.trim() ? cleanSurrogates(title.trim()) : undefined;
      const cleanContent = cleanSurrogates(content.trim());
      await updateFact(fact.id, {
        title: cleanTitle,
        content: cleanContent,
      });
      useUIStore.getState().showToast(t('common:factUpdated', { defaultValue: 'Dato actualizado exitosamente' }), 'success');
      router.replace(`/fact/${fact.id}`);
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, fact, hasChanges, title, content, updateFact, router, t]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setConfirmLeaveVisible(true);
      return;
    }
    if (fact) {
      router.navigate(`/fact/${fact.id}`);
    }
  }, [router, fact, hasChanges]);

  const handleConfirmLeave = useCallback(() => {
    setConfirmLeaveVisible(false);
    if (fact) {
      router.navigate(`/fact/${fact.id}`);
    }
  }, [router, fact]);

  if (loading) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: topInset }]}>
        <ThemedText type="default">
          {t('common:factNotFound', { defaultValue: 'Dato no encontrado' })}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <ThemedView style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset + Spacing.two }]}>
        {/* Header */}
        <View style={styles.header}>
          <AppPressable
            onPress={handleCancel}
            disabled={isSubmitting}
            hitSlop={8}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </AppPressable>
          <View style={styles.headerContent}>
            <ThemedText type="subtitle">{t('create:editTitle')}</ThemedText>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title field */}
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('create:fieldTitle')}
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
              placeholder={t('create:titlePlaceholder')}
              placeholderTextColor={theme.muted}
              value={title}
              onChangeText={setTitle}
              editable={!isSubmitting}
            />
          </View>

          {/* Content field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('create:fieldContent')}
              </ThemedText>
              <View style={styles.fieldHeaderRight}>
                <EmojiButton onPress={() => setShowEmojiPicker((v) => !v)} active={showEmojiPicker} />
                <CharCounter current={content.trim().length} min={MIN_LENGTH} max={MAX_LENGTH} />
              </View>
            </View>
            <View style={styles.contentContainer}>
              <TextInput
                ref={contentInputRef}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t('create:contentPlaceholder')}
                placeholderTextColor={theme.muted}
                value={content}
                onChangeText={handleContentChange}
                onSelectionChange={handleSelectionChange}
                onBlur={handleContentBlur}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              <MentionDropdown
                visible={showMentions}
                loading={isSearchingMentions}
                results={mentionResults}
                selectedIndex={selectedMentionIndex}
                onSelect={handleSelectMention}
                onSelectIndex={setSelectedMentionIndex}
              />

              <HashtagDropdown
                visible={showHashtags}
                loading={isSearchingHashtags}
                results={hashtagResults}
                selectedIndex={selectedHashtagIndex}
                onSelect={handleSelectHashtag}
                onSelectIndex={setSelectedHashtagIndex}
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <AppPressable
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border },
              ]}
              onPress={handleCancel}>
              <ThemedText type="smallBold" style={styles.cancelText}>
                {t('common:cancel')}
              </ThemedText>
            </AppPressable>
            <AppPressable
              style={[
                styles.button,
                styles.submitButton,
                {
                  backgroundColor:
                    isValid && hasChanges && !isSubmitting ? theme.primary : theme.muted,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={isValid && hasChanges && !isSubmitting ? handleSubmit : undefined}
              disabled={!isValid || !hasChanges || isSubmitting}>
              <ThemedText type="smallBold" style={styles.submitText}>
                {isSubmitting ? t('create:saving') : t('create:saveChanges')}
              </ThemedText>
            </AppPressable>
          </View>
        </View>
      </ThemedView>

      <ConfirmDialog
        visible={confirmLeaveVisible}
        title={t('create:leaveConfirmTitle')}
        message={t('create:leaveConfirmMessage')}
        confirmLabel={t('create:leaveConfirmExit')}
        cancelLabel={t('create:leaveConfirmStay')}
        destructive
        onConfirm={handleConfirmLeave}
        onCancel={() => setConfirmLeaveVisible(false)}
      />

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
          requestAnimationFrame(() => contentInputRef.current?.focus());
        }}
        onSelect={handleEmojiSelected}
      />
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.one,
  },
  headerContent: {
    flex: 1,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  field: {
    gap: Spacing.two,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 120,
  },
  contentContainer: {
    position: 'relative',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    opacity: 0.7,
  },
  submitButton: {},
  submitText: {
    color: '#FFFFFF',
  },
});
