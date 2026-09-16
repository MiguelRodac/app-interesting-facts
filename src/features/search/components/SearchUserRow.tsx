import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Author } from '@/types';

interface SearchUserRowProps {
  user: Author;
  onPress: (user: Author) => void;
}

export function SearchUserRow({ user, onPress }: SearchUserRowProps) {
  const theme = useTheme();

  return (
    <AppPressable
      style={[styles.userRow, { borderBottomColor: theme.border }]}
      onPress={() => onPress(user)}>
      <UserAvatar user={user} size={44} />
      <View style={styles.userInfo}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {user.displayName}
        </ThemedText>
        <ThemedText type="small" themeColor="muted" numberOfLines={1}>
          @{user.username}
        </ThemedText>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
});
