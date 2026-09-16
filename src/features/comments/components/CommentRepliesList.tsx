import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Comment } from '@/types';

export interface CommentRepliesListProps {
  replies: Comment[];
  repliesExpanded: boolean;
  onToggleExpanded: () => void;
  renderReply: (reply: Comment) => React.ReactNode;
}

export function CommentRepliesList({
  replies,
  repliesExpanded,
  onToggleExpanded,
  renderReply,
}: CommentRepliesListProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  if (replies.length === 0) return null;

  return (
    <View style={styles.replies}>
      <AppPressable
        onPress={onToggleExpanded}
        style={styles.repliesToggle}
        hitSlop={8}>
        <Ionicons
          name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={theme.textSecondary}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.repliesToggleText}>
          {repliesExpanded
            ? (replies.length === 1 ? t('hideReply') : t('hideReplies'))
            : (replies.length === 1 ? t('viewReply') : t('viewReplies', { count: replies.length }))}
        </ThemedText>
      </AppPressable>

      {repliesExpanded && replies.map(renderReply)}
    </View>
  );
}

const styles = StyleSheet.create({
  replies: {
    marginTop: Spacing.one,
    marginLeft: Spacing.four,
    paddingLeft: Spacing.two,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'flex-start',
    marginBottom: Spacing.one,
  },
  repliesToggleText: {
    fontWeight: '500',
    fontSize: 13,
  },
});
