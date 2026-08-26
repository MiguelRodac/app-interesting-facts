import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FactCard } from '@/components/FactCard';
import { LikesModal } from '@/components/LikesModal';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  const { user, isAuthenticated } = useAuth();
const userFacts = useFactsStore((s) => s.userFacts);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);
  const fetchFacts = useFactsStore((s) => s.fetchFacts);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const { likedEntries, likesLoading, refetch: refetchLikes } = useUserLikes(user?.id);
  const { mentionedFacts, mentionsLoading, mentionsCount, refetch: refetchMentions } = useMentionedFacts(user?.username);
  const userFactsCount = useFactsStore((s) => s.userFacts.length);
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
      // Silent refreshes: profile facts + feed + likes + mentions
      await Promise.all([fetchUserFacts(user.id, true), fetchFacts(true), refetchLikes(), refetchMentions()]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchUserFacts, fetchFacts, refetchLikes, refetchMentions]);

  // Fetch fresh user facts every time the profile gains focus (create/edit/delete happen elsewhere)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchUserFacts(user.id, userFactsCount > 0);
      }
      // Also refetch likes and mentions so the tabs show fresh data.
      refetchLikes();
      refetchMentions();
    }, [user?.id, fetchUserFacts, userFactsCount, refetchLikes, refetchMentions]),
  );

  const displayedFacts = activeTab === 'mine' ? userFacts : activeTab === 'liked' ? likedEntries : mentionedFacts;

  const handleFactPress = useCallback(
    (fact: Fact) => {
      if (fact.isRepost) {
        router.push(`/repost/${fact.id}?from=profile` as any);
      } else {
        router.push(`/fact/${fact.id}?from=profile`);
      }
    },
    [router],
  );

const handleLike = useCallback(
    async (item: Fact) => {
      // Pass the rendered card as fallback: Liked/Mentions entries may not
      // exist in the feed/user-facts caches, but the action still must fire.
      await toggleLike(item.originalFactId ?? item.id, item);
      // Unlike must drop the entry from the Liked list — silent re-fetch
      // reconciles it server-side (feed-style refresh), no spinner flash.
      if (activeTab === 'liked') refetchLikes(true);
    },
    [toggleLike, activeTab, refetchLikes],
  );

  const handleRepost = useCallback(
    async (item: Fact) => {
      const ok = await toggleRepost(item.originalFactId ?? item.id, item);
      if (ok) Alert.alert('Listo', 'Repost publicado');
    },
    [toggleRepost],
  );

  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);
  const handleRepostLike = useCallback(
    async (item: Fact) => {
      await toggleRepostLike(item.id, item);
      // Un-liking a repost must drop it from the Liked list as well.
      if (activeTab === 'liked') refetchLikes(true);
    },
    [toggleRepostLike, activeTab, refetchLikes],
  );

  // Entering the Liked tab always shows fresh state — likes made elsewhere
  // (feed, other tabs) change membership without touching this screen.
  const handleTabChange = useCallback(
    (tab: ProfileTab) => {
      setActiveTab(tab);
      if (tab === 'liked') refetchLikes(true);
    },
    [refetchLikes],
  );

  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleEditProfile = useCallback(() => {
    router.push('/edit-profile');
  }, [router]);

const renderItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant="preview"
        onPress={() => handleFactPress(item)}
        onLike={!item.isRepost ? () => handleLike(item) : undefined}
        onRepost={() => handleRepost(item)}
        onRepostLike={item.isRepost ? () => handleRepostLike(item) : undefined}
        onOpenLikes={!item.isRepost ? () => setLikesFactId(item.originalFactId ?? item.id) : undefined}
        onOpenRepostLikes={item.isRepost ? () => setLikesRepostId(item.id) : undefined}
      />
    ),
    [handleFactPress, handleLike, handleRepost, handleRepostLike],
  );

  const renderEmpty = useCallback(() => {
    if (
      (activeTab === 'mine' && userFactsLoading) ||
      (activeTab === 'liked' && likesLoading) ||
      (activeTab === 'mentions' && mentionsLoading)
    ) {
      return <LoadingSkeleton count={3} />;
    }
    if (activeTab === 'mine') {
      return <EmptyState title="No facts yet" subtitle="Your created facts will appear here" icon="create-outline" />;
    }
    if (activeTab === 'liked') {
      return <EmptyState title="No liked facts" subtitle="Facts you like will appear here" icon="heart-outline" />;
    }
    return <EmptyState title="No mentions yet" subtitle="Facts that mention you will appear here" icon="at-outline" />;
  }, [activeTab, userFactsLoading, likesLoading, mentionsLoading]);

  const renderHeader = useCallback(
    () => {
      if (!user) return null;
      return (
      <View>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            <AppPressable onPress={() => setAvatarModalVisible(true)} hitSlop={8}>
              <UserAvatar user={user} size={80} />
            </AppPressable>
            {/* Tapping anywhere on the name/username opens Edit Profile */}
            <AppPressable onPress={handleEditProfile} style={styles.userInfo} hitSlop={4}>
              <ThemedText type="subtitle" numberOfLines={2} ellipsizeMode="tail">{user.displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                @{user.username}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.primary }}>
                Edit Profile
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

        {/* Tab switcher */}
        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          <AppPressable
            onPress={() => handleTabChange('mine')}
            style={[styles.tab, activeTab === 'mine' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'mine' ? theme.primary : theme.muted }}>
              My Facts ({userFacts.length})
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('liked')}
            style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
              Liked ({likedEntries.length})
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={() => handleTabChange('mentions')}
            style={[styles.tab, activeTab === 'mentions' && { borderBottomColor: theme.primary }]}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'mentions' ? theme.primary : theme.muted }}>
              Mentions ({mentionsCount})
            </ThemedText>
          </AppPressable>
        </View>
      </View>
      );
    },
    [user, theme, activeTab, handleEditProfile, handleSettings, handleTabChange, userFacts.length, likedEntries.length, mentionsCount],
  );

  if (!isAuthenticated || !user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loginPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={theme.primary} />
          <ThemedText type="subtitle" style={styles.loginTitle}>
            Sign in to view your profile
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.loginSubtitle}>
            Create facts, save your favorites, and more
          </ThemedText>
          <AppPressable
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/auth/login')}>
            <ThemedText type="small" style={styles.loginButtonText}>
              Sign In
            </ThemedText>
          </AppPressable>
          <AppPressable
            style={[styles.registerButton, { borderColor: theme.border }]}
            onPress={() => router.push('/auth/register')}>
            <ThemedText type="small" style={{ color: theme.text }}>
              Create Account
            </ThemedText>
          </AppPressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header + tabs live inside ListHeaderComponent so the whole screen
          scrolls as one unit and shares contentContainerStyle padding —
          keeps the safe-area inset consistent with the other tabs. */}
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
