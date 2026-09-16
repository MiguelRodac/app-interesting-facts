import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';
import { useEditFactScreen } from '../hooks/useEditFactScreen';
import { FactFormInputs } from './FactFormInputs';

export function EditFactScreen() {
  const { t } = useTranslation(['create', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  const {
    fact,
    loading,
    isSubmitting,
    hasChanges,
    isValid,
    confirmLeaveVisible,
    setConfirmLeaveVisible,
    editor,
    handleSubmit,
    handleCancel,
    handleConfirmLeave,
    router,
  } = useEditFactScreen();

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="subtitle">
          {t('create:factNotFound', { defaultValue: 'Fact not found' })}
        </ThemedText>
        <AppPressable
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>
            {t('common:back', { defaultValue: 'Go Back' })}
          </ThemedText>
        </AppPressable>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <ThemedView style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <AppPressable
            hitSlop={8}
            onPress={handleCancel}
            style={[styles.iconButton, { borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </AppPressable>
          <ThemedText type="title" style={styles.headerTitle}>
            {t('create:editHeaderTitle', { defaultValue: 'Edit Fact' })}
          </ThemedText>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

            {/* Buttons */}
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
                disabled={isSubmitting || !isValid || !hasChanges}
                hitSlop={6}
                style={[
                  styles.button,
                  styles.submitButton,
                  {
                    backgroundColor: isValid && hasChanges ? theme.primary : theme.muted,
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={styles.submitText}>
                  {isSubmitting
                    ? t('create:savingButton', { defaultValue: 'Saving...' })
                    : t('create:saveButton', { defaultValue: 'Save Changes' })}
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
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 36,
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
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  backButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
