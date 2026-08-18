import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Top padding for custom headers — keeps content below the status bar and
 * notch on Android/iOS while preserving the existing spacing on web
 * (where insets.top is 0).
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(Spacing.six, insets.top + Spacing.three);
}