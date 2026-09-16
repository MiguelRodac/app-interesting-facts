import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Hashtag } from '@/types';

interface SearchHashtagRowProps {
  hashtag: Hashtag;
  onPress: (tag: string) => void;
}

export function SearchHashtagRow({ hashtag, onPress }: SearchHashtagRowProps) {
  const theme = useTheme();

  return (
    <AppPressable
      style={[styles.hashtagRow, { borderBottomColor: theme.border }]}
      onPress={() => onPress(hashtag.tag)}>
      <Ionicons name="pricetag-outline" size={18} color={theme.primary} />
      <ThemedText type="default" style={styles.hashtagText}>
        #{hashtag.tag}
      </ThemedText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hashtagText: {
    flex: 1,
  },
});
