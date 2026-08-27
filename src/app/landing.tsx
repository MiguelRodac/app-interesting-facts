import { useEffect, useState, useMemo } from 'react';
import { Linking, Platform, StyleSheet, ScrollView, View, useWindowDimensions } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { APK_URL } from '@/config/landing';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/hooks/theme-provider';

const BREAKPOINT = 600;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function LandingScreen() {
  const { t } = useTranslation(['landing', 'common']);
  const theme = useTheme();
  const { colorScheme, toggleDarkMode } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isNarrow = width < BREAKPOINT;
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const features = useMemo(
    () => [
      {
        icon: 'bulb-outline' as const,
        title: t('landing:feature1Title'),
        description: t('landing:feature1Desc'),
      },
      {
        icon: 'heart-outline' as const,
        title: t('landing:feature2Title'),
        description: t('landing:feature2Desc'),
      },
      {
        icon: 'search-outline' as const,
        title: t('landing:feature3Title'),
        description: t('landing:feature3Desc'),
      },
    ],
    [t],
  );

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
          <Image
            source={require('@/assets/images/icon.png')}
            style={[styles.logoImage, isNarrow && styles.logoImageNarrow]}
            accessibilityLabel={t('landing:logoLabel')}
          />
          <ThemedText type="title" style={[styles.title, isNarrow && styles.titleNarrow]}>
            {t('landing:title')}
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textSecondary"
            style={[styles.tagline, isNarrow && styles.taglineNarrow]}>
            {t('landing:tagline')}
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
                  {t('landing:downloadApk')}
                </ThemedText>
              </AppPressable>
            )}
            {deviceType === 'desktop' && installPrompt && (
              <AppPressable
                style={[styles.ctaGhost, isNarrow && styles.ctaNarrow, { borderColor: theme.border }]}
                onPress={handleInstall}>
                <Ionicons name="phone-portrait-outline" size={20} color={theme.text} />
                <ThemedText type="default" style={{ color: theme.text }}>
                  {t('landing:installApp')}
                </ThemedText>
              </AppPressable>
            )}
            <AppPressable
              style={[styles.ctaGhost, isNarrow && styles.ctaNarrow, { borderColor: theme.border }]}
              onPress={handleTryApp}>
              <Ionicons name="browsers-outline" size={20} color={theme.text} />
              <ThemedText type="default" style={{ color: theme.text }}>
                {t('landing:tryInBrowser')}
              </ThemedText>
            </AppPressable>
          </View>
        </View>

        {/* Features */}
        <View style={[styles.features, isNarrow && styles.featuresNarrow]}>
          {features.map((feature) => (
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
              <ThemedText type="smallBold">{t('landing:iosHintTitle')}</ThemedText>
              {deviceType === 'ios' ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.iosHintDescription}>
                  {t('landing:iosHint')}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.iosHintDescription}>
                  {t('landing:desktopHint')}
                </ThemedText>
              )}
            </View>
          </ThemedView>
        )}

        {/* Footer */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {t('landing:footer')}
        </ThemedText>
      </ScrollView>

      {/* Header controls — top-right corner */}
      <View style={styles.themeToggleWrap}>
        <LanguageToggle />
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={isDark ? t('landing:switchToLight') : t('landing:switchToDark')}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: Radii.lg,
  },
  logoImageNarrow: {
    width: 72,
    height: 72,
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