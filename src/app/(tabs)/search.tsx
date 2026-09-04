import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useSegments, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { FactCard } from '@/components/FactCard';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SegmentedTabs, type SegmentedTab } from '@/components/SegmentedTabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { BottomTabInset, Radii, Spacing } from '@/constants/theme';
import { useSearch } from '@/data/hooks/useSearch';
import { useFactsStore } from '@/data/stores/factsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Author, Fact, Hashtag } from '@/types';

type SearchTabKey = 'people' | 'posts' | 'hashtags';

export default function SearchScreen() {
  const { t } = useTranslation(['search', 'common']);
  const {
    query,
    activeTab,
    peopleResults,
    postsResults,
    hashtagsResults,
    isLoading,
    isLoadingMore,
    hasMore,
    setQuery,
    setActiveTab,
    search,
    loadMore,
    clearResults,
    togglePostLike,
    togglePostRepostLike,
  } = useSearch();

  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopInset();
  const params = useLocalSearchParams<{ q?: string }>();
  const segments = useSegments();
  const [inputValue, setInputValue] = useState(query);
  const latestTextRef = useRef(query);
  const hasCheckedAuth = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Cleanup debounce timeout and clear search results on unmount
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

  // Auto-execute search from route params (e.g., from hashtag press).
  // Run whenever params.q changes — whether the screen mounts fresh with a
  // query already present or an already-mounted screen receives a new query.
  useEffect(() => {
    if (params.q) {
      const decodedQuery = decodeURIComponent(params.q);
      setInputValue(decodedQuery);
      latestTextRef.current = decodedQuery;
      setQuery(decodedQuery);
      const preferred = decodedQuery.trim().startsWith('#') ? 'posts' : undefined;
      search(decodedQuery, preferred);
    }
  }, [params.q, setQuery, search]);

  // Real-time search — debounced to avoid spamming the API
  const handleChangeText = useCallback(
    (text: string) => {
      latestTextRef.current = text;
      setInputValue(text);
      setQuery(text);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce: search after 500ms of inactivity
      searchTimeoutRef.current = setTimeout(() => {
        search(latestTextRef.current);
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
      latestTextRef.current = hashtagQuery;
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

  // Build tabs with counts (Facts/Posts first, then People, then Hashtags)
  const tabsWithCounts: SegmentedTab[] = useMemo(() => [
    { key: 'posts', label: t('search:tabPosts'), count: postsResults.length },
    { key: 'people', label: t('search:tabPeople'), count: peopleResults.length },
    { key: 'hashtags', label: t('search:tabHashtags'), count: hashtagsResults.length },
  ], [t, postsResults.length, peopleResults.length, hashtagsResults.length]);

  // --- People tab ---
  const renderPeopleItem = useCallback(
    ({ item }: { item: Author }) => (
      <AppPressable
        style={[styles.userRow, { borderBottomColor: theme.border }]}
        onPress={() => handleUserPress(item)}>
        <UserAvatar user={item} size={44} />
        <View style={styles.userInfo}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {item.displayName}
          </ThemedText>
          <ThemedText type="small" themeColor="muted" numberOfLines={1}>
            @{item.username}
          </ThemedText>
        </View>
      </AppPressable>
    ),
    [handleUserPress, theme.border],
  );

  // --- Posts tab ---
  const renderPostItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant="preview"
        isSignedIn={isAuthenticated}
        onPress={() => handleFactPress(item)}
        onLike={isAuthenticated && !item.isRepost ? () => handleLike(item.id) : undefined}
        onRepost={isAuthenticated ? () => handleRepost(item.originalFactId ?? item.id) : undefined}
        onRepostLike={isAuthenticated && item.isRepost ? () => handleRepostLike(item.id) : undefined}
        onOpenLikes={!item.isRepost ? () => setLikesFactId(item.originalFactId ?? item.id) : undefined}
        onOpenRepostLikes={item.isRepost ? () => setLikesRepostId(item.id) : undefined}
      />
    ),
    [isAuthenticated, handleFactPress, handleLike, handleRepost, handleRepostLike],
  );

  // --- Hashtags tab ---
  const renderHashtagItem = useCallback(
    ({ item }: { item: Hashtag }) => (
      <AppPressable
        style={[styles.hashtagRow, { borderBottomColor: theme.border }]}
        onPress={() => handleHashtagPress(item.tag)}>
        <Ionicons name="pricetag-outline" size={18} color={theme.primary} />
        <ThemedText type="default" style={styles.hashtagText}>
          #{item.tag}
        </ThemedText>
      </AppPressable>
    ),
    [handleHashtagPress, theme.border, theme.primary],
  );

  // --- Empty state ---
  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return <LoadingSkeleton count={3} />;
    }

    if (!query.trim()) {
      return (
        <EmptyState
          title={t('search:searchHint')}
          subtitle={t('search:placeholder')}
          icon="search-outline"
        />
      );
    }

    let emptyTitle = t('search:noPostsTitle');
    let emptySubtitle = t('search:noPostsSubtitle');
    if (activeTab === 'people') {
      emptyTitle = t('search:noPeopleTitle');
      emptySubtitle = t('search:noPeopleSubtitle');
    } else if (activeTab === 'hashtags') {
      emptyTitle = t('search:noHashtagsTitle');
      emptySubtitle = t('search:noHashtagsSubtitle');
    }

    return (
      <EmptyState
        title={emptyTitle}
        subtitle={emptySubtitle}
        icon="search-outline"
      />
    );
  }, [isLoading, query, activeTab, t]);

  // Pick data + renderer for active tab
  const activeData =
    activeTab === 'people'
      ? peopleResults
      : activeTab === 'posts'
        ? postsResults
        : hashtagsResults;

  const activeKeyExtractor = (item: Author | Fact | Hashtag): string => {
    if (activeTab === 'hashtags') return (item as Hashtag).id;
    return item.id;
  };

  const activeRenderItem =
    activeTab === 'people'
      ? (renderPeopleItem as ({ item }: { item: Author | Fact | Hashtag }) => React.ReactElement)
      : activeTab === 'posts'
        ? (renderPostItem as ({ item }: { item: Author | Fact | Hashtag }) => React.ReactElement)
        : (renderHashtagItem as ({ item }: { item: Author | Fact | Hashtag }) => React.ReactElement);

  const handleEndReached = useCallback(() => {
    if (activeTab === 'posts' && hasMore && !isLoading && !isLoadingMore) {
      loadMore();
    }
  }, [activeTab, hasMore, isLoading, isLoadingMore, loadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || activeTab !== 'posts') return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [isLoadingMore, activeTab, theme.primary]);

  // Show loading while checking auth — early return AFTER all hooks
  if (authLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchBarContainer, { paddingTop: topInset }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Ionicons name="search-outline" size={20} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('search:placeholder')}
            placeholderTextColor={theme.muted}
            value={inputValue}
            onChangeText={handleChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputValue.length > 0 && (
            <AppPressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.muted} />
            </AppPressable>
          )}
        </View>
      </View>

      {/* Segmented tabs — only visible after a search */}
      {query.trim().length > 0 && !isLoading && (
        <SegmentedTabs
          tabs={tabsWithCounts}
          activeKey={activeTab}
          onChange={handleTabChange}
        />
      )}

      {/* Results — keep the list mounted while results exist so
          pull-to-refresh works; the skeleton only shows on first load */}
      {isLoading && activeData.length === 0 ? (
        <LoadingSkeleton count={3} />
      ) : (
        <FlatList
          data={activeData as (Author | Fact | Hashtag)[]}
          renderItem={activeRenderItem}
          keyExtractor={activeKeyExtractor}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}

      {/* Full likes list */}
      <LikesModal
        factId={likesFactId}
        visible={likesFactId !== null}
        onClose={() => setLikesFactId(null)}
      />

      {/* Repost likes list */}
      <LikesModal
        repostId={likesRepostId}
        visible={likesRepostId !== null}
        onClose={() => setLikesRepostId(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hashtagText: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
