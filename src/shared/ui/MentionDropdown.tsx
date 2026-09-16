import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ApiUserSearchResult } from '@/shared/api/types';

interface MentionDropdownProps {
  visible: boolean;
  loading: boolean;
  results: ApiUserSearchResult[];
  selectedIndex: number;
  onSelect: (user: ApiUserSearchResult) => void;
  onSelectIndex: (index: number) => void;
}

export function MentionDropdown({
  visible,
  loading,
  results,
  selectedIndex,
  onSelect,
  onSelectIndex,
}: MentionDropdownProps) {
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
            {t('noUsersFound', { defaultValue: 'No se encontraron usuarios' })}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.username}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <AppPressable
              style={[
                styles.item,
                index === selectedIndex && { backgroundColor: theme.backgroundSelected },
              ]}
              onPress={() => onSelect(item)}
              onPressIn={() => onSelectIndex(index)}>
              <UserAvatar
                user={{
                  displayName: item.displayName,
                  avatarColor: item.avatarColor ?? '#64B5F6',
                  avatarUrl: item.avatarUrl,
                }}
                size={30}
              />
              <View style={styles.info}>
                <ThemedText type="smallBold" themeColor="text">
                  @{item.username}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.displayName}
                </ThemedText>
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
  info: {
    flex: 1,
  },
});
