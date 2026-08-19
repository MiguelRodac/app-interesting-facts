import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyledContent } from '@/components/StyledContent';
import { UserAvatar } from '@/components/UserAvatar';
import { LikeButton } from '@/components/LikeButton';
import { LikedByLine } from '@/components/LikedByLine';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { useAuth } from '@/data/hooks/useAuth';
import { useFactLikes } from '@/data/hooks/useFactLikes';
import { useTheme } from '@/hooks/use-theme';
import type { Fact } from '@/types';

interface FactCardProps {
  fact: Fact;
  variant: 'anon' | 'preview' | 'full';
  onLike?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  onOpenLikes?: () => void;
  isOwner?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FactCard({
  fact,
  variant,
  onLike,
  onShare,
  onEdit,
  onDelete,
  onPress,
  onOpenLikes,
  isOwner = false,
}: FactCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  // Likes are only fetched (and shown) for signed-in users
  const { likes } = useFactLikes(variant !== 'anon' && fact.likesCount > 0 ? fact.id : undefined);

  const isCollapsible = fact.content.length > COLLAPSE_THRESHOLD;

  const titleEl = fact.title ? (
    <StyledContent content={fact.title} style={[styles.defaultText, styles.title]} />
  ) : null;

  const contentEl = (
    <StyledContent
      content={fact.content}
      numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
      style={[styles.defaultText, styles.content]}
    />
  );

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
      {/* Author row — hidden for anon. Sibling of the content area so the
          card never nests interactive elements (web renders <button>). */}
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
            <ThemedText type="smallBold">{fact.author.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              @{fact.author.username} · {formatDate(fact.createdAt)}
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
            {expanded ? 'See less' : 'See more'}
          </ThemedText>
        </AppPressable>
      )}

      {/* Likes line — opens the full likes modal; hidden for anonymous users */}
      {variant !== 'anon' && <LikedByLine likes={likes} onPress={onOpenLikes} />}

      {/* Actions row */}
      {variant !== 'anon' && (
        <View style={styles.actionsRow}>
          <LikeButton
            liked={fact.liked}
            likesCount={fact.likesCount}
            onPress={onLike ?? (() => {})}
            disabled={!onLike}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.likesCount}
          </ThemedText>

          {variant === 'full' && onShare && (
            <AppPressable onPress={onShare} hitSlop={8} style={styles.actionBtn}>
              <Ionicons name="share-outline" size={20} color={theme.muted} />
            </AppPressable>
          )}

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
  actionBtn: {
    padding: Spacing.one,
  },
  ownerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: Spacing.two,
  },
});
