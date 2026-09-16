import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface ReplyTarget {
  commentId: string;
  username: string;
  authorUsername?: string;
  initialText?: string;
}

export interface CommentReplyBannerProps {
  replyTo: ReplyTarget;
  onCancelReply: () => void;
}

export function CommentReplyBanner({ replyTo, onCancelReply }: CommentReplyBannerProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <View style={[styles.replyBanner, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="return-down-forward" size={16} color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.replyText} numberOfLines={1}>
        {t('replyingTo', { username: replyTo.username || replyTo.authorUsername || '' })}
      </ThemedText>
      <AppPressable onPress={onCancelReply} hitSlop={8} style={styles.replyDismiss}>
        <Ionicons name="close" size={16} color={theme.textSecondary} />
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.sm,
    marginBottom: Spacing.one,
  },
  replyText: {
    flex: 1,
    fontSize: 13,
  },
  replyDismiss: {
    padding: Spacing.half,
  },
});
