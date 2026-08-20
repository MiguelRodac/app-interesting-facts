import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CharCounter } from '@/components/CharCounter';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { AppPressable } from '@/components/ui/app-pressable';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiUserSearchResult } from '@/data/api/types';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useTheme } from '@/hooks/use-theme';

const client = createApiClient(getIdToken);

/** Backend contract: comment content is 10-500 chars after trim. */
export const COMMENT_MIN_LENGTH = 10;
export const COMMENT_MAX_LENGTH = 500;

const DROPDOWN_BG = '#26262E';
const DROPDOWN_BORDER = '#3A3A46';

interface ReplyTarget {
  commentId: string;
  username: string;
}

type ComposerMode = 'create' | 'edit';

interface CommentComposerProps {
  factId: string;
  /** Set (create mode) → reply to another author's comment; empty → new top-level comment. */
  replyTo?: ReplyTarget | null;
  /** Fired when the inline replying chip's cancel (X) is tapped. */
  onCancelReply?: () => void;
  /** Fired after a successful create/reply POST (cleared input) — used to blur/reset focus. */
  onDone?: () => void;
  /** 'edit' reuses the same composer inline to edit one of the author's own comments. */
  mode?: ComposerMode;
  /** The comment being edited (edit mode) — drives updateComment(factId, commentId, content). */
  commentId?: string;
  /** Initial content to edit (edit mode). */
  initialValue?: string;
  /** Fired when the edit Cancel button is tapped (edit mode). */
  onCancelEdit?: () => void;
}

/**
 * Inline multiline comment box used for creating, replying and editing.
 * Includes a CharCounter (10-500) and @mention autocomplete with debounced
 * /users/search — the backend validates mentions in comment content (422
 * VALIDATION_ERROR), so the dropdown inserts `@username` phrase exactly as
 * the backend parses. For signed-in authors only; the parent decides whether
 * to mount it at all.
 */
export function CommentComposer({
  factId,
  replyTo,
  onCancelReply,
  onDone,
  mode = 'create',
  commentId,
  initialValue = '',
  onCancelEdit,
}: CommentComposerProps) {
  const theme = useTheme();
  const isEdit = mode === 'edit';
  const addComment = useCommentsStore((s) => s.addComment);
  const updateComment = useCommentsStore((s) => s.updateComment);

  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Clear any pending timeouts when the composer unmounts.
  useEffect(() => {
    const timeout = mentionTimeoutRef.current;
    const blur = blurTimeoutRef.current;
    return () => {
      if (timeout) clearTimeout(timeout);
      if (blur) clearTimeout(blur);
    };
  }, []);

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
    // Delay lets a suggestion-row tap register first (rows use
    // keyboardShouldPersistTaps="handled").
    blurTimeoutRef.current = setTimeout(() => {
      setShowMentions(false);
      setMentionResults([]);
    }, 150);
  }, []);

  const handleSelectMention = useCallback(
    (user: ApiUserSearchResult) => {
      const lastAtIndex = content.lastIndexOf('@', cursorPositionRef.current);
      if (lastAtIndex === -1) return;
      const beforeAt = content.substring(0, lastAtIndex);
      const afterCursor = content.substring(cursorPositionRef.current);
      const newContent = `${beforeAt}@${user.username} ${afterCursor}`;

      setContent(newContent);
      setShowMentions(false);
      setMentionResults([]);
      inputRef.current?.focus();
    },
    [content],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (isEdit && commentId) {
        await updateComment(factId, commentId, content.trim());
      } else {
        await addComment(factId, content.trim(), replyTo?.commentId);
      }
      setContent('');
      setShowMentions(false);
      setMentionResults([]);
      onDone?.();
    } catch {
      // Mutation errors surface via the comments store → uiStore error banner.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setContent('');
    setShowMentions(false);
    setMentionResults([]);
    onCancelEdit?.();
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {replyTo && !isEdit ? (
        <View style={styles.replyChipRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Replying to <ThemedText type="smallBold">@{replyTo.username}</ThemedText>
          </ThemedText>
          <AppPressable onPress={onCancelReply} hitSlop={8} style={styles.replyCancel}>
            <Ionicons name="close-circle" size={18} color={theme.muted} />
          </AppPressable>
        </View>
      ) : null}

      <View style={styles.contentContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholder={isEdit ? 'Edit your comment...' : 'Add a comment... Use @ to mention'}
          placeholderTextColor={theme.muted}
          value={content}
          onChangeText={handleContentChange}
          onSelectionChange={handleSelectionChange}
          onBlur={handleContentBlur}
          maxLength={COMMENT_MAX_LENGTH}
          multiline
          textAlignVertical="top"
          editable={!isSubmitting}
          autoFocus={isEdit || !!replyTo}
        />

        {showMentions && (
          <View
            style={[
              styles.autocompleteDropdown,
              { backgroundColor: DROPDOWN_BG, borderColor: DROPDOWN_BORDER },
            ]}>
            {isSearchingMentions ? (
              <View style={styles.autocompleteState}>
                <ActivityIndicator size="small" color={theme.muted} />
              </View>
            ) : mentionResults.length === 0 ? (
              <View style={styles.autocompleteState}>
                <ThemedText type="small" style={styles.autocompleteEmptyText}>
                  No users found
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
                      index === selectedMentionIndex && styles.autocompleteItemSelected,
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
                      <ThemedText type="smallBold" style={styles.autocompleteName}>
                        {item.username}
                      </ThemedText>
                      <ThemedText type="small" style={styles.autocompleteSubtext}>
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

      <View style={styles.footer}>
        <CharCounter current={trimmedLength} min={COMMENT_MIN_LENGTH} max={COMMENT_MAX_LENGTH} />
        <View style={styles.actions}>
          {isEdit ? (
            <AppPressable onPress={handleCancelEdit} disabled={isSubmitting} hitSlop={6} style={styles.button}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </AppPressable>
          ) : null}
          <AppPressable
            onPress={canSubmit ? handleSubmit : undefined}
            disabled={!canSubmit}
            hitSlop={6}
            style={[
              styles.button,
              { backgroundColor: canSubmit ? theme.primary : theme.muted },
              isSubmitting && styles.submitting,
            ]}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : isEdit ? (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Save
              </ThemedText>
            ) : (
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            )}
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  replyChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyCancel: {
    padding: 2,
  },
  contentContainer: {
    position: 'relative',
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 120,
    padding: 0,
  },
  autocompleteDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 220,
    marginBottom: Spacing.one,
    borderRadius: Radii.lg,
    borderWidth: 1,
    zIndex: 1000,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  autocompleteState: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  autocompleteEmptyText: {
    color: '#B0B0C0',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  autocompleteItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  autocompleteInfo: {
    flex: 1,
    gap: 1,
  },
  autocompleteName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  autocompleteSubtext: {
    fontSize: 12,
    color: '#A0A0B0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    minWidth: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitting: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
