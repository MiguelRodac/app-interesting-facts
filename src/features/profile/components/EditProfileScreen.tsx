import { StyleSheet, View, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AvatarPickerModal } from './AvatarPickerModal';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';
import { useEditProfileScreen } from '../hooks/useEditProfileScreen';
import { EditProfileAvatarSection } from './EditProfileAvatarSection';
import { EditProfileFields } from './EditProfileFields';
import { EditProfilePasswordSection } from './EditProfilePasswordSection';

export function EditProfileScreen() {
  const { t } = useTranslation(['profile', 'create', 'common']);
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  const {
    user,
    isLoading,
    isSubmitting,
    pendingDisplayName,
    pendingEmail,
    pendingAvatarColor,
    pendingAvatarUrl,
    isEditingName,
    editNameValue,
    setEditNameValue,
    isEditingEmail,
    editEmailValue,
    setEditEmailValue,
    editingFocused,
    setEditingFocused,
    isAvatarModalVisible,
    setIsAvatarModalVisible,
    isPasswordPromptVisible,
    passwordValue,
    setPasswordValue,
    isConfirmingEmail,
    confirmLeaveVisible,
    handleStartEditName,
    handleCancelEditName,
    handleConfirmEditName,
    handleStartEditEmail,
    handleCancelEditEmail,
    handleConfirmEditEmail,
    handleSelectAvatarOption,
    handleSave,
    handleCancel,
    handleConfirmLeave,
    handleCancelLeave,
    handleCancelPasswordPrompt,
    handleConfirmEmailChange,
  } = useEditProfileScreen();

  if (isLoading || !user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset }]}>
          <AppPressable onPress={handleCancel} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </AppPressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            {t('profile:editProfileTitle')}
          </ThemedText>
          <AppPressable onPress={handleSave} hitSlop={8} disabled={isSubmitting}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {isSubmitting ? t('common:saving') : t('common:done')}
            </ThemedText>
          </AppPressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(Spacing.six, bottomInset + Spacing.four) },
          ]}
          keyboardShouldPersistTaps="handled">
          <EditProfileAvatarSection
            displayName={pendingDisplayName}
            avatarColor={pendingAvatarColor}
            avatarUrl={pendingAvatarUrl}
            onPress={() => setIsAvatarModalVisible(true)}
          />

          <EditProfileFields
            username={user.username}
            pendingDisplayName={pendingDisplayName}
            isEditingName={isEditingName}
            editNameValue={editNameValue}
            onChangeEditNameValue={setEditNameValue}
            onStartEditName={handleStartEditName}
            onConfirmEditName={handleConfirmEditName}
            onCancelEditName={handleCancelEditName}
            pendingEmail={pendingEmail}
            isEditingEmail={isEditingEmail}
            editEmailValue={editEmailValue}
            onChangeEditEmailValue={setEditEmailValue}
            onStartEditEmail={handleStartEditEmail}
            onConfirmEditEmail={handleConfirmEditEmail}
            onCancelEditEmail={handleCancelEditEmail}
            editingFocused={editingFocused}
            onFocusInput={() => setEditingFocused(true)}
            onBlurInput={() => setEditingFocused(false)}
            isSubmitting={isSubmitting}
          />

          {isPasswordPromptVisible && (
            <EditProfilePasswordSection
              passwordValue={passwordValue}
              onChangePasswordValue={setPasswordValue}
              isConfirmingEmail={isConfirmingEmail}
              onCancel={handleCancelPasswordPrompt}
              onConfirm={handleConfirmEmailChange}
            />
          )}
        </ScrollView>

        <AvatarPickerModal
          visible={isAvatarModalVisible}
          currentColor={pendingAvatarColor}
          currentAvatarUrl={pendingAvatarUrl}
          onClose={() => setIsAvatarModalVisible(false)}
          onSelectAvatarOption={handleSelectAvatarOption}
        />

        <AppModal visible={confirmLeaveVisible} transparent animationType="fade" onRequestClose={handleCancelLeave}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContent}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {t('create:leaveConfirmTitle')}
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
                {t('create:leaveConfirmMessage')}
              </ThemedText>
              <View style={styles.modalButtons}>
                <AppPressable
                  onPress={handleCancelLeave}
                  style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={styles.cancelModalText}>
                    {t('create:leaveConfirmStay')}
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  onPress={handleConfirmLeave}
                  style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
                  <ThemedText type="smallBold" style={styles.confirmModalText}>
                    {t('create:leaveConfirmExit')}
                  </ThemedText>
                </AppPressable>
              </View>
            </ThemedView>
          </View>
        </AppModal>
      </ThemedView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  backButton: {
    padding: Spacing.one,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalText: {
    color: '#8E8E93',
  },
  confirmModalButton: {},
  confirmModalText: {
    color: '#FFFFFF',
  },
});
