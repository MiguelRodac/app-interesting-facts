import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter, useFocusEffect } from 'expo-router';

import { FactCard } from '@/components/FactCard';
import { EmptyState } from '@/components/EmptyState';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useFacts } from '@/data/hooks/useFacts';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

export default function FeedScreen() {
  const { facts, isLoading, hasMore, fetchFacts, loadMore, toggleLike } = useFacts();
const { isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const firstFocusRef = useRef(true);

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

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      router.push(`/fact/${fact.id}?from=feed`);
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

const renderItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant={isAuthenticated ? 'preview' : 'anon'}
        onPress={isAuthenticated ? () => handleFactPress(item) : undefined}
        onLike={isAuthenticated ? () => handleLike(item.id) : undefined}
        onOpenLikes={isAuthenticated ? () => setLikesFactId(item.id) : undefined}
      />
    ),
    [isAuthenticated, handleFactPress, handleLike],
  );

  const renderFooter = useCallback(
    () => (isLoading && facts.length > 0 ? <LoadingSkeleton count={1} /> : null),
    [isLoading, facts.length],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return <LoadingSkeleton count={3} />;
    }
    return <EmptyState title="No facts yet" subtitle="Be the first to share a fact!" icon="bulb-outline" />;
  }, [isLoading]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="subtitle">Interesting Facts</ThemedText>
        {!isAuthenticated ? (
          <View style={styles.authButtons}>
            <AppPressable
              style={[styles.authButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/auth/login')}>
              <ThemedText type="small" style={styles.authButtonText}>
                Sign In
              </ThemedText>
            </AppPressable>
            <AppPressable
              style={[styles.authButton, { borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => router.push('/auth/register')}>
              <ThemedText type="small" style={{ color: theme.text }}>
                Register
              </ThemedText>
            </AppPressable>
          </View>
        ) : null}
      </View>

      {/* Facts list */}
      <FlatList
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  authButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  authButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.md,
    minWidth: 80,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#ffffff',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
});
