import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { CommentItem } from '@/components/comments/CommentItem';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useFactComments } from '@/data/hooks/useFactComments';
import { useTheme } from '@/hooks/use-theme';
import type { CommentAuthor } from '@/types';

interface CommentSectionProps {
  factId: string;
  /** Author deep-link routing — handled by the parent (fact detail screen). */
  onCommentAuthorPress?: (author: CommentAuthor) => void;
}

// How long we show the loader for the initial fetch before yielding to the
// (possibly empty) state. useFactComments doesn't surface a loading flag, so
// a short debounce avoids a flash of "No comments yet" on the very first visit
// while keeping a warm cache from showing a spinner.
const INITIAL_LOADING_MS = 250;

/**
 * Threaded comments read section. Mounted inside the fact detail ScrollView —
 * FlatList with scrollEnabled={false} so the outer ScrollView scrolls.
 *
 * PR4 is READ-ONLY: rendering, author deep-links, the collapsed replies
 * toggle, and the edit-window timer infra. `replyTo` / `editingId` are local
 * state scaffolded for the PR5 write UI; no post/edit/delete is wired here.
 */
export function CommentSection({ factId, onCommentAuthorPress }: CommentSectionProps) {
  const theme = useTheme();
  const { comments } = useFactComments(factId);

  // Scaffold for PR5 — reply target and in-edit comment id. Read-phase only
  // in this slice; PR5 wires these into the composer/edit actions.
  const [replyTo, setReplyTo] = useState<CommentAuthor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(() => comments.length === 0);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), INITIAL_LOADING_MS);
    return () => clearTimeout(timer);
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
            <CommentItem comment={item} onAuthorPress={onCommentAuthorPress} />
          )}
        />
      )}
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
