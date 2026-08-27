import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/ui/app-pressable';
import { StyledContent } from '@/components/StyledContent';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canEditComment, formatRelativeTime } from '@/utils/commentTime';
import type { Comment, CommentAuthor } from '@/types';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';

interface CommentItemProps {
  comment: Comment;
  /** Root parent comment id — passed down when rendering nested replies. */
  rootCommentId?: string;
  /** Parent fact id — required for fact comment-like endpoints. */
  factId?: string;
  /** Parent repost entry id — required for repost comment-like endpoints. */
  repostEntryId?: string;
  /** Called when the author is pressed — parent decides profile deep-link. */
  onAuthorPress?: (author: CommentAuthor) => void;
  /** Current signed-in user's username, for editing/deleting own comments. */
  currentUsername?: string;
  /** Whether a user is signed in — reply is only offered to signed-in viewers. */
  isSignedIn?: boolean;
  /** Tapped "Reply". Parent sets replyTo with rootCommentId + focuses composer. */
  onReply?: (comment: Comment, rootCommentId?: string) => void;
  /** Tapped "Edit" (own comment within the 1h window). */
  onEdit?: (comment: Comment) => void;
  /** Tapped "Delete" (own comment). Parent opens the ConfirmDialog. */
  onDelete?: (comment: Comment) => void;
  /** Tapped the like COUNT (signed-in, count > 0) — parent opens LikesModal with commentId. */
  onOpenLikes?: (commentId: string) => void;
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
  rootCommentId,
  factId,
  repostEntryId,
  onAuthorPress,
  currentUsername,
  isSignedIn = false,
  onReply,
  onEdit,
  onDelete,
  onOpenLikes,
}: CommentItemProps) {
  const { t } = useTranslation(['common', 'feed']);
  const theme = useTheme();
  const toggleCommentLike = useCommentsStore((s) => s.toggleCommentLike);
  const toggleRepostCommentLike = useRepostsStore((s) => s.toggleRepostCommentLike);
  const isRepost = !!repostEntryId;
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canEdit, setCanEdit] = useState(() => canEditComment(comment.createdAt));

  // Long comments collapse behind a "See more" toggle (mirrors the facts
  // card). Snapped off per comment line length; short comments render fully.
  const isCollapsible = comment.content.length > COLLAPSE_THRESHOLD;

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

  const isTopLevel = comment.parentCommentId == null;

  const handleReply = useCallback(() => {
    const effectiveRootId = rootCommentId ?? (isTopLevel ? comment.id : comment.parentCommentId ?? comment.id);
    onReply?.(comment, effectiveRootId);
  }, [onReply, comment, rootCommentId, isTopLevel]);

  const handleEdit = useCallback(() => onEdit?.(comment), [onEdit, comment]);
  const handleDelete = useCallback(() => onDelete?.(comment), [onDelete, comment]);
  const handleToggleLike = useCallback(() => {
    if (!isSignedIn) return;
    if (isRepost && repostEntryId) {
      toggleRepostCommentLike(repostEntryId, comment).catch(() => {});
    } else if (factId) {
      toggleCommentLike(factId, comment).catch(() => {});
    }
  }, [isSignedIn, isRepost, repostEntryId, factId, toggleCommentLike, toggleRepostCommentLike, comment]);

  const replies = comment.replies ?? [];

  // Authoring visibility:
  //  - Reply: any comment/reply when signed in.
  //  - Edit: own comment within the 1-hour window (canEdit from the timer).
  //  - Delete: own comment (no window; blocked replies handled by the store).
  const isOwn = currentUsername != null && comment.author.username === currentUsername;
  const canReply = isSignedIn;

  // Comment likes: backend-populated for authenticated viewers (likesCount,
  // liked). Anonymous viewers see the count read-only; signed-in viewers get
  // an interactive heart that toggles the like optimistically in the store.
  const likesCount = comment.likesCount ?? 0;
  const liked = comment.liked ?? false;

  // Right-aligned like heart + count. Heart and count are SEPARATE sibling
  // pressables (not nested) to avoid <button> inside <button> on web.
  const likeNode = (
    <View style={styles.like}>
      {isSignedIn ? (
        <AppPressable onPress={handleToggleLike} hitSlop={8}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={17}
            color={liked ? theme.destructive : theme.textSecondary}
          />
        </AppPressable>
      ) : (
        <Ionicons name="heart-outline" size={17} color={theme.textSecondary} />
      )}
      {isSignedIn && likesCount > 0 ? (
        <AppPressable onPress={() => onOpenLikes?.(comment.id)} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            {likesCount}
          </ThemedText>
        </AppPressable>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {likesCount}
        </ThemedText>
      )}
    </View>
  );

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
              {(isSignedIn
                ? `${comment.author.displayName} `
                : `@${comment.author.username} `)}
            </Text>
            <StyledContent
              content={comment.content}
              style={styles.content}
              enableHashtags={false}
              numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
            />
          </Text>
          {isCollapsible && (
            <AppPressable
              onPress={() => setExpanded((current) => !current)}
              hitSlop={6}
              style={styles.seeMore}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {expanded ? t('feed:seeLess') : t('feed:seeMore')}
              </ThemedText>
            </AppPressable>
          )}

          {/* Compact actions: Reply · time · Edit · Delete   [♥ count] */}
          <View style={styles.actionsRow}>
            <View style={styles.actionsLeft}>
              {canReply && (
                <AppPressable onPress={handleReply} hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.actionLink}>
                    {t('common:reply')}
                  </ThemedText>
                </AppPressable>
              )}
              <ThemedText type="small" themeColor="muted">
                {formatRelativeTime(comment.createdAt)}
              </ThemedText>
              {comment.edited && (
                <ThemedText type="small" themeColor="muted">
                  {t('common:edited')}
                </ThemedText>
              )}
              {isOwn && canEdit && (
                <AppPressable onPress={handleEdit} hitSlop={8} style={styles.actionWithIcon}>
                  <Ionicons name="create-outline" size={13} color={theme.muted} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('common:edit')}
                  </ThemedText>
                </AppPressable>
              )}
              {isOwn && (
                <AppPressable onPress={handleDelete} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color={theme.muted} />
                </AppPressable>
              )}
            </View>

            {likeNode}
          </View>
        </View>
      </View>

      {/* Replies — depth-1 only, soft Instagram-style thread: no heavy left
          border, a light indent, and a plain "View N replies / Hide replies"
          toggle with a small chevron. Author + content continue inline. */}
      {replies.length > 0 && (
        <View style={styles.replies}>
          <AppPressable
            onPress={() => setRepliesExpanded((current) => !current)}
            style={styles.repliesToggle}
            hitSlop={8}>
            <Ionicons
              name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.repliesToggleText}>
              {repliesExpanded
                ? (replies.length === 1 ? t('common:hideReply') : t('common:hideReplies'))
                : (replies.length === 1 ? t('common:viewReply') : t('common:viewReplies', { count: replies.length }))}
            </ThemedText>
          </AppPressable>

          {repliesExpanded &&
            replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                rootCommentId={rootCommentId ?? comment.id}
                factId={factId}
                repostEntryId={repostEntryId}
                onAuthorPress={onAuthorPress}
                currentUsername={currentUsername}
                isSignedIn={isSignedIn}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenLikes={onOpenLikes}
              />
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
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.half,
    marginBottom: Spacing.half,
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
  // Soft IG thread: a light consistent indent, no heavy left border. The
  // replies' own padding gives the visual nesting.
  replies: {
    marginTop: Spacing.one,
    marginLeft: Spacing.four,
    paddingLeft: Spacing.two,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'flex-start',
    marginBottom: Spacing.one,
  },
  repliesToggleText: {
    fontWeight: 500,
    fontSize: 13,
  },
});
