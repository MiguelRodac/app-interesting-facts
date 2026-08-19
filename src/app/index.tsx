import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LANDING_ENABLED } from '@/config/landing';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();

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
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <Ionicons name="bulb-outline" size={80} color={theme.primary} />
          <ThemedText type="title" style={styles.title}>
            Interesting Facts
          </ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Discover and share fascinating facts with the world
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.buttons}>
          <AppPressable
            style={[styles.ctaButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/auth/login')}>
            <ThemedText type="default" style={styles.ctaText}>
              Get Started
            </ThemedText>
          </AppPressable>

          <AppPressable
            style={[styles.ghostButton, { borderColor: theme.border }]}
            onPress={() => router.replace('/(tabs)')}>
            <ThemedText type="default" style={{ color: theme.text }}>
              Browse without signing in
            </ThemedText>
          </AppPressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.six,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  buttons: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  ctaButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    borderRadius: 9999,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: {
    color: '#ffffff',
  },
  ghostButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: 9999,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
});
