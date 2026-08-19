import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyledContent } from '@/components/StyledContent';
import { UserAvatar } from '@/components/UserAvatar';
import { LikeButton } from '@/components/LikeButton';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD } from '@/constants/facts';
import { useAuth } from '@/data/hooks/useAuth';
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
  isOwner = false,
}: FactCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const isCollapsible = fact.content.length > COLLAPSE_THRESHOLD;

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
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, Shadows.sm]}>
        {/* Author row — hidden for anon */}
        {variant !== 'anon' && (
          <Pressable
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
          </Pressable>
        )}

        {/* Title */}
        {fact.title ? (
          <StyledContent
            content={fact.title}
            style={[styles.defaultText, styles.title]}
          />
        ) : null}

        {/* Content */}
        <StyledContent
          content={fact.content}
          numberOfLines={isCollapsible && !expanded ? COLLAPSE_LINES : undefined}
          style={[styles.defaultText, styles.content]}
        />

        {/* Expand/collapse toggle for long facts */}
        {isCollapsible && (
          <Pressable onPress={handleToggleExpand} hitSlop={6} style={styles.seeMore}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {expanded ? 'See less' : 'See more'}
            </ThemedText>
          </Pressable>
        )}

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
              <Pressable onPress={onShare} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={20} color={theme.muted} />
              </Pressable>
            )}

            {variant === 'full' && isOwner && (
              <View style={styles.ownerActions}>
                {onEdit && (
                  <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color={theme.primary} />
                  </Pressable>
                )}
                {onDelete && (
                  <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </ThemedView>
    </Pressable>
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
