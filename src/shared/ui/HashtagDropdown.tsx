import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ApiHashtag } from '@/shared/api/types';

interface HashtagDropdownProps {
  visible: boolean;
  loading: boolean;
  results: ApiHashtag[];
  selectedIndex: number;
  onSelect: (hashtag: ApiHashtag) => void;
  onSelectIndex: (index: number) => void;
}

export function HashtagDropdown({
  visible,
  loading,
  results,
  selectedIndex,
  onSelect,
  onSelectIndex,
}: HashtagDropdownProps) {
  const { t } = useTranslation('create');
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.dropdown,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="small" color={theme.muted} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.stateContainer}>
          <ThemedText type="small" themeColor="muted">
            {t('noHashtagsFound', { defaultValue: 'No se encontraron hashtags' })}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <AppPressable
              style={[
                styles.item,
                index === selectedIndex && { backgroundColor: theme.backgroundSelected },
              ]}
              onPress={() => onSelect(item)}
              onPressIn={() => onSelectIndex(index)}>
              <View style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  #
                </ThemedText>
              </View>
              <View style={styles.info}>
                <ThemedText type="smallBold" themeColor="text">
                  {item.tag}
                </ThemedText>
                {typeof item.usageCount === 'number' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('hashtagCount', { count: item.usageCount, defaultValue: `${item.usageCount} hechos` })}
                  </ThemedText>
                )}
              </View>
            </AppPressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: Spacing.one,
    maxHeight: 180,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
  },
  stateContainer: {
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
});
