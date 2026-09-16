import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CharCounter } from '@/shared/ui/CharCounter';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { EmojiPicker, EmojiButton } from '@/shared/ui/EmojiPicker';
import { MentionDropdown, HashtagDropdown } from '@/shared/ui';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { AppPressable } from '@/shared/ui/app-pressable';
import { BottomTabInset, Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useFacts } from '../hooks/useFacts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useCreateScreenGuard } from '../guards/createScreenGuard';
import { useUIStore } from '@/shared/stores/uiStore';
import { useMentionSearch } from '@/features/search/hooks/useMentionSearch';
import { useHashtagSearch } from '@/features/search/hooks/useHashtagSearch';
import type { ApiUserSearchResult, ApiHashtag } from '@/shared/api/types';
import { safeInsertText, cleanSurrogates } from '@/utils/text';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

export function CreateFactScreen() {

  const { t } = useTranslation(['create', 'common']);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const cursorPositionRef = useRef(0);
  const previousTextLengthRef = useRef(0);
  const hasCheckedAuth = useRef(false);
  const contentInputRef = useRef<TextInput>(null);

  const { addFact } = useFacts();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const segments = useSegments();
  const showToast = useUIStore((s) => s.showToast);
  const topInset = useTopInset();
  const {
    setHasUnsavedChanges,
    clearGuard,
    formResetCount,
    hasUnsavedChanges,
    triggerFormReset,
  } = useCreateScreenGuard();

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

  // Clear the form when the user confirms leaving via the tab guard modal
  const [prevFormResetCount, setPrevFormResetCount] = useState(formResetCount);
  if (formResetCount !== prevFormResetCount) {
    setPrevFormResetCount(formResetCount);
    if (formResetCount > 0) {
      setTitle('');
      setContent('');
    }
  }

  useEffect(() => {
    if (formResetCount === 0) return;
    closeMentions();
    closeHashtags();
    clearGuard();
  }, [formResetCount, clearGuard, closeMentions, closeHashtags]);

  // Redirect to login on initial visit when unauthenticated
  useEffect(() => {
    const isOnAuthScreen = (segments as string[]).includes('auth');
    if (!isAuthenticated && !isOnAuthScreen) {
      if (!hasCheckedAuth.current) {
        hasCheckedAuth.current = true;
        router.replace('/auth/login');
      }
    } else if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated, segments, router]);

  // Cleanup autocomplete state on unmount
  useEffect(() => {
    return () => {
      closeMentions();
      closeHashtags();
      clearGuard();
    };
  }, [clearGuard, closeMentions, closeHashtags]);

  // Track unsaved changes for tab navigation guard
  useEffect(() => {
    const hasChanges = title.length > 0 || content.length > 0 || showMentions || showHashtags;
    setHasUnsavedChanges(hasChanges);
  }, [title, content, showMentions, showHashtags, setHasUnsavedChanges]);

  // Intercept Android hardware back button
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

      // Detect @mention trigger
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

      // Detect #hashtag trigger
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

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedLength = content.trim().length;
    if (trimmedLength === 0) {
      showToast(t('create:contentRequired'), 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanTitle = title.trim() ? cleanSurrogates(title.trim()) : undefined;
      const cleanContent = cleanSurrogates(content.trim());
      await addFact({
        title: cleanTitle,
        content: cleanContent,
      });
      setTitle('');
      setContent('');
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
    setTitle('');
    setContent('');
    clearGuard();
    router.navigate('/(tabs)');
  };

  const handleConfirmLeave = () => {
    setConfirmLeaveVisible(false);
    triggerFormReset();
    clearGuard();
    router.navigate('/(tabs)');
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <ThemedView style={[styles.container, { paddingTop: topInset }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">{t('create:headerTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('create:headerSubtitle')}
            </ThemedText>
          </View>

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
                onPress={handleCancel}
                disabled={isSubmitting}
                hitSlop={6}
                style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelText}>
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                hitSlop={6}
                style={[
                  styles.button,
                  styles.submitButton,
                  {
                    backgroundColor: isValid ? theme.primary : theme.muted,
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={styles.submitText}>
                  {isSubmitting ? t('create:submittingButton') : t('create:submitButton')}
                </ThemedText>
              </AppPressable>
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
          requestAnimationFrame(() => contentInputRef.current?.focus());
        }}
        onSelect={handleEmojiSelected}
      />

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
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
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
    position: 'relative',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  contentContainer: {
    position: 'relative',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 120,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three + 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
