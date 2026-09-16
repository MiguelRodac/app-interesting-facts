import { StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { UsernameStatus } from '../hooks/useRegisterScreen';

export interface RegisterUsernameFieldProps {
  username: string;
  onChangeUsername: (value: string) => void;
  status: UsernameStatus;
  borderColor: string;
  helperText: string | null;
  helperColor: string;
  isSubmitting: boolean;
}

export function RegisterUsernameField({
  username,
  onChangeUsername,
  status,
  borderColor,
  helperText,
  helperColor,
  isSubmitting,
}: RegisterUsernameFieldProps) {
  const { t } = useTranslation('auth');
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('username')}
      </ThemedText>
      <View
        style={[
          styles.usernameInputShell,
          {
            backgroundColor: theme.backgroundElement,
            borderColor,
          },
        ]}>
        <ThemedText type="smallBold" style={[styles.usernamePrefix, { color: theme.text }]}>
          @
        </ThemedText>
        <TextInput
          style={[styles.usernameField, { color: theme.text }]}
          placeholder={t('usernamePlaceholder')}
          placeholderTextColor={theme.muted}
          value={username}
          onChangeText={onChangeUsername}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
        />
        {status === 'checking' && (
          <ActivityIndicator size="small" color={theme.primary} style={styles.usernameIndicator} />
        )}
        {status === 'available' && (
          <Ionicons name="checkmark-circle" size={20} color={theme.success} style={styles.usernameIndicator} />
        )}
        {status === 'taken' && (
          <Ionicons name="close-circle" size={20} color={theme.destructive} style={styles.usernameIndicator} />
        )}
        {status === 'invalid' && (
          <Ionicons name="close-circle" size={20} color={theme.destructive} style={styles.usernameIndicator} />
        )}
      </View>
      {helperText && (
        <ThemedText type="small" style={{ color: helperColor }}>
          {helperText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  usernameInputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  usernamePrefix: {
    paddingLeft: Spacing.three,
    fontSize: 16,
    lineHeight: 20,
  },
  usernameField: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  usernameIndicator: {
    position: 'absolute',
    right: Spacing.three,
  },
});
