import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TabItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TABS: TabItem[] = [
  { name: 'index', icon: 'home-outline', iconFocused: 'home', label: 'Feed' },
  { name: 'search', icon: 'search-outline', iconFocused: 'search', label: 'Search' },
  { name: 'create', icon: 'add-circle-outline', iconFocused: 'add-circle', label: 'Create' },
  { name: 'profile', icon: 'person-outline', iconFocused: 'person', label: 'Profile' },
];

interface TabBarProps {
  activeTab: string;
  onTabPress: (name: string) => void;
}

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
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
              {tab.label}
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
