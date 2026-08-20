import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { FactCard } from '@/components/FactCard';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useUserProfile } from '@/data/hooks/useUserProfile';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const {
    profile,
    facts,
    isLoading,
    factsLoading,
    fetchProfile,
    fetchUserFacts,
    toggleLike,
    clearProfile,
  } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const [likesFactId, setLikesFactId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!username) return;
    setRefreshing(true);
    try {
      await fetchProfile(username, profile ? true : undefined);
      if (profile?.id) {
        await fetchUserFacts(profile.id, true);
      }
    } finally {
      setRefreshing(false);
    }
  }, [username, profile, fetchProfile, fetchUserFacts]);

useEffect(() => {
    if (!username) {
      // Route without the dynamic segment (/users without a username) — not a
      // real page, send the visitor back to the feed instead of a dead end.
      router.replace('/(tabs)');
      return;
    }
    fetchProfile(username).catch(() => {
      // Error handled by store → uiStore
    });
    return () => {
      clearProfile();
    };
  }, [username, fetchProfile, clearProfile, router]);

  // Fetch facts once profile is loaded (uses profile.id from GET /users/:username)
  useEffect(() => {
    if (!profile) return;
    fetchUserFacts(profile.id).catch(() => {
      // Error handled by store → uiStore
    });
  }, [profile, fetchUserFacts]);

  const handleFactPress = useCallback(
    (fact: Fact) => {
      router.push(`/fact/${fact.id}?from=user`);
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
          title="User not found"
          subtitle="This user may not exist"
          icon="person-outline"
        />
      );
    }

    return (
      <View style={styles.header}>
        {/* Back button */}
        <AppPressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>

        {/* Profile card */}
        <ThemedView type="backgroundElement" style={[styles.profileCard, Shadows.md]}>
          <UserAvatar user={profile} size={72} />
          <ThemedText type="subtitle" style={styles.displayName}>
            {profile.displayName}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            @{profile.username}
          </ThemedText>
          <ThemedText type="small" themeColor="muted" style={styles.joinedDate}>
            Joined {formatJoinDate(profile.createdAt)}
          </ThemedText>
        </ThemedView>

        {/* Facts section header */}
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Facts</ThemedText>
          {!factsLoading && (
            <ThemedText type="small" themeColor="muted">
              {facts.length}
            </ThemedText>
          )}
        </View>

        {factsLoading && <LoadingSkeleton count={2} />}

        {!factsLoading && facts.length === 0 && (
          <EmptyState
            title="No facts yet"
            subtitle="This user hasn't posted any facts"
            icon="document-text-outline"
          />
        )}
      </View>
    );
  };

  // Don't render the list at all while initial loading or if profile not found
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
        data={facts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <FactCard
            fact={item}
            variant="preview"
            isSignedIn={isAuthenticated}
            onRequireLogin={handleRequireLogin}
            onPress={() => handleFactPress(item)}
            onLike={isAuthenticated ? () => handleLike(item.id) : undefined}
            onOpenLikes={isAuthenticated ? () => setLikesFactId(item.id) : undefined}
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
});
