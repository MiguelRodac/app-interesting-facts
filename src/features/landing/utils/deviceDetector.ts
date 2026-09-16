import { Platform } from 'react-native';

export type DeviceType = 'ios' | 'android' | 'desktop';

export function getInitialDeviceType(): DeviceType {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIpad =
    /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (/iphone|ipod|ipad/i.test(ua) || isIpad) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
