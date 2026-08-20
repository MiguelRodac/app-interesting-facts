import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { FactLike } from '@/types';

interface LikedByLineProps {
  likeBy: FactLike[];
  likesCount: number;
  onPress?: () => void;
}

/**
 * "Liked by @alice, @bob and 3 more" with mini avatars.
 * Renders entirely from the inline Fact payload — no extra request.
 * Tap opens the full likes modal.
 */
export function LikedByLine({ likeBy, likesCount, onPress }: LikedByLineProps) {
  const theme = useTheme();

  if (likeBy.length === 0 && likesCount === 0) return null;

  const shown = likeBy.slice(0, 2);
  const remaining = Math.max(likesCount - likeBy.length, 0);

  const hasNames = likeBy.length > 0;
  const names = shown.map((entry) => `@${entry.username}`).join(', ');
  const andMore = remaining > 0 ? ` and ${remaining} more` : '';

  return (
    <AppPressable
      onPress={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      disabled={!onPress}
      hitSlop={4}
      style={styles.row}>
      <View style={styles.avatars}>
        {shown.map((entry, i) => (
          <View key={entry.username} style={[styles.avatarWrap, i > 0 && styles.avatarOverlap]}>
            <UserAvatar
              user={{
                displayName: entry.username,
                avatarUrl: entry.avatarUrl,
                avatarColor: entry.avatarColor,
              }}
              size={18}
            />
          </View>
        ))}
      </View>
      {hasNames ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.text}>
          Liked by <ThemedText type="smallBold" style={{ color: theme.text }}>{names}</ThemedText>
          {andMore}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.text}>
          {likesCount} likes
        </ThemedText>
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarOverlap: {
    marginLeft: -Spacing.one,
  },
  text: {
    flexShrink: 1,
  },
});