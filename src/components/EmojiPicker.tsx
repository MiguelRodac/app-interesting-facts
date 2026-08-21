import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const EMOJI_DATA: Record<string, { label: string; icon: string; emojis: string[] }> = {
  smileys: {
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢',
      '🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥',
      '😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
      '😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯',
      '🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁',
      '😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰',
      '😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
    ],
  },
  gestures: {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫷',
      '🫸','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙',
      '👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊',
      '👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏',
      '💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀',
    ],
  },
  hearts: {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝',
      '💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️',
    ],
  },
  animals: {
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
      '🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊',
      '🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉',
      '🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌',
      '🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢',
    ],
  },
  food: {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧈',
      '🥞','🧇','🥩','🍗','🍖','🦴','🌮','🌯','🫔','🥙',
      '🧆','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣',
      '🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮',
    ],
  },
  objects: {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '💡','🔦','🕯️','🧯','🛢️','💸','💵','💴','💶','💷',
      '🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨',
      '⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲',
      '🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️',
    ],
  },
  symbols: {
    label: 'Symbols',
    icon: '♾️',
    emojis: [
      '♾️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤',
      '🔺','🔻','💠','🔶','🔷','🔳','🔲','▪️','▫️','◾',
      '◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛',
      '⬜','🟫','➕','➖','➗','✖️','🟰','♾️','‼️','⁉️',
      '❓','❔','❕','❗','〰️','〽️','特权','㊗️','㊙️','🈶',
      '🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️',
      '🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘',
      '❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷',
    ],
  },
  travel: {
    label: 'Travel',
    icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','🛼',
      '🚁','🛸','✈️','🛩️','🛫','🛬','🪂','💺','🚀','🛸',
      '🚉','🚊','🚝','🚞','🚋','🚃','🚋','🚆','🚇','🚈',
    ],
  },
  flags: {
    label: 'Flags',
    icon: '🏁',
    emojis: [
      '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧',
      '🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇯🇵','🇰🇷','🇧🇷','🇮🇳','🇷🇺','🇨🇳',
      '🇲🇽','🇨🇦','🇦🇺','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇧🇴',
    ],
  },
};

const CATEGORIES = Object.keys(EMOJI_DATA);

interface EmojiPickerPopoverProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
}

export function EmojiPickerPopover({ visible, onClose, onEmojiSelected }: EmojiPickerPopoverProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const numColumns = width < 350 ? 5 : width < 420 ? 6 : 7;
  const cellSize = width < 350 ? 38 : width < 420 ? 42 : 44;
  const emojiFontSize = width < 350 ? 22 : width < 420 ? 24 : 26;

  const emojis = useMemo(() => {
    if (query.trim()) {
      return CATEGORIES.flatMap((c) => EMOJI_DATA[c].emojis);
    }
    return EMOJI_DATA[activeCategory]?.emojis ?? [];
  }, [query, activeCategory]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop — tap to close */}
      <AppPressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.popover, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {/* Search */}
        <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.muted} style={{ marginLeft: 4 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search emojis..."
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <AppPressable onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </AppPressable>
          )}
        </View>

        {/* Category tabs */}
        {!query.trim() && (
          <View style={[styles.categoryRow, { borderBottomColor: theme.border }]}>
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item: cat }) => {
                const isActive = activeCategory === cat;
                return (
                  <AppPressable
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.categoryTab,
                      isActive && { backgroundColor: theme.primary + '20' },
                    ]}>
                    <ThemedText style={styles.categoryIcon}>{EMOJI_DATA[cat].icon}</ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? theme.primary : theme.muted, marginLeft: 4 }}>
                      {EMOJI_DATA[cat].label}
                    </ThemedText>
                  </AppPressable>
                );
              }}
            />
          </View>
        )}

        {/* Emoji grid */}
        <FlatList
          data={emojis}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          numColumns={numColumns}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AppPressable
              onPress={() => onEmojiSelected(item)}
              style={[styles.emojiCell, { width: cellSize, height: cellSize, backgroundColor: 'transparent' }]}>
              <ThemedText style={[styles.emoji, { fontSize: emojiFontSize }]}>{item}</ThemedText>
          </AppPressable>
          )}
        />
      </View>
    </>
  );
}

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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  popover: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 240,
    marginBottom: Spacing.one,
    borderRadius: Radii.lg,
    borderWidth: 1,
    zIndex: 1000,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  categoryRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryList: {
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.half,
    gap: 2,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingVertical: Spacing.half,
  },
  emojiCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 26,
  },
  emojiBtn: {
    padding: Spacing.one,
  },
});
