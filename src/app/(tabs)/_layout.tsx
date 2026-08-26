import { useState, useCallback } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';

import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCreateScreenGuard } from '@/data/stores/createScreenGuard';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { triggerScrollToTop } from '@/lib/scrollToTop';

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { hasUnsavedChanges, clearGuard, triggerFormReset } = useCreateScreenGuard();
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Determine active tab from pathname
  const activeTab = pathname.includes('/search')
    ? 'search'
    : pathname.includes('/create')
      ? 'create'
      : pathname.includes('/profile')
        ? 'profile'
        : 'index';

  const navigateToTab = useCallback(
    (name: string) => {
      switch (name) {
        case 'search':
          router.navigate('/(tabs)/search');
          break;
        case 'create':
          router.navigate('/(tabs)/create');
          break;
        case 'profile':
          router.navigate('/(tabs)/profile');
          break;
        default:
          router.navigate('/(tabs)');
          break;
      }
    },
    [router],
  );

  const handleTabPress = useCallback(
    (name: string) => {
      // If leaving create tab with unsaved changes, show confirmation
      if (activeTab === 'create' && name !== 'create' && hasUnsavedChanges) {
        setPendingTab(name);
        return;
      }

      // If already on the home tab, scroll to top and refresh
      if (activeTab === 'index' && name === 'index') {
        triggerScrollToTop();
        return;
      }

      navigateToTab(name);
    },
    [activeTab, hasUnsavedChanges, navigateToTab],
  );

  const handleConfirmLeave = useCallback(() => {
    if (pendingTab) {
      triggerFormReset();
      clearGuard();
      navigateToTab(pendingTab);
      setPendingTab(null);
    }
  }, [pendingTab, clearGuard, navigateToTab, triggerFormReset]);

  const handleCancelLeave = useCallback(() => {
    setPendingTab(null);
  }, []);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={() => (
          <TabBar activeTab={activeTab} onTabPress={handleTabPress} />
        )}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="create" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen
          name="users/[username]"
          options={{
            href: null, // Hide from tab bar — navigated to programmatically
          }}
        />
      </Tabs>

      {/* Unsaved changes confirmation modal */}
      <AppModal visible={pendingTab !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              ¿Perder los cambios?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?
            </ThemedText>
            <View style={styles.modalButtons}>
              <AppPressable
                onPress={handleCancelLeave}
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelButtonText}>
                  Cancelar
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleConfirmLeave}
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.confirmButtonText}>
                  Salir
                </ThemedText>
              </AppPressable>
            </View>
          </ThemedView>
        </View>
</AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    opacity: 0.7,
  },
  confirmButton: {},
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
