import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface EditProfileAvatarSectionProps {
  displayName: string;
  avatarColor: string | null;
  avatarUrl: string | null;
  onPress: () => void;
}

export function EditProfileAvatarSection({
  displayName,
  avatarColor,
  avatarUrl,
  onPress,
}: EditProfileAvatarSectionProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();
  const hasUrlAvatar = avatarUrl != null && avatarUrl.trim().length > 0;

  return (
    <View style={styles.avatarSection}>
      <AppPressable onPress={onPress} style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <UserAvatar
            user={{
              displayName,
              avatarColor: avatarColor ?? undefined,
              avatarUrl: hasUrlAvatar ? avatarUrl : null,
            }}
            size={96}
          />
        </View>
        <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </View>
      </AppPressable>
      <AppPressable onPress={onPress}>
        <ThemedText type="small" themeColor="primary">
          {t('profile:tapToChange')}
        </ThemedText>
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
