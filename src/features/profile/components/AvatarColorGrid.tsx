import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ApiAvatarOption } from '@/shared/api/types';

interface AvatarColorGridProps {
  colorOptions: ApiAvatarOption[];
  pendingColor: string | null;
  onPickColor: (color: string) => void;
  onPickNoColor: () => void;
}

export function AvatarColorGrid({
  colorOptions,
  pendingColor,
  onPickColor,
  onPickNoColor,
}: AvatarColorGridProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  if (colorOptions.length === 0) return null;

  return (
    <>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {t('profile:chooseColor')}
      </ThemedText>
      <View style={styles.colorGrid}>
        <AppPressable
          onPress={onPickNoColor}
          style={[
            styles.noColorOption,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pendingColor === null && styles.optionSelected,
          ]}>
          <Ionicons name="ban-outline" size={20} color={theme.textSecondary} />
          {pendingColor === null && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </AppPressable>
        {colorOptions.map((option) => {
          const isSelected = pendingColor === option.color;
          return (
            <AppPressable
              key={option.id}
              onPress={() => onPickColor(option.color!)}
              style={[
                styles.colorOption,
                { backgroundColor: option.color ?? undefined },
                isSelected && styles.optionSelected,
              ]}>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </AppPressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: Spacing.two,
    marginTop: Spacing.three,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noColorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
