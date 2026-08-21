import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as ExpoThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  // Phone frame only applies to desktop browsers — narrow viewports
  // (real phones opening the web app) render full-screen, edge to edge.
  const { width } = useWindowDimensions();
  const isDesktop = width > 480;

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
  // Public, frame-less web pages (a normal website instead of the phone
  // frame). Both the landing page and the Firebase action-link pages
  // (email verification / password reset) render full-screen on desktop web;
  // everything else renders inside the phone frame.
  const isFramelessWeb =
    Platform.OS === 'web' &&
    (segments[0] === 'landing' || segments[0] === 'verify-email');
  const screenBackground = Colors[colorScheme === 'dark' ? 'dark' : 'light'].background;

  const appStack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: screenBackground },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="landing" />
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
  );

  return (
    <ExpoThemeProvider value={theme}>
      {Platform.OS === 'web' && !isFramelessWeb ? (
        <>
          {/* Web app: on desktop it renders inside a phone-sized frame so it
              always looks like an app; phone-sized viewports are full-screen.
              Native builds ignore this entirely. */}
          <View style={[styles.rootWeb, isDesktop && styles.rootWebDesktop]}>
            <View
              style={[
                styles.phoneFrame,
                isDesktop && styles.phoneFrameDesktop,
                { backgroundColor: screenBackground },
              ]}>
              <View style={styles.root}>
                <ErrorBanner />
                <Toast />
                {appStack}
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Native app or web landing page — plain full-screen layout */}
          <View style={styles.root}>
            <ErrorBanner />
            <Toast />
            {appStack}
          </View>
        </>
      )}
    </ExpoThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootWeb: {
    flex: 1,
    backgroundColor: '#141518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootWebDesktop: {
    paddingVertical: 24,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
  },
  phoneFrameDesktop: {
    maxWidth: 430,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 0 48px rgba(0, 0, 0, 0.55)',
  },
});
