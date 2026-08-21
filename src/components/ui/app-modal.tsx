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
 * inline absolute overlay on web. Uses position:absolute (not fixed) so
 * the overlay stays INSIDE the phone frame on desktop web and doesn't
 * escape the iframe.
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
    return <View style={styles.webOverlay}>{children}</View>;
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

const styles = StyleSheet.create({
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
