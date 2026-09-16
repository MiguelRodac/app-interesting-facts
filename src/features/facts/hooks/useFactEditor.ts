import { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput } from 'react-native';
import { useMentionSearch } from '@/features/search/hooks/useMentionSearch';
import { useHashtagSearch } from '@/features/search/hooks/useHashtagSearch';
import type { ApiUserSearchResult, ApiHashtag } from '@/shared/api/types';
import { safeInsertText } from '@/utils/text';

export const FACT_MIN_LENGTH = 10;
export const FACT_MAX_LENGTH = 1000;

interface UseFactEditorOptions {
  initialTitle?: string;
  initialContent?: string;
}

export function useFactEditor(options?: UseFactEditorOptions) {
  const [title, setTitle] = useState(options?.initialTitle ?? '');
  const [content, setContent] = useState(options?.initialContent ?? '');
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

  // Cleanup autocomplete dropdowns on unmount
  useEffect(() => {
    return () => {
      closeMentions();
      closeHashtags();
    };
  }, [closeMentions, closeHashtags]);

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

  const resetForm = useCallback((newTitle = '', newContent = '') => {
    setTitle(newTitle);
    setContent(newContent);
    closeMentions();
    closeHashtags();
  }, [closeMentions, closeHashtags]);

  return {
    title,
    setTitle,
    content,
    setContent,
    contentInputRef,
    showEmojiPicker,
    setShowEmojiPicker,
    showMentions,
    isSearchingMentions,
    mentionResults,
    selectedMentionIndex,
    setSelectedMentionIndex,
    showHashtags,
    isSearchingHashtags,
    hashtagResults,
    selectedHashtagIndex,
    setSelectedHashtagIndex,
    handleContentChange,
    handleSelectionChange,
    handleContentBlur,
    handleSelectMention,
    handleSelectHashtag,
    handleEmojiSelected,
    closeMentions,
    closeHashtags,
    resetForm,
  };
}
