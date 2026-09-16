import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useMentionSearch } from '@/features/search/hooks/useMentionSearch';
import type { ApiUserSearchResult } from '@/shared/api/types';
import { useCommentsStore } from '../stores/commentsStore';
import { useRepostsStore } from '@/features/facts/stores/repostsStore';
import { useUIStore } from '@/shared/stores/uiStore';
import { safeInsertText, cleanSurrogates } from '@/utils/text';
import type { ReplyTarget } from '../components/CommentReplyBanner';

export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 500;

export const INITIAL_LINE_HEIGHT = 34;
export const MAX_HEIGHT = 96;

export interface UseCommentComposerParams {
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

export function useCommentComposer({
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
}: UseCommentComposerParams) {
  const { t } = useTranslation(['common', 'create']);
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

  const [prevTarget, setPrevTarget] = useState({
    mode,
    commentId,
    replyToCommentId: replyTo?.commentId,
  });

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
        if (isRepost && repostEntryId) await updateRepostComment(repostEntryId, commentId, trimmed);
        else if (factId) await updateComment(factId, commentId, trimmed);
        useUIStore.getState().showToast(t('common:commentUpdated'), 'success');
      } else if (replyTo) {
        if (isRepost && repostEntryId) await addRepostComment(repostEntryId, trimmed, replyTo.commentId);
        else if (factId) await addComment(factId, trimmed, replyTo.commentId);
        useUIStore.getState().showToast(t('common:replyPosted'), 'success');
      } else {
        if (isRepost && repostEntryId) await addRepostComment(repostEntryId, trimmed);
        else if (factId) await addComment(factId, trimmed);
        useUIStore.getState().showToast(t('common:commentPosted'), 'success');
      }
      setContent('');
      setInputHeight(INITIAL_LINE_HEIGHT);
      onDone?.();
    } catch (error) {
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

  return {
    content,
    isSubmitting,
    inputHeight,
    focused,
    showEmojiPicker,
    setShowEmojiPicker,
    inputRef,
    showMentions,
    isSearchingMentions,
    mentionResults,
    selectedMentionIndex,
    setSelectedMentionIndex,
    canSubmit,
    postLabel,
    handleContentSizeChange,
    handleFocus,
    handleContentChange,
    handleSelectionChange,
    handleContentBlur,
    handleSelectMention,
    handleSubmit,
    handleCancelEdit,
    handleCancelReply,
    handleEmojiPress,
    handleEmojiSelected,
  };
}
