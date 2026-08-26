import { useCallback, useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setAppUpdateHandler } from '@/data/api/client';
import { useUpdateStore } from '@/data/stores/updateStore';
import { Radii, Spacing } from '@/constants/theme';

/** Where to send users for the latest version — deployed landing first,
 *  direct APK as fallback. Both optional; the gate degrades gracefully. */
const DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? process.env.EXPO_PUBLIC_APK_URL ?? null;

/**
 * Full-screen blocker rendered by the root layout. Stays hidden until the
 * API client flags an outdated/missing app version, then covers every
 * screen with a "update required" notice and a direct link to the landing
 * page (where the latest APK lives).
 */
export function AppUpdateGate() {
  const updateRequired = useUpdateStore((s) => s.updateRequired);

  useEffect(() => {
    setAppUpdateHandler(() => useUpdateStore.getState().flagUpdateRequired());
  }, []);

  const handleDownload = useCallback(() => {
    if (!DOWNLOAD_URL) return;
    Linking.openURL(DOWNLOAD_URL).catch(() => {});
  }, []);

  if (!updateRequired) return null;

  return (
    <ThemedView style={styles.backdrop}>
      <View style={styles.card}>
        <Ionicons name="cloud-download-outline" size={64} color="#FB8C00" />
        <ThemedText type="subtitle" style={styles.title}>
          Versión desactualizada
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          Estás usando una versión que ya no es compatible. Descarga la última
          versión desde nuestra página para seguir usando la app.
        </ThemedText>
        {DOWNLOAD_URL ? (
          <AppPressable style={styles.button} onPress={handleDownload} hitSlop={6}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <ThemedText type="smallBold" style={styles.buttonText}>
              Ir a descargar
            </ThemedText>
          </AppPressable>
        ) : (
          <ThemedText type="small" themeColor="muted" style={styles.hint}>
            Contacta al equipo para obtener la última versión.
          </ThemedText>
        )}
      </View>
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
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 340,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
