import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TabItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

const TABS: TabItem[] = [
  { name: 'index', icon: 'home-outline', iconFocused: 'home', labelKey: 'tabFeed' },
  { name: 'search', icon: 'search-outline', iconFocused: 'search', labelKey: 'tabSearch' },
  { name: 'create', icon: 'add-circle-outline', iconFocused: 'add-circle', labelKey: 'tabCreate' },
  { name: 'profile', icon: 'person-outline', iconFocused: 'person', labelKey: 'tabProfile' },
];

interface TabBarProps {
  activeTab: string;
  onTabPress: (name: string) => void;
}

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      ]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        const iconName = isActive ? tab.iconFocused : tab.icon;
        const color = isActive ? theme.primary : theme.muted;

        return (
          <AppPressable
            key={tab.name}
            onPress={() => onTabPress(tab.name)}
            style={styles.tab}>
            <Ionicons name={iconName} size={24} color={color} />
            <ThemedText
              type="small"
              style={[styles.label, { color }]}>
              {t(tab.labelKey)}
            </ThemedText>
          </AppPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
