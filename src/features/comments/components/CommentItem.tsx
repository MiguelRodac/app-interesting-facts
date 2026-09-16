import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { StyledContent } from '@/features/facts/components/StyledContent';
import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD, checkIsCollapsible } from '@/constants/facts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { canEditComment } from '@/utils/commentTime';
import type { Comment, CommentAuthor } from '@/types';
import { useCommentsStore } from '../stores/commentsStore';
import { useRepostsStore } from '@/features/facts/stores/repostsStore';
import { CommentItemActions } from './CommentItemActions';
import { CommentRepliesList } from './CommentRepliesList';

export interface CommentItemProps {
  comment: Comment;
  rootCommentId?: string;
  factId?: string;
  repostEntryId?: string;
  onAuthorPress?: (author: CommentAuthor) => void;
  currentUsername?: string;
  isSignedIn?: boolean;
  onReply?: (comment: Comment, rootCommentId?: string) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (comment: Comment) => void;
  onOpenLikes?: (commentId: string) => void;
}

const EDIT_RECHECK_MS = 60 * 1000;

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
  const { t } = useTranslation('feed');
  const theme = useTheme();
  const toggleCommentLike = useCommentsStore((s) => s.toggleCommentLike);
  const toggleRepostCommentLike = useRepostsStore((s) => s.toggleRepostCommentLike);
  const isRepost = !!repostEntryId;
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canEdit, setCanEdit] = useState(() => canEditComment(comment.createdAt));

  const isCollapsible = checkIsCollapsible(comment.content, COLLAPSE_LINES, COLLAPSE_THRESHOLD);

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
  const isOwn = currentUsername != null && comment.author.username === currentUsername;
  const likesCount = comment.likesCount ?? 0;
  const liked = comment.liked ?? false;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <AppPressable onPress={handleAuthorPress} style={styles.avatarWrap} hitSlop={8}>
          <UserAvatar user={comment.author} size={30} />
        </AppPressable>

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
                {expanded ? t('seeLess') : t('seeMore')}
              </ThemedText>
            </AppPressable>
          )}

          <CommentItemActions
            createdAt={comment.createdAt}
            edited={comment.edited}
            canReply={isSignedIn}
            isOwn={isOwn}
            canEdit={canEdit}
            isSignedIn={isSignedIn}
            liked={liked}
            likesCount={likesCount}
            commentId={comment.id}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleLike={handleToggleLike}
            onOpenLikes={onOpenLikes}
          />
        </View>
      </View>

      <CommentRepliesList
        replies={replies}
        repliesExpanded={repliesExpanded}
        onToggleExpanded={() => setRepliesExpanded((c) => !c)}
        renderReply={(reply) => (
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
        )}
      />
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
  inline: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  authorName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.half,
    marginBottom: Spacing.half,
  },
});
