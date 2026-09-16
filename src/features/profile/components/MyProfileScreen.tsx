import { useCallback, useEffect, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FactCard, LikesModal } from '@/features/facts';
import type { Fact } from '@/types';
import { registerScrollToTop } from '@/lib/scrollToTop';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useMyProfileScreen } from '../hooks/useMyProfileScreen';
import { MyProfileHeader } from './MyProfileHeader';
import { MyProfileTabs } from './MyProfileTabs';
import { MyProfileUnauthPrompt } from './MyProfileUnauthPrompt';

export function MyProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();

  const {
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
  } = useMyProfileScreen();

  const flatListRef = useRef<FlatList<Fact>>(null);

  useEffect(() => {
    return registerScrollToTop(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      handleRefresh();
    }, 'profile');
  }, [handleRefresh]);

  const renderEmpty = useCallback(() => {
    if (activeTab === 'mine') {
      if (isLoading) return <LoadingSkeleton count={2} />;
      return <EmptyState title={t('profile:noFactsTitle')} subtitle={t('profile:noFactsSubtitle')} icon="bulb-outline" />;
    }
    if (activeTab === 'liked') {
      if (isLoading) return <LoadingSkeleton count={2} />;
      return <EmptyState title={t('profile:noLikedTitle')} subtitle={t('profile:noLikedSubtitle')} icon="heart-outline" />;
    }
    if (isLoading) return <LoadingSkeleton count={2} />;
    return <EmptyState title={t('profile:noMentionsTitle')} subtitle={t('profile:noMentionsSubtitle')} icon="at-outline" />;
  }, [activeTab, isLoading, t]);

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <LoadingSkeleton count={1} />
        </View>
      );
    }
    if (!hasMore && displayedFacts.length > 5) {
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
  }, [isLoadingMore, hasMore, displayedFacts.length, theme.muted, t]);

  if (!isAuthenticated || !user) {
    return (
      <MyProfileUnauthPrompt
        topInset={topInset}
        onSettings={handleSettings}
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: topInset }]}>
      <FlatList
        ref={flatListRef}
        data={displayedFacts}
        keyExtractor={(item) => (item.isRepost ? `repost-${item.id}` : item.id)}
        contentContainerStyle={styles.listContent}
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
        ListHeaderComponent={
          <View>
            <MyProfileHeader
              user={user}
              onAvatarPress={() => setAvatarModalVisible(true)}
              onEditProfile={handleEditProfile}
              onSettings={handleSettings}
            />
            <MyProfileTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </View>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <FactCard
              fact={item}
              variant="preview"
              isSignedIn={true}
              onPress={() => handleFactPress(item)}
              onLike={!item.isRepost ? () => handleLike(item.id) : undefined}
              onRepost={() => handleRepost(item.originalFactId ?? item.id)}
              onRepostLike={item.isRepost ? () => handleRepostLike(item.id) : undefined}
              onOpenLikes={!item.isRepost ? () => setLikesFactId(item.originalFactId ?? item.id) : undefined}
              onOpenRepostLikes={item.isRepost ? () => setLikesRepostId(item.id) : undefined}
            />
          </View>
        )}
      />

      <AppModal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}>
        <AppPressable style={styles.modalBackdrop} onPress={() => setAvatarModalVisible(false)}>
          <View style={styles.modalContent}>
            <UserAvatar user={user} size={200} />
          </View>
        </AppPressable>
      </AppModal>

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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: Spacing.four,
    borderRadius: Radii.xl,
  },
});
