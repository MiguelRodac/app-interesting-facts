import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, ScrollView, View, useWindowDimensions } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APK_URL } from '@/config/landing';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/hooks/theme-provider';

const BREAKPOINT = 600;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const FEATURES = [
  {
    icon: 'bulb-outline' as const,
    title: 'Discover',
    description: 'A feed of fascinating facts to learn something new every day.',
  },
  {
    icon: 'heart-outline' as const,
    title: 'Like & save',
    description: 'Keep your favorite facts close with a single tap.',
  },
  {
    icon: 'search-outline' as const,
    title: 'Find anything',
    description: 'Search by keyword or explore hashtags and creators.',
  },
];

export default function LandingScreen() {
  const theme = useTheme();
  const { colorScheme, toggleDarkMode } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isNarrow = width < BREAKPOINT;
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ua = navigator.userAgent;
    const isIpad =
      /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (/iphone|ipod|ipad/i.test(ua) || isIpad) {
      setDeviceType('ios');
    } else if (/android/i.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleDownload = () => {
    if (!APK_URL) return;
    if (Platform.OS === 'web') {
      window.open(APK_URL, '_blank');
    } else {
      Linking.openURL(APK_URL);
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleTryApp = () => {
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, isNarrow && styles.scrollNarrow]}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.logoBadge, isNarrow && styles.logoBadgeNarrow, { backgroundColor: theme.primary }]}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={[styles.logoImage, isNarrow && styles.logoImageNarrow]}
              accessibilityLabel="Interesting Facts logo"
            />
          </View>
          <ThemedText type="title" style={[styles.title, isNarrow && styles.titleNarrow]}>
            Interesting Facts
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textSecondary"
            style={[styles.tagline, isNarrow && styles.taglineNarrow]}>
            Discover and share fascinating facts with the world. Available as an app
            for Android — or try it right in your browser.
          </ThemedText>

          {/* CTAs — one install path per device, plus the universal
              "try in the browser" fallback */}
          <View style={[styles.ctas, isNarrow && styles.ctasNarrow]}>
            {deviceType === 'android' && APK_URL && (
              <AppPressable
                style={[styles.ctaPrimary, isNarrow && styles.ctaNarrow, { backgroundColor: theme.primary }]}
                onPress={handleDownload}>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <ThemedText type="default" style={styles.ctaPrimaryText}>
                  Download the APK
                </ThemedText>
              </AppPressable>
            )}
            {deviceType === 'desktop' && installPrompt && (
              <AppPressable
                style={[styles.ctaGhost, isNarrow && styles.ctaNarrow, { borderColor: theme.border }]}
                onPress={handleInstall}>
                <Ionicons name="phone-portrait-outline" size={20} color={theme.text} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  Install the app
                </ThemedText>
              </AppPressable>
            )}
            <AppPressable
              style={[styles.ctaGhost, isNarrow && styles.ctaNarrow, { borderColor: theme.border }]}
              onPress={handleTryApp}>
              <Ionicons name="browsers-outline" size={20} color={theme.text} />
              <ThemedText type="default" style={{ color: theme.text }}>
                Try it in the browser
              </ThemedText>
            </AppPressable>
          </View>
        </View>

        {/* Features */}
        <View style={[styles.features, isNarrow && styles.featuresNarrow]}>
          {FEATURES.map((feature) => (
            <ThemedView
              key={feature.title}
              type="backgroundElement"
              style={[styles.featureCard, isNarrow && styles.featureCardNarrow, Shadows.sm]}>
              <Ionicons name={feature.icon} size={28} color={theme.primary} />
              <ThemedText type="smallBold" style={styles.featureTitle}>
                {feature.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.featureDescription}>
                {feature.description}
              </ThemedText>
            </ThemedView>
          ))}
        </View>

        {/* Install hint: iOS installs via Share → Add to Home Screen,
            other browsers without an install prompt install from their menu */}
        {(deviceType === 'ios' || (deviceType === 'desktop' && !installPrompt)) && (
          <ThemedView
            type="backgroundElement"
            style={[styles.iosHint, styles.staticCard, { borderColor: theme.border }]}>
            <Ionicons name="phone-portrait-outline" size={24} color={theme.primary} />
            <View style={styles.iosHintText}>
              <ThemedText type="smallBold">Install the app</ThemedText>
              {deviceType === 'ios' ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.iosHintDescription}>
                  Tap Share, then &quot;Add to Home Screen&quot; — it works like a real app.
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.iosHintDescription}>
                  Use your browser&apos;s menu — &quot;Add to Home Screen&quot; or &quot;Install
                  App&quot;.
                </ThemedText>
              )}
            </View>
          </ThemedView>
        )}

{/* Footer */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          Interesting Facts · Made with curiosity
        </ThemedText>
      </ScrollView>

      {/* Theme toggle — top-right corner */}
      <View style={styles.themeToggleWrap}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onPress={toggleDarkMode}
          style={[
            styles.themeToggle,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.text} />
        </AppPressable>
      </View>
    </ThemedView>
  );
}

const Shadows = {
  sm: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggleWrap: {
    position: 'absolute',
    top: Spacing.four,
    right: Spacing.four,
    zIndex: 10,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    gap: Spacing.six,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  scrollNarrow: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  logoBadgeNarrow: {
    width: 64,
    height: 64,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
  },
  logoImageNarrow: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
  },
  titleNarrow: {
    fontSize: 28,
    lineHeight: 36,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 480,
    fontSize: 17,
    lineHeight: 26,
  },
  taglineNarrow: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  ctasNarrow: {
    flexDirection: 'column',
    width: '100%',
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    minWidth: 220,
  },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    borderWidth: 1,
    minWidth: 220,
  },
  ctaNarrow: {
    width: '100%',
    minWidth: 0,
  },
  ctaPrimaryText: {
    color: '#FFFFFF',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  featuresNarrow: {
    flexDirection: 'column',
  },
  featureCard: {
    width: 200,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  featureCardNarrow: {
    width: '100%',
  },
  featureTitle: {
    marginTop: Spacing.one,
  },
  featureDescription: {
    lineHeight: 20,
  },
  staticCard: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    gap: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iosHint: {
    borderWidth: 1,
  },
  iosHintText: {
    flex: 1,
    gap: Spacing.one,
  },
  iosHintDescription: {
    lineHeight: 20,
  },
  footer: {
    textAlign: 'center',
  },
});