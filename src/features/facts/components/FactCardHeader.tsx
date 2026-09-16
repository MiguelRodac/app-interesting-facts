import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Fact } from '@/types';

export interface FactCardHeaderProps {
  fact: Fact;
  variant: 'anon' | 'preview' | 'full';
  onAuthorPress: () => void;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale.startsWith('es') ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FactCardHeader({
  fact,
  variant,
  onAuthorPress,
}: FactCardHeaderProps) {
  const { t, i18n } = useTranslation('feed');
  const theme = useTheme();

  return (
    <>
      {/* Repost indicator */}
      {fact.isRepost && fact.reposter && (
        <View style={styles.repostLine}>
          <UserAvatar user={fact.reposter} size={20} />
          <ThemedText type="small" themeColor="textSecondary">
            {fact.reposter.isMe
              ? t('youReposted')
              : t('repostedBy', { username: fact.reposter.username })}
          </ThemedText>
          <Ionicons name="repeat" size={14} color={theme.muted} />
        </View>
      )}

      {/* Author row */}
      {variant !== 'anon' && (
        <AppPressable
          onPress={(e) => {
            e.stopPropagation();
            onAuthorPress();
          }}
          hitSlop={8}
          style={styles.authorRow}>
          <UserAvatar user={fact.author} size={32} />
          <View style={styles.authorInfo}>
            <ThemedText type="smallBold" numberOfLines={1} ellipsizeMode="tail">
              {fact.author.displayName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              @{fact.author.username} · {formatDate(fact.createdAt, i18n.language)}
            </ThemedText>
          </View>
        </AppPressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  repostLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
});
