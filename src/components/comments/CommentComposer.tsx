import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { Radii, Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { useAuth } from '@/data/hooks/useAuth';
import type { ApiUserSearchResult } from '@/data/api/types';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { EmojiPicker, EmojiButton } from '@/components/EmojiPicker';

const client = createApiClient(getIdToken);

/** Comment content is 1-500 chars after trim (backend min is being relaxed to 1). */
export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_MAX_LENGTH = 500;

/** Single-line input height (matches one wrapped text line + vertical padding). */
const INITIAL_LINE_HEIGHT = 34;
/** Auto-expansion cap — beyond this the input scrolls internally instead of growing. */
const MAX_HEIGHT = 96;

export interface ReplyTarget {
  commentId: string;
  username: string;
  initialText?: string;
}

type ComposerMode = 'create' | 'edit';

interface CommentComposerProps {
  /** Fact id — used for fact comments. Mutually exclusive with repostEntryId. */
  factId?: string;
  /** Repost entry id — used for repost comments. Mutually exclusive with factId. */
  repostEntryId?: string;
  /** Set (create mode) → reply to another author's comment; empty → new top-level comment. */
  replyTo?: ReplyTarget | null;
  /** Fired when the inline replying chip's cancel (X) is tapped. */
  onCancelReply?: () => void;
  /** Fired after a successful create/reply POST (cleared input) — used to blur/reset focus. */
  onDone?: () => void;
  /** 'edit' reuses the same composer to edit one of the author's own comments. */
  mode?: ComposerMode;
  /** The comment being edited (edit mode) — drives updateComment(factId, commentId, content). */
  commentId?: string;
  /** Initial content to edit (edit mode). */
  initialValue?: string;
  /** Fired when the edit Cancel button is tapped (edit mode). */
  onCancelEdit?: () => void;
  /** Fired whenever the pending draft text changes — lets the parent screen
   *  arm its unsaved-changes guard (true while unsubmitted text exists). */
  onPendingTextChange?: (hasPending: boolean) => void;
}

/**
 * Minimal Instagram/Facebook-style comment bar, pinned at the bottom of the
 * fact detail (the parent mounts it OUTSIDE the ScrollView so it stays visible
 * while the thread scrolls).
 *
 * Clean single-row layout: avatar + multiline TextInput + a plain "Post" text
 * button that enables only when the 1-char minimum is met. There is NO visible
 * CharCounter and NO filled pill button. The 500-char maxLength and the 1-char
 * minimum gate stay silent (validated on submit by disabling Post while short).
 *
 * @mention autocomplete is preserved (GET /users/search) but restyled to blend —
 * a subtle bottom:'100%' dropdown above the input. Signed-in authors only; the
 * parent decides whether to mount it at all.
 */
export function CommentComposer({
  factId,
  repostEntryId,
  replyTo,
  onCancelReply,
  onDone,
  mode = 'create',
  commentId,
  initialValue = '',
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

  // Auto-growing multiline + YouTube-style bottom-underline focus. The input
  // starts one line tall, expands with content up to MAX_HEIGHT, then scrolls
  // internally. Focus only lights up a bottom underline instead of the box.
  const [inputHeight, setInputHeight] = useState(INITIAL_LINE_HEIGHT);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!content) {
      setInputHeight(INITIAL_LINE_HEIGHT);
    }
  }, [content]);

  const handleContentSizeChange = useCallback((event: {
    nativeEvent: { contentSize: { height: number } };
  }) => {
    if (!content) {
      setInputHeight(INITIAL_LINE_HEIGHT);
      return;
    }
    setInputHeight(Math.max(INITIAL_LINE_HEIGHT, Math.min(event.nativeEvent.contentSize.height, MAX_HEIGHT)));
  }, [content]);

  const handleFocus = useCallback(() => setFocused(true), []);

  // Mention autocomplete state (mirrors create.tsx, mentions only).
  const [mentionResults, setMentionResults] = useState<ApiUserSearchResult[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const cursorPositionRef = useRef(0);
  const previousTextLengthRef = useRef(0);
  const mentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMentionQueryRef = useRef('');
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedLength = content.trim().length;
  const canSubmit =
    trimmedLength >= COMMENT_MIN_LENGTH && trimmedLength <= COMMENT_MAX_LENGTH && !isSubmitting;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const avatarUser = user
    ? {
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl,
      }
    : null;

  // Clear any pending timeouts when the composer unmounts.
  useEffect(() => {
    const timeout = mentionTimeoutRef.current;
    const blur = blurTimeoutRef.current;
    return () => {
      if (timeout) clearTimeout(timeout);
      if (blur) clearTimeout(blur);
    };
  }, []);

  // Sync content when the parent swaps the same mounted composer between create
  // and edit modes, or sets/clears replyTo.
  useEffect(() => {
    if (mode === 'edit' && commentId) {
      setContent(initialValue);
    } else if (replyTo) {
      const text = replyTo.initialText ?? '';
      setContent(text);
      cursorPositionRef.current = text.length;
      setShowMentions(false);
      setMentionResults([]);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setContent('');
      setInputHeight(INITIAL_LINE_HEIGHT);
      setShowMentions(false);
      setMentionResults([]);
    }
  }, [mode, commentId, initialValue, replyTo]);

  // Tell the parent when there's unsubmitted draft text so it can arm its
  // unsaved-changes guard. InitialValue in edit mode is not "pending", so
  // report from the first render based on the current content.
  useEffect(() => {
    onPendingTextChange?.(content.length > 0);
  }, [content, onPendingTextChange]);

  const searchMentions = useCallback((query: string) => {
    latestMentionQueryRef.current = query;

    if (mentionTimeoutRef.current) clearTimeout(mentionTimeoutRef.current);

    if (query.length < 1) {
      setMentionResults([]);
      setShowMentions(false);
      return;
    }

    // Debounce: search after 500ms of inactivity (same as create.tsx).
    mentionTimeoutRef.current = setTimeout(async () => {
      const currentQuery = latestMentionQueryRef.current;
      if (currentQuery.length < 1) {
        setMentionResults([]);
        setShowMentions(false);
        return;
      }

      setIsSearchingMentions(true);
      try {
        const response = await client.get<ApiUserSearchResult[] | { results: ApiUserSearchResult[] }>(
          '/users/search',
          { q: currentQuery },
        );
        const results = Array.isArray(response) ? response : (response.results ?? []);
        const normalizedQuery = currentQuery.toLowerCase();
        setMentionResults(
          results.filter((r) => r.username.toLowerCase().includes(normalizedQuery)),
        );
        setSelectedMentionIndex(0);
      } catch {
        setMentionResults([]);
      } finally {
        setIsSearchingMentions(false);
      }
    }, 500);
  }, []);

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      if (!text) {
        setInputHeight(INITIAL_LINE_HEIGHT);
      }

      // Same cursor-fallback logic as create.tsx: onSelectionChange fires
      // after onChangeText, so on a keystroke the ref holds the OLD cursor.
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
          latestMentionQueryRef.current = textAfterAt;
          setShowMentions(true);
          searchMentions(textAfterAt);
          return;
        }
      }

      setShowMentions(false);
      setMentionResults([]);
    },
    [searchMentions],
  );

  const handleSelectionChange = useCallback((event: {
    nativeEvent: { selection: { start: number; end: number } };
  }) => {
    cursorPositionRef.current = event.nativeEvent.selection.start;
  }, []);

  const handleContentBlur = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setFocused(false);
    // Delay lets a suggestion-row tap register first (rows use
    // keyboardShouldPersistTaps="handled").
    blurTimeoutRef.current = setTimeout(() => {
      setShowMentions(false);
      setMentionResults([]);
    }, 150);
  }, []);

  const handleSelectMention = useCallback(
    (userMention: ApiUserSearchResult) => {
      const lastAtIndex = content.lastIndexOf('@', cursorPositionRef.current);
      if (lastAtIndex === -1) return;
      const beforeAt = content.substring(0, lastAtIndex);
      const afterCursor = content.substring(cursorPositionRef.current);
      const newContent = `${beforeAt}@${userMention.username} ${afterCursor}`;

      setContent(newContent);
      setShowMentions(false);
      setMentionResults([]);
      const newCursorPos = beforeAt.length + userMention.username.length + 2;
      cursorPositionRef.current = newCursorPos;
      inputRef.current?.focus();
    },
    [content],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (trimmed.length < COMMENT_MIN_LENGTH || trimmed.length > COMMENT_MAX_LENGTH || isSubmitting) {
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
        onDone?.();
      } else {
        if (isRepost && repostEntryId) {
          await addRepostComment(repostEntryId, trimmed);
        } else if (factId) {
          await addComment(factId, trimmed);
        }
        setContent('');
        setInputHeight(INITIAL_LINE_HEIGHT);
        onDone?.();
      }
    } catch {
      // Error handled by store → uiStore
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    isSubmitting,
    isEdit,
    commentId,
    isRepost,
    repostEntryId,
    factId,
    replyTo,
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
    setShowMentions(false);
    setMentionResults([]);
    onCancelEdit?.();
  }, [onCancelEdit]);

  const handleCancelReply = useCallback(() => {
    setContent('');
    setInputHeight(INITIAL_LINE_HEIGHT);
    setShowMentions(false);
    setMentionResults([]);
    onCancelReply?.();
  }, [onCancelReply]);

  const handleEmojiPress = useCallback(() => setShowEmojiPicker((v) => !v), []);

  const handleEmojiSelected = useCallback((emoji: string) => {
    const pos = cursorPositionRef.current;
    setContent((prev) => {
      const before = prev.substring(0, pos);
      const after = prev.substring(pos);
      return `${before}${emoji}${after}`;
    });
    cursorPositionRef.current = pos + emoji.length;
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
          // Lift the composer above the on-screen keyboard on Android — with
          // edge-to-edge the window doesn't resize, so the fixed bar would
          // otherwise stay hidden behind the IME.
          Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight },
        ]}>
      {/* Subtle reply-to chip, only in create/reply mode with an active target. */}
      {replyTo && !isEdit ? (
        <View style={styles.replyChipRow}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.replyChipText}>
            {t('common:replyingTo')} <ThemedText type="smallBold">@{replyTo.username}</ThemedText>
          </ThemedText>
          <AppPressable onPress={handleCancelReply} hitSlop={8} style={styles.replyCancel}>
            <Ionicons name="close-circle" size={17} color={theme.muted} />
          </AppPressable>
        </View>
      ) : null}

      <View style={[styles.row, { borderTopColor: theme.border }]}>
        {/* Avatar — current signed-in user. */}
        {avatarUser ? (
          <View style={styles.avatar}>
            <UserAvatar user={avatarUser} size={32} />
          </View>
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}

        <View style={styles.inputWrap}>
          <View
            style={[
              styles.inputUnderline,
              { borderBottomColor: focused ? theme.primary : theme.border },
            ]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                { color: theme.text, height: inputHeight },
              ]}
              placeholder={isEdit ? t('common:editCommentPlaceholder') : t('common:addCommentPlaceholder')}
              placeholderTextColor={theme.muted}
              value={content}
              onChangeText={handleContentChange}
              onSelectionChange={handleSelectionChange}
              onFocus={handleFocus}
              onBlur={handleContentBlur}
              onContentSizeChange={handleContentSizeChange}
              maxLength={COMMENT_MAX_LENGTH}
              multiline
              scrollEnabled={inputHeight >= MAX_HEIGHT}
              textAlignVertical="top"
              editable={!isSubmitting}
              autoFocus={isEdit || !!replyTo}
            />
          </View>

          {showMentions && (
            <View
              style={[
                styles.autocompleteDropdown,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              {isSearchingMentions ? (
                <View style={styles.autocompleteState}>
                  <ActivityIndicator size="small" color={theme.muted} />
                </View>
              ) : mentionResults.length === 0 ? (
                <View style={styles.autocompleteState}>
                  <ThemedText type="small" themeColor="muted">
                    {t('create:noUsersFound')}
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={mentionResults}
                  keyExtractor={(item) => item.username}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item, index }) => (
                    <AppPressable
                      style={[
                        styles.autocompleteItem,
                        index === selectedMentionIndex && { backgroundColor: theme.backgroundSelected },
                      ]}
                      onPress={() => handleSelectMention(item)}
                      onPressIn={() => setSelectedMentionIndex(index)}>
                      <UserAvatar
                        user={{
                          displayName: item.displayName,
                          avatarColor: item.avatarColor ?? '#64B5F6',
                          avatarUrl: item.avatarUrl,
                        }}
                        size={28}
                      />
                      <View style={styles.autocompleteInfo}>
                        <ThemedText type="smallBold" themeColor="text">
                          {item.username}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.displayName}
                        </ThemedText>
                      </View>
                    </AppPressable>
                  )}
                />
              )}
            </View>
          )}
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
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ThemedText
                type="smallBold"
                style={[styles.postText, { color: canSubmit ? theme.primary : theme.muted }]}>
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
  // Fixed bar — clean, borderless card; separation via a subtle top hairline.
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  replyChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  replyChipText: {
    flexShrink: 1,
  },
  replyCancel: {
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    // Small nudge down so the 32px avatar's vertical center lines up with the
    // input's first text line (top-aligned, Instagram-style) instead of sitting
    // flush at the row top or being pushed low by multiline growth.
    marginTop: Spacing.half,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    marginTop: Spacing.half,
  },
  inputWrap: {
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
  autocompleteDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 220,
    marginBottom: Spacing.two,
    borderRadius: Radii.lg,
    borderWidth: 1,
    zIndex: 1000,
    overflow: 'hidden',
  },
  autocompleteState: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  autocompleteInfo: {
    flex: 1,
    gap: 1,
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
  emojiButton: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
  },
});
