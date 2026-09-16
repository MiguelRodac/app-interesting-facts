import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { MAX_DISPLAY_NAME_LENGTH } from '@/utils/validation';

interface EditProfileFieldsProps {
  username: string;
  pendingDisplayName: string;
  isEditingName: boolean;
  editNameValue: string;
  onChangeEditNameValue: (text: string) => void;
  onStartEditName: () => void;
  onConfirmEditName: () => void;
  onCancelEditName: () => void;
  pendingEmail: string;
  isEditingEmail: boolean;
  editEmailValue: string;
  onChangeEditEmailValue: (text: string) => void;
  onStartEditEmail: () => void;
  onConfirmEditEmail: () => void;
  onCancelEditEmail: () => void;
  editingFocused: boolean;
  onFocusInput: () => void;
  onBlurInput: () => void;
  isSubmitting: boolean;
}

export function EditProfileFields({
  username,
  pendingDisplayName,
  isEditingName,
  editNameValue,
  onChangeEditNameValue,
  onStartEditName,
  onConfirmEditName,
  onCancelEditName,
  pendingEmail,
  isEditingEmail,
  editEmailValue,
  onChangeEditEmailValue,
  onStartEditEmail,
  onConfirmEditEmail,
  onCancelEditEmail,
  editingFocused,
  onFocusInput,
  onBlurInput,
  isSubmitting,
}: EditProfileFieldsProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  return (
    <>
      {/* Display name row */}
      <View style={styles.fieldSection}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
          {t('profile:displayName')}
        </ThemedText>
        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderBottomColor: editingFocused ? theme.primary : theme.border,
                },
              ]}
              value={editNameValue}
              onChangeText={onChangeEditNameValue}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              autoFocus
              autoCapitalize="words"
              editable={!isSubmitting}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
            <AppPressable
              onPress={onConfirmEditName}
              style={[styles.iconButton, { backgroundColor: theme.success }]}
              disabled={isSubmitting}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </AppPressable>
            <AppPressable
              onPress={onCancelEditName}
              style={[styles.iconButton, { backgroundColor: theme.muted }]}
              disabled={isSubmitting}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </AppPressable>
          </View>
        ) : (
          <AppPressable onPress={onStartEditName} style={styles.nameDisplayRow}>
            <ThemedText type="default" style={styles.nameDisplayText}>
              {pendingDisplayName}
            </ThemedText>
            <Ionicons name="pencil" size={18} color={theme.muted} />
          </AppPressable>
        )}
      </View>

      {/* Username (read-only) */}
      <View style={styles.fieldSection}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
          {t('profile:username')}
        </ThemedText>
        <View style={styles.readOnlyRow}>
          <ThemedText type="default" themeColor="muted">
            @{username}
          </ThemedText>
        </View>
      </View>

      {/* Email row */}
      <View style={styles.fieldSection}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
          {t('profile:email')}
        </ThemedText>
        {isEditingEmail ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderBottomColor: editingFocused ? theme.primary : theme.border,
                },
              ]}
              value={editEmailValue}
              onChangeText={onChangeEditEmailValue}
              maxLength={254}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSubmitting}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
            <AppPressable
              onPress={onConfirmEditEmail}
              style={[styles.iconButton, { backgroundColor: theme.success }]}
              disabled={isSubmitting}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </AppPressable>
            <AppPressable
              onPress={onCancelEditEmail}
              style={[styles.iconButton, { backgroundColor: theme.muted }]}
              disabled={isSubmitting}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </AppPressable>
          </View>
        ) : (
          <AppPressable onPress={onStartEditEmail} style={styles.nameDisplayRow}>
            <ThemedText type="default" style={styles.nameDisplayText}>
              {pendingEmail}
            </ThemedText>
            <Ionicons name="pencil" size={18} color={theme.muted} />
          </AppPressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fieldSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  fieldLabel: {
    marginBottom: Spacing.half,
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  nameDisplayText: {
    flex: 1,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyRow: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
});
