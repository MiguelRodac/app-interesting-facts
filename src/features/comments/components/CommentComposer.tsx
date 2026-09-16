import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { AppPressable } from '@/components/ui/app-pressable';
import { MentionDropdown } from '@/components/MentionDropdown';
import { Radii, Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useMentionSearch } from '@/hooks/useMentionSearch';
import { useAuth } from '@/data/hooks/useAuth';
import type { ApiUserSearchResult } from '@/data/api/types';
import { useCommentsStore } from '../stores/commentsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { EmojiPicker, EmojiButton } from '@/components/EmojiPicker';
import { safeInsertText, cleanSurrogates } from '@/utils/text';

export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 500;

const INITIAL_LINE_HEIGHT = 34;
const MAX_HEIGHT = 96;

export interface ReplyTarget {
  commentId: string;
  username: string;
  authorUsername?: string;
  initialText?: string;
}

export interface CommentComposerProps {
  factId?: string;
  repostEntryId?: string;
  commentId?: string;
  mode?: 'create' | 'edit';
  initialValue?: string;
  replyTo?: ReplyTarget | null;
  onDone?: () => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onPendingTextChange?: (hasPendingText: boolean) => void;
}

export function CommentComposer({
  factId,
  repostEntryId,
  commentId,
  mode = 'create',
  initialValue = '',
  replyTo = null,
  onDone,
  onCancelReply,
  onCancelEdit,
  onPendingTextChange,
}: CommentComposerProps) {
  const { t } = useTranslation(['common', 'create']);
  const theme = useTheme();
  const { user } = useAuth();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = mode === 'edit';
  const isRepost = !!repostEntryId;
  const addComment = useCommentsStore((s) => s.addComment);
  const updateComment = useCommentsStore((s) => s.updateComment);
  const addRepostComment = useRepostsStore((s) => s.addRepostComment);
  const updateRepostComment = useRepostsStore((s) => s.updateRepostComment);

  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputHeight, setInputHeight] = useState(INITIAL_LINE_HEIGHT);
  const [focused, setFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const cursorPositionRef = useRef(0);
  const previousTextLengthRef = useRef(0);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const trimmedLength = content.trim().length;
  const canSubmit =
    trimmedLength >= COMMENT_MIN_LENGTH && trimmedLength <= COMMENT_MAX_LENGTH && !isSubmitting;

  const avatarUser = user
    ? {
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl,
      }
    : { displayName: 'User' };

  const [prevTarget, setPrevTarget] = useState({ mode, commentId, replyToCommentId: replyTo?.commentId });
  if (
    prevTarget.mode !== mode ||
    prevTarget.commentId !== commentId ||
    prevTarget.replyToCommentId !== replyTo?.commentId
  ) {
    setPrevTarget({ mode, commentId, replyToCommentId: replyTo?.commentId });
    if (mode === 'edit' && commentId) {
      setContent(initialValue);
    } else if (replyTo) {
      setContent(replyTo.initialText ?? '');
    } else {
      setContent('');
      setInputHeight(INITIAL_LINE_HEIGHT);
    }
  }

  useEffect(() => {
    const blur = blurTimeoutRef.current;
    return () => {
      if (blur) clearTimeout(blur);
    };
  }, []);

  useEffect(() => {
    if (replyTo) {
      cursorPositionRef.current = (replyTo.initialText ?? '').length;
      closeMentions();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [replyTo, closeMentions]);

  useEffect(() => {
    onPendingTextChange?.(content.length > 0);
  }, [content, onPendingTextChange]);

  const handleContentSizeChange = useCallback(
    (event: { nativeEvent: { contentSize: { height: number } } }) => {
      if (!content) {
        setInputHeight(INITIAL_LINE_HEIGHT);
        return;
      }
      setInputHeight(
        Math.max(INITIAL_LINE_HEIGHT, Math.min(event.nativeEvent.contentSize.height, MAX_HEIGHT))
      );
    },
    [content]
  );

  const handleFocus = useCallback(() => setFocused(true), []);

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      if (!text) {
        setInputHeight(INITIAL_LINE_HEIGHT);
      }

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
          searchMentions(textAfterAt);
          return;
        }
      }

      closeMentions();
    },
    [searchMentions, closeMentions, setShowMentions]
  );

  const handleSelectionChange = useCallback(
    (event: { nativeEvent: { selection: { start: number; end: number } } }) => {
      cursorPositionRef.current = event.nativeEvent.selection.start;
    },
    []
  );

  const handleContentBlur = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setFocused(false);
    blurTimeoutRef.current = setTimeout(() => {
      closeMentions();
    }, 150);
  }, [closeMentions]);

  const handleSelectMention = useCallback(
    (userMention: ApiUserSearchResult) => {
      const { newContent, newCursor } = applyMention(content, cursorPositionRef.current, userMention);
      setContent(newContent);
      cursorPositionRef.current = newCursor;
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [content, applyMention]
  );

  const handleSubmit = useCallback(async () => {
    const rawTrimmed = content.trim();
    const trimmed = cleanSurrogates(rawTrimmed);
    if (trimmed.length < COMMENT_MIN_LENGTH || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && commentId) {
        if (isRepost && repostEntryId) {
          await updateRepostComment(repostEntryId, commentId, trimmed);
        } else if (factId) {
          await updateComment(factId, commentId, trimmed);
        }
        setContent('');
        setInputHeight(INITIAL_LINE_HEIGHT);
        useUIStore.getState().showToast(t('common:commentUpdated'), 'success');
        onDone?.();
      } else if (replyTo) {
        if (isRepost && repostEntryId) {
          await addRepostComment(repostEntryId, trimmed, replyTo.commentId);
        } else if (factId) {
          await addComment(factId, trimmed, replyTo.commentId);
        }
        setContent('');
        setInputHeight(INITIAL_LINE_HEIGHT);
        useUIStore.getState().showToast(t('common:replyPosted'), 'success');
        onDone?.();
      } else {
        if (isRepost && repostEntryId) {
          await addRepostComment(repostEntryId, trimmed);
        } else if (factId) {
          await addComment(factId, trimmed);
        }
        setContent('');
        setInputHeight(INITIAL_LINE_HEIGHT);
        useUIStore.getState().showToast(t('common:commentPosted'), 'success');
        onDone?.();
      }
    } catch (error) {
      // The API error is already dispatched to useUIStore by the store (→ ErrorBanner),
      // but we log it here to avoid swallowing unexpected runtime or render errors.
      console.error('[CommentComposer] Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    isSubmitting,
    isEdit,
    commentId,
    replyTo,
    isRepost,
    repostEntryId,
    factId,
    updateRepostComment,
    updateComment,
    addRepostComment,
    addComment,
    onDone,
    t,
  ]);

  const handleCancelEdit = useCallback(() => {
    setContent('');
    setInputHeight(INITIAL_LINE_HEIGHT);
    closeMentions();
    onCancelEdit?.();
  }, [onCancelEdit, closeMentions]);

  const handleCancelReply = useCallback(() => {
    setContent('');
    setInputHeight(INITIAL_LINE_HEIGHT);
    closeMentions();
    onCancelReply?.();
  }, [onCancelReply, closeMentions]);

  const handleEmojiPress = useCallback(() => setShowEmojiPicker((v) => !v), []);

  const handleEmojiSelected = useCallback((emoji: string) => {
    const pos = cursorPositionRef.current;
    setContent((prev) => {
      const { text, newCursor } = safeInsertText(prev, emoji, pos);
      cursorPositionRef.current = newCursor;
      return text;
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const postLabel = isEdit ? t('common:save') : t('common:post');

  return (
    <>
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelected}
      />
      <View
        style={[
          styles.wrap,
          { borderTopColor: theme.border, backgroundColor: theme.background },
          Platform.OS === 'ios' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}>
        {replyTo ? (
          <View style={[styles.replyBanner, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="return-down-forward" size={16} color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.replyText} numberOfLines={1}>
              {t('common:replyingTo', { username: replyTo.username || replyTo.authorUsername || '' })}
            </ThemedText>
            <AppPressable onPress={handleCancelReply} hitSlop={8} style={styles.replyDismiss}>
              <Ionicons name="close" size={16} color={theme.textSecondary} />
            </AppPressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <UserAvatar user={avatarUser} size={32} />
          <View style={styles.inputCol}>
            <View
              style={[
                styles.inputUnderline,
                { borderBottomColor: focused ? theme.primary : theme.border },
              ]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { color: theme.text, height: !content ? INITIAL_LINE_HEIGHT : inputHeight },
                ]}
                placeholder={isEdit ? t('common:editCommentPlaceholder') : t('common:addCommentPlaceholder')}
                placeholderTextColor={theme.muted}
                value={content}
                onChangeText={handleContentChange}
                onSelectionChange={handleSelectionChange}
                onFocus={handleFocus}
                onBlur={handleContentBlur}
                onContentSizeChange={handleContentSizeChange}
                multiline
                scrollEnabled={inputHeight >= MAX_HEIGHT}
                textAlignVertical="top"
                editable={!isSubmitting}
                autoFocus={isEdit || !!replyTo}
              />
            </View>

            <MentionDropdown
              visible={showMentions}
              loading={isSearchingMentions}
              results={mentionResults}
              selectedIndex={selectedMentionIndex}
              onSelect={handleSelectMention}
              onSelectIndex={setSelectedMentionIndex}
            />
          </View>

          <View style={styles.actions}>
            {isEdit ? (
              <AppPressable onPress={handleCancelEdit} disabled={isSubmitting} hitSlop={6} style={styles.textButton}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cancelText}>
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
            ) : null}
            <View style={styles.actionsSpacer} />
            <EmojiButton onPress={handleEmojiPress} active={showEmojiPicker} />
            <AppPressable
              onPress={canSubmit ? handleSubmit : undefined}
              disabled={!canSubmit}
              hitSlop={6}
              style={styles.textButton}>
              {isSubmitting ? (
                <ThemedText type="smallBold" themeColor="muted" style={styles.postText}>
                  ...
                </ThemedText>
              ) : (
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.postText,
                    { color: canSubmit ? theme.primary : theme.muted },
                  ]}>
                  {postLabel}
                </ThemedText>
              )}
            </AppPressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.sm,
    marginBottom: Spacing.one,
  },
  replyText: {
    flex: 1,
    fontSize: 13,
  },
  replyDismiss: {
    padding: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inputCol: {
    flex: 1,
    position: 'relative',
  },
  inputUnderline: {
    borderBottomWidth: 1.5,
    paddingBottom: Spacing.half,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: Spacing.one,
    paddingHorizontal: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  textButton: {
    minWidth: 40,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: {
    fontSize: 15,
  },
  cancelText: {
    fontSize: 15,
  },
  actionsSpacer: {
    width: Spacing.one,
  },
});
