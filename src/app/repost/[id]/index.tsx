import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View, Share, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

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
import { useRepostComments, notifyRepostCommentsChanged } from '@/data/hooks/useRepostComments';
import { useAuth } from '@/data/hooks/useAuth';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Comment, Fact } from '@/types';

interface CommentReplyTarget {
  commentId: string;
  username: string;
  initialText?: string;
}

export default function RepostDetailScreen() {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { facts, fetchFactById, fetchRepostById, toggleRepostLike, toggleRepost } = useFacts();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasCheckedAuth = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const theme = useTheme();
  const topInset = useTopInset();
  const [fact, setFact] = useState<Fact | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isCollapsible = fact ? fact.content.length > COLLAPSE_THRESHOLD : false;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [commentLikesId, setCommentLikesId] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<CommentReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [composerHasPending, setComposerHasPending] = useState(false);
  const [confirmDiscardCommentVisible, setConfirmDiscardCommentVisible] = useState(false);

  // repostEntryId is the composite ID from the feed (e.g. "factId-repost-username")
  const repostEntryId = fact?.isRepost ? fact.id : null;

  // For repost comments, we use the repostEntryId as the entity key
  const entityId = repostEntryId ?? id ?? '';

  // Live thread from the repost comments cache
  const { comments } = useRepostComments(entityId);
  const editingComment = useMemo(() => {
    if (!editingId) return null;
    const topLevel = comments.find((c) => c.id === editingId);
    if (topLevel) return topLevel;
    for (const comment of comments) {
      const reply = (comment.replies ?? []).find((r) => r.id === editingId);
      if (reply) return reply;
    }
    return null;
  }, [comments, editingId]);

  const handleCommentReply = useCallback((comment: Comment, rootCommentId?: string) => {
    setEditingId(null);
    const effectiveParentId = rootCommentId ?? comment.parentCommentId ?? comment.id;
    const isReplyingToNested = comment.parentCommentId != null || (rootCommentId != null && rootCommentId !== comment.id);
    setReplyTo({
      commentId: effectiveParentId,
      username: comment.author.username,
      initialText: isReplyingToNested ? `@${comment.author.username} ` : '',
    });
  }, []);

  const handleCommentEdit = useCallback((comment: Comment) => {
    setReplyTo(null);
    setEditingId(comment.id);
  }, []);

  const handleComposerCancelReply = useCallback(() => setReplyTo(null), []);
  const handleComposerCancelEdit = useCallback(() => setEditingId(null), []);

  const handleComposerDone = useCallback(() => {
    setReplyTo(null);
    setEditingId(null);
  }, []);

  const handleComposerPendingTextChange = useCallback((hasPending: boolean) => {
    setComposerHasPending(hasPending);
  }, []);

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

  // Load the repost from store or fetch it
  useEffect(() => {
    if (!id) return;
    const found = facts.find((f) => f.id === id);
    if (found) {
      setFact(found);
      setLoading(false);
      return;
    }
    // Try finding by originalFactId (for reposts that may be stored by their original ID)
    const byOriginal = facts.find((f) => f.originalFactId === id);
    if (byOriginal) {
      setFact(byOriginal);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchRepostById(id)
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
  }, [id, facts, fetchRepostById]);

  const handleRefresh = useCallback(async () => {
    if (!id || !repostEntryId) return;
    setRefreshing(true);
    try {
      await fetchRepostById(id);
      notifyRepostCommentsChanged(repostEntryId);
    } finally {
      setRefreshing(false);
    }
  }, [id, repostEntryId, fetchRepostById]);

  const handleAuthorPress = useCallback(() => {
    if (!fact) return;
    if (user && fact.author.id === user.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/(tabs)/users/[username]', params: { username: fact.author.username } });
    }
  }, [user, fact, router]);

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

  const handleOpenCommentLikes = useCallback((commentId: string) => {
    setCommentLikesId(commentId);
  }, []);

  const handleRepostLike = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (fact && repostEntryId) {
      toggleRepostLike(repostEntryId);
    }
  }, [fact, repostEntryId, toggleRepostLike, isAuthenticated, router]);

  const handleRepost = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (fact) {
      const res = await toggleRepost(fact.originalFactId ?? fact.id);
      if (res?.success) {
        useUIStore.getState().showToast(
          res.reposted ? t('feed:repostPublished') : t('feed:repostRemoved'),
          'success'
        );
      }
    }
  }, [fact, toggleRepost, isAuthenticated, router, t]);

  const handleShare = useCallback(async () => {
    if (!fact) return;
    try {
      await Share.share({
        message: `${fact.title ? fact.title + ': ' : ''}${fact.content}`,
      });
    } catch {
      // User cancelled share
    }
  }, [fact]);

  const handleScrollToComments = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleBack = useCallback(() => {
    if (composerHasPending) {
      setConfirmDiscardCommentVisible(true);
      return;
    }
    switch (from) {
      case 'search':
        router.replace('/(tabs)/search');
        break;
      case 'profile':
        router.replace('/(tabs)/profile');
        break;
      case 'user':
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
        <EmptyState title={t('common:factNotFound')} subtitle={t('common:factNotFoundSubtitle')} icon="alert-circle-outline" />
      </ThemedView>
    );
  }

  const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'en-US';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollViewRef}
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

        {/* Repost banner */}
        {fact.reposterUsername && (
          <View style={[styles.repostBanner, { borderBottomColor: theme.border }]}>
            <Ionicons name="repeat" size={14} color={theme.muted} />
            <ThemedText type="small" themeColor="textSecondary">
              {fact.reposterUsername === user?.username
                ? t('feed:youReposted')
                : t('feed:repostedBy', { username: fact.reposterUsername })}
            </ThemedText>
          </View>
        )}

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
            <StyledContent content={fact.title} style={styles.title} />
          ) : null}

          {/* Content */}
          <StyledContent
            content={fact.content}
            numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
            style={styles.content}
          />

          {/* Expand/collapse toggle */}
          {isCollapsible && (
            <AppPressable onPress={() => setExpanded((current) => !current)} hitSlop={6} style={styles.seeMore}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {expanded ? t('feed:seeLess') : t('feed:seeMore')}
              </ThemedText>
            </AppPressable>
          )}

          {/* Meta */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            {new Date(fact.createdAt).toLocaleDateString(dateLocale, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>

          {/* Repost likes line — same format as facts: 3 avatars + usernames + N more */}
          <LikedByLine
            likes={fact.likeBy ?? []}
            likesCount={fact.repostLikeCount ?? 0}
            onPress={() =>
              isAuthenticated
                ? setLikesModalVisible(true)
                : router.push('/auth/login')
            }
          />

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {/* Repost like */}
            <AppPressable onPress={handleRepostLike} style={styles.actionBtn} hitSlop={8}>
              <Ionicons
                name={fact.repostLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={fact.repostLiked ? theme.destructive : theme.muted}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {fact.repostLikeCount ?? 0}
              </ThemedText>
            </AppPressable>

            {/* Comment — scroll to the comment thread below */}
            <AppPressable onPress={handleScrollToComments} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={24} color={theme.muted} />
              <ThemedText type="small" themeColor="textSecondary">
                {fact.repostCommentCount ?? 0}
              </ThemedText>
            </AppPressable>

            {/* Repost toggle */}
            <AppPressable onPress={handleRepost} style={styles.actionBtn} hitSlop={8}>
              <Ionicons
                name={fact.repostedByMe ? 'repeat' : 'repeat-outline'}
                size={28}
                color={fact.repostedByMe ? theme.primary : theme.muted}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {fact.repostCount}
              </ThemedText>
            </AppPressable>

            <AppPressable onPress={handleShare} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={24} color={theme.muted} />
            </AppPressable>
          </View>
        </ThemedView>

        {/* Repost comments */}
        {isAuthenticated && repostEntryId && (
          <CommentSection
            repostEntryId={repostEntryId}
            onCommentAuthorPress={handleCommentAuthorPress}
            isSignedIn={isAuthenticated}
            onReply={handleCommentReply}
            onEdit={handleCommentEdit}
            onOpenCommentLikes={handleOpenCommentLikes}
          />
        )}
      </ScrollView>

      {/* Fixed bottom comment composer */}
      {isAuthenticated && repostEntryId && (
        <CommentComposer
          repostEntryId={repostEntryId}
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

      {/* Unsaved comment draft confirm */}
      <AppModal
        visible={confirmDiscardCommentVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDiscardComment}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('common:discardCommentTitle')}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              {t('common:discardCommentMessage')}
            </ThemedText>
            <View style={styles.modalButtons}>
              <AppPressable
                onPress={handleCancelDiscardComment}
                style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelModalText}>
                  {t('common:keepEditing')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleConfirmDiscardComment}
                style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.confirmModalText}>
                  {t('common:discard')}
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      </AppModal>

      {/* Repost likes modal */}
      {user && repostEntryId && (
        <LikesModal
          repostId={repostEntryId}
          visible={likesModalVisible}
          onClose={() => setLikesModalVisible(false)}
        />
      )}

      {/* Repost comment likes modal */}
      {user && repostEntryId && (
        <LikesModal
          repostId={repostEntryId}
          repostCommentId={commentLikesId}
          visible={commentLikesId !== null}
          onClose={() => setCommentLikesId(null)}
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
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
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
    flex: 1,
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
  repostLikesLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
