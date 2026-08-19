/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: '#3c87f7',
    destructive: '#E53935',
    border: '#E0E0E0',
    muted: '#9E9E9E',
    success: '#43A047',
    warning: '#FB8C00',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#5B9DF7',
    destructive: '#EF5350',
    border: '#333333',
    muted: '#757575',
    success: '#66BB6A',
    warning: '#FFA726',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Light-palette alert surfaces — same in light and dark mode for readability. */
export const AlertColors = {
  success: { background: '#D8F3DE', text: '#1B5E20', border: '#81C784', icon: '#2E7D32' },
  warning: { background: '#FFF3E0', text: '#B25000', border: '#FFCC80', icon: '#E65100' },
  info: { background: '#DDEBFF', text: '#0D47A1', border: '#8FC3F8', icon: '#1565C0' },
  error: { background: '#FDE7EC', text: '#B71C1C', border: '#EF9A9A', icon: '#C62828' },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    elevation: 1,
  },
  md: {
    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
    elevation: 3,
  },
  lg: {
    boxShadow: '0 4px 8px rgba(0,0,0,0.16)',
    elevation: 6,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
