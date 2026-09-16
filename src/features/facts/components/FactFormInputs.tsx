import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CharCounter } from '@/shared/ui/CharCounter';
import { EmojiPicker, EmojiButton } from '@/shared/ui/EmojiPicker';
import { MentionDropdown, HashtagDropdown } from '@/shared/ui';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { ApiUserSearchResult, ApiHashtag } from '@/shared/api/types';
import { FACT_MIN_LENGTH, FACT_MAX_LENGTH } from '../hooks/useFactEditor';

interface FactFormInputsProps {
  title: string;
  onChangeTitle: (title: string) => void;
  content: string;
  isSubmitting: boolean;
  contentInputRef: React.RefObject<TextInput | null>;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onCloseEmojiPicker: () => void;
  onEmojiSelected: (emoji: string) => void;
  showMentions: boolean;
  isSearchingMentions: boolean;
  mentionResults: ApiUserSearchResult[];
  selectedMentionIndex: number;
  onSelectMention: (user: ApiUserSearchResult) => void;
  onSelectMentionIndex: (index: number) => void;
  showHashtags: boolean;
  isSearchingHashtags: boolean;
  hashtagResults: ApiHashtag[];
  selectedHashtagIndex: number;
  onSelectHashtag: (hashtag: ApiHashtag) => void;
  onSelectHashtagIndex: (index: number) => void;
  onContentChange: (text: string) => void;
  onSelectionChange: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  onContentBlur: () => void;
}

export function FactFormInputs({
  title,
  onChangeTitle,
  content,
  isSubmitting,
  contentInputRef,
  showEmojiPicker,
  onToggleEmojiPicker,
  onCloseEmojiPicker,
  onEmojiSelected,
  showMentions,
  isSearchingMentions,
  mentionResults,
  selectedMentionIndex,
  onSelectMention,
  onSelectMentionIndex,
  showHashtags,
  isSearchingHashtags,
  hashtagResults,
  selectedHashtagIndex,
  onSelectHashtag,
  onSelectHashtagIndex,
  onContentChange,
  onSelectionChange,
  onContentBlur,
}: FactFormInputsProps) {
  const { t } = useTranslation(['create', 'common']);
  const theme = useTheme();

  return (
    <>
      {/* Title field */}
      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('create:fieldTitle')}
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder={t('create:titlePlaceholder')}
          placeholderTextColor={theme.muted}
          value={title}
          onChangeText={onChangeTitle}
          editable={!isSubmitting}
        />
      </View>

      {/* Content field */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('create:fieldContent')}
          </ThemedText>
          <View style={styles.fieldHeaderRight}>
            <EmojiButton onPress={onToggleEmojiPicker} active={showEmojiPicker} />
            <CharCounter current={content.trim().length} min={FACT_MIN_LENGTH} max={FACT_MAX_LENGTH} />
          </View>
        </View>
        <View style={styles.contentContainer}>
          <TextInput
            ref={contentInputRef}
            style={[
              styles.textarea,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('create:contentPlaceholder')}
            placeholderTextColor={theme.muted}
            value={content}
            onChangeText={onContentChange}
            onSelectionChange={onSelectionChange}
            onBlur={onContentBlur}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />

          <MentionDropdown
            visible={showMentions}
            loading={isSearchingMentions}
            results={mentionResults}
            selectedIndex={selectedMentionIndex}
            onSelect={onSelectMention}
            onSelectIndex={onSelectMentionIndex}
          />

          <HashtagDropdown
            visible={showHashtags}
            loading={isSearchingHashtags}
            results={hashtagResults}
            selectedIndex={selectedHashtagIndex}
            onSelect={onSelectHashtag}
            onSelectIndex={onSelectHashtagIndex}
          />
        </View>
      </View>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={onCloseEmojiPicker}
        onSelect={onEmojiSelected}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
    position: 'relative',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  contentContainer: {
    position: 'relative',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 120,
  },
});
