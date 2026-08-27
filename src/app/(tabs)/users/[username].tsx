import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { FactCard } from '@/components/FactCard';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useUserProfile } from '@/data/hooks/useUserProfile';
import { useUserLikes } from '@/data/hooks/useUserLikes';
import { useRepostsStore } from '@/data/stores/repostsStore';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

type ProfileTab = 'facts' | 'likes';

function formatJoinDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export default function UserProfileScreen() {
  const { t, i18n } = useTranslation(['profile', 'feed', 'common']);
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const {
    profile,
    facts,
    isLoading,
    factsLoading,
    fetchProfile,
    fetchUserFacts,
    toggleLike,
    toggleRepost,
    clearProfile,
  } = useUserProfile();
  const { likedEntries, likesLoading, refetch: refetchUserLikes } = useUserLikes(profile?.id ?? null);
  const { isAuthenticated } = useAuth();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [likesRepostId, setLikesRepostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('facts');

  const handleRefresh = useCallback(async () => {
    if (!username) return;
    setRefreshing(true);
    try {
      await fetchProfile(username, profile ? true : undefined);
      if (profile?.id) {
        await Promise.all([fetchUserFacts(profile.id, true), refetchUserLikes()]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [username, profile, fetchProfile, fetchUserFacts, refetchUserLikes]);

  useEffect(() => {
    if (!username) {
      router.replace('/(tabs)');
      return;
    }
    fetchProfile(username).catch(() => {});
    return () => {
      clearProfile();
    };
  }, [username, fetchProfile, clearProfile, router]);

  useEffect(() => {
    if (!profile) return;
    fetchUserFacts(profile.id).catch(() => {});
  }, [profile, fetchUserFacts]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      if (fact.isRepost) {
        router.push(`/repost/${fact.id}?from=user` as any);
      } else {
        router.push(`/fact/${fact.id}?from=user`);
      }
    },
    [router],
  );

  const handleLike = useCallback(
    (factId: string, fallbackFact?: Fact) => {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      toggleLike(factId, fallbackFact);
    },
    [isAuthenticated, toggleLike, router],
  );

  const handleRepost = useCallback(
    (factId: string, fallbackFact?: Fact) => {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      toggleRepost(factId, fallbackFact).then((ok) => {
        if (ok) Alert.alert(t('common:ready'), t('feed:repostCreated'));
      });
    },
    [isAuthenticated, toggleRepost, router, t],
  );

  const handleRepostLike = useCallback(
    (repostId: string, fallbackFact?: Fact) => {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      useRepostsStore.getState().toggleRepostLike(repostId, fallbackFact).catch(() => {});
    },
    [isAuthenticated],
  );

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

  const renderHeader = () => {
    if (isLoading) {
      return <LoadingSkeleton count={1} />;
    }

    if (!profile) {
      return (
        <EmptyState
          title={t('profile:userNotFound')}
          subtitle={t('profile:userNotFoundSubtitle')}
          icon="person-outline"
        />
      );
    }

    return (
      <View style={styles.header}>
        <AppPressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>

        <ThemedView type="backgroundElement" style={[styles.profileCard, Shadows.md]}>
          <UserAvatar user={profile} size={72} />
          <ThemedText type="subtitle" numberOfLines={2} ellipsizeMode="tail" style={styles.displayName}>
            {profile.displayName}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>
            @{profile.username}
          </ThemedText>
          <ThemedText type="small" themeColor="muted" style={styles.joinedDate}>
            {t('profile:joinedDate', { date: formatJoinDate(profile.createdAt, dateLocale) })}
          </ThemedText>
        </ThemedView>

        <View style={styles.tabBar}>
          <AppPressable
            onPress={() => setActiveTab('facts')}
            style={[styles.tab, activeTab === 'facts' && { borderBottomColor: theme.primary }]}
            hitSlop={8}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'facts' ? theme.primary : theme.muted }}>
              {t('profile:tabFacts')}
            </ThemedText>
            {activeTab === 'facts' && !factsLoading && (
              <ThemedText type="small" themeColor="muted">{facts.length}</ThemedText>
            )}
          </AppPressable>
          <AppPressable
            onPress={() => setActiveTab('likes')}
            style={[styles.tab, activeTab === 'likes' && { borderBottomColor: theme.primary }]}
            hitSlop={8}>
            <ThemedText
              type="smallBold"
              style={{ color: activeTab === 'likes' ? theme.primary : theme.muted }}>
              {t('profile:tabLikes')}
            </ThemedText>
            {activeTab === 'likes' && !likesLoading && (
              <ThemedText type="small" themeColor="muted">{likedEntries.length}</ThemedText>
            )}
          </AppPressable>
        </View>

        {activeTab === 'facts' && factsLoading && <LoadingSkeleton count={2} />}
        {activeTab === 'facts' && !factsLoading && facts.length === 0 && (
          <EmptyState
            title={t('profile:noFactsTitle')}
            subtitle={t('profile:userNoFactsSubtitle')}
            icon="document-text-outline"
          />
        )}
        {activeTab === 'likes' && likesLoading && <LoadingSkeleton count={2} />}
        {activeTab === 'likes' && !likesLoading && likedEntries.length === 0 && (
          <EmptyState
            title={t('profile:noLikedTitle')}
            subtitle={t('profile:userNoLikesSubtitle')}
            icon="heart-outline"
          />
        )}
      </View>
    );
  };

  if (isLoading || !profile) {
    return (
      <ThemedView style={styles.container}>
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.list, { paddingTop: topInset }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={activeTab === 'facts' ? facts : likedEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <FactCard
            fact={item}
            variant="preview"
            isSignedIn={isAuthenticated}
            onRequireLogin={handleRequireLogin}
            onPress={() => handleFactPress(item)}
            onLike={isAuthenticated && !item.isRepost ? () => handleLike(item.originalFactId ?? item.id, item) : undefined}
            onRepost={isAuthenticated ? () => handleRepost(item.originalFactId ?? item.id, item) : undefined}
            onRepostLike={isAuthenticated && item.isRepost ? () => handleRepostLike(item.id, item) : undefined}
            onOpenLikes={isAuthenticated && !item.isRepost ? () => setLikesFactId(item.originalFactId ?? item.id) : undefined}
            onOpenRepostLikes={isAuthenticated && item.isRepost ? () => setLikesRepostId(item.id) : undefined}
          />
        )}
        contentContainerStyle={[styles.list, { paddingTop: topInset }]}
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
  list: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: Spacing.two,
  },
  backButton: {
    marginBottom: Spacing.three,
    padding: Spacing.one,
    alignSelf: 'flex-start',
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radii.lg,
    marginBottom: Spacing.four,
  },
  displayName: {
    marginTop: Spacing.three,
    textAlign: 'center',
    width: '100%',
  },
  username: {
    textAlign: 'center',
    width: '100%',
  },
  joinedDate: {
    marginTop: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginBottom: Spacing.three,
    gap: Spacing.four,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
