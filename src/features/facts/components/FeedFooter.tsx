import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/shared/ui/app-pressable';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface FeedFooterProps {
  isLoading: boolean;
  factsCount: number;
  hasMore: boolean;
  isAuthenticated: boolean;
}

export function FeedFooter({
  isLoading,
  factsCount,
  hasMore,
  isAuthenticated,
}: FeedFooterProps) {
  const { t } = useTranslation('feed');
  const theme = useTheme();
  const router = useRouter();

  if (isLoading && factsCount > 0) {
    return <LoadingSkeleton count={1} />;
  }

  if (!hasMore && factsCount > 0) {
    if (!isAuthenticated) {
      return (
        <View style={styles.footerContainer}>
          <ThemedView type="backgroundElement" style={[styles.guestCard, { borderColor: theme.border }]}>
            <Ionicons name="sparkles" size={28} color={theme.primary} />
            <ThemedText type="subtitle" style={styles.guestTitle}>
              {t('guestBannerTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.guestSubtitle}>
              {t('guestBannerSubtitle')}
            </ThemedText>
            <View style={styles.guestButtons}>
              <AppPressable
                style={[styles.guestButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/auth/login')}>
                <ThemedText type="smallBold" style={styles.guestButtonText}>
                  {t('guestBannerSignIn')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                style={[styles.guestButton, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => router.push('/auth/register')}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {t('guestBannerSignUp')}
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      );
    }

    return (
      <View style={styles.endOfList}>
        <Ionicons name="checkmark-circle-outline" size={28} color={theme.muted} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.endOfListText}>
          {t('endOfListTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="muted">
          {t('endOfListSubtitle')}
        </ThemedText>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  guestTitle: {
    textAlign: 'center',
  },
  guestSubtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  guestButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  guestButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: '#FFFFFF',
  },
  endOfList: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.one,
  },
  endOfListText: {
    fontWeight: '600',
  },
});
