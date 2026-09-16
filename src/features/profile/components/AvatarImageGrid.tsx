import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ApiAvatarOption } from '@/shared/api/types';

interface AvatarImageGridProps {
  avatarOptionsWithUrl: ApiAvatarOption[];
  pendingUrl: string | null;
  onPickAvatar: (option: ApiAvatarOption) => void;
  onPickNoAvatar: () => void;
}

export function AvatarImageGrid({
  avatarOptionsWithUrl,
  pendingUrl,
  onPickAvatar,
  onPickNoAvatar,
}: AvatarImageGridProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  return (
    <>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {t('profile:chooseAvatar')}
      </ThemedText>
      <View style={styles.avatarGrid}>
        <AppPressable
          onPress={onPickNoAvatar}
          style={[
            styles.noAvatarOption,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pendingUrl === null && styles.optionSelected,
          ]}>
          <Ionicons name="person-outline" size={24} color={theme.textSecondary} />
          {pendingUrl === null && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </AppPressable>
        {avatarOptionsWithUrl.map((option) => {
          const isSelected = pendingUrl === option.url;
          return (
            <AppPressable
              key={option.id}
              onPress={() => onPickAvatar(option)}
              style={[styles.avatarOption, isSelected && styles.optionSelected]}>
              <Image
                source={{ uri: option.url ?? undefined }}
                style={styles.avatarImage}
                contentFit="cover"
              />
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
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  noAvatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
