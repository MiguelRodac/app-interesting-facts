import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LANDING_ENABLED } from '@/config/landing';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { useBottomInset } from '@/hooks/use-bottom-inset';

export default function HomeScreen() {
  const { t } = useTranslation(['common', 'landing']);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }

    // Web only: the landing page is ALWAYS the home for anonymous visitors
    // when EXPO_PUBLIC_LANDING_ENABLED=true. Never affects the APK build.
    if (Platform.OS === 'web' && LANDING_ENABLED) {
      router.replace('/landing');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: topInset + Spacing.two,
            paddingBottom: Math.max(Spacing.six, bottomInset + Spacing.four),
          },
        ]}>
        {/* Top Header with Language Toggle */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <LanguageToggle />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Ionicons name="bulb-outline" size={80} color={theme.primary} />
          <ThemedText type="title" style={styles.title}>
            {t('landing:title')}
          </ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary" style={styles.subtitle}>
            {t('common:welcomeSubtitle')}
          </ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <AppPressable
            style={[styles.ctaButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/auth/login')}>
            <ThemedText type="default" style={styles.ctaText}>
              {t('common:getStarted')}
            </ThemedText>
          </AppPressable>

          <AppPressable
            style={[styles.ghostButton, { borderColor: theme.border }]}
            onPress={() => router.replace('/(tabs)')}>
            <ThemedText type="default" style={{ color: theme.text }}>
              {t('common:browseWithoutSignIn')}
            </ThemedText>
          </AppPressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginVertical: 'auto',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
  },
  buttons: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.three,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  ghostButton: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
