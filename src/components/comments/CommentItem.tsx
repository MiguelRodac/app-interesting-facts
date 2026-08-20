import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppPressable } from '@/components/ui/app-pressable';
import { StyledContent } from '@/components/StyledContent';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canEditComment } from '@/utils/commentTime';
import type { Comment, CommentAuthor } from '@/types';

interface CommentItemProps {
  comment: Comment;
  /** Called when the author is pressed — parent decides profile deep-link. */
  onAuthorPress?: (author: CommentAuthor) => void;
  /** Current signed-in user's username, for editing/deleting own comments. */
  currentUsername?: string;
  /** Whether a user is signed in — reply is only offered to signed-in viewers. */
  isSignedIn?: boolean;
  /** Tapped "Reply" (depth-0 top-level only). Parent sets replyTo + focuses composer. */
  onReply?: (comment: Comment) => void;
  /** Tapped "Edit" (own comment within the 1h window). */
  onEdit?: (comment: Comment) => void;
  /** Tapped "Delete" (own comment). Parent opens the ConfirmDialog. */
  onDelete?: (comment: Comment) => void;
}

// Re-check the 1-hour edit window every 60s so the (PR5) edit affordance
// stays in sync without a re-render from data changes.
const EDIT_RECHECK_MS = 60 * 1000;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Renders a single comment (top-level or reply). Presentational: data flows
 * in via props. Edit affordance is intentionally read-phase in PR4 — the
 * edit-window timer is wired up so PR5 can drop the action in cleanly.
 */
export function CommentItem({
  comment,
  onAuthorPress,
  currentUsername,
  isSignedIn = false,
  onReply,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const theme = useTheme();
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [canEdit, setCanEdit] = useState(() => canEditComment(comment.createdAt));

  // Re-evaluate the edit window on an interval so `canEdit` flips to false
  // ~60s after the 1-hour mark. Edit controls render from this value.
  useEffect(() => {
    const interval = setInterval(() => {
      setCanEdit(canEditComment(comment.createdAt));
    }, EDIT_RECHECK_MS);
    return () => clearInterval(interval);
  }, [comment.createdAt]);

  const handleAuthorPress = useCallback(() => {
    onAuthorPress?.(comment.author);
  }, [onAuthorPress, comment.author]);

  const handleReply = useCallback(() => onReply?.(comment), [onReply, comment]);
  const handleEdit = useCallback(() => onEdit?.(comment), [onEdit, comment]);
  const handleDelete = useCallback(() => onDelete?.(comment), [onDelete, comment]);

  const replies = comment.replies ?? [];

  // Authoring visibility:
  //  - Reply: depth-0 top-level only (backend rejects reply-to-reply), signed-in.
  //  - Edit: own comment within the 1-hour window (canEdit from the timer).
  //  - Delete: own comment (no window; blocked replies handled by the store).
  const isTopLevel = comment.parentCommentId == null;
  const isOwn = currentUsername != null && comment.author.username === currentUsername;
  const canReply = isTopLevel && isSignedIn;

  return (
    <View style={styles.container}>
      {/* Header: avatar + author + timestamp + edited badge */}
      <AppPressable onPress={handleAuthorPress} style={styles.header} hitSlop={8}>
        <UserAvatar user={comment.author} size={28} />
        <View style={styles.meta}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {comment.author.displayName}
          </ThemedText>
          <View style={styles.metaLine}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatTimestamp(comment.createdAt)}
            </ThemedText>
            {comment.edited && (
              <ThemedText type="small" themeColor="textSecondary">
                {' '}(edited)
              </ThemedText>
            )}
          </View>
        </View>
      </AppPressable>

      {/* Body */}
      <StyledContent content={comment.content} style={styles.content} />

      {/* Authoring actions */}
      {(canReply || (isOwn && canEdit) || isOwn) && (
        <View style={styles.actions}>
          {canReply && (
            <AppPressable onPress={handleReply} hitSlop={8} style={styles.action}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                Reply
              </ThemedText>
            </AppPressable>
          )}
          {isOwn && canEdit && (
            <AppPressable onPress={handleEdit} hitSlop={8} style={styles.action}>
              <Ionicons name="create-outline" size={16} color={theme.muted} />
              <ThemedText type="smallBold" themeColor="textSecondary">
                Edit
              </ThemedText>
            </AppPressable>
          )}
          {isOwn && (
            <AppPressable onPress={handleDelete} hitSlop={8} style={styles.action}>
              <Ionicons name="trash-outline" size={15} color={theme.destructive} />
            </AppPressable>
          )}
        </View>
      )}

      {/* Replies — depth-1 only, flat indented list */}
      {replies.length > 0 && (
        <View style={[styles.replies, { borderLeftColor: theme.border }]}>
          <AppPressable
            onPress={() => setRepliesExpanded((current) => !current)}
            style={styles.repliesToggle}
            hitSlop={8}>
            <Ionicons
              name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.primary}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {repliesExpanded
                ? `Hide ${replies.length === 1 ? 'reply' : 'replies'}`
                : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </ThemedText>
          </AppPressable>

          {repliesExpanded &&
            replies.map((reply) => (
              <View key={reply.id} style={styles.replyItem}>
                <CommentItem comment={reply} onAuthorPress={onAuthorPress} />
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    flex: 1,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  replies: {
    marginTop: Spacing.two,
    paddingLeft: Spacing.three,
    borderLeftWidth: 2,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'flex-start',
    marginBottom: Spacing.one,
  },
  replyItem: {
    marginBottom: Spacing.one,
  },
});
