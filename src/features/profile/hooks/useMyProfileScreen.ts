import { useCallback, useRef, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useFactsStore,
  useRepostsStore,
  useUserLikes,
  useMentionedFacts,
} from '@/features/facts';
import type { Fact } from '@/types';

export type ProfileTab = 'mine' | 'liked' | 'mentions';

export function useMyProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const userFacts = useFactsStore((s) => s.userFacts);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const userFactsLoadingMore = useFactsStore((s) => s.userFactsLoadingMore);
  const userFactsHasMore = useFactsStore((s) => s.userFactsHasMore);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);
  const loadMoreUserFacts = useFactsStore((s) => s.loadMoreUserFacts);
  const fetchFacts = useFactsStore((s) => s.fetchFacts);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);

  const {
    likedEntries,
    likesLoading,
    likesLoadingMore,
    hasMore: hasMoreLikes,
    refetch: refetchLikes,
    loadMore: loadMoreLikes,
  } = useUserLikes(user?.id);

  const {
    mentionedFacts,
    mentionsLoading,
    mentionsLoadingMore,
    hasMore: hasMoreMentions,
    refetch: refetchMentions,
    loadMore: loadMoreMentions,
  } = useMentionedFacts(user?.username);

  const [activeTab, setActiveTab] = useState<ProfileTab>('mine');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const firstFocusRef = useRef(true);
  const userId = user?.id;

  const handleEndReached = useCallback(() => {
    if (!userId) return;
    if (activeTab === 'mine') {
      if (userFactsHasMore && !userFactsLoading && !userFactsLoadingMore && userFacts.length > 0) {
        loadMoreUserFacts(userId);
      }
    } else if (activeTab === 'liked') {
      if (hasMoreLikes && !likesLoading && !likesLoadingMore && likedEntries.length > 0) {
        loadMoreLikes();
      }
    } else if (activeTab === 'mentions') {
      if (hasMoreMentions && !mentionsLoading && !mentionsLoadingMore && mentionedFacts.length > 0) {
        loadMoreMentions();
      }
    }
  }, [
    userId,
    activeTab,
    userFactsHasMore,
    userFactsLoading,
    userFactsLoadingMore,
    userFacts.length,
    loadMoreUserFacts,
    hasMoreLikes,
    likesLoading,
    likesLoadingMore,
    likedEntries.length,
    loadMoreLikes,
    hasMoreMentions,
    mentionsLoading,
    mentionsLoadingMore,
    mentionedFacts.length,
    loadMoreMentions,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (userId) {
        fetchUserFacts(userId);
      }
    }, [userId, fetchUserFacts]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId) {
        await Promise.all([
          fetchUserFacts(userId),
          refetchLikes(),
          refetchMentions(),
        ]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [userId, fetchUserFacts, refetchLikes, refetchMentions]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      if (fact.isRepost) {
        router.push(`/repost/${fact.id}` as any);
      } else {
        router.push(`/fact/${fact.id}`);
      }
    },
    [router],
  );

  const handleEditProfile = useCallback(() => {
    router.push('/(tabs)/profile/edit' as any);
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleTabChange = useCallback(
    (tab: ProfileTab) => {
      setActiveTab(tab);
      if (tab === 'liked') refetchLikes();
      else if (tab === 'mentions') refetchMentions();
    },
    [refetchLikes, refetchMentions],
  );

  const handleLike = useCallback(
    async (factId: string) => {
      await toggleLike(factId);
      if (userId) {
        fetchUserFacts(userId);
        fetchFacts();
      }
    },
    [toggleLike, userId, fetchUserFacts, fetchFacts],
  );

  const handleRepostLike = useCallback(
    async (repostEntryId: string) => {
      await toggleRepostLike(repostEntryId);
      if (userId) {
        fetchUserFacts(userId);
      }
    },
    [toggleRepostLike, userId, fetchUserFacts],
  );

  const handleRepost = useCallback(
    async (factId: string) => {
      const ok = await toggleRepost(factId);
      if (ok && userId) {
        fetchUserFacts(userId);
      }
    },
    [toggleRepost, userId, fetchUserFacts],
  );

  const displayedFacts =
    activeTab === 'mine'
      ? userFacts
      : activeTab === 'liked'
        ? likedEntries
        : mentionedFacts;

  const isLoading =
    activeTab === 'mine'
      ? userFactsLoading
      : activeTab === 'liked'
        ? likesLoading
        : mentionsLoading;

  const isLoadingMore =
    activeTab === 'mine'
      ? userFactsLoadingMore
      : activeTab === 'liked'
        ? likesLoadingMore
        : mentionsLoadingMore;

  const hasMore =
    activeTab === 'mine'
      ? userFactsHasMore
      : activeTab === 'liked'
        ? hasMoreLikes
        : hasMoreMentions;

  return {
    user,
    isAuthenticated,
    activeTab,
    displayedFacts,
    isLoading,
    isLoadingMore,
    hasMore,
    refreshing,
    avatarModalVisible,
    setAvatarModalVisible,
    likesFactId,
    setLikesFactId,
    likesRepostId,
    setLikesRepostId,
    handleRefresh,
    handleEndReached,
    handleFactPress,
    handleEditProfile,
    handleSettings,
    handleTabChange,
    handleLike,
    handleRepost,
    handleRepostLike,
    router,
  };
}
