import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export interface SegmentedTab {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedTabs({ tabs, activeKey, onChange }: SegmentedTabsProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <AppPressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              isActive && { backgroundColor: theme.background },
              isActive && styles.tabActive,
            ]}>
            <ThemedText
              type="smallBold"
              style={[
                styles.label,
                { color: isActive ? theme.text : theme.muted },
              ]}>
              {tab.label}
              {tab.count !== undefined ? ` (${tab.count})` : ''}
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
    borderRadius: Radii.md,
    padding: Spacing.half,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radii.sm,
  },
  tabActive: {
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    elevation: 1,
  },
  label: {
    textAlign: 'center',
  },
});
