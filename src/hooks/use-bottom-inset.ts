import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Bottom padding for screens, tab bars, and fixed bottom elements.
 * Keeps content above the Android gesture navigation bar / 3-button bar
 * and the iOS home indicator, while keeping lighter padding on web.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    return Spacing.two;
  }

  return Math.max(Spacing.two, insets.bottom);
}
