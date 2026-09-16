import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FactCard } from './FactCard';
import { LikesModal } from './LikesModal';
import { useFacts } from '../hooks/useFacts';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/stores/uiStore';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { registerScrollToTop } from '@/lib/scrollToTop';
import type { Fact } from '@/types';
import { FeedFooter } from './FeedFooter';

export function FeedScreen() {
  const { t } = useTranslation('feed');
  const { facts, isLoading, hasMore, fetchFacts, loadMore, toggleLike, toggleRepost, toggleRepostLike } = useFacts();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const firstFocusRef = useRef(true);
  const flatListRef = useRef<FlatList<Fact>>(null);

  useFocusEffect(
    useCallback(() => {
      fetchFacts(firstFocusRef.current ? undefined : true);
      firstFocusRef.current = false;
    }, [fetchFacts]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFacts(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFacts]);

  useEffect(() => {
    return registerScrollToTop(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      handleRefresh();
    });
  }, [handleRefresh]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      if (fact.isRepost) {
        router.push(`/repost/${fact.id}?from=feed` as any);
      } else {
        router.push(`/fact/${fact.id}?from=feed`);
      }
    },
    [router],
  );

  const handleLike = useCallback(
    (factId: string) => {
      if (isAuthenticated) {
        toggleLike(factId);
      }
    },
    [isAuthenticated, toggleLike],
  );

  const handleRepost = useCallback(
    async (factId: string) => {
      if (!isAuthenticated) return;
      const res = await toggleRepost(factId);
      if (res?.success) {
        useUIStore.getState().showToast(
          res.reposted ? t('repostPublished') : t('repostRemoved'),
          'success'
        );
      }
    },
    [isAuthenticated, toggleRepost, t],
  );

  const handleRepostLike = useCallback(
    (repostEntryId: string) => {
      if (isAuthenticated) {
        toggleRepostLike(repostEntryId);
      }
    },
    [isAuthenticated, toggleRepostLike],
  );

  const handleRequireLogin = useCallback(() => {
    router.push('/auth/login');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant="preview"
        isSignedIn={isAuthenticated}
        onPress={() => handleFactPress(item)}
        onLike={isAuthenticated ? () => handleLike(item.id) : undefined}
        onRepost={isAuthenticated ? () => handleRepost(item.originalFactId ?? item.id) : undefined}
        onRepostLike={isAuthenticated && item.isRepost ? () => handleRepostLike(item.id) : undefined}
        onOpenLikes={() => setLikesFactId(item.originalFactId ?? item.id)}
        onOpenRepostLikes={() => setLikesRepostId(item.id)}
        onRequireLogin={handleRequireLogin}
      />
    ),
    [isAuthenticated, handleFactPress, handleLike, handleRepost, handleRepostLike, handleRequireLogin],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return <LoadingSkeleton count={3} />;
    }
    return (
      <EmptyState
        title={t('emptyTitle')}
        subtitle={t('emptySubtitle')}
        icon="bulb-outline"
      />
    );
  }, [isLoading, t]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="subtitle">{t('title')}</ThemedText>
        {!isAuthenticated && <LanguageToggle />}
      </View>

      {/* Facts list */}
      <FlatList
        ref={flatListRef}
        data={facts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <FeedFooter
            isLoading={isLoading}
            factsCount={facts.length}
            hasMore={hasMore}
            isAuthenticated={isAuthenticated}
          />
        }
        ListEmptyComponent={renderEmpty}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
});
