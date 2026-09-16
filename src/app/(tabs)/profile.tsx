import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FactCard, LikesModal, useUserLikes, useMentionedFacts, useFactsStore, useRepostsStore } from '@/features/facts';
import { UserAvatar } from '@/features/profile';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useUIStore } from '@/data/stores/uiStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

type ProfileTab = 'mine' | 'liked' | 'mentions';

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'auth', 'common']);
  const { user, isAuthenticated } = useAuth();
  const userFacts = useFactsStore((s) => s.userFacts);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const userFactsLoadingMore = useFactsStore((s) => s.userFactsLoadingMore);
  const userFactsHasMore = useFactsStore((s) => s.userFactsHasMore);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);
  const loadMoreUserFacts = useFactsStore((s) => s.loadMoreUserFacts);
  const fetchFacts = useFactsStore((s) => s.fetchFacts);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);
  const {
    likedEntries,
    likesLoading,
    likesLoadingMore,
    hasMore: hasMoreLikes,
    refetch: refetchLikes,
    loadMore: loadMoreLikes,
  } = useUserLikes(user?.id);
  const {
    mentionedFacts,
    mentionsLoading,
    mentionsLoadingMore,
    hasMore: hasMoreMentions,
    refetch: refetchMentions,
    loadMore: loadMoreMentions,
  } = useMentionedFacts(user?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>('mine');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();

  const firstFocusRef = useRef(true);
  const userId = user?.id;

  const handleEndReached = useCallback(() => {
    if (!userId) return;
    if (activeTab === 'mine') {
      if (userFactsHasMore && !userFactsLoading && !userFactsLoadingMore && userFacts.length > 0) {
        loadMoreUserFacts(userId);
      }
    } else if (activeTab === 'liked') {
      if (hasMoreLikes && !likesLoading && !likesLoadingMore && likedEntries.length > 0) {
        loadMoreLikes();
      }
    } else if (activeTab === 'mentions') {
      if (hasMoreMentions && !mentionsLoading && !mentionsLoadingMore && mentionedFacts.length > 0) {
        loadMoreMentions();
      }
    }
  }, [
    userId,
    activeTab,
    userFactsHasMore,
    userFactsLoading,
    userFactsLoadingMore,
    userFacts.length,
    loadMoreUserFacts,
    hasMoreLikes,
    likesLoading,
    likesLoadingMore,
    likedEntries.length,
    loadMoreLikes,
    hasMoreMentions,
    mentionsLoading,
    mentionsLoadingMore,
    mentionedFacts.length,
    loadMoreMentions,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchUserFacts(userId, true), fetchFacts(true), refetchLikes(true), refetchMentions(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [userId, fetchUserFacts, fetchFacts, refetchLikes, refetchMentions]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const isFirst = firstFocusRef.current;
      firstFocusRef.current = false;
      fetchUserFacts(userId, !isFirst);
      refetchLikes(!isFirst);
      refetchMentions(!isFirst);
    }, [userId, fetchUserFacts, refetchLikes, refetchMentions]),
  );

  const handleFactPress = useCallback(
    (fact: Fact) => {
      router.push(fact.isRepost ? `/repost/${fact.id}` : `/fact/${fact.id}`);
    },
    [router],
  );

  const lastProfileLikeRef = useRef<Record<string, number>>({});
  const handleLike = useCallback(
    (factId: string, fallbackFact?: Fact) => {
      const now = Date.now();
      if (now - (lastProfileLikeRef.current[factId] ?? 0) < 400) return;
      lastProfileLikeRef.current[factId] = now;
      toggleLike(factId, fallbackFact);
    },
    [toggleLike],
  );

  const handleRepostLike = useCallback(
    (repostEntryId: string, fallbackFact?: Fact) => {
      const now = Date.now();
      if (now - (lastProfileLikeRef.current[repostEntryId] ?? 0) < 400) return;
      lastProfileLikeRef.current[repostEntryId] = now;
      toggleRepostLike(repostEntryId, fallbackFact);
    },
    [toggleRepostLike],
  );

  const handleRepost = useCallback(
    async (factId: string) => {
      const res = await toggleRepost(factId);
      if (res?.success) {
        useUIStore.getState().showToast(
          res.reposted ? t('feed:repostPublished') : t('feed:repostRemoved'),
          'success'
        );
      }
    },
    [toggleRepost, t],
  );

  const handleEditProfile = useCallback(() => {
    router.push('/edit-profile');
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
  }, []);

  const displayedFacts =
    activeTab === 'mine'
      ? userFacts
      : activeTab === 'liked'
        ? likedEntries
        : mentionedFacts;

  const renderItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant="preview"
        onPress={() => handleFactPress(item)}
        onLike={() => handleLike(item.id, item)}
        onRepost={() => handleRepost(item.originalFactId ?? item.id)}
        onRepostLike={item.isRepost ? () => handleRepostLike(item.id, item) : undefined}
        onOpenLikes={() => setLikesFactId(item.originalFactId ?? item.id)}
        onOpenRepostLikes={() => setLikesRepostId(item.id)}
      />
    ),
    [handleFactPress, handleLike, handleRepost, handleRepostLike],
  );

  const renderEmpty = useCallback(() => {
    if (activeTab === 'mine') {
      if (userFactsLoading) return <LoadingSkeleton count={2} />;
      return <EmptyState title={t('profile:noFactsTitle')} subtitle={t('profile:noFactsSubtitle')} icon="bulb-outline" />;
    }
    if (activeTab === 'liked') {
      if (likesLoading) return <LoadingSkeleton count={2} />;
      return <EmptyState title={t('profile:noLikedTitle')} subtitle={t('profile:noLikedSubtitle')} icon="heart-outline" />;
    }
    if (mentionsLoading) return <LoadingSkeleton count={2} />;
    return <EmptyState title={t('profile:noMentionsTitle')} subtitle={t('profile:noMentionsSubtitle')} icon="at-outline" />;
  }, [activeTab, userFactsLoading, likesLoading, mentionsLoading, t]);

  const renderFooter = useCallback(() => {
    const isLoadingMore =
      activeTab === 'mine'
        ? userFactsLoadingMore
        : activeTab === 'liked'
          ? likesLoadingMore
          : mentionsLoadingMore;

    const hasMore =
      activeTab === 'mine'
        ? userFactsHasMore
        : activeTab === 'liked'
          ? hasMoreLikes
          : hasMoreMentions;

    const count = displayedFacts.length;

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <LoadingSkeleton count={1} />
        </View>
      );
    }

    if (!hasMore && count > 5) {
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
  }, [
    activeTab,
    userFactsLoadingMore,
    likesLoadingMore,
    mentionsLoadingMore,
    userFactsHasMore,
    hasMoreLikes,
    hasMoreMentions,
    displayedFacts.length,
    theme.muted,
    t,
  ]);

  const renderHeader = useCallback(
    () => {
      if (!user) return null;
      return (
      <View>
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            <AppPressable onPress={() => setAvatarModalVisible(true)} hitSlop={8}>
              <UserAvatar user={user} size={80} />
            </AppPressable>
            <AppPressable onPress={handleEditProfile} style={styles.userInfo} hitSlop={4}>
              <ThemedText type="subtitle" numberOfLines={2} ellipsizeMode="tail">{user.displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                @{user.username}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.primary }}>
                {t('profile:editProfile')}
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={handleSettings}
              hitSlop={8}
              style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color={theme.text} />
            </AppPressable>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          <AppPressable
            onPress={() => handleTabChange('mine')}
            style={[styles.tab, activeTab === 'mine' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'mine' ? theme.primary : theme.muted }}>
              {t('profile:tabMyFacts')}
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('liked')}
            style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
              {t('profile:tabLiked')}
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('mentions')}
            style={[styles.tab, activeTab === 'mentions' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'mentions' ? theme.primary : theme.muted }}>
              {t('profile:tabMentions')}
            </ThemedText>
          </AppPressable>
        </View>
      </View>
      );
    },
    [user, theme, activeTab, handleEditProfile, handleSettings, handleTabChange, t],
  );

  if (!isAuthenticated || !user) {
    return (
      <ThemedView style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.unauthTopBar}>
          <LanguageToggle />
          <AppPressable
            onPress={handleSettings}
            hitSlop={8}
            style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </AppPressable>
        </View>
        <ThemedView style={styles.loginPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={theme.primary} />
          <ThemedText type="subtitle" style={styles.loginTitle}>
            {t('profile:anonymousTitle')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.loginSubtitle}>
            {t('profile:anonymousSubtitle')}
          </ThemedText>
          <AppPressable
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/auth/login')}>
            <ThemedText type="small" style={styles.loginButtonText}>
              {t('auth:signInTitle')}
            </ThemedText>
          </AppPressable>
          <AppPressable
            style={[styles.registerButton, { borderColor: theme.border }]}
            onPress={() => router.push('/auth/register')}>
            <ThemedText type="small" style={{ color: theme.text }}>
              {t('auth:createAccountTitle')}
            </ThemedText>
          </AppPressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={displayedFacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.list, { paddingTop: topInset }]}
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

      {/* Avatar preview modal — Instagram-style full view */}
<AppModal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}>
        <AppPressable
          style={styles.avatarModalOverlay}
          onPress={() => setAvatarModalVisible(false)}>
<UserAvatar user={user} size={240} />
        </AppPressable>
      </AppModal>

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
  profileHeader: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  settingsButton: {
    padding: Spacing.one,
    alignSelf: 'flex-start',
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  userInfo: {
    gap: Spacing.half,
    flex: 1,
    minWidth: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  unauthTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  loginTitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  loginSubtitle: {
    textAlign: 'center',
    maxWidth: 250,
  },
  loginButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    minWidth: 150,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  loginButtonText: {
    color: '#ffffff',
  },
  registerButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 150,
    alignItems: 'center',
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
