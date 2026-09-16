import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface EditProfilePasswordSectionProps {
  passwordValue: string;
  onChangePasswordValue: (val: string) => void;
  isConfirmingEmail: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function EditProfilePasswordSection({
  passwordValue,
  onChangePasswordValue,
  isConfirmingEmail,
  onCancel,
  onConfirm,
}: EditProfilePasswordSectionProps) {
  const { t } = useTranslation(['profile', 'auth', 'common']);
  const theme = useTheme();

  return (
    <View style={styles.passwordSection}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.fieldLabel}>
        {t('profile:confirmEmailTitle')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('profile:confirmEmailSubtitle')}
      </ThemedText>
      <PasswordField
        value={passwordValue}
        onChangeText={onChangePasswordValue}
        label={t('auth:currentPassword')}
        placeholder={t('auth:passwordPlaceholder')}
        editable={!isConfirmingEmail}
      />
      <View style={styles.passwordButtons}>
        <AppPressable
          style={[styles.passwordButton, styles.passwordCancelButton, { borderColor: theme.border }]}
          onPress={onCancel}
          disabled={isConfirmingEmail}>
          <ThemedText type="smallBold" style={styles.passwordCancelText}>
            {t('common:cancel')}
          </ThemedText>
        </AppPressable>
        <AppPressable
          style={[
            styles.passwordButton,
            styles.passwordConfirmButton,
            { backgroundColor: isConfirmingEmail || passwordValue.length === 0 ? theme.muted : theme.primary },
          ]}
          onPress={onConfirm}
          disabled={isConfirmingEmail || passwordValue.length === 0}>
          <ThemedText type="smallBold" style={styles.passwordConfirmText}>
            {isConfirmingEmail ? t('common:confirming') : t('common:confirm')}
          </ThemedText>
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  fieldLabel: {
    marginBottom: Spacing.half,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  passwordButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCancelButton: {
    borderWidth: 1,
  },
  passwordCancelText: {
    color: '#8E8E93',
  },
  passwordConfirmButton: {},
  passwordConfirmText: {
    color: '#FFFFFF',
  },
});
