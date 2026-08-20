import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Share, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LikedByLine } from '@/components/LikedByLine';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { CommentComposer } from '@/components/comments/CommentComposer';
import { CommentSection } from '@/components/comments/CommentSection';
import { StyledContent } from '@/components/StyledContent';
import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { useFacts } from '@/data/hooks/useFacts';
import { notifyFactCommentsChanged, useFactComments } from '@/data/hooks/useFactComments';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Comment, Fact } from '@/types';

/** Reply target — enough to prefill the fixed composer in reply mode. */
interface CommentReplyTarget {
  commentId: string;
  username: string;
}

export default function FactDetailScreen() {
const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { facts, fetchFactById, toggleLike, deleteFact } = useFacts();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasCheckedAuth = useRef(false);
  const theme = useTheme();
  const topInset = useTopInset();
  const [fact, setFact] = useState<Fact | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isCollapsible = fact ? fact.content.length > COLLAPSE_THRESHOLD : false;
  const handleConfirmDelete = useCallback(async () => {
    if (!fact) return;
    setConfirmDeleteVisible(false);
    try {
      await deleteFact(fact.id);
      router.replace('/(tabs)');
    } catch {
      // Error handled by uiStore
    }
  }, [fact, deleteFact, router]);

const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const [likesModalVisible, setLikesModalVisible] = useState(false);

  // Fixed-bottom composer state (moved up from CommentSection so the detail
  // screen owns the single pinned composer for create/reply/edit).
  const [replyTo, setReplyTo] = useState<CommentReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Unsaved-changes guard for the fixed comment composer: armed while there's
  // unsubmitted draft text; shows a full-screen confirm instead of leaving.
  const [composerHasPending, setComposerHasPending] = useState(false);
  const [confirmDiscardCommentVisible, setConfirmDiscardCommentVisible] = useState(false);

  // Live thread (same store cache CommentSection renders) — lets us resolve the
  // comment under edit so the fixed composer can prefill its content.
  const { comments } = useFactComments(id ?? '');
  const editingComment = useMemo(
    () => (editingId ? comments.find((c) => c.id === editingId) ?? null : null),
    [comments, editingId],
  );

  // Reply: cancel any edit, prefill replyTo so the fixed composer submits with
  // parentCommentId, and focus it (autoFocus on the TextInput when replyTo set).
  const handleCommentReply = useCallback((comment: Comment) => {
    setEditingId(null);
    setReplyTo({ commentId: comment.id, username: comment.author.username });
  }, []);

  // Edit: cancel any reply, swap the fixed composer into edit mode.
  const handleCommentEdit = useCallback((comment: Comment) => {
    setReplyTo(null);
    setEditingId(comment.id);
  }, []);

  const handleComposerCancelReply = useCallback(() => setReplyTo(null), []);
  const handleComposerCancelEdit = useCallback(() => setEditingId(null), []);

  // After a successful create/reply/edit, reset the fixed composer state.
  const handleComposerDone = useCallback(() => {
    setReplyTo(null);
    setEditingId(null);
  }, []);

  // Track the composer's unsubmitted draft text so leaving can be guarded.
  const handleComposerPendingTextChange = useCallback((hasPending: boolean) => {
    setComposerHasPending(hasPending);
  }, []);

  // Intercept Android hardware back — confirm before leaving with a draft.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (composerHasPending) {
        setConfirmDiscardCommentVisible(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [composerHasPending]);

  const handleConfirmDiscardComment = useCallback(() => {
    setConfirmDiscardCommentVisible(false);
    router.replace('/(tabs)');
  }, [router]);

  const handleCancelDiscardComment = useCallback(() => {
    setConfirmDiscardCommentVisible(false);
  }, []);

  // Tab bar — highlight the tab the user came from
  const activeTab = from === 'search' ? 'search' : from === 'profile' || from === 'user' ? 'profile' : 'index';
  const handleTabPress = useCallback(
    (name: string) => {
      switch (name) {
        case 'search':
          router.replace('/(tabs)/search');
          break;
        case 'create':
          router.replace('/(tabs)/create');
          break;
        case 'profile':
          router.replace('/(tabs)/profile');
          break;
        default:
          router.replace('/(tabs)');
          break;
      }
    },
    [router],
  );

// Redirect to login when the session is gone (e.g. expired token). The
  // detail is private: anonymous viewers must not see fact contents. The ref
  // guards against redirect loops once navigation lands on the auth screen.
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      if (!hasCheckedAuth.current) {
        hasCheckedAuth.current = true;
        router.replace('/auth/login');
      }
    } else if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated, isLoading, router]);

