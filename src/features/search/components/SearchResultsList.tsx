import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FactCard } from '@/features/facts';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Author, Fact, Hashtag } from '@/types';
import type { SearchTabKey } from '../hooks/useSearchScreen';
import { SearchUserRow } from './SearchUserRow';
import { SearchHashtagRow } from './SearchHashtagRow';
import { SearchFooter } from './SearchFooter';

interface SearchResultsListProps {
  activeTab: SearchTabKey;
  query: string;
  peopleResults: Author[];
  postsResults: Fact[];
  hashtagsResults: Hashtag[];
  isLoading: boolean;
  isLoadingMore: boolean;
  canLoadMore: boolean;
  isAuthenticated: boolean;
  refreshing: boolean;
  flatListRef: React.RefObject<FlatList | null>;
  scrollYRef: React.MutableRefObject<number>;
  onRefresh: () => void;
  onLoadMore: () => void;
  onFactPress: (fact: Fact) => void;
  onUserPress: (user: Author) => void;
  onHashtagPress: (tag: string) => void;
  onLike: (factId: string) => void;
  onRepost: (factId: string) => void;
  onRepostLike: (repostEntryId: string) => void;
  onOpenLikes: (factId: string) => void;
  onOpenRepostLikes: (repostId: string) => void;
}

export function SearchResultsList({
  activeTab,
  query,
  peopleResults,
  postsResults,
  hashtagsResults,
  isLoading,
  isLoadingMore,
  canLoadMore,
  isAuthenticated,
  refreshing,
  flatListRef,
  scrollYRef,
  onRefresh,
  onLoadMore,
  onFactPress,
  onUserPress,
  onHashtagPress,
  onLike,
  onRepost,
  onRepostLike,
  onOpenLikes,
  onOpenRepostLikes,
}: SearchResultsListProps) {
  const { t } = useTranslation(['search', 'common']);
  const theme = useTheme();

  const activeData =
    activeTab === 'people'
      ? peopleResults
      : activeTab === 'posts'
        ? postsResults
        : hashtagsResults;

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

  const renderItem = useCallback(
    ({ item }: { item: Author | Fact | Hashtag }) => {
      if (activeTab === 'people') {
        return <SearchUserRow user={item as Author} onPress={onUserPress} />;
      }
      if (activeTab === 'hashtags') {
        return <SearchHashtagRow hashtag={item as Hashtag} onPress={onHashtagPress} />;
      }
      const fact = item as Fact;
      return (
        <FactCard
          fact={fact}
          variant="preview"
          isSignedIn={isAuthenticated}
          onPress={() => onFactPress(fact)}
          onLike={isAuthenticated && !fact.isRepost ? () => onLike(fact.id) : undefined}
          onRepost={isAuthenticated ? () => onRepost(fact.originalFactId ?? fact.id) : undefined}
          onRepostLike={isAuthenticated && fact.isRepost ? () => onRepostLike(fact.id) : undefined}
          onOpenLikes={!fact.isRepost ? () => onOpenLikes(fact.originalFactId ?? fact.id) : undefined}
          onOpenRepostLikes={fact.isRepost ? () => onOpenRepostLikes(fact.id) : undefined}
        />
      );
    },
    [
      activeTab,
      isAuthenticated,
      onUserPress,
      onHashtagPress,
      onFactPress,
      onLike,
      onRepost,
      onRepostLike,
      onOpenLikes,
      onOpenRepostLikes,
    ],
  );

  const keyExtractor = (item: Author | Fact | Hashtag): string => {
    return item.id;
  };

  if (isLoading && activeData.length === 0) {
    return <LoadingSkeleton count={3} />;
  }

  return (
    <FlatList
      ref={flatListRef}
      data={activeData as (Author | Fact | Hashtag)[]}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={
        <SearchFooter
          isLoadingMore={isLoadingMore}
          canLoadMore={canLoadMore}
          isLoading={isLoading}
          hasData={activeData.length > 0}
          onLoadMore={onLoadMore}
        />
      }
      showsVerticalScrollIndicator={false}
      onScroll={(e) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
