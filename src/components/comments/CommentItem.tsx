import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppPressable } from '@/components/ui/app-pressable';
import { StyledContent } from '@/components/StyledContent';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canEditComment, formatRelativeTime } from '@/utils/commentTime';
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

/**
 * Renders a single comment (top-level or reply) in the Instagram style:
 * a top-aligned avatar beside an inline "**author** text" flow, a compact
 * muted actions line below (Reply · time · Edit · Delete, plus a right-aligned
 * like heart), and an indented replies group.
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

  // Comment likes are NOT yet wired to the backend (no /comments/:id/likes
  // endpoint; CommentResponse has no isLiked/likesCount). The heart is a
  // visual placeholder: count comes from likesCount when the domain type has
  // it, otherwise 0, and the button stays inert.
  // TODO(backend): wire comment likes once /comments/:id/likes exists.
  const likesCount = comment.likesCount ?? 0;
  const liked = comment.liked ?? false;

  return (
    <View style={styles.container}>
      {/* Instagram row: top-aligned avatar beside the inline text block. */}
      <View style={styles.row}>
        <AppPressable onPress={handleAuthorPress} style={styles.avatarWrap} hitSlop={8}>
          <UserAvatar user={comment.author} size={30} />
        </AppPressable>

        {/* Inline "author text" flow — one block, wraps naturally. */}
        <View style={styles.body}>
          <Text style={styles.inline}>
            <Text
              onPress={handleAuthorPress}
              style={[styles.authorName, { color: theme.text }]}
              suppressHighlighting>
              {comment.author.displayName}{' '}
            </Text>
            <StyledContent content={comment.content} style={styles.content} />
          </Text>

          {/* Compact actions: Reply · time · Edit · Delete   [♥ count] */}
          <View style={styles.actionsRow}>
            <View style={styles.actionsLeft}>
              {canReply && (
                <AppPressable onPress={handleReply} hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.actionLink}>
                    Reply
                  </ThemedText>
                </AppPressable>
              )}
              <ThemedText type="small" themeColor="muted">
                {formatRelativeTime(comment.createdAt)}
              </ThemedText>
              {comment.edited && (
                <ThemedText type="small" themeColor="muted">
                  (edited)
                </ThemedText>
              )}
              {isOwn && canEdit && (
                <AppPressable onPress={handleEdit} hitSlop={8} style={styles.actionWithIcon}>
                  <Ionicons name="create-outline" size={13} color={theme.muted} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Edit
                  </ThemedText>
                </AppPressable>
              )}
              {isOwn && (
                <AppPressable onPress={handleDelete} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color={theme.muted} />
                </AppPressable>
              )}
            </View>

            {/* Visual-only like heart (backed by likesCount when present, else 0).
                Non-interactive until the backend /comments/:id/likes contract lands. */}
            <View style={styles.like}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={17}
                color={liked ? theme.destructive : theme.textSecondary}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {likesCount}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Replies — depth-1 only, flat indented list */}
      {replies.length > 0 && (
        <View style={[styles.replies, { borderLeftColor: theme.border }]}>
          <AppPressable
            onPress={() => setRepliesExpanded((current) => !current)}
            style={styles.repliesToggle}
            hitSlop={8}>
            <Ionicons
              name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.repliesToggleText}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatarWrap: {
    marginTop: Spacing.half,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  // Author name + content share one text flow so the comment reads inline:
  // "**alice** this is the comment text" on the same block as the avatar.
  inline: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  authorName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.half,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionLink: {
    fontWeight: 600,
  },
  actionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  replies: {
    marginTop: Spacing.two,
    marginLeft: 38,
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
  repliesToggleText: {
    fontWeight: 600,
  },
  replyItem: {
    marginBottom: Spacing.one,
  },
});
