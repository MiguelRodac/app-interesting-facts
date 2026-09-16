import { useState, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getPasswordStrength,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/utils/validation';

interface PasswordFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** Show the strength meter below the input (used on register) */
  showStrength?: boolean;
  /** Field label, defaults to localized "Password" */
  label?: string;
}

const STRENGTH_COLORS = ['#E53935', '#E53935', '#FB8C00', '#43A047', '#2E7D32', '#2E7D32'];

export function PasswordField({
  value,
  onChangeText,
  placeholder,
  editable = true,
  showStrength = false,
  label,
}: PasswordFieldProps) {
  const { t } = useTranslation(['auth', 'common']);
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const tooShort = value.length > 0 && value.length < MIN_PASSWORD_LENGTH;
  const tooLong = value.length > MAX_PASSWORD_LENGTH;
  const invalid = tooShort || tooLong;
  const strength = getPasswordStrength(value);
  const borderColor = invalid ? theme.destructive : theme.border;

  const strengthLabels = useMemo(
    () => [
      t('auth:strengthWeak'),
      t('auth:strengthWeak'),
      t('auth:strengthFair'),
      t('auth:strengthGood'),
      t('auth:strengthStrong'),
      t('auth:strengthStrong'),
    ],
    [t],
  );

  const displayLabel = label ?? t('auth:password');

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {displayLabel}
      </ThemedText>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderColor,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          value={value}
          onChangeText={onChangeText}
          maxLength={MAX_PASSWORD_LENGTH}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <AppPressable
          onPress={() => setShowPassword((current) => !current)}
          hitSlop={8}
          style={styles.eyeButton}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={theme.muted}
          />
        </AppPressable>
      </View>
      {tooShort && (
        <ThemedText type="small" style={{ color: theme.destructive }}>
          {t('auth:passwordLengthError')}
        </ThemedText>
      )}
      {showStrength && value.length > 0 && (
        <View style={styles.strengthRow}>
          {strengthLabels.map((_, index) => (
            <View
              key={index}
              style={[
                styles.strengthSegment,
                {
                  backgroundColor: index < strength ? STRENGTH_COLORS[strength] : theme.backgroundSelected,
                },
              ]}
            />
          ))}
          <ThemedText type="small" style={{ color: STRENGTH_COLORS[strength] }}>
            {strengthLabels[strength]}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.six - Spacing.one,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.three,
    padding: Spacing.one,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radii.full,
  },
});