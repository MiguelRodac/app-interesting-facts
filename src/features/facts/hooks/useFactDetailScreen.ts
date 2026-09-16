import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFacts } from './useFacts';
import { notifyFactCommentsChanged, useFactComments } from '@/features/comments/hooks/useFactComments';
import { subscribeEntryUpdates } from '@/shared/events/entryUpdateBus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/stores/uiStore';
import type { Comment, Fact } from '@/types';

export interface CommentReplyTarget {
  commentId: string;
  username: string;
  initialText?: string;
}

export function useFactDetailScreen(id?: string, from?: string) {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const { facts, fetchFactById, toggleLike, toggleRepost, deleteFact } = useFacts();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const isDeletingRef = useRef(false);
  const showToast = useUIStore((s) => s.showToast);

  const cachedFact = (id ? facts.find((f) => f.id === id) : null) ?? null;
  const [fact, setFact] = useState<Fact | null>(cachedFact);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(!cachedFact);
  const [refreshing, setRefreshing] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [commentLikesId, setCommentLikesId] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<CommentReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerHasPending, setComposerHasPending] = useState(false);
  const [confirmDiscardCommentVisible, setConfirmDiscardCommentVisible] = useState(false);

  const { comments } = useFactComments(id ?? '');
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

  const handleComposerDone = useCallback(() => {
    setReplyTo(null);
    setEditingId(null);
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

  const loadFact = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchFactById(id);
      if (data) setFact(data);
    } catch {
      // Handled by store
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, fetchFactById]);

  useEffect(() => {
    if (!cachedFact) {
      loadFact();
    } else {
      setLoading(false);
    }
  }, [id, cachedFact, loadFact]);

  useEffect(() => {
    if (!id) return;
    return subscribeEntryUpdates((scope, anchor) => {
      if (anchor.id === id && scope === 'fact') {
        loadFact();
      }
    });
  }, [id, loadFact]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFact();
    if (id) notifyFactCommentsChanged(id);
  }, [loadFact, id]);

  const handleConfirmDelete = useCallback(async () => {
    if (!fact) return;
    isDeletingRef.current = true;
    setConfirmDeleteVisible(false);
    try {
      await deleteFact(fact.id);
      showToast(t('common:factDeleted'), 'success');
      router.replace('/(tabs)');
    } catch {
      isDeletingRef.current = false;
    }
  }, [fact, deleteFact, router, showToast, t]);

  const handleAuthorPress = useCallback(() => {
    if (!fact) return;
    if (isAuthenticated && user?.username === fact.author.username) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/(tabs)/users/${fact.author.username}`);
    }
  }, [fact, isAuthenticated, user, router]);

  const handleLike = useCallback(async () => {
    if (!fact) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const previousLiked = fact.liked;
    const previousCount = fact.likesCount;
    setFact((prev) =>
      prev
        ? {
            ...prev,
            liked: !prev.liked,
            likesCount: prev.liked ? Math.max(0, prev.likesCount - 1) : prev.likesCount + 1,
          }
        : null
    );
    try {
      await toggleLike(fact.id);
    } catch {
      setFact((prev) => (prev ? { ...prev, liked: previousLiked, likesCount: previousCount } : null));
    }
  }, [fact, isAuthenticated, toggleLike, router]);

  const handleRepost = useCallback(async () => {
    if (!fact) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const previousReposted = fact.repostedByMe;
    const previousCount = fact.repostCount;
    setFact((prev) =>
      prev
        ? {
            ...prev,
            repostedByMe: !prev.repostedByMe,
            repostCount: prev.repostedByMe ? Math.max(0, prev.repostCount - 1) : prev.repostCount + 1,
          }
        : null
    );
    try {
      const res = await toggleRepost(fact.originalFactId ?? fact.id);
      if (res?.success) {
        showToast(
          res.reposted ? t('feed:repostPublished') : t('feed:repostRemoved'),
          'success'
        );
      }
    } catch {
      setFact((prev) => (prev ? { ...prev, repostedByMe: previousReposted, repostCount: previousCount } : null));
    }
  }, [fact, toggleRepost, isAuthenticated, router, showToast, t]);

  const handleShare = useCallback(async () => {
    if (!fact) return;
    try {
      await Share.share({
        message: `${fact.title ? fact.title + ': ' : ''}${fact.content}`,
      });
    } catch {}
  }, [fact]);

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

  const isOwner = !!(user && fact && user.username === fact.author.username);
  const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'en-US';

  return {
    fact,
    loading,
    refreshing,
    isOwner,
    isAuthenticated,
    dateLocale,
    expanded,
    setExpanded,
    overflowVisible,
    setOverflowVisible,
    confirmDeleteVisible,
    setConfirmDeleteVisible,
    confirmDiscardCommentVisible,
    setConfirmDiscardCommentVisible,
    likesModalVisible,
    setLikesModalVisible,
    commentLikesId,
    setCommentLikesId,
    editingComment,
    replyTo,
    setReplyTo,
    setEditingId,
    setComposerHasPending,
    handleRefresh,
    handleConfirmDelete,
    handleAuthorPress,
    handleLike,
    handleRepost,
    handleShare,
    handleBack,
    handleCommentReply,
    handleCommentEdit,
    handleComposerDone,
  };
}
