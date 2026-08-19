import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { ApiFactLike } from '@/data/api/types';

interface LikedByLineProps {
  likes: ApiFactLike[];
  onPress?: () => void;
}

/** "Liked by @alice, @bob and 3 more" — tap opens the full likes modal */
export function LikedByLine({ likes, onPress }: LikedByLineProps) {
  const theme = useTheme();

  if (likes.length === 0) return null;

  const shown = likes.slice(0, 3);
  const remaining = likes.length - shown.length;
  const names = shown
    .map((like) => `@${like.username}`)
    .join(remaining > 0 ? ', ' : shown.length > 1 ? ' and ' : '');

  return (
    <AppPressable
      onPress={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      disabled={!onPress}
      hitSlop={4}
      style={styles.row}>
      <Ionicons name="heart" size={14} color={theme.destructive} />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.text}>
        Liked by <ThemedText type="smallBold" style={{ color: theme.text }}>{names}</ThemedText>
        {remaining > 0 ? ` and ${remaining} more` : ''}
      </ThemedText>
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
  text: {
    flexShrink: 1,
  },
});