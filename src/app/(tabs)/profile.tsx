import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
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
import { useLikedFacts } from '@/data/hooks/useLikedFacts';
import { useMentionedFacts } from '@/data/hooks/useMentionedFacts';
import { useFactsStore } from '@/data/stores/factsStore';
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
  const { likedFacts } = useLikedFacts();
  const { mentionedFacts, mentionsLoading, mentionsCount, refetch: refetchMentions } = useMentionedFacts(user?.username);
  const userFactsCount = useFactsStore((s) => s.userFacts.length);
const [activeTab, setActiveTab] = useState<ProfileTab>('mine');
const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      // Silent refreshes: profile facts + feed + mentions
      await Promise.all([fetchUserFacts(user.id, true), fetchFacts(true), refetchMentions()]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchUserFacts, fetchFacts, refetchMentions]);

  // Fetch fresh user facts every time the profile gains focus (create/edit/delete happen elsewhere)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchUserFacts(user.id, userFactsCount > 0);
      }
      // Also refetch mentions so the tab shows fresh data.
      refetchMentions();
    }, [user?.id, fetchUserFacts, userFactsCount, refetchMentions]),
  );

  const displayedFacts = activeTab === 'mine' ? userFacts : activeTab === 'liked' ? likedFacts : mentionedFacts;

  const handleFactPress = useCallback(
    (fact: Fact) => {
      // Reposts use the original fact ID for detail navigation.
      const factId = fact.originalFactId ?? fact.id;
      router.push(`/fact/${factId}?from=profile`);
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
    (factId: string) => {
      toggleRepost(factId);
    },
    [toggleRepost],
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
        onLike={() => handleLike(item.id)}
        onRepost={() => handleRepost(item.id)}
        onOpenLikes={() => setLikesFactId(item.originalFactId ?? item.id)}
      />
    ),
    [handleFactPress, handleLike, handleRepost],
  );

  const renderEmpty = useCallback(() => {
    if ((activeTab === 'mine' && userFactsLoading) || (activeTab === 'mentions' && mentionsLoading)) {
      return <LoadingSkeleton count={3} />;
    }
    if (activeTab === 'mine') {
      return <EmptyState title="No facts yet" subtitle="Your created facts will appear here" icon="create-outline" />;
    }
    if (activeTab === 'liked') {
      return <EmptyState title="No liked facts" subtitle="Facts you like will appear here" icon="heart-outline" />;
    }
    return <EmptyState title="No mentions yet" subtitle="Facts that mention you will appear here" icon="at-outline" />;
  }, [activeTab, userFactsLoading, mentionsLoading]);

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
      {/* Profile header */}
      <View style={[styles.profileHeader, { paddingTop: topInset }]}>
        {/* Settings — anchored to the top-right corner, doesn't push content */}
        <AppPressable
          onPress={handleSettings}
          hitSlop={8}
          style={[styles.settingsButton, { top: topInset + Spacing.two }]}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </AppPressable>

        <View style={styles.avatarSection}>
          <AppPressable onPress={() => setAvatarModalVisible(true)} hitSlop={8}>
            <UserAvatar user={user} size={80} />
          </AppPressable>
          {/* Tapping anywhere on the name/username opens Edit Profile */}
          <AppPressable onPress={handleEditProfile} style={styles.userInfo} hitSlop={4}>
            <ThemedText type="subtitle">{user.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              @{user.username}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.primary }}>
              Edit Profile
            </ThemedText>
          </AppPressable>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <AppPressable
          onPress={() => setActiveTab('mine')}
          style={[styles.tab, activeTab === 'mine' && { borderBottomColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'mine' ? theme.primary : theme.muted }}>
            My Facts ({userFacts.length})
          </ThemedText>
        </AppPressable>
        <AppPressable
          onPress={() => setActiveTab('liked')}
          style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
            Liked ({likedFacts.length})
          </ThemedText>
        </AppPressable>
        <AppPressable
          onPress={() => setActiveTab('mentions')}
          style={[styles.tab, activeTab === 'mentions' && { borderBottomColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'mentions' ? theme.primary : theme.muted }}>
            Mentions ({mentionsCount})
          </ThemedText>
        </AppPressable>
      </View>

      {/* Facts list */}
<FlatList
        data={displayedFacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  settingsButton: {
    position: 'absolute',
    right: Spacing.three,
    padding: Spacing.one,
    zIndex: 10,
  },
  avatarModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  userInfo: {
    gap: Spacing.half,
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
