import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface SearchFooterProps {
  isLoadingMore: boolean;
  canLoadMore: boolean;
  isLoading: boolean;
  hasData: boolean;
  onLoadMore: () => void;
}

export function SearchFooter({
  isLoadingMore,
  canLoadMore,
  isLoading,
  hasData,
  onLoadMore,
}: SearchFooterProps) {
  const { t } = useTranslation('search');
  const theme = useTheme();

  if (isLoadingMore) {
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (canLoadMore && !isLoading && hasData) {
    return (
      <View style={styles.footerActionContainer}>
        <AppPressable
          style={[
            styles.loadMoreButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            isLoadingMore && { opacity: 0.6 },
          ]}
          onPress={onLoadMore}
          disabled={isLoadingMore}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('search:loadMore', { defaultValue: 'Ver más' })}>
          <Ionicons name="chevron-down-outline" size={16} color={theme.primary} />
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {t('search:loadMore', { defaultValue: 'Ver más' })}
          </ThemedText>
        </AppPressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  footerLoader: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
});
