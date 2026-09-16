import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface SearchHeaderProps {
  topInset: number;
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function SearchHeader({ topInset, value, onChangeText, onClear }: SearchHeaderProps) {
  const { t } = useTranslation('search');
  const theme = useTheme();

  return (
    <View style={[styles.searchBarContainer, { paddingTop: topInset }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Ionicons name="search-outline" size={20} color={theme.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('search:placeholder')}
          placeholderTextColor={theme.muted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <AppPressable onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.muted} />
          </AppPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
