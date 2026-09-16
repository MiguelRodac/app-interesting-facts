import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUserProfile } from './useUserProfile';
import { useUserLikes } from '@/features/facts/hooks/useUserLikes';
import { useRepostsStore } from '@/features/facts/stores/repostsStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Fact } from '@/types';

export type UserProfileTab = 'facts' | 'likes';

export function useUserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const {
    profile,
    facts,
    isLoading,
    factsLoading,
    factsLoadingMore,
    factsHasMore,
    fetchProfile,
    fetchUserFacts,
    loadMoreUserFacts,
    toggleLike,
    toggleRepost,
    clearProfile,
  } = useUserProfile();

  const {
    likedEntries,
    likesLoading,
    likesLoadingMore,
    hasMore: hasMoreLikes,
    refetch: refetchUserLikes,
    loadMore: loadMoreUserLikes,
  } = useUserLikes(profile?.id ?? null);

  const { isAuthenticated } = useAuth();
  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);

  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<UserProfileTab>('facts');

  const profileId = profile?.id;

  useEffect(() => {
    if (!username) {
      router.replace('/(tabs)');
      return;
    }
    fetchProfile(username).catch(() => {});
    return () => {
      clearProfile();
    };
  }, [username, router, fetchProfile, clearProfile]);

  useEffect(() => {
    if (profileId) {
      fetchUserFacts(profileId);
    }
  }, [profileId, fetchUserFacts]);

  const handleEndReached = useCallback(() => {
    if (!profileId) return;
    if (activeTab === 'facts') {
      if (factsHasMore && !factsLoading && !factsLoadingMore && facts.length > 0) {
        loadMoreUserFacts(profileId);
      }
    } else if (activeTab === 'likes') {
      if (hasMoreLikes && !likesLoading && !likesLoadingMore && likedEntries.length > 0) {
        loadMoreUserLikes();
      }
    }
  }, [
    profileId,
    activeTab,
    factsHasMore,
    factsLoading,
    factsLoadingMore,
    facts.length,
    loadMoreUserFacts,
    hasMoreLikes,
    likesLoading,
    likesLoadingMore,
    likedEntries.length,
    loadMoreUserLikes,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!username) return;
    setRefreshing(true);
    try {
      await fetchProfile(username, profile ? true : undefined);
      if (profile?.id) {
        await Promise.all([fetchUserFacts(profile.id, true), refetchUserLikes()]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [username, profile, fetchProfile, fetchUserFacts, refetchUserLikes]);

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

  const handleLike = useCallback(
    async (factId: string) => {
      if (!isAuthenticated) return;
      await toggleLike(factId);
    },
    [isAuthenticated, toggleLike],
  );

  const handleRepost = useCallback(
    async (factId: string) => {
      if (!isAuthenticated) return;
      await toggleRepost(factId);
    },
    [isAuthenticated, toggleRepost],
  );

  const handleRepostLike = useCallback(
    async (repostEntryId: string) => {
      if (!isAuthenticated) return;
      await toggleRepostLike(repostEntryId);
      if (profileId) {
        fetchUserFacts(profileId);
      }
    },
    [isAuthenticated, toggleRepostLike, profileId, fetchUserFacts],
  );

  const displayedFacts = activeTab === 'facts' ? facts : likedEntries;
  const isTabLoading = activeTab === 'facts' ? factsLoading : likesLoading;
  const isTabLoadingMore = activeTab === 'facts' ? factsLoadingMore : likesLoadingMore;
  const tabHasMore = activeTab === 'facts' ? factsHasMore : hasMoreLikes;

  return {
    profile,
    isLoading,
    displayedFacts,
    isTabLoading,
    isTabLoadingMore,
    tabHasMore,
    activeTab,
    setActiveTab,
    refreshing,
    isAuthenticated,
    likesFactId,
    setLikesFactId,
    likesRepostId,
    setLikesRepostId,
    handleRefresh,
    handleEndReached,
    handleFactPress,
    handleLike,
    handleRepost,
    handleRepostLike,
    router,
  };
}
