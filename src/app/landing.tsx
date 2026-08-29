import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Linking, Platform, StyleSheet, ScrollView, View, useWindowDimensions } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { AppModal } from '@/components/ui/app-modal';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageToggle } from '@/components/LanguageToggle';
import { APK_URL } from '@/config/landing';
import { Radii, Spacing, Shadows } from '@/constants/theme';
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
  const [activeAccordion, setActiveAccordion] = useState<'apk' | 'pwa' | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [guideY, setGuideY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleScrollToGuide = useCallback(() => {
    if (Platform.OS === 'web') {
      const el = document.getElementById('installation-guide');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    scrollViewRef.current?.scrollTo({ y: Math.max(0, guideY - 20), animated: true });
  }, [guideY]);

  const handleConfirmDownload = useCallback(() => {
    setConfirmModalVisible(false);
    if (!APK_URL) return;
    if (Platform.OS === 'web') {
      try {
        const a = document.createElement('a');
        a.href = APK_URL;
        a.download = 'app-interesting-facts.apk';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        window.location.href = APK_URL;
      }
    } else {
      Linking.openURL(APK_URL).catch(() => {});
    }
  }, []);

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
      <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.scroll, isNarrow && styles.scrollNarrow]}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={isDark ? require('@/assets/images/logo-light.png') : require('@/assets/images/logo-dark.png')}
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

          {/* CTAs */}
          <View style={[styles.ctas, isNarrow && styles.ctasNarrow]}>
            <AppPressable
              style={[styles.ctaPrimary, isNarrow && styles.ctaNarrow, { backgroundColor: theme.primary }]}
              onPress={handleScrollToGuide}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <ThemedText type="default" style={styles.ctaPrimaryText}>
                {t('landing:downloadApp')}
              </ThemedText>
            </AppPressable>
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

        {/* Unified Installation Guide Accordion */}
        <ThemedView
          nativeID="installation-guide"
          onLayout={(e) => setGuideY(e.nativeEvent.layout.y)}
          type="backgroundElement"
          style={[styles.guideCard, isNarrow && styles.guideCardNarrow, Shadows.sm]}>
          <View style={styles.guideHeader}>
            <Ionicons name="cloud-download-outline" size={26} color={theme.primary} />
            <View style={{ flex: 1, gap: Spacing.half }}>
              <ThemedText type="subtitle" style={styles.guideTitle}>
                {t('landing:installGuideTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('landing:downloadZoneSubtitle')}
              </ThemedText>
            </View>
          </View>

          {/* Accordion Item 1: Android APK */}
          {APK_URL && (
            <View style={[styles.accordionItem, { borderColor: theme.border }]}>
              <AppPressable
                style={[
                  styles.accordionHeader,
                  activeAccordion === 'apk' && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
                onPress={() => setActiveAccordion((prev) => (prev === 'apk' ? null : 'apk'))}>
                <View style={styles.accordionHeaderLeft}>
                  <Ionicons name="logo-android" size={22} color={theme.primary} />
                  <View style={styles.accordionTitleWrap}>
                    <ThemedText type="smallBold" themeColor="text">
                      {t('landing:tabApkTitle')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('landing:tabApkSubtitle')}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={activeAccordion === 'apk' ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </AppPressable>

              {activeAccordion === 'apk' && (
                <View style={styles.accordionBody}>
                  <View style={[styles.guideSteps, isNarrow && styles.guideStepsNarrow]}>
                    <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                      <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>1</ThemedText>
                      </View>
                      <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                        {t('landing:installStep1Title')}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                        {t('landing:installStep1Desc')}
                      </ThemedText>
                    </View>

                    <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                      <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>2</ThemedText>
                      </View>
                      <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                        {t('landing:installStep2Title')}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                        {t('landing:installStep2Desc')}
                      </ThemedText>
                    </View>

                    <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                      <View style={[styles.guideStepNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>3</ThemedText>
                      </View>
                      <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                        {t('landing:installStep3Title')}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                        {t('landing:installStep3Desc')}
                      </ThemedText>
                    </View>
                  </View>

                  <AppPressable
                    style={[
                      styles.ctaPrimary,
                      isNarrow && styles.ctaNarrow,
                      { backgroundColor: theme.primary, alignSelf: 'center', marginTop: Spacing.three },
                    ]}
                    onPress={() => setConfirmModalVisible(true)}>
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                    <ThemedText type="default" style={styles.ctaPrimaryText}>
                      {t('landing:downloadApk')}
                    </ThemedText>
                  </AppPressable>
                </View>
              )}
            </View>
          )}

          {/* Accordion Item 2: PWA / Web App (iOS, Android, Desktop) */}
          <View style={[styles.accordionItem, { borderColor: theme.border }]}>
            <AppPressable
              style={[
                styles.accordionHeader,
                activeAccordion === 'pwa' && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={() => setActiveAccordion((prev) => (prev === 'pwa' ? null : 'pwa'))}>
              <View style={styles.accordionHeaderLeft}>
                <Ionicons name="globe-outline" size={22} color={theme.primary} />
                <View style={styles.accordionTitleWrap}>
                  <ThemedText type="smallBold" themeColor="text">
                    {t('landing:tabPwaTitle')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('landing:tabPwaSubtitle')}
                  </ThemedText>
                </View>
              </View>
              <Ionicons
                name={activeAccordion === 'pwa' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </AppPressable>

            {activeAccordion === 'pwa' && (
              <View style={styles.accordionBody}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.pwaIntroText}>
                  {t('landing:pwaIntro')}
                </ThemedText>

                <View style={[styles.guideSteps, isNarrow && styles.guideStepsNarrow]}>
                  {/* iOS */}
                  <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Ionicons name="logo-apple" size={24} color={theme.text} style={{ marginBottom: Spacing.half }} />
                    <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                      {t('landing:pwaIosTitle')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                      {t('landing:pwaIosDesc')}
                    </ThemedText>
                  </View>

                  {/* Android Browser */}
                  <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Ionicons name="logo-android" size={24} color="#3DDC84" style={{ marginBottom: Spacing.half }} />
                    <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                      {t('landing:pwaAndroidTitle')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                      {t('landing:pwaAndroidDesc')}
                    </ThemedText>
                  </View>

                  {/* Desktop */}
                  <View style={[styles.guideStepItem, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Ionicons name="laptop-outline" size={24} color={theme.primary} style={{ marginBottom: Spacing.half }} />
                    <ThemedText type="smallBold" themeColor="text" style={styles.guideStepTitle}>
                      {t('landing:pwaDesktopTitle')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.guideStepDesc}>
                      {t('landing:pwaDesktopDesc')}
                    </ThemedText>
                  </View>
                </View>

                {installPrompt && (
                  <AppPressable
                    style={[
                      styles.ctaPrimary,
                      isNarrow && styles.ctaNarrow,
                      { backgroundColor: theme.primary, alignSelf: 'center', marginTop: Spacing.three },
                    ]}
                    onPress={handleInstall}>
                    <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
                    <ThemedText type="default" style={styles.ctaPrimaryText}>
                      {t('landing:installDirectlyButton')}
                    </ThemedText>
                  </AppPressable>
                )}
              </View>
            )}
          </View>
        </ThemedView>

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

      {/* Explicit User Consent Modal */}
      <AppModal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={[styles.modalContent, { borderColor: theme.border }, Shadows.lg]}>
            <Ionicons name="download-outline" size={40} color={theme.primary} />
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('landing:downloadModalTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.modalMessage}>
              {t('landing:downloadModalConsent')}
            </ThemedText>
            <View style={styles.modalButtons}>
              <AppPressable
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setConfirmModalVisible(false)}>
                <ThemedText type="smallBold" themeColor="text">
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleConfirmDownload}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('common:download')}
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
      </AppModal>
    </ThemedView>
  );
}

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
  footer: {
    textAlign: 'center',
  },
  guideCard: {
    width: '100%',
    maxWidth: 640,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    gap: Spacing.three,
  },
  guideCardNarrow: {
    padding: Spacing.three,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  guideTitle: {
    fontSize: 18,
  },
  accordionItem: {
    width: '100%',
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  accordionTitleWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  accordionBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pwaIntroText: {
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  guideSteps: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  guideStepsNarrow: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  guideStepItem: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.one,
  },
  guideStepNumber: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  guideStepTitle: {
    fontSize: 14,
  },
  guideStepDesc: {
    lineHeight: 18,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginTop: Spacing.two,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});