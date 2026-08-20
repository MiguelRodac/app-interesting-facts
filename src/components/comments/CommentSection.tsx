import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

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
 * The write composer is NOT rendered here: the fact detail screen mounts a
 * single FIXED bottom composer (Instagram/Facebook style) that stays pinned
 * above the tab bar while this thread scrolls. Reply/edit state lives in the
 * parent and is coordinated through onReply/onEdit. This section only renders
 * the comment thread plus the delete ConfirmDialog.
 */
export function CommentSection({
  factId,
  onCommentAuthorPress,
  isSignedIn: isSignedInProp,
  onReply,
  onEdit,
}: CommentSectionProps) {
  const theme = useTheme();
  const { comments } = useFactComments(factId);
  const { user } = useAuth();
  const deleteComment = useCommentsStore((s) => s.deleteComment);

  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  const [loading, setLoading] = useState(() => comments.length === 0);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), INITIAL_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  const isSignedIn = isSignedInProp ?? !!user;
  const currentUsername = user?.username;

  // Delete: hold the target until the ConfirmDialog resolves.
  const handleDelete = useCallback((comment: Comment) => {
    setDeleteTarget(comment);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Clear the pending target eagerly so the dialog closes immediately.
    setDeleteTarget(null);
    // The store optimistically removes the comment and surfaces errors (e.g.
    // DELETE_BLOCKED_HAS_REPLIES 403) via uiStore.setError → global banner.
    deleteComment(factId, targetId).catch(() => {
      // Ignore — store handles error surfacing.
    });
  }, [deleteTarget, factId, deleteComment]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.header}>
        Comments
      </ThemedText>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.stateWrap}>
          <ThemedText type="small" themeColor="muted">
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
              onReply={onReply}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          )}
        />
      )}

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
