import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { formatRelativeTime } from '@/utils/commentTime';

export interface CommentItemActionsProps {
  createdAt: string;
  edited?: boolean;
  canReply: boolean;
  isOwn: boolean;
  canEdit: boolean;
  isSignedIn: boolean;
  liked: boolean;
  likesCount: number;
  commentId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLike: () => void;
  onOpenLikes?: (commentId: string) => void;
}

export function CommentItemActions({
  createdAt,
  edited,
  canReply,
  isOwn,
  canEdit,
  isSignedIn,
  liked,
  likesCount,
  commentId,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
  onOpenLikes,
}: CommentItemActionsProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <View style={styles.actionsRow}>
      <View style={styles.actionsLeft}>
        {canReply && (
          <AppPressable onPress={onReply} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.actionLink}>
              {t('reply')}
            </ThemedText>
          </AppPressable>
        )}
        <ThemedText type="small" themeColor="muted">
          {formatRelativeTime(createdAt)}
        </ThemedText>
        {edited && (
          <ThemedText type="small" themeColor="muted">
            {t('edited')}
          </ThemedText>
        )}
        {isOwn && canEdit && (
          <AppPressable onPress={onEdit} hitSlop={8} style={styles.actionWithIcon}>
            <Ionicons name="create-outline" size={13} color={theme.muted} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('edit')}
            </ThemedText>
          </AppPressable>
        )}
        {isOwn && (
          <AppPressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={14} color={theme.muted} />
          </AppPressable>
        )}
      </View>

      <View style={styles.like}>
        {isSignedIn ? (
          <AppPressable onPress={onToggleLike} hitSlop={8}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={17}
              color={liked ? theme.destructive : theme.textSecondary}
            />
          </AppPressable>
        ) : (
          <Ionicons name="heart-outline" size={17} color={theme.textSecondary} />
        )}
        {isSignedIn && likesCount > 0 ? (
          <AppPressable onPress={() => onOpenLikes?.(commentId)} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              {likesCount}
            </ThemedText>
          </AppPressable>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {likesCount}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.half,
    gap: Spacing.two,
  },
  actionsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    rowGap: Spacing.half,
  },
  actionLink: {
    fontWeight: 600,
  },
  actionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
