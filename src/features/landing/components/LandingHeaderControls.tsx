import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useThemeContext } from '@/shared/hooks/theme-provider';

export const LandingHeaderControls = React.memo(function LandingHeaderControls() {
  const { t } = useTranslation('landing');
  const theme = useTheme();
  const { colorScheme, toggleDarkMode } = useThemeContext();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.themeToggleWrap}>
      <LanguageToggle />
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={isDark ? t('landing:switchToLight') : t('landing:switchToDark')}
        onPress={toggleDarkMode}
        style={[
          styles.themeToggle,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.text} />
      </AppPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  themeToggleWrap: {
    position: 'absolute',
    top: Spacing.four,
    right: Spacing.four,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
});
