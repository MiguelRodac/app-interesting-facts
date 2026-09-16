import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Fact } from '@/types';
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
import { FactDetailOverflowMenu } from './FactDetailOverflowMenu';

interface FactDetailCardProps {
  fact: Fact;
  isOwner: boolean;
  isAuthenticated: boolean;
  dateLocale: string;
  expanded: boolean;
  isCollapsible: boolean;
  overflowVisible: boolean;
  onToggleOverflow: () => void;
  onCloseOverflow: () => void;
  onToggleExpanded: () => void;
  onAuthorPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLikes: () => void;
  onLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onScrollToComments: () => void;
}

export const FactDetailCard = React.memo(function FactDetailCard({
  fact,
  isOwner,
  isAuthenticated,
  dateLocale,
  expanded,
  isCollapsible,
  overflowVisible,
  onToggleOverflow,
  onCloseOverflow,
  onToggleExpanded,
  onAuthorPress,
  onEdit,
  onDelete,
  onOpenLikes,
  onLike,
  onRepost,
  onShare,
  onScrollToComments,
}: FactDetailCardProps) {
  const { t } = useTranslation(['feed', 'common']);
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.md]}>
      {/* Author + overflow menu */}
      <View style={styles.headerRow}>
        <AppPressable onPress={onAuthorPress} style={[styles.authorRow, { flex: 1 }]} hitSlop={8}>
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

        {isOwner ? (
          <FactDetailOverflowMenu
            visible={overflowVisible}
            onToggle={onToggleOverflow}
            onClose={onCloseOverflow}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </View>

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

      {/* Likes line */}
      <LikedByLine likes={fact.likeBy} likesCount={fact.likesCount} onPress={onOpenLikes} />

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <View style={styles.actionBtn}>
          <LikeButton liked={fact.liked} likesCount={fact.likesCount} onPress={onLike} size={28} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.likesCount}
          </ThemedText>
        </View>

        {/* Comment count */}
        <AppPressable onPress={onScrollToComments} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={24} color={theme.muted} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.commentsCount}
          </ThemedText>
        </AppPressable>

        {/* Repost */}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
    position: 'relative',
    zIndex: 200,
    elevation: 10,
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
