import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { AppPressable } from '@/shared/ui/app-pressable';
import { MentionDropdown } from '@/shared/ui/MentionDropdown';
import { Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/shared/hooks/use-keyboard-height';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/shared/hooks/use-theme';
import { EmojiPicker, EmojiButton } from '@/shared/ui/EmojiPicker';
import {
  useCommentComposer,
  COMMENT_MIN_LENGTH,
  COMMENT_MAX_LENGTH,
  INITIAL_LINE_HEIGHT,
  MAX_HEIGHT,
} from '../hooks/useCommentComposer';
import { CommentReplyBanner, type ReplyTarget } from './CommentReplyBanner';

export { COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH, type ReplyTarget };

export interface CommentComposerProps {
  factId?: string;
  repostEntryId?: string;
  commentId?: string;
  mode?: 'create' | 'edit';
  initialValue?: string;
  replyTo?: ReplyTarget | null;
  onDone?: () => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onPendingTextChange?: (hasPendingText: boolean) => void;
}

export function CommentComposer(props: CommentComposerProps) {
  const { mode = 'create', replyTo = null } = props;
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { user } = useAuth();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = mode === 'edit';

  const {
    content,
    isSubmitting,
    inputHeight,
    focused,
    showEmojiPicker,
    setShowEmojiPicker,
    inputRef,
    showMentions,
    isSearchingMentions,
    mentionResults,
    selectedMentionIndex,
    setSelectedMentionIndex,
    canSubmit,
    postLabel,
    handleContentSizeChange,
    handleFocus,
    handleContentChange,
    handleSelectionChange,
    handleContentBlur,
    handleSelectMention,
    handleSubmit,
    handleCancelEdit,
    handleCancelReply,
    handleEmojiPress,
    handleEmojiSelected,
  } = useCommentComposer(props);

  const avatarUser = user
    ? {
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl,
      }
    : { displayName: 'User' };

  return (
    <>
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelected}
      />
      <View
        style={[
          styles.wrap,
          { borderTopColor: theme.border, backgroundColor: theme.background },
          Platform.OS === 'ios' && keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}>
        {replyTo ? (
          <CommentReplyBanner replyTo={replyTo} onCancelReply={handleCancelReply} />
        ) : null}

        <View style={styles.row}>
          <UserAvatar user={avatarUser} size={32} />
          <View style={styles.inputCol}>
            <View
              style={[
                styles.inputUnderline,
                { borderBottomColor: focused ? theme.primary : theme.border },
              ]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { color: theme.text, height: !content ? INITIAL_LINE_HEIGHT : inputHeight },
                ]}
                placeholder={isEdit ? t('editCommentPlaceholder') : t('addCommentPlaceholder')}
                placeholderTextColor={theme.muted}
                value={content}
                onChangeText={handleContentChange}
                onSelectionChange={handleSelectionChange}
                onFocus={handleFocus}
                onBlur={handleContentBlur}
                onContentSizeChange={handleContentSizeChange}
                multiline
                scrollEnabled={inputHeight >= MAX_HEIGHT}
                textAlignVertical="top"
                editable={!isSubmitting}
                autoFocus={isEdit || !!replyTo}
              />
            </View>

            <MentionDropdown
              visible={showMentions}
              loading={isSearchingMentions}
              results={mentionResults}
              selectedIndex={selectedMentionIndex}
              onSelect={handleSelectMention}
              onSelectIndex={setSelectedMentionIndex}
            />
          </View>

          <View style={styles.actions}>
            {isEdit ? (
              <AppPressable onPress={handleCancelEdit} disabled={isSubmitting} hitSlop={6} style={styles.textButton}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cancelText}>
                  {t('cancel')}
                </ThemedText>
              </AppPressable>
            ) : null}
            <View style={styles.actionsSpacer} />
            <EmojiButton onPress={handleEmojiPress} active={showEmojiPicker} />
            <AppPressable
              onPress={canSubmit ? handleSubmit : undefined}
              disabled={!canSubmit}
              hitSlop={6}
              style={styles.textButton}>
              {isSubmitting ? (
                <ThemedText type="smallBold" themeColor="muted" style={styles.postText}>
                  ...
                </ThemedText>
              ) : (
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.postText,
                    { color: canSubmit ? theme.primary : theme.muted },
                  ]}>
                  {postLabel}
                </ThemedText>
              )}
            </AppPressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inputCol: {
    flex: 1,
    position: 'relative',
  },
  inputUnderline: {
    borderBottomWidth: 1.5,
    paddingBottom: Spacing.half,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: Spacing.one,
    paddingHorizontal: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  textButton: {
    minWidth: 40,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: {
    fontSize: 15,
  },
  cancelText: {
    fontSize: 15,
  },
  actionsSpacer: {
    width: Spacing.one,
  },
});
