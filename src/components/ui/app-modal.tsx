import { Modal as RNModal, Platform, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

interface AppModalProps {
  visible: boolean;
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  onRequestClose?: () => void;
  children: ReactNode;
}

/**
 * Modal wrapper that keeps RN `Modal` in native builds but renders an
 * inline absolute overlay on web. RN Web portals `Modal` to the app root,
 * OUTSIDE the phone frame used on desktop — this wrapper keeps every
 * dialog inside the frame, exactly like the rest of the app UI.
 */
export function AppModal({
  visible,
  transparent,
  animationType,
  onRequestClose,
  children,
}: AppModalProps) {
  if (Platform.OS === 'web') {
    if (!visible) return null;
    return <View style={StyleSheet.absoluteFill}>{children}</View>;
  }

  return (
    <RNModal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}>
      {children}
    </RNModal>
  );
}