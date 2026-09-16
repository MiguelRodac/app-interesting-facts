import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { PublicProfile } from '@/types';
import type { UserProfileTab } from '../hooks/useUserProfileScreen';

interface UserProfileHeaderProps {
  profile: PublicProfile | null;
  isLoading: boolean;
  activeTab: UserProfileTab;
  onTabChange: (tab: UserProfileTab) => void;
  onBack: () => void;
  factsCount: number;
  factsLoading: boolean;
  likesCount: number;
  likesLoading: boolean;
}

function formatJoinDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function UserProfileHeader({
  profile,
  isLoading,
  activeTab,
  onTabChange,
  onBack,
  factsCount,
  factsLoading,
  likesCount,
  likesLoading,
}: UserProfileHeaderProps) {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const theme = useTheme();
  const dateLocale = i18n.language.startsWith('es') ? 'es-ES' : 'en-US';

  if (isLoading) {
    return <LoadingSkeleton count={1} />;
  }

  if (!profile) {
    return (
      <EmptyState
        title={t('profile:userNotFound')}
        subtitle={t('profile:userNotFoundSubtitle')}
        icon="person-outline"
      />
    );
  }

  return (
    <View style={styles.header}>
      <AppPressable onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </AppPressable>

      <ThemedView type="backgroundElement" style={[styles.profileCard, Shadows.md]}>
        <UserAvatar user={profile} size={72} />
        <ThemedText type="subtitle" numberOfLines={2} ellipsizeMode="tail" style={styles.displayName}>
          {profile.displayName}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>
          @{profile.username}
        </ThemedText>
        <ThemedText type="small" themeColor="muted" style={styles.joinedDate}>
          {t('profile:joinedDate', { date: formatJoinDate(profile.createdAt, dateLocale) })}
        </ThemedText>
      </ThemedView>

      <View style={styles.tabBar}>
        <AppPressable
          onPress={() => onTabChange('facts')}
          style={[styles.tab, activeTab === 'facts' && { borderBottomColor: theme.primary }]}
          hitSlop={8}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'facts' ? theme.primary : theme.muted }}>
            {t('profile:tabFacts')}
          </ThemedText>
        </AppPressable>
        <AppPressable
          onPress={() => onTabChange('likes')}
          style={[styles.tab, activeTab === 'likes' && { borderBottomColor: theme.primary }]}
          hitSlop={8}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'likes' ? theme.primary : theme.muted }}>
            {t('profile:tabLikes')}
          </ThemedText>
        </AppPressable>
      </View>

      {activeTab === 'facts' && factsLoading && <LoadingSkeleton count={2} />}
      {activeTab === 'facts' && !factsLoading && factsCount === 0 && (
        <EmptyState
          title={t('profile:noFactsTitle')}
          subtitle={t('profile:userNoFactsSubtitle')}
          icon="document-text-outline"
        />
      )}
      {activeTab === 'likes' && likesLoading && <LoadingSkeleton count={2} />}
      {activeTab === 'likes' && !likesLoading && likesCount === 0 && (
        <EmptyState
          title={t('profile:noLikedTitle')}
          subtitle={t('profile:userNoLikesSubtitle')}
          icon="heart-outline"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.four,
  },
  backButton: {
    marginBottom: Spacing.three,
    padding: Spacing.one,
  },
  profileCard: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  displayName: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  username: {
    marginTop: Spacing.one,
  },
  joinedDate: {
    marginTop: Spacing.two,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginBottom: Spacing.three,
    gap: Spacing.four,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
