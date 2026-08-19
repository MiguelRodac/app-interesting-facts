/**
 * Landing page config (web only).
 * Set EXPO_PUBLIC_LANDING_ENABLED=true so the landing page is always the
 * home for anonymous web visitors, and EXPO_PUBLIC_APK_URL to the direct
 * APK download link. The APK build is untouched — this only affects the
 * web bundle.
 */
export const LANDING_ENABLED = process.env.EXPO_PUBLIC_LANDING_ENABLED === 'true';

export const APK_URL = process.env.EXPO_PUBLIC_APK_URL ?? null;