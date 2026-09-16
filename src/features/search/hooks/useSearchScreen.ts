import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams, useSegments, useFocusEffect } from 'expo-router';
import { useSearch } from './useSearch';
import { useAuth } from '@/features/auth';
import { useFactsStore, useRepostsStore } from '@/features/facts';
import type { Author, Fact } from '@/types';

export type SearchTabKey = 'people' | 'posts' | 'hashtags';

export function useSearchScreen() {
  const {
    query,
    activeTab,
    peopleResults,
    postsResults,
    hashtagsResults,
    isLoading,
    isLoadingMore,
    hasMorePosts,
    hasMorePeople,
    hasMoreHashtags,
    setQuery,
    setActiveTab,
    search,
    loadMore,
    clearResults,
    togglePostLike,
    togglePostRepostLike,
  } = useSearch();

  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const segments = useSegments();
  const [inputValue, setInputValue] = useState(query);
  const hasCheckedAuth = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollYRef = useRef(0);

  const toggleLike = useFactsStore((s) => s.toggleLike);
  const handleLike = useCallback(
    async (factId: string) => {
      if (!isAuthenticated) return;
      togglePostLike(factId);
      await toggleLike(factId);
    },
    [isAuthenticated, togglePostLike, toggleLike],
  );

  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const handleRepost = useCallback(
    async (factId: string) => {
      if (!isAuthenticated) return;
      const ok = await toggleRepost(factId);
      if (ok) Alert.alert('Listo', 'Repost publicado');
    },
    [isAuthenticated, toggleRepost],
  );

  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);
  const handleRepostLike = useCallback(
    async (repostEntryId: string) => {
      if (!isAuthenticated) return;
      togglePostRepostLike(repostEntryId);
      await toggleRepostLike(repostEntryId);
    },
    [isAuthenticated, togglePostRepostLike, toggleRepostLike],
  );

  const handleRefresh = useCallback(async () => {
    if (!query.trim()) return;
    setRefreshing(true);
    try {
      await search(query);
    } finally {
      setRefreshing(false);
    }
  }, [query, search]);

  // Redirect to login when unauthenticated
  useEffect(() => {
    const isOnAuthScreen = (segments as string[]).includes('auth');
    if (!isAuthenticated && !isOnAuthScreen) {
      if (!hasCheckedAuth.current) {
        hasCheckedAuth.current = true;
        router.replace('/auth/login');
      }
    } else if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated, segments, router]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Clear search results when leaving the screen (tab change)
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearResults();
        setInputValue('');
        setQuery('');
      };
    }, [clearResults, setQuery])
  );

  // Auto-execute search from route params (e.g. from hashtag press)
  const [prevParamQ, setPrevParamQ] = useState(params.q);
  if (params.q !== prevParamQ) {
    setPrevParamQ(params.q);
    if (params.q) {
      const decodedQuery = decodeURIComponent(params.q);
      setInputValue(decodedQuery);
      setQuery(decodedQuery);
    }
  }

  useEffect(() => {
    if (params.q) {
      const decodedQuery = decodeURIComponent(params.q);
      const preferred = decodedQuery.trim().startsWith('#') ? 'posts' : undefined;
      search(decodedQuery, preferred);
    }
  }, [params.q, search]);

  // Real-time search — debounced 500ms
  const handleChangeText = useCallback(
    (text: string) => {
      setInputValue(text);
      setQuery(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        search(text);
      }, 500);
    },
    [setQuery, search],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    clearResults();
  }, [clearResults]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      if (fact.isRepost) {
        router.push(`/repost/${fact.id}?from=search` as any);
      } else {
        router.push(`/fact/${fact.id}?from=search`);
      }
    },
    [router],
  );

  const handleUserPress = useCallback(
    (user: Author) => {
      router.push(`/users/${user.username}`);
    },
    [router],
  );

  const handleHashtagPress = useCallback(
    (tag: string) => {
      const hashtagQuery = `#${tag}`;
      setInputValue(hashtagQuery);
      setQuery(hashtagQuery);
      search(hashtagQuery, 'posts');
    },
    [setQuery, search],
  );

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key as SearchTabKey);
    },
    [setActiveTab],
  );

  const canLoadMore =
    activeTab === 'posts'
      ? hasMorePosts
      : activeTab === 'people'
        ? hasMorePeople
        : hasMoreHashtags;

  const handleLoadMore = useCallback(async () => {
    const savedOffset = scrollYRef.current;
    await loadMore();
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: savedOffset,
        animated: false,
      });
    });
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: savedOffset,
        animated: false,
      });
    }, 50);
  }, [loadMore]);

  return {
    query,
    activeTab,
    peopleResults,
    postsResults,
    hashtagsResults,
    isLoading,
    isLoadingMore,
    canLoadMore,
    authLoading,
    isAuthenticated,
    inputValue,
    refreshing,
    likesFactId,
    setLikesFactId,
    likesRepostId,
    setLikesRepostId,
    flatListRef,
    scrollYRef,
    handleChangeText,
    handleClear,
    handleTabChange,
    handleRefresh,
    handleLoadMore,
    handleFactPress,
    handleUserPress,
    handleHashtagPress,
    handleLike,
    handleRepost,
    handleRepostLike,
  };
}
