import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FactCard, LikesModal } from '@/features/facts';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useUserProfileScreen } from '../hooks/useUserProfileScreen';
import { UserProfileHeader } from './UserProfileHeader';

export function UserProfileScreen() {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const topInset = useTopInset();

  const {
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
  } = useUserProfileScreen();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleRequireLogin = useCallback(() => {
    router.push('/auth/login');
  }, [router]);

  const renderFooter = useCallback(() => {
    if (isTabLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <LoadingSkeleton count={1} />
        </View>
      );
    }

    if (!tabHasMore && displayedFacts.length > 5) {
      return (
        <View style={styles.endOfList}>
          <Ionicons name="checkmark-circle-outline" size={24} color={theme.muted} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.endOfListText}>
            {t('common:endOfList', { defaultValue: 'Has llegado al final' })}
          </ThemedText>
        </View>
      );
    }

    return null;
  }, [isTabLoadingMore, tabHasMore, displayedFacts.length, theme.muted, t]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={displayedFacts}
        keyExtractor={(item) => (item.isRepost ? `repost-${item.id}` : item.id)}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
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
              onRequireLogin={handleRequireLogin}
            />
          </View>
        )}
        ListHeaderComponent={
          <UserProfileHeader
            profile={profile}
            isLoading={isLoading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={handleBack}
            factsCount={displayedFacts.length}
            factsLoading={isTabLoading}
            likesCount={displayedFacts.length}
            likesLoading={isTabLoading}
          />
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={[styles.list, { paddingTop: topInset }]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
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
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  cardWrapper: {
    marginBottom: Spacing.three,
  },
  footerLoading: {
    paddingVertical: Spacing.two,
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
