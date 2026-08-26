import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns the on-screen keyboard height, only tracked on Android.
 *
 * With Expo SDK 54+ edge-to-edge, `adjustResize` often stops lifting
 * bottom-anchored elements, so fixed overlays (comment composer, emoji
 * picker) get covered by the keyboard. This hook lets those overlays lift
 * themselves by the keyboard height. On iOS it always returns 0 — the
 * KeyboardAvoidingView with behavior "padding" already handles that case,
 * so applying this too would double-lift.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
