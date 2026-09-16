import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Fact, Author } from '@/types';
import { AppPressable } from '@/shared/ui/app-pressable';
import { LikeButton } from './LikeButton';
import { LikedByLine } from './LikedByLine';
import { StyledContent } from './StyledContent';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES_DETAIL } from '@/constants/facts';
import { useTheme } from '@/shared/hooks/use-theme';

interface RepostDetailCardProps {
  fact: Fact;
  user: Author | null;
  isAuthenticated: boolean;
  dateLocale: string;
  expanded: boolean;
  isCollapsible: boolean;
  onToggleExpanded: () => void;
  onAuthorPress: () => void;
  onOpenLikes: () => void;
  onRepostLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onScrollToComments: () => void;
}

export const RepostDetailCard = React.memo(function RepostDetailCard({
  fact,
  user,
  isAuthenticated,
  dateLocale,
  expanded,
  isCollapsible,
  onToggleExpanded,
  onAuthorPress,
  onOpenLikes,
  onRepostLike,
  onRepost,
  onShare,
  onScrollToComments,
}: RepostDetailCardProps) {
  const { t } = useTranslation(['feed', 'common']);
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.md]}>
      {/* Repost banner */}
      {fact.reposterUsername && (
        <View style={[styles.repostBanner, { borderBottomColor: theme.border }]}>
          <Ionicons name="repeat" size={14} color={theme.muted} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.reposterUsername === user?.username
              ? t('feed:youReposted')
              : t('feed:repostedBy', { username: fact.reposterUsername })}
          </ThemedText>
        </View>
      )}

      {/* Author */}
      <AppPressable onPress={onAuthorPress} style={styles.authorRow} hitSlop={8}>
        <UserAvatar user={fact.author} size={44} />
        <View style={styles.authorInfo}>
          {isAuthenticated ? (
            <ThemedText type="smallBold">{fact.author.displayName}</ThemedText>
          ) : (
            <ThemedText type="smallBold">@{fact.author.username}</ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            @{fact.author.username}
          </ThemedText>
        </View>
      </AppPressable>

      {/* Title */}
      {fact.title ? <StyledContent content={fact.title} style={styles.title} /> : null}

      {/* Content */}
      <StyledContent
        content={fact.content}
        numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES_DETAIL : undefined}
        style={styles.content}
      />

      {/* Expand/collapse toggle */}
      {isCollapsible && (
        <AppPressable onPress={onToggleExpanded} hitSlop={6} style={styles.seeMore}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {expanded ? t('feed:seeLess') : t('feed:seeMore')}
          </ThemedText>
        </AppPressable>
      )}

      {/* Meta */}
      <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
        {new Date(fact.createdAt).toLocaleDateString(dateLocale, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </ThemedText>

      {/* Repost likes line */}
      <LikedByLine
        likes={fact.likeBy ?? []}
        likesCount={fact.repostLikeCount ?? 0}
        onPress={onOpenLikes}
      />

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        {/* Repost like */}
        <View style={styles.actionBtn}>
          <LikeButton
            liked={!!fact.repostLiked}
            likesCount={fact.repostLikeCount ?? 0}
            onPress={onRepostLike}
            size={28}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.repostLikeCount ?? 0}
          </ThemedText>
        </View>

        {/* Comment */}
        <AppPressable onPress={onScrollToComments} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={24} color={theme.muted} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.repostCommentCount ?? 0}
          </ThemedText>
        </AppPressable>

        {/* Repost toggle */}
        <AppPressable onPress={onRepost} style={styles.actionBtn} hitSlop={8}>
          <Ionicons
            name={fact.repostedByMe ? 'repeat' : 'repeat-outline'}
            size={28}
            color={fact.repostedByMe ? theme.primary : theme.muted}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.repostCount}
          </ThemedText>
        </AppPressable>

        <AppPressable onPress={onShare} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="share-outline" size={24} color={theme.muted} />
        </AppPressable>
      </View>
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    position: 'relative',
    zIndex: 1,
  },
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  authorInfo: {
    flex: 1,
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
});
