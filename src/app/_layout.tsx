import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as ExpoThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { Toast } from '@/components/Toast';
import { useAuthStore } from '@/data/stores/authStore';
import { Colors } from '@/constants/theme';
import { ThemeProvider, useThemeContext } from '@/hooks/theme-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { colorScheme } = useThemeContext();
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);

  // Hydrate auth state on mount
  useEffect(() => {
    hydrate()
      .catch(() => {
        // Non-fatal — user stays unauthenticated
      })
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  // Only redirect AUTHENTICATED users away from auth screens
  // Don't redirect unauthenticated users from protected routes —
  // let each screen handle its own auth requirements
  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === 'auth';

    // Authenticated user on auth screen → go to feed
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, ready, router]);

  // Show nothing until ready (splash screen)
  if (!ready) {
    return null;
  }

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ExpoThemeProvider value={theme}>
      <View style={styles.root}>
        <ErrorBanner />
        <Toast />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].background,
            },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="(tabs)"
            options={{
              // Don't show as a modal when redirected from tabs
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="auth/register"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="fact/[id]"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </View>
    </ExpoThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
