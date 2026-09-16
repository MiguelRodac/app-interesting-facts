import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { StyledContent } from './StyledContent';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Fact } from '@/types';

export interface FactCardCommentPreviewProps {
  fact: Fact;
  isSignedIn: boolean;
  onPress?: () => void;
}

export function FactCardCommentPreview({
  fact,
  isSignedIn,
  onPress,
}: FactCardCommentPreviewProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  if (!isSignedIn || fact.isRepost || fact.commentsCount <= 0 || !fact.commentPreview) {
    return null;
  }

  return (
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
            {fact.commentPreview.replies === 1 ? t('reply') : t('replies')}
          </ThemedText>
        )}
      </ThemedText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  commentPreviewRow: {
    paddingVertical: Spacing.half,
  },
  commentPreview: {
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
});
