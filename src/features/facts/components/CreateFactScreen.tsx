import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { AppPressable } from '@/shared/ui/app-pressable';
import { BottomTabInset, Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useCreateFactScreen } from '../hooks/useCreateFactScreen';
import { FactFormInputs } from './FactFormInputs';

export function CreateFactScreen() {
  const { t } = useTranslation(['create', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();

  const {
    editor,
    isSubmitting,
    isLoading,
    isValid,
    confirmLeaveVisible,
    setConfirmLeaveVisible,
    handleSubmit,
    handleCancel,
    handleConfirmLeave,
  } = useCreateFactScreen();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <ThemedView style={[styles.container, { paddingTop: topInset }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">{t('create:headerTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('create:headerSubtitle')}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <FactFormInputs
              title={editor.title}
              onChangeTitle={editor.setTitle}
              content={editor.content}
              isSubmitting={isSubmitting}
              contentInputRef={editor.contentInputRef}
              showEmojiPicker={editor.showEmojiPicker}
              onToggleEmojiPicker={() => editor.setShowEmojiPicker((v) => !v)}
              onCloseEmojiPicker={() => {
                editor.setShowEmojiPicker(false);
                requestAnimationFrame(() => editor.contentInputRef.current?.focus());
              }}
              onEmojiSelected={editor.handleEmojiSelected}
              showMentions={editor.showMentions}
              isSearchingMentions={editor.isSearchingMentions}
              mentionResults={editor.mentionResults}
              selectedMentionIndex={editor.selectedMentionIndex}
              onSelectMention={editor.handleSelectMention}
              onSelectMentionIndex={editor.setSelectedMentionIndex}
              showHashtags={editor.showHashtags}
              isSearchingHashtags={editor.isSearchingHashtags}
              hashtagResults={editor.hashtagResults}
              selectedHashtagIndex={editor.selectedHashtagIndex}
              onSelectHashtag={editor.handleSelectHashtag}
              onSelectHashtagIndex={editor.setSelectedHashtagIndex}
              onContentChange={editor.handleContentChange}
              onSelectionChange={editor.handleSelectionChange}
              onContentBlur={editor.handleContentBlur}
            />

            <View style={styles.buttons}>
              <AppPressable
                onPress={handleCancel}
                disabled={isSubmitting}
                hitSlop={6}
                style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelText}>
                  {t('common:cancel')}
                </ThemedText>
              </AppPressable>
              <AppPressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                hitSlop={6}
                style={[
                  styles.button,
                  styles.submitButton,
                  {
                    backgroundColor: isValid ? theme.primary : theme.muted,
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={styles.submitText}>
                  {isSubmitting ? t('create:submittingButton') : t('create:submitButton')}
                </ThemedText>
              </AppPressable>
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      <ConfirmDialog
        visible={confirmLeaveVisible}
        title={t('create:leaveConfirmTitle')}
        message={t('create:leaveConfirmMessage')}
        confirmLabel={t('create:leaveConfirmExit')}
        cancelLabel={t('create:leaveConfirmStay')}
        destructive
        onConfirm={handleConfirmLeave}
        onCancel={() => setConfirmLeaveVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three + 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    opacity: 0.7,
  },
  submitButton: {},
  submitText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
