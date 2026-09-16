import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { LanguagePreference } from '@/i18n';

export interface SettingsLanguageSectionProps {
  languagePreference: LanguagePreference;
  onSelectPreference: (preference: LanguagePreference) => void;
}

export function SettingsLanguageSection({
  languagePreference,
  onSelectPreference,
}: SettingsLanguageSectionProps) {
  const { t } = useTranslation('settings');
  const theme = useTheme();

  const languageOptions: {
    value: LanguagePreference;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: 'system', label: t('langSystem'), icon: 'globe-outline' },
    { value: 'en', label: t('langEn'), icon: 'language-outline' },
    { value: 'es', label: t('langEs'), icon: 'language-outline' },
  ];

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {t('sectionLanguage')}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {languageOptions.map((option, index) => {
          const isSelected = languagePreference === option.value;
          return (
            <AppPressable
              key={option.value}
              onPress={() => onSelectPreference(option.value)}
              style={[
                styles.row,
                index < languageOptions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}>
              <Ionicons name={option.icon} size={20} color={isSelected ? theme.primary : theme.muted} />
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
