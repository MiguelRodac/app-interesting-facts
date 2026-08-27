import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyledContent } from '@/components/StyledContent';
import { UserAvatar } from '@/components/UserAvatar';
import { LikeButton } from '@/components/LikeButton';
import { LikedByLine } from '@/components/LikedByLine';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import type { Fact } from '@/types';

interface FactCardProps {
  fact: Fact;
  variant: 'anon' | 'preview' | 'full';
  onLike?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  onOpenLikes?: () => void;
  /** Like a repost (separate from fact like). */
  onRepostLike?: () => void;
  /** Open the repost likes modal. */
  onOpenRepostLikes?: () => void;
  isOwner?: boolean;
  /** Whether the viewer is signed in. When false the card shows the full
   *  read-only surface (author, liked-by, action bar, comment preview) but
   *  every action routes to `onRequireLogin` instead of executing. */
  isSignedIn?: boolean;
  /** Called instead of the real action when the viewer is signed out. */
  onRequireLogin?: () => void;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FactCard({
  fact,
  variant,
  onLike,
  onRepost,
  onShare,
  onEdit,
  onDelete,
  onPress,
  onOpenLikes,
  onRepostLike,
  onOpenRepostLikes,
  isOwner = false,
  isSignedIn = true,
  onRequireLogin,
}: FactCardProps) {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Anon variant: viewer is logged out, show non-interactive preview
  const anonView = variant === 'anon';

  // Helper to wrap actions with auth check
  const gate = (action?: () => void) => {
    if (!isSignedIn) return onRequireLogin;
    return action;
  };

  // Determine if content exceeds the collapse threshold
  const isCollapsible =
    variant !== 'full' &&
    fact.content &&
    fact.content.length > COLLAPSE_THRESHOLD;

  const contentNumberOfLines =
    variant === 'full' || expanded ? undefined : COLLAPSE_LINES;

  const titleEl = fact.title ? (
    <ThemedText type="subtitle" numberOfLines={variant === 'full' ? undefined : 2} style={styles.title}>
      {fact.title}
    </ThemedText>
  ) : null;

  const contentEl = fact.content ? (
    <StyledContent
      content={fact.content}
      numberOfLines={contentNumberOfLines}
      enableHashtags
      style={styles.content}
    />
  ) : null;

  const handleAuthorPress = useCallback(() => {
    if (user && fact.author.id === user.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/(tabs)/users/[username]', params: { username: fact.author.username } });
    }
  }, [user, fact.author.id, fact.author.username, router]);

  const handleToggleExpand = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setExpanded((current) => !current);
  }, []);

  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.sm]}>
      {/* Repost indicator — Reposter avatar + "Reposted by @user" banner above
          the author row, only for repost entries in the feed. */}
      {fact.isRepost && fact.reposter && (
        <View style={styles.repostLine}>
          <UserAvatar user={fact.reposter} size={20} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.reposter.isMe
              ? t('feed:youReposted')
              : t('feed:repostedBy', { username: fact.reposter.username })}
          </ThemedText>
          <Ionicons name="repeat" size={14} color={theme.muted} />
        </View>
      )}

      {/* Author row */}
      {variant !== 'anon' && (
        <AppPressable
          onPress={(e) => {
            e.stopPropagation();
            handleAuthorPress();
          }}
          hitSlop={8}
          style={styles.authorRow}
        >
          <UserAvatar user={fact.author} size={32} />
          <View style={styles.authorInfo}>
            <ThemedText type="smallBold" numberOfLines={1} ellipsizeMode="tail">{fact.author.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              @{fact.author.username} · {formatDate(fact.createdAt, i18n.language)}
            </ThemedText>
          </View>
        </AppPressable>
      )}

      {/* Tappable body — opens the fact detail */}
      {onPress ? (
        <AppPressable onPress={onPress} style={styles.body}>
          {titleEl}
          {contentEl}
        </AppPressable>
      ) : (
        <View>
          {titleEl}
          {contentEl}
        </View>
      )}

      {/* Expand/collapse toggle for long facts */}
      {isCollapsible && (
        <AppPressable onPress={handleToggleExpand} hitSlop={6} style={styles.seeMore}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {expanded ? t('feed:seeLess') : t('feed:seeMore')}
          </ThemedText>
        </AppPressable>
      )}

      {/* Likes line — opens the full likes modal */}
      {variant !== 'anon' && (
        <LikedByLine
          likes={fact.isRepost ? (fact.likeBy ?? []) : fact.likeBy}
          likesCount={fact.isRepost ? (fact.repostLikeCount ?? 0) : fact.likesCount}
          onPress={gate(fact.isRepost ? onOpenRepostLikes : onOpenLikes)}
        />
      )}

      {/* Actions row */}
      {variant !== 'anon' && (
        <View style={styles.actionsRow}>
          <LikeButton
            liked={fact.isRepost ? (fact.repostLiked ?? false) : fact.liked}
            likesCount={fact.isRepost ? (fact.repostLikeCount ?? 0) : fact.likesCount}
            onPress={gate(fact.isRepost ? onRepostLike : onLike)}
            disabled={isSignedIn && (fact.isRepost ? !onRepostLike : !onLike)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.isRepost ? (fact.repostLikeCount ?? 0) : fact.likesCount}
          </ThemedText>

          <AppPressable
            onPress={onPress}
            hitSlop={8}
            style={styles.commentBtn}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.muted} />
            <ThemedText type="small" themeColor="textSecondary">
              {fact.isRepost ? (fact.repostCommentCount ?? 0) : fact.commentsCount}
            </ThemedText>
          </AppPressable>

          {variant === 'full' && onShare && (
            <AppPressable onPress={onShare} hitSlop={8} style={styles.actionBtn}>
              <Ionicons name="share-outline" size={20} color={theme.muted} />
            </AppPressable>
          )}

          {/* Repost — optimistic toggle wired to the reposts module. */}
          <AppPressable
            onPress={gate(onRepost)}
            hitSlop={8}
            style={styles.actionBtn}
            disabled={isSignedIn && !onRepost}>
            <Ionicons
              name={fact.repostedByMe ? 'repeat' : 'repeat-outline'}
              size={20}
              color={fact.repostedByMe ? theme.primary : theme.muted}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {fact.repostCount}
            </ThemedText>
          </AppPressable>

          {variant === 'full' && isOwner && (
            <View style={styles.ownerActions}>
              {onEdit && (
                <AppPressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={20} color={theme.primary} />
                </AppPressable>
              )}
              {onDelete && (
                <AppPressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                </AppPressable>
              )}
            </View>
          )}
        </View>
      )}

      {/* Comment preview line — BELOW the action bar. Private comment content:
          only shown to signed-in viewers. Anonymous users see the count badge
          but not the preview text (backend will 401 comment reads without a
          token). Reposts don't have a comment preview from the API. */}
      {isSignedIn && !fact.isRepost && fact.commentsCount > 0 && fact.commentPreview && (
        <AppPressable
          onPress={onPress}
          hitSlop={8}
          style={styles.commentPreviewRow}
          disabled={!onPress}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.commentPreview}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              @{fact.commentPreview.author.username}
            </ThemedText>{' '}
            <StyledContent content={fact.commentPreview.content} enableHashtags={false} />
            {fact.commentPreview.replies > 0 && (
              <ThemedText type="smallBold" themeColor="primary">
                {' '}+{fact.commentPreview.replies}{' '}
                {fact.commentPreview.replies === 1 ? t('common:reply') : t('common:replies')}
              </ThemedText>
            )}
          </ThemedText>
        </AppPressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontSize: 16,
    lineHeight: 24,
  },
card: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    marginBottom: Spacing.two,
  },
  repostLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  body: {
    gap: Spacing.two,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  authorInfo: {
    marginLeft: Spacing.two,
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  content: {
    marginBottom: Spacing.two,
    lineHeight: 22,
  },
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.one,
    marginBottom: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  commentPreviewRow: {
    paddingVertical: Spacing.half,
  },
  commentPreview: {
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  ownerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: Spacing.two,
  },
});
