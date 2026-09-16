import { useEffect, useState, useRef, useCallback } from 'react';
import { Linking, Platform, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { APK_URL } from '@/config/landing';
import { Spacing } from '@/constants/theme';
import { LandingHeaderControls } from './LandingHeaderControls';
import { LandingHero } from './LandingHero';
import { LandingFeatures } from './LandingFeatures';
import { LandingInstallAccordion } from './LandingInstallAccordion';
import { ApkDownloadConsentModal } from './ApkDownloadConsentModal';
import { PwaGuideModal } from './PwaGuideModal';
import { getInitialDeviceType, type BeforeInstallPromptEvent, type DeviceType } from '../utils/deviceDetector';

const BREAKPOINT = 600;

export function LandingScreen() {
  const { t } = useTranslation('landing');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < BREAKPOINT;

  const [deviceType] = useState<DeviceType>(getInitialDeviceType);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<'apk' | 'pwa' | null>('apk');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pwaGuideModalVisible, setPwaGuideModalVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const isDownloadingRef = useRef(false);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guideY, setGuideY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { download } = useLocalSearchParams<{ download?: string }>();
  const hasAutoDownloadedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    setConfirmModalVisible(false);

    if (downloadTimerRef.current) {
      clearTimeout(downloadTimerRef.current);
    }

    const downloadHref = APK_URL || '/app-interesting-facts.apk';
    if (!downloadHref) {
      isDownloadingRef.current = false;
      setIsDownloading(false);
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = downloadHref;
        a.setAttribute('download', 'app-interesting-facts.apk');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        Linking.openURL(downloadHref).catch(() => {});
      }
    } catch {
      if (Platform.OS === 'web') {
        window.location.href = downloadHref;
      }
    } finally {
      downloadTimerRef.current = setTimeout(() => {
        isDownloadingRef.current = false;
        setIsDownloading(false);
      }, 5000);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && download === 'apk' && !hasAutoDownloadedRef.current) {
      hasAutoDownloadedRef.current = true;
      setActiveAccordion('apk');
      const timer = setTimeout(() => {
        handleConfirmDownload();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [download, handleConfirmDownload]);

  const handleInstallPwa = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch {
        setPwaGuideModalVisible(true);
      }
    } else {
      setPwaGuideModalVisible(true);
    }
  };

  const handleTryApp = () => {
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <LandingHeaderControls />

      <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.scroll, isNarrow && styles.scrollNarrow]}>
        <LandingHero
          isNarrow={isNarrow}
          onScrollToGuide={handleScrollToGuide}
          onTryApp={handleTryApp}
        />

        <LandingFeatures isNarrow={isNarrow} />

        <LandingInstallAccordion
          isNarrow={isNarrow}
          activeAccordion={activeAccordion}
          onToggleAccordion={(key) => setActiveAccordion((prev) => (prev === key ? null : key))}
          isDownloading={isDownloading}
          onConfirmDownload={handleConfirmDownload}
          onInstallPwa={handleInstallPwa}
          onLayoutGuide={setGuideY}
        />

        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {t('landing:footer')}
        </ThemedText>
      </ScrollView>

      <ApkDownloadConsentModal
        visible={confirmModalVisible}
        isDownloading={isDownloading}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmDownload}
      />

      <PwaGuideModal
        visible={pwaGuideModalVisible}
        deviceType={deviceType}
        onClose={() => setPwaGuideModalVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  footer: {
    textAlign: 'center',
  },
});