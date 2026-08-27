import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/ui/app-pressable';
import { FactCard } from '@/components/FactCard';
import { EmptyState } from '@/components/EmptyState';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useFacts } from '@/data/hooks/useFacts';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { registerScrollToTop } from '@/lib/scrollToTop';
import type { Fact } from '@/types';

export default function FeedScreen() {
  const { t } = useTranslation(['feed', 'common']);
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

  // Initial fetch shows the skeleton; later focus refreshes are silent
  // (background merge keeps new facts on top without resetting scroll).
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

  // Register scroll-to-top handler so the tab bar can trigger it
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
      const ok = await toggleRepost(factId);
      if (ok) Alert.alert(t('common:ready'), t('feed:repostPublished'));
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
        onRepost={isAuthenticated ? () => handleRepost(item.id) : undefined}
        onRepostLike={isAuthenticated ? () => handleRepostLike(item.id) : undefined}
        onOpenLikes={() => setLikesFactId(item.originalFactId ?? item.id)}
        onOpenRepostLikes={() => setLikesRepostId(item.id)}
        onRequireLogin={handleRequireLogin}
      />
    ),
    [isAuthenticated, handleFactPress, handleLike, handleRepost, handleRepostLike, handleRequireLogin],
  );

  const renderFooter = useCallback(() => {
    if (isLoading && facts.length > 0) return <LoadingSkeleton count={1} />;
    if (!hasMore && facts.length > 0) {
      if (!isAuthenticated) {
        return (
          <View style={styles.footerContainer}>
            <ThemedView type="backgroundElement" style={[styles.guestCard, { borderColor: theme.border }]}>
              <Ionicons name="sparkles" size={28} color={theme.primary} />
              <ThemedText type="subtitle" style={styles.guestTitle}>
                {t('feed:guestBannerTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.guestSubtitle}>
                {t('feed:guestBannerSubtitle')}
              </ThemedText>
              <View style={styles.guestButtons}>
                <AppPressable
                  style={[styles.guestButton, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/auth/login')}>
                  <ThemedText type="smallBold" style={styles.guestButtonText}>
                    {t('feed:guestBannerSignIn')}
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  style={[styles.guestButton, { borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => router.push('/auth/register')}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {t('feed:guestBannerSignUp')}
                  </ThemedText>
                </AppPressable>
              </View>
            </ThemedView>
          </View>
        );
      }
      return (
        <View style={styles.endOfList}>
          <Ionicons name="checkmark-circle-outline" size={28} color={theme.muted} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.endOfListText}>
            {t('feed:endOfListTitle')}
          </ThemedText>
          <ThemedText type="small" themeColor="muted">
            {t('feed:endOfListSubtitle')}
          </ThemedText>
        </View>
      );
    }
    return null;
  }, [isLoading, facts.length, hasMore, isAuthenticated, theme, t, router]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return <LoadingSkeleton count={3} />;
    }
    return (
      <EmptyState
        title={t('feed:emptyTitle')}
        subtitle={t('feed:emptySubtitle')}
        icon="bulb-outline"
      />
    );
  }, [isLoading, t]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="subtitle">{t('feed:title')}</ThemedText>
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
        ListFooterComponent={renderFooter}
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
  footerContainer: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    alignItems: 'center',
    textAlign: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  guestTitle: {
    textAlign: 'center',
  },
  guestSubtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  guestButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  guestButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: '#FFFFFF',
  },
  endOfList: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.one,
  },
  endOfListText: {
    fontWeight: '600',
  },
});
