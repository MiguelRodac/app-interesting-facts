import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EmojiPickerPopoverProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
}

/**
 * Inline emoji picker popover that renders directly in the component tree
 * (above the input). Designed to sit just above the TextInput, not as a modal.
 */
export function EmojiPickerPopover({ visible, onClose, onEmojiSelected }: EmojiPickerPopoverProps) {
  const theme = useTheme();

  if (!visible) return null;

  const handleSelect = (emojiData: { native: string }) => {
    onEmojiSelected(emojiData.native);
    onClose();
  };

  return (
    <View style={[styles.popover, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme="dark"
        previewPosition="none"
        maxFrequentRows={2}
        perLine={8}
        skinTonePosition="search"
      />
    </View>
  );
}

/**
 * Emoji toggle button — place this next to the TextInput.
 */
export function EmojiButton({ onPress, active }: { onPress: () => void; active?: boolean }) {
  const theme = useTheme();
  return (
    <AppPressable onPress={onPress} hitSlop={8} style={styles.emojiBtn}>
      <Ionicons
        name={active ? 'happy' : 'happy-outline'}
        size={22}
        color={active ? theme.primary : theme.muted}
      />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  popover: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 320,
    marginBottom: Spacing.one,
  },
  emojiBtn: {
    padding: Spacing.one,
  },
});
