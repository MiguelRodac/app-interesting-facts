import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { AppPressable } from '@/components/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { useAuth } from '@/data/hooks/useAuth';
import type { ApiUserSearchResult } from '@/data/api/types';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useTheme } from '@/hooks/use-theme';

const client = createApiClient(getIdToken);

/** Comment content is 1-500 chars after trim (backend min is being relaxed to 1). */
export const COMMENT_MIN_LENGTH = 1;
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
  /** 'edit' reuses the same composer to edit one of the author's own comments. */
  mode?: ComposerMode;
  /** The comment being edited (edit mode) — drives updateComment(factId, commentId, content). */
  commentId?: string;
  /** Initial content to edit (edit mode). */
  initialValue?: string;
  /** Fired when the edit Cancel button is tapped (edit mode). */
  onCancelEdit?: () => void;
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
  replyTo,
  onCancelReply,
  onDone,
  mode = 'create',
  commentId,
  initialValue = '',
  onCancelEdit,
}: CommentComposerProps) {
  const theme = useTheme();
  const { user } = useAuth();
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
  // and edit modes (replyTo/editingId live in the detail screen). Entering edit
  // mode pre-fills the target comment's text; leaving edit mode clears any
  // stale draft and any pending mention state.
  useEffect(() => {
    if (mode === 'edit' && commentId) {
      setContent(initialValue);
    } else {
      setContent('');
      setShowMentions(false);
      setMentionResults([]);
    }
  }, [mode, commentId, initialValue]);

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
    (userMention: ApiUserSearchResult) => {
      const lastAtIndex = content.lastIndexOf('@', cursorPositionRef.current);
      if (lastAtIndex === -1) return;
      const beforeAt = content.substring(0, lastAtIndex);
      const afterCursor = content.substring(cursorPositionRef.current);
      const newContent = `${beforeAt}@${userMention.username} ${afterCursor}`;

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

  const postLabel = isEdit ? 'Save' : 'Post';

  return (
    <View style={[styles.wrap, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
      {/* Subtle reply-to chip, only in create/reply mode with an active target. */}
      {replyTo && !isEdit ? (
        <View style={styles.replyChipRow}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.replyChipText}>
            Replying to <ThemedText type="smallBold">@{replyTo.username}</ThemedText>
          </ThemedText>
          <AppPressable onPress={onCancelReply} hitSlop={8} style={styles.replyCancel}>
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
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            placeholder={isEdit ? 'Edit your comment...' : 'Add a comment...'}
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

        <View style={styles.actions}>
          {isEdit ? (
            <AppPressable onPress={handleCancelEdit} disabled={isSubmitting} hitSlop={6} style={styles.textButton}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cancelText}>
                Cancel
              </ThemedText>
            </AppPressable>
          ) : null}
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
  input: {
    fontSize: 15,
    lineHeight: 21,
    minHeight: 32,
    maxHeight: 96,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'flex-end',
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
});
