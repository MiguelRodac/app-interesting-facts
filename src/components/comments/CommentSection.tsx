import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CommentItem } from '@/components/comments/CommentItem';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useFactComments } from '@/data/hooks/useFactComments';
import { useRepostComments } from '@/data/hooks/useRepostComments';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useTheme } from '@/hooks/use-theme';
import type { Comment, CommentAuthor } from '@/types';

interface CommentSectionProps {
  /** Fact id — used for fact comments. Mutually exclusive with repostEntryId. */
  factId?: string;
  /** Repost entry id — used for repost comments. Mutually exclusive with factId. */
  repostEntryId?: string;
  /** Author deep-link routing — handled by the parent (detail screen). */
  onCommentAuthorPress?: (author: CommentAuthor) => void;
  /** Whether the viewer is signed in. Anonymous viewers see comments
   *  read-only with @username author names (no displayName). Defaults to the
   *  detected auth state when omitted. */
  isSignedIn?: boolean;
  /** Tapped "Reply" (top-level comment). Parent owns replyTo state and focuses
   *  the fixed bottom composer in reply mode. */
  onReply?: (comment: Comment) => void;
  /** Tapped "Edit" (own comment within the 1h window). Parent swaps the fixed
   *  bottom composer into edit mode. */
  onEdit?: (comment: Comment) => void;
  /** Tapped a comment's like COUNT — parent opens LikesModal with commentId. */
  onOpenCommentLikes?: (commentId: string) => void;
}

/**
 * Threaded comments section. Mounted inside the fact detail ScrollView —
 * FlatList with scrollEnabled={false} so the outer ScrollView scrolls.
 *
 * The write composer is NOT rendered here: the fact detail screen mounts a
 * single FIXED bottom composer (Instagram/Facebook style) that stays pinned
 * above the tab bar while this thread scrolls. Reply/edit state lives in the
 * parent and is coordinated through onReply/onEdit. This section only renders
 * the comment thread plus the delete ConfirmDialog.
 */
export function CommentSection({
  factId,
  repostEntryId,
  onCommentAuthorPress,
  isSignedIn: isSignedInProp,
  onReply,
  onEdit,
  onOpenCommentLikes,
}: CommentSectionProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const isRepost = !!repostEntryId;
  const entityId = repostEntryId ?? factId ?? '';

  // Use the appropriate hook based on whether this is a repost or fact.
  const factCommentsResult = useFactComments(isRepost ? null : entityId);
  const repostCommentsResult = useRepostComments(isRepost ? entityId : null);
  const { comments, loading: factLoading } = isRepost ? repostCommentsResult : factCommentsResult;

  const { user } = useAuth();
  const deleteFactComment = useCommentsStore((s) => s.deleteComment);
  const deleteRepostComment = useRepostsStore((s) => s.deleteRepostComment);

  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  // If the cache already has comments, skip the loading spinner (warm cache).
  const loading = factLoading && comments.length === 0;

  const isSignedIn = isSignedInProp ?? !!user;
  const currentUsername = user?.username;

  const handleDelete = useCallback((comment: Comment) => {
    setDeleteTarget(comment);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    if (isRepost && repostEntryId) {
      deleteRepostComment(repostEntryId, targetId).catch(() => {});
    } else if (factId) {
      deleteFactComment(factId, targetId).catch(() => {});
    }
  }, [deleteTarget, factId, repostEntryId, isRepost, deleteFactComment, deleteRepostComment]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.header}>
        {t('common:comments')}
      </ThemedText>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.stateWrap}>
          <ThemedText type="small" themeColor="muted">
            {t('common:noCommentsYet')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              factId={factId}
              repostEntryId={repostEntryId}
              onAuthorPress={onCommentAuthorPress}
              currentUsername={currentUsername}
              isSignedIn={isSignedIn}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={handleDelete}
              onOpenLikes={onOpenCommentLikes}
            />
          )}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title={t('common:deleteCommentTitle')}
        message={t('common:deleteCommentMessage')}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.three,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  stateWrap: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  // Instagram-like rhythm: airy gap between comments, no heavy borders —
  // separation comes from spacing alone. Slightly larger gap than the default
  // Spacing.one to keep the list breathable.
  listContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
