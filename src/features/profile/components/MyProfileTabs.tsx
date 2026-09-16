import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ProfileTab } from '../hooks/useMyProfileScreen';

interface MyProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function MyProfileTabs({ activeTab, onTabChange }: MyProfileTabsProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  return (
    <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
      <AppPressable
        onPress={() => onTabChange('mine')}
        style={[styles.tab, activeTab === 'mine' && { borderBottomColor: theme.primary }]}>
        <ThemedText
          type="smallBold"
          style={{ color: activeTab === 'mine' ? theme.primary : theme.muted }}>
          {t('profile:tabMyFacts')}
        </ThemedText>
      </AppPressable>
      <AppPressable
        onPress={() => onTabChange('liked')}
        style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
        <ThemedText
          type="smallBold"
          style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
          {t('profile:tabLiked')}
        </ThemedText>
      </AppPressable>
      <AppPressable
        onPress={() => onTabChange('mentions')}
        style={[styles.tab, activeTab === 'mentions' && { borderBottomColor: theme.primary }]}>
        <ThemedText
          type="smallBold"
          style={{ color: activeTab === 'mentions' ? theme.primary : theme.muted }}>
          {t('profile:tabMentions')}
        </ThemedText>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
    gap: Spacing.four,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
