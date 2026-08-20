import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { CommentComposer } from '@/components/comments/CommentComposer';
import { CommentItem } from '@/components/comments/CommentItem';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useFactComments } from '@/data/hooks/useFactComments';
import { useCommentsStore } from '@/data/stores/commentsStore';
import { useTheme } from '@/hooks/use-theme';
import type { Comment, CommentAuthor } from '@/types';

interface CommentSectionProps {
  factId: string;
  /** Author deep-link routing — handled by the parent (fact detail screen). */
  onCommentAuthorPress?: (author: CommentAuthor) => void;
}

/** Reply target — enough to prefill reply mode with the parentCommentId. */
interface ReplyTarget {
  commentId: string;
  username: string;
}

// How long we show the loader for the initial fetch before yielding to the
// (possibly empty) state. useFactComments doesn't surface a loading flag, so
// a short debounce avoids a flash of "No comments yet" on the very first visit
// while keeping a warm cache from showing a spinner.
const INITIAL_LOADING_MS = 250;

/**
 * Threaded comments section. Mounted inside the fact detail ScrollView —
 * FlatList with scrollEnabled={false} so the outer ScrollView scrolls.
 *
 * PR5 adds the WRITE UI on top of the PR4 read surface: an inline composer
 * for new comments/replies, inline editing of one's own comments, and delete
 * (with ConfirmDialog). The store's optimistic cache + notify pipeline keeps
 * every mutation reflected in the list without a manual refresh.
 */
export function CommentSection({ factId, onCommentAuthorPress }: CommentSectionProps) {
  const theme = useTheme();
  const { comments } = useFactComments(factId);
  const { user } = useAuth();
  const deleteComment = useCommentsStore((s) => s.deleteComment);

  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  const [loading, setLoading] = useState(() => comments.length === 0);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), INITIAL_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  /** The comment currently being edited, looked up from the live thread. */
  const editingComment = useMemo(
    () => comments.find((c) => c.id === editingId) ?? null,
    [comments, editingId],
  );

  const isSignedIn = !!user;
  const currentUsername = user?.username;

  // Reply: prefill replyTo so the composer submits with parentCommentId, and
  // focus the composer (autoFocus on the TextInput triggers when replyTo set).
  const handleReply = useCallback((comment: Comment) => {
    setEditingId(null);
    setReplyTo({ commentId: comment.id, username: comment.author.username });
  }, []);

  // Edit: swap the top-level composer region for an inline edit composer.
  const handleEdit = useCallback((comment: Comment) => {
    setReplyTo(null);
    setEditingId(comment.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Delete: hold the target until the ConfirmDialog resolves.
  const handleDelete = useCallback((comment: Comment) => {
    setDeleteTarget(comment);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Clear the pending target eagerly so the dialog closes immediately.
    setDeleteTarget(null);
    // If we were editing or replying to the deleted comment, reset that state.
    setEditingId((current) => (current === targetId ? null : current));
    setReplyTo((current) =>
      current?.commentId === targetId ? null : current,
    );
    // The store optimistically removes the comment and surfaces errors (e.g.
    // DELETE_BLOCKED_HAS_REPLIES 403) via uiStore.setError → global banner.
    deleteComment(factId, targetId).catch(() => {
      // Ignore — store handles error surfacing.
    });
  }, [deleteTarget, factId, deleteComment]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleComposerDone = useCallback(() => {
    setReplyTo(null);
    setEditingId(null);
  }, []);

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.header}>
        Comments ({comments.length})
      </ThemedText>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.stateWrap}>
          <ThemedText type="small" themeColor="textSecondary">
            No comments yet. Be the first to share a thought.
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
              onAuthorPress={onCommentAuthorPress}
              currentUsername={currentUsername}
              isSignedIn={isSignedIn}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      {/* Inline edit composer — replaces the create composer while editing. */}
      {isSignedIn && editingComment ? (
        <CommentComposer
          factId={factId}
          mode="edit"
          commentId={editingComment.id}
          initialValue={editingComment.content}
          onCancelEdit={handleCancelEdit}
          onDone={handleComposerDone}
        />
      ) : null}

      {/* Create/reply composer — signed-in only, at the bottom of the section. */}
      {isSignedIn && !editingComment ? (
        <CommentComposer
          factId={factId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onDone={handleComposerDone}
        />
      ) : null}

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? You can't delete a comment that has replies from other users."
        confirmLabel="Delete"
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
    marginBottom: Spacing.two,
  },
  stateWrap: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  listContent: {
    gap: Spacing.one,
  },
});
