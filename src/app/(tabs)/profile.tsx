import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FactCard } from '@/components/FactCard';
import { LikesModal } from '@/components/LikesModal';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useUserLikes } from '@/data/hooks/useUserLikes';
import { useMentionedFacts } from '@/data/hooks/useMentionedFacts';
import { useFactsStore } from '@/data/stores/factsStore';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

type ProfileTab = 'mine' | 'liked' | 'mentions';

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'auth', 'common']);
  const { user, isAuthenticated } = useAuth();
  const userFacts = useFactsStore((s) => s.userFacts);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);
  const fetchFacts = useFactsStore((s) => s.fetchFacts);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);
  const { likedEntries, likesLoading, refetch: refetchLikes } = useUserLikes(user?.id);
  const { mentionedFacts, mentionsLoading, mentionsCount, refetch: refetchMentions } = useMentionedFacts(user?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>('mine');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchUserFacts(user.id, true), fetchFacts(true), refetchLikes(true), refetchMentions(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchUserFacts, fetchFacts, refetchLikes, refetchMentions]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        const hasFacts = userFacts.length > 0;
        const hasLikes = likedEntries.length > 0;
        const hasMentions = mentionedFacts.length > 0;
        fetchUserFacts(user.id, hasFacts);
        refetchLikes(hasLikes);
        refetchMentions(hasMentions);
      }
    }, [user?.id, userFacts.length, likedEntries.length, mentionedFacts.length, fetchUserFacts, refetchLikes, refetchMentions]),
  );

  const handleFactPress = useCallback(
    (fact: Fact) => {
      router.push(fact.isRepost ? `/repost/${fact.id}` : `/fact/${fact.id}`);
    },
    [router],
  );

  const handleLike = useCallback(
    (factId: string) => {
      toggleLike(factId);
    },
    [toggleLike],
  );

  const handleRepost = useCallback(
    async (factId: string) => {
      const ok = await toggleRepost(factId);
      if (ok) Alert.alert(t('common:ready'), t('feed:repostPublished'));
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
        onLike={() => handleLike(item.id)}
        onRepost={() => handleRepost(item.originalFactId ?? item.id)}
        onRepostLike={item.isRepost ? () => toggleRepostLike(item.id) : undefined}
        onOpenLikes={() => setLikesFactId(item.originalFactId ?? item.id)}
        onOpenRepostLikes={() => setLikesRepostId(item.id)}
      />
    ),
    [handleFactPress, handleLike, handleRepost, toggleRepostLike],
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
              {t('profile:tabMyFacts')} ({userFactsLoading && userFacts.length === 0 ? '...' : userFacts.length})
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('liked')}
            style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
              {t('profile:tabLiked')} ({likesLoading && likedEntries.length === 0 ? '...' : likedEntries.length})
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('mentions')}
            style={[styles.tab, activeTab === 'mentions' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'mentions' ? theme.primary : theme.muted }}>
              {t('profile:tabMentions')} ({mentionsLoading && mentionedFacts.length === 0 ? '...' : mentionsCount})
            </ThemedText>
          </AppPressable>
        </View>
      </View>
      );
    },
    [user, theme, activeTab, handleEditProfile, handleSettings, handleTabChange, userFacts.length, likedEntries.length, mentionsCount, userFactsLoading, likesLoading, mentionsLoading, t],
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
});
