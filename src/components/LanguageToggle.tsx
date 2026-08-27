import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { Radii, Spacing } from '@/constants/theme';

export function LanguageToggle() {
  const { currentLanguage, setLanguagePreference } = useLanguage();
  const theme = useTheme();

  const toggleLanguage = () => {
    const nextLang = currentLanguage === 'es' ? 'en' : 'es';
    setLanguagePreference(nextLang);
  };

  const nextLabel = currentLanguage === 'es' ? 'English' : 'Español';

  return (
    <AppPressable
      onPress={toggleLanguage}
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${nextLabel}`}>
      <Ionicons name="globe-outline" size={16} color={theme.text} />
      <ThemedText type="smallBold" style={[styles.text, { color: theme.text }]}>
        {currentLanguage.toUpperCase()}
      </ThemedText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
