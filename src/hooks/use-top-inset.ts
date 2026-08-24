import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Top padding for custom headers — keeps content below the status bar and
 * notch on Android/iOS while keeping a lighter padding on web (where
 * insets.top is 0 and 64px is overkill).
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    return Spacing.three;
  }

  return Math.max(Spacing.six, insets.top + Spacing.three);
}