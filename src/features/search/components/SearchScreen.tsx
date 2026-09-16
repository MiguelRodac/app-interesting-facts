import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LikesModal } from '@/features/facts';
import { SegmentedTabs, type SegmentedTab } from '@/shared/ui/SegmentedTabs';
import { ThemedView } from '@/shared/ui/themed-view';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useSearchScreen } from '../hooks/useSearchScreen';
import { SearchHeader } from './SearchHeader';
import { SearchResultsList } from './SearchResultsList';

export function SearchScreen() {
  const { t } = useTranslation(['search', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();

  const {
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
  } = useSearchScreen();

  const tabs: SegmentedTab[] = useMemo(
    () => [
      { key: 'posts', label: t('search:tabPosts') },
      { key: 'people', label: t('search:tabPeople') },
      { key: 'hashtags', label: t('search:tabHashtags') },
    ],
    [t],
  );

  if (authLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SearchHeader
        topInset={topInset}
        value={inputValue}
        onChangeText={handleChangeText}
        onClear={handleClear}
      />

      {query.trim().length > 0 && !isLoading && (
        <SegmentedTabs
          tabs={tabs}
          activeKey={activeTab}
          onChange={handleTabChange}
        />
      )}

      <SearchResultsList
        activeTab={activeTab}
        query={query}
        peopleResults={peopleResults}
        postsResults={postsResults}
        hashtagsResults={hashtagsResults}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        canLoadMore={canLoadMore}
        isAuthenticated={isAuthenticated}
        refreshing={refreshing}
        flatListRef={flatListRef}
        scrollYRef={scrollYRef}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        onFactPress={handleFactPress}
        onUserPress={handleUserPress}
        onHashtagPress={handleHashtagPress}
        onLike={handleLike}
        onRepost={handleRepost}
        onRepostLike={handleRepostLike}
        onOpenLikes={setLikesFactId}
        onOpenRepostLikes={setLikesRepostId}
      />

      <LikesModal
        factId={likesFactId}
        visible={likesFactId !== null}
        onClose={() => setLikesFactId(null)}
      />

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
