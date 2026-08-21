import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
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
      '🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒',
      '🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇',
      '🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞',
    ],
  },
  food: {
    label: 'Food',
    icon: '🍔',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
      '🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🥔',
      '🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄',
      '🍔','🍕','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘',
      '🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘',
      '🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥',
      '🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🍩',
      '🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','☕',
    ],
  },
  activities: {
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
      '🪀','🏓','🏸','🏒','🥍','🏏','🪃','🥅','⛳','🪁',
      '🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️',
      '🥌','🎿','🎯','🪀','🪁','🎮','🕹️','🎲','🧩','🎭',
    ],
  },
  travel: {
    label: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '🛻','🚚','🚛','🚜','🛵','🏍️','🛺','🚲','🛴','🛹',
      '🛼','🚁','✈️','🛩️','🚀','🛸','🚢','⛵','🛶','🚤',
      '🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️',
    ],
  },
  objects: {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾',
      '💿','📀','🎥','📷','📹','📺','📻','🎙️','🎚️','🎛️',
      '💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶',
      '💷','🪙','💰','💳','🧾','💎','⚖️','🔧','🔨','⚒️',
      '🛠️','⛏️','🪚','🔩','⚙️','🪤','🧰','🪛','🔗','📎',
    ],
  },
  symbols: {
    label: 'Symbols',
    icon: '⭐',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
      '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐',
      '⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳',
      '🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️',
      '㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️',
      '🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️',
      '🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓',
      '❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️',
      '🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠',
      'Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️',
      '🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮',
      '🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗',
      '🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣',
      '6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️',
      '⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬',
      '◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️',
      '↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂',
      '🔄','🔃','🎵','🎶','➕','➖','➗','✖️','🟰','♾️',
      '💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙',
      '🔛','🔝','🔜','✔️','☑️','🔘','🔴','🟠','🟡','🟢',
      '🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶',
      '🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥',
      '🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇',
      '🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯️','♠️',
      '♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓',
      '🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛',
    ],
  },
};

const CATEGORIES = Object.keys(EMOJI_DATA);

interface EmojiPickerPopoverProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
}

/**
 * Cross-platform emoji picker — flat grid with search, no DOM dependencies.
 */
export function EmojiPickerPopover({ visible, onClose, onEmojiSelected }: EmojiPickerPopoverProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const emojis = useMemo(() => {
    if (query.trim()) {
      // Show all emojis from every category when searching
      return CATEGORIES.flatMap((c) => EMOJI_DATA[c].emojis);
    }
    return EMOJI_DATA[activeCategory]?.emojis ?? [];
  }, [query, activeCategory]);

  if (!visible) return null;

  return (
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

      {/* Category tabs — emoji icon + label */}
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

      {/* Emoji grid — 7 columns, bigger cells */}
      <FlatList
        data={emojis}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        numColumns={7}
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AppPressable
            onPress={() => onEmojiSelected(item)}
            style={[styles.emojiCell, { backgroundColor: 'transparent' }]}>
            <ThemedText style={styles.emoji}>{item}</ThemedText>
          </AppPressable>
        )}
      />
    </View>
  );
}

/**
 * Emoji toggle button — place next to a TextInput.
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

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  popover: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 340,
    marginBottom: Spacing.one,
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
    width: CELL_SIZE,
    height: CELL_SIZE,
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
