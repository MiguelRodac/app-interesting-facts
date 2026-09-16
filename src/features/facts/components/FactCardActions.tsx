import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { LikeButton } from './LikeButton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Fact } from '@/types';

export interface FactCardActionsProps {
  fact: Fact;
  variant: 'anon' | 'preview' | 'full';
  isSignedIn: boolean;
  isOwner?: boolean;
  onLike?: () => void;
  onRepostLike?: () => void;
  onPress?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  gate: (action?: () => void) => (() => void) | undefined;
}

export function FactCardActions({
  fact,
  variant,
  isSignedIn,
  isOwner,
  onLike,
  onRepostLike,
  onPress,
  onShare,
  onRepost,
  onEdit,
  onDelete,
  gate,
}: FactCardActionsProps) {
  const theme = useTheme();

  if (variant === 'anon') return null;

  return (
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

      <AppPressable onPress={onPress} hitSlop={8} style={styles.commentBtn}>
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

      {/* Repost button */}
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
  );
}

const styles = StyleSheet.create({
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
