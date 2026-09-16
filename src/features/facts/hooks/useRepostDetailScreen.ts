import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFacts } from './useFacts';
import { useRepostComments, notifyRepostCommentsChanged } from './useRepostComments';
import { subscribeEntryUpdates } from '@/shared/events/entryUpdateBus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/stores/uiStore';
import type { Comment, Fact } from '@/types';

export interface CommentReplyTarget {
  commentId: string;
  username: string;
  initialText?: string;
}

export function useRepostDetailScreen(id?: string, from?: string) {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const { facts, fetchRepostById, toggleRepostLike, toggleRepost } = useFacts();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const cachedFact =
    (id ? (facts.find((f) => f.id === id) ?? facts.find((f) => f.originalFactId === id)) : null) ?? null;
  const [fact, setFact] = useState<Fact | null>(cachedFact);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(!cachedFact);
  const [refreshing, setRefreshing] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [commentLikesId, setCommentLikesId] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<CommentReplyTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerHasPending, setComposerHasPending] = useState(false);
  const [confirmDiscardCommentVisible, setConfirmDiscardCommentVisible] = useState(false);

  const repostEntryId = fact?.isRepost ? fact.id : null;
  const entityId = repostEntryId ?? id ?? '';

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

  const loadRepost = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchRepostById(id);
      if (data) setFact(data);
    } catch {
      // Handled by store
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, fetchRepostById]);

  useEffect(() => {
    let cancelled = false;
    if (!cachedFact) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          loadRepost();
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [id, cachedFact, loadRepost]);

  useEffect(() => {
    if (!id) return;
    return subscribeEntryUpdates((scope, anchor) => {
      const currentFactId = fact?.id ?? id;
      const currentOriginalId = fact?.originalFactId;
      const isTarget =
        anchor.id === currentFactId ||
        (currentOriginalId && anchor.id === currentOriginalId) ||
        (anchor.originalFactId && anchor.originalFactId === currentOriginalId);

      if (isTarget) {
        loadRepost();
      }
    });
  }, [id, fact?.id, fact?.originalFactId, loadRepost]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRepost();
      if (repostEntryId) {
        notifyRepostCommentsChanged(repostEntryId);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadRepost, repostEntryId]);

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
    [user, router]
  );

  const lastRepostLikePressRef = useRef(0);
  const handleRepostLike = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (fact && repostEntryId) {
      const now = Date.now();
      if (now - lastRepostLikePressRef.current < 400) return;
      lastRepostLikePressRef.current = now;
      toggleRepostLike(repostEntryId, fact);
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
        showToast(
          res.reposted ? t('feed:repostPublished') : t('feed:repostRemoved'),
          'success'
        );
      }
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

  const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'en-US';

  return {
    fact,
    repostEntryId,
    loading,
    refreshing,
    isAuthenticated,
    dateLocale,
    user,
    expanded,
    setExpanded,
    likesModalVisible,
    setLikesModalVisible,
    commentLikesId,
    setCommentLikesId,
    editingComment,
    replyTo,
    setReplyTo,
    setEditingId,
    confirmDiscardCommentVisible,
    setConfirmDiscardCommentVisible,
    setComposerHasPending,
    handleRefresh,
    handleAuthorPress,
    handleCommentAuthorPress,
    handleRepostLike,
    handleRepost,
    handleShare,
    handleBack,
    handleCommentReply,
    handleCommentEdit,
    handleComposerDone,
  };
}
