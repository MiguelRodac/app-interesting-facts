import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
      '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺',
      '🔻','💠','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽',
      '◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜',
      '🟫','➕','➖','➗','✖️','❓','❔','❕','❗','〰️',
    ],
  },
  travel: {
    label: 'Travel',
    icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','🛼',
      '🚁','🛸','✈️','🛩️','🛫','🛬','🪂','💺','🚀','🛸',
      '🚉','🚊','🚝','🚞','🚋','🚃','🚆','🚇','🚈','🚂',
    ],
  },
  flags: {
    label: 'Flags',
    icon: '🏁',
    emojis: [
      '🏁','🚩','🎌','🏴','🏳️','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇪🇸',
      '🇮🇹','🇯🇵','🇰🇷','🇧🇷','🇮🇳','🇷🇺','🇨🇳','🇲🇽','🇨🇦','🇦🇺',
      '🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇪🇨','🇻🇪','🇧🇴','🇨🇺','🇵🇦','🇯🇲',
    ],
  },
};

const CATEGORIES = Object.keys(EMOJI_DATA);

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const COLS = 8;
const ROWS_MIN = 5;

interface EmojiPickerPopoverProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
}

export function EmojiPickerPopover({ visible, onClose, onEmojiSelected }: EmojiPickerPopoverProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const emojis = useMemo(() => {
    if (query.trim()) {
      return CATEGORIES.flatMap((c) => EMOJI_DATA[c].emojis);
    }
    return EMOJI_DATA[activeCategory]?.emojis ?? [];
  }, [query, activeCategory]);

  const rows = useMemo(() => {
    const c = chunk(emojis, COLS);
    while (c.length < ROWS_MIN) c.push([]);
    return c;
  }, [emojis]);

  if (!visible) return null;

  return (
    <>
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

        {/* Emoji grid — vertical scroll + horizontal scroll for all rows together */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.grid}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.gridVertical}>
            <View style={styles.gridInner}>
              {rows.map((row, rowIdx) => (
                <View key={`row-${rowIdx}`} style={styles.row}>
                  {row.map((emoji, colIdx) => (
                    <AppPressable
                      key={`${emoji}-${colIdx}`}
                      onPress={() => onEmojiSelected(emoji)}
                      style={styles.emojiCell}>
                      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
                    </AppPressable>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
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
    maxHeight: 340,
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
    maxHeight: 260,
  },
  gridVertical: {
    maxHeight: 260,
  },
  gridInner: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
  },
  emojiCell: {
    width: 44,
    height: 44,
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
