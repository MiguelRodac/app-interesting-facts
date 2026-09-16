import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ThemePreference } from '@/shared/hooks/theme-provider';

export interface SettingsThemeSectionProps {
  themePreference: ThemePreference;
  onSelectPreference: (preference: ThemePreference) => void;
}

export function SettingsThemeSection({
  themePreference,
  onSelectPreference,
}: SettingsThemeSectionProps) {
  const { t } = useTranslation('settings');
  const theme = useTheme();

  const themeOptions: {
    value: ThemePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconFocused: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline', iconFocused: 'phone-portrait' },
    { value: 'light', label: t('themeLight'), icon: 'sunny-outline', iconFocused: 'sunny' },
    { value: 'dark', label: t('themeDark'), icon: 'moon-outline', iconFocused: 'moon' },
  ];

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {t('sectionAppearance')}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {themeOptions.map((option, index) => {
          const isSelected = themePreference === option.value;
          const iconName = isSelected ? option.iconFocused : option.icon;
          return (
            <AppPressable
              key={option.value}
              onPress={() => onSelectPreference(option.value)}
              style={[
                styles.row,
                index < themeOptions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}>
              <Ionicons name={iconName} size={20} color={isSelected ? theme.primary : theme.muted} />
              <ThemedText type="default" style={{ color: isSelected ? theme.primary : theme.text }}>
                {option.label}
              </ThemedText>
              <View style={styles.flexSpacer} />
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={isSelected ? theme.primary : theme.muted}
              />
            </AppPressable>
          );
        })}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  flexSpacer: {
    flex: 1,
  },
});
