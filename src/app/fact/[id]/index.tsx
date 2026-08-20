import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Share, ScrollView, RefreshControl } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LikedByLine } from '@/components/LikedByLine';
import { LikesModal } from '@/components/LikesModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { StyledContent } from '@/components/StyledContent';
import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { useFacts } from '@/data/hooks/useFacts';
import { useFactLikes } from '@/data/hooks/useFactLikes';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import type { Fact } from '@/types';

export default function FactDetailScreen() {
const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { facts, fetchFactById, toggleLike, deleteFact } = useFacts();
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const [fact, setFact] = useState<Fact | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isCollapsible = fact ? fact.content.length > COLLAPSE_THRESHOLD : false;
  const handleConfirmDelete = useCallback(async () => {
    if (!fact) return;
    setConfirmDeleteVisible(false);
    try {
      await deleteFact(fact.id);
      router.replace('/(tabs)');
    } catch {
      // Error handled by uiStore
    }
  }, [fact, deleteFact, router]);

const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  // Likes are only fetched/shown for signed-in users
  const { likes, refetch: refetchLikes } = useFactLikes(id, !!user);

  // Tab bar — highlight the tab the user came from
  const activeTab = from === 'search' ? 'search' : from === 'profile' || from === 'user' ? 'profile' : 'index';
  const handleTabPress = useCallback(
    (name: string) => {
      switch (name) {
        case 'search':
          router.replace('/(tabs)/search');
          break;
        case 'create':
          router.replace('/(tabs)/create');
          break;
        case 'profile':
          router.replace('/(tabs)/profile');
          break;
        default:
          router.replace('/(tabs)');
          break;
      }
    },
    [router],
  );

// Prefer the store copy (feed already has it); on cold start / F5 the store
  // is empty, so fetch the fact by ID instead of showing "not found".
  useEffect(() => {
    if (!id) return;
    const found = facts.find((f) => f.id === id);
    if (found) {
      setFact(found);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchFactById(id)
      .then((fetched) => {
        if (active) setFact(fetched);
      })
      .catch(() => {
        if (active) setFact(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, facts, fetchFactById]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      await fetchFactById(id);
      if (user) refetchLikes();
    } finally {
      setRefreshing(false);
    }
  }, [id, user, fetchFactById, refetchLikes]);

// Likes with usernames — fetched via the shared useFactLikes hook
  // (cached per factId; the LikesModal refetches fresh on open).

  const isOwner = fact && user?.id === fact.author.id;

  const handleAuthorPress = useCallback(() => {
    if (!fact) return;
    if (user && fact.author.id === user.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/(tabs)/users/[username]', params: { username: fact.author.username } });
    }
  }, [user, fact, router]);

const handleLike = useCallback(() => {
    if (fact) {
      toggleLike(fact.id);
    }
  }, [fact, toggleLike]);

  const handleShare = useCallback(async () => {
    if (!fact) return;
    try {
      await Share.share({
        message: `${fact.title ? fact.title + ': ' : ''}${fact.content}`,
      });
    } catch {
      // User cancelled share — ignore
    }
  }, [fact]);

  const handleDelete = useCallback(() => {
    setConfirmDeleteVisible(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (fact) {
      router.push(`/fact/${fact.id}/edit`);
    }
  }, [fact, router]);

  const handleBack = useCallback(() => {
    // Go back to the screen the user came from, never router.back()
    // (detail ↔ edit push/replace can create a navigation loop).
    switch (from) {
      case 'search':
        router.replace('/(tabs)/search');
        break;
      case 'profile':
        router.replace('/(tabs)/profile');
        break;
      case 'user':
        // User profile screen is always in the stack below detail — safe to pop
        router.back();
        break;
      default:
        router.replace('/(tabs)');
        break;
    }
  }, [from, router]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingSkeleton count={1} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState title="Fact not found" subtitle="This fact may have been deleted" icon="alert-circle-outline" />
      </ThemedView>
    );
  }

  return (
<View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        {/* Back button */}
        <AppPressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>

        {/* Fact detail card */}
        <ThemedView type="backgroundElement" style={[styles.card, Shadows.md]}>
          {/* Author */}
          <AppPressable onPress={handleAuthorPress} style={styles.authorRow} hitSlop={8}>
            <UserAvatar user={fact.author} size={44} />
            <View style={styles.authorInfo}>
              <ThemedText type="smallBold">{fact.author.displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                @{fact.author.username}
              </ThemedText>
            </View>
          </AppPressable>

          {/* Title */}
          {fact.title ? (
            <StyledContent
              content={fact.title}
              style={styles.title}
            />
          ) : null}

          {/* Content */}
          <StyledContent
            content={fact.content}
            numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
            style={styles.content}
          />

          {/* Expand/collapse toggle for long facts */}
          {isCollapsible && (
            <AppPressable onPress={() => setExpanded((current) => !current)} hitSlop={6} style={styles.seeMore}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {expanded ? 'See less' : 'See more'}
              </ThemedText>
            </AppPressable>
          )}

          {/* Meta */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            {new Date(fact.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>

{/* Likes line — "Liked by @alice, @bob and 3 more"; tap opens the full modal.
        Only shown to signed-in users. */}
          {user && (
            <LikedByLine likes={likes} likesCount={fact.likesCount} onPress={() => setLikesModalVisible(true)} />
          )}

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            <AppPressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
              <Ionicons
                name={fact.liked ? 'heart' : 'heart-outline'}
                size={28}
                color={fact.liked ? theme.destructive : theme.muted}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {fact.likesCount}
              </ThemedText>
            </AppPressable>

            <AppPressable onPress={handleShare} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={24} color={theme.muted} />
            </AppPressable>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <AppPressable
                  onPress={handleEdit}
                  style={[styles.editButton, { borderColor: theme.primary }]}
                  hitSlop={8}>
                  <Ionicons name="create-outline" size={18} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Edit
                  </ThemedText>
                </AppPressable>
                <AppPressable onPress={handleDelete} style={styles.actionBtn} hitSlop={8}>
                  <Ionicons name="trash-outline" size={24} color={theme.destructive} />
                </AppPressable>
              </View>
            ) : null}
          </View>
        </ThemedView>
      </ScrollView>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} />

{/* Delete confirmation */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete Fact"
        message="Are you sure you want to delete this fact?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Full likes list — signed-in only */}
      {user && (
        <LikesModal
          factId={id}
          visible={likesModalVisible}
          onClose={() => setLikesModalVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    marginBottom: Spacing.three,
    padding: Spacing.one,
    alignSelf: 'flex-start',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  authorInfo: {
    gap: Spacing.half,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: Spacing.three,
  },
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.two,
    marginBottom: Spacing.three,
  },
  meta: {
    marginBottom: Spacing.three,
  },
actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  ownerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: Spacing.two,
  },
});
