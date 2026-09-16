import { useState, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSegments } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { setAppUpdateHandler } from '@/data/api/client';
import { Spacing } from '@/constants/theme';
import { useUpdateStore } from './stores/updateStore';
import { WebUpdateCard } from './components/WebUpdateCard';
import { NativeUpdateCard } from './components/NativeUpdateCard';
import { InstallGuideModal } from './components/InstallGuideModal';

const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://app-interesting-facts.vercel.app/landing';

/**
 * Root gate checking application version:
 * - On Web/PWA: Renders WebUpdateCard (automatic reload/cache clearing).
 * - On Native: Renders NativeUpdateCard (guide to official web download) + InstallGuideModal.
 */
export function AppUpdateGate() {
  const segments = useSegments();
  const updateRequired = useUpdateStore((s) => s.updateRequired);
  const [guideModalVisible, setGuideModalVisible] = useState(false);

  useEffect(() => {
    setAppUpdateHandler(() => useUpdateStore.getState().flagUpdateRequired());
  }, []);

  const isLandingPage = Platform.OS === 'web' && segments[0] === 'landing';
  if (!updateRequired || isLandingPage) return null;

  return (
    <ThemedView style={styles.backdrop}>
      {Platform.OS === 'web' ? (
        <WebUpdateCard />
      ) : (
        <>
          <NativeUpdateCard
            appVersion={APP_VERSION}
            webUrl={WEB_URL}
            onOpenGuide={() => setGuideModalVisible(true)}
          />
          <InstallGuideModal
            visible={guideModalVisible}
            onClose={() => setGuideModalVisible(false)}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    zIndex: 9999,
    elevation: 9999,
  },
});
