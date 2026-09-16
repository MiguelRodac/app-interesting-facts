import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Author } from '@/types';

interface MyProfileHeaderProps {
  user: Author;
  onAvatarPress: () => void;
  onEditProfile: () => void;
  onSettings: () => void;
}

export function MyProfileHeader({
  user,
  onAvatarPress,
  onEditProfile,
  onSettings,
}: MyProfileHeaderProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarSection}>
        <AppPressable onPress={onAvatarPress} hitSlop={8}>
          <UserAvatar user={user} size={80} />
        </AppPressable>
        <AppPressable onPress={onEditProfile} style={styles.userInfo} hitSlop={4}>
          <ThemedText type="subtitle" numberOfLines={2} ellipsizeMode="tail">
            {user.displayName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            @{user.username}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.primary }}>
            {t('profile:editProfile')}
          </ThemedText>
        </AppPressable>
        <AppPressable onPress={onSettings} hitSlop={8} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    paddingVertical: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  settingsButton: {
    padding: Spacing.one,
  },
});
