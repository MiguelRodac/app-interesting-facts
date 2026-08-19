import { forwardRef } from 'react';
import { Pressable as NativePressable, type PressableProps } from 'react-native';

/**
 * App-wide Pressable: on web it renders with role=button (real interactive
 * element: keyboard focus + activation) instead of a plain <div>, and every
 * touch target gets a default hitSlop so taps are easier.
 */
export const AppPressable = forwardRef<React.ComponentRef<typeof NativePressable>, PressableProps>(
  function AppPressable({ accessibilityRole = 'button', hitSlop = 4, ...rest }, ref) {
    return (
      <NativePressable ref={ref} accessibilityRole={accessibilityRole} hitSlop={hitSlop} {...rest} />
    );
  },
);