// Prefer the store copy (feed already has it); on cold start / F5 the store
  // is empty, so fetch the fact by ID instead of showing "not found".
  useEffect(() => {
    if (!id) return;
    const found = facts.find((f) => f.id === id);
    if (found) {
      setFact(found);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchFactById(id)
      .then((fetched) => {
        if (active) setFact(fetched);
      })
      .catch(() => {
        if (active) setFact(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, facts, fetchFactById]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      await fetchFactById(id);
      // Ping any mounted useFactComments for this fact so pull-to-refresh also
      // refetches the threaded comments.
      notifyFactCommentsChanged(id);
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchFactById]);

const isOwner = fact && user?.id === fact.author.id;

  const handleAuthorPress = useCallback(() => {
    if (!fact) return;
    if (user && fact.author.id === user.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/(tabs)/users/[username]', params: { username: fact.author.username } });
    }
  }, [user, fact, router]);

  // Comment authors follow the same deep-link rule via username (comments
  // carry no author id, so match the signed-in user's username like mentions).
  const handleCommentAuthorPress = useCallback(
    (author: { username: string }) => {
      if (user && user.username === author.username) {
        router.push('/(tabs)/profile');
      } else {
        router.push({ pathname: '/(tabs)/users/[username]', params: { username: author.username } });
      }
    },
    [user, router],
  );


  const handleLike = useCallback(() => {
    // View-mode guard: anonymous viewers can't like — route to the login gate.
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (fact) {
      toggleLike(fact.id);
    }
  }, [fact, toggleLike, isAuthenticated, router]);

  const handleShare = useCallback(async () => {
    if (!fact) return;
    try {
      await Share.share({
        message: `${fact.title ? fact.title + ': ' : ''}${fact.content}`,
      });
    } catch {
      // User cancelled share — ignore
    }
  }, [fact]);

  const handleDelete = useCallback(() => {
    setConfirmDeleteVisible(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (fact) {
      router.push(`/fact/${fact.id}/edit`);
    }
  }, [fact, router]);

  const handleBack = useCallback(() => {
    // Unsaved comment draft — confirm before leaving.
    if (composerHasPending) {
      setConfirmDiscardCommentVisible(true);
      return;
    }
    // Go back to the screen the user came from, never router.back()
    // (detail ↔ edit push/replace can create a navigation loop).
    switch (from) {
      case 'search':
        router.replace('/(tabs)/search');
        break;
      case 'profile':
        router.replace('/(tabs)/profile');
        break;
      case 'user':
        // User profile screen is always in the stack below detail — safe to pop
        router.back();
        break;
      default:
        router.replace('/(tabs)');
        break;
    }
  }, [from, router, composerHasPending]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingSkeleton count={1} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState title="Fact not found" subtitle="This fact may have been deleted" icon="alert-circle-outline" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        {/* Back button */}
        <AppPressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>

        {/* Fact detail card */}
        <ThemedView type="backgroundElement" style={[styles.card, Shadows.md]}>
          {/* Author */}
          <AppPressable onPress={handleAuthorPress} style={styles.authorRow} hitSlop={8}>
            <UserAvatar user={fact.author} size={44} />
            <View style={styles.authorInfo}>
              {isAuthenticated ? (
                <ThemedText type="smallBold">{fact.author.displayName}</ThemedText>
              ) : (
                <ThemedText type="smallBold">@{fact.author.username}</ThemedText>
              )}
              <ThemedText type="small" themeColor="textSecondary">
                @{fact.author.username}
              </ThemedText>
            </View>
          </AppPressable>

          {/* Title */}
          {fact.title ? (
            <StyledContent
              content={fact.title}
              style={styles.title}
            />
          ) : null}

          {/* Content */}
          <StyledContent
            content={fact.content}
            numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
            style={styles.content}
          />

          {/* Expand/collapse toggle for long facts */}
          {isCollapsible && (
            <AppPressable onPress={() => setExpanded((current) => !current)} hitSlop={6} style={styles.seeMore}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {expanded ? 'See less' : 'See more'}
              </ThemedText>
            </AppPressable>
          )}

          {/* Meta */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            {new Date(fact.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>

{/* Likes line — "Liked by @alice, @bob and 3 more"; tap opens the full modal.
        Shown to everyone; anonymous viewers route to login instead. */}
          <LikedByLine
            likes={fact.likeBy}
            likesCount={fact.likesCount}
            onPress={() =>
              isAuthenticated
                ? setLikesModalVisible(true)
                : router.push('/auth/login')
            }
          />

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            <AppPressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
              <Ionicons
                name={fact.liked ? 'heart' : 'heart-outline'}
                size={28}
                color={fact.liked ? theme.destructive : theme.muted}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {fact.likesCount}
              </ThemedText>
            </AppPressable>

            {/* Repost placeholder — visual only while the backend builds the
                repost module. Disabled on purpose: do not fake functionality.
                TODO(backend): wire repost when /facts/:id/reposts exists */}
            <AppPressable disabled style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="repeat" size={24} color={theme.muted} />
            </AppPressable>

            <AppPressable onPress={handleShare} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={24} color={theme.muted} />
            </AppPressable>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <AppPressable
                  onPress={handleEdit}
                  style={[styles.editButton, { borderColor: theme.primary }]}
                  hitSlop={8}>
                  <Ionicons name="create-outline" size={18} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Edit
                  </ThemedText>
                </AppPressable>
                <AppPressable onPress={handleDelete} style={styles.actionBtn} hitSlop={8}>
                  <Ionicons name="trash-outline" size={24} color={theme.destructive} />
                </AppPressable>
              </View>
            ) : null}
          </View>
        </ThemedView>

        {/* Threaded comments — read-only in this slice. Mounted only for
            signed-in users: comment reads are becoming private (backend will
            401 GET /facts/:id/comments without a token), so anonymous viewers
            get no thread section. Comment count is still visible via the
            conversation balloon on the FactCard/detail. */}
        {isAuthenticated && (
          <CommentSection
            factId={fact.id}
            onCommentAuthorPress={handleCommentAuthorPress}
            isSignedIn={isAuthenticated}
            onReply={handleCommentReply}
            onEdit={handleCommentEdit}
          />
        )}
      </ScrollView>

      {/* Fixed bottom comment composer — pinned above the TabBar, OUTSIDE the
          ScrollView, so it stays visible while the thread scrolls (Instagram/
          Facebook pattern). Reply/edit state is owned here; when Reply/Edit is
          tapped on a comment, onReply/onEdit route through the section and swap
          this composer into reply/edit mode. */}
      {isAuthenticated && (
        <CommentComposer
          factId={fact.id}
          mode={editingComment ? 'edit' : 'create'}
          commentId={editingComment?.id}
          initialValue={editingComment?.content ?? ''}
          replyTo={editingComment ? null : replyTo}
          onCancelReply={handleComposerCancelReply}
          onCancelEdit={handleComposerCancelEdit}
          onDone={handleComposerDone}
          onPendingTextChange={handleComposerPendingTextChange}
        />
      )}


      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} />

{/* Delete confirmation */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete Fact"
        message="Are you sure you want to delete this fact?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Unsaved comment draft — full-screen, no-scroll confirm */}
      <AppModal
        visible={confirmDiscardCommentVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDiscardComment}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Discard comment?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              You have an unsent comment. Are you sure you want to discard it?
            </ThemedText>
            <View style={styles.modalButtons}>
              <AppPressable
                onPress={handleCancelDiscardComment}
                style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelModalText}>
                  Keep editing
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleConfirmDiscardComment}
                style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.confirmModalText}>
                  Discard
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      </AppModal>

      {/* Full likes list — signed-in only */}
      {user && (
        <LikesModal
          factId={id}
          visible={likesModalVisible}
          onClose={() => setLikesModalVisible(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    marginBottom: Spacing.three,
    padding: Spacing.one,
    alignSelf: 'flex-start',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  authorInfo: {
    gap: Spacing.half,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: Spacing.three,
  },
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.two,
    marginBottom: Spacing.three,
  },
  meta: {
    marginBottom: Spacing.three,
  },
actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  ownerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: Spacing.two,
  },
  // Full-screen (flex:1), no-scroll confirm overlay — mirrors the create-tab guard
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalText: {
    opacity: 0.7,
  },
  confirmModalButton: {},
  confirmModalText: {
    color: '#FFFFFF',
  },
});
