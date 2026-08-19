import { useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getPasswordStrength,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_ERROR_MESSAGE,
  PASSWORD_STRENGTH_LABELS,
} from '@/utils/validation';

interface PasswordFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** Show the strength meter below the input (used on register) */
  showStrength?: boolean;
  /** Field label, defaults to "Password" */
  label?: string;
}

const STRENGTH_COLORS = ['#E53935', '#E53935', '#FB8C00', '#43A047', '#2E7D32', '#2E7D32'];

export function PasswordField({
  value,
  onChangeText,
  placeholder,
  editable = true,
  showStrength = false,
  label = 'Password',
}: PasswordFieldProps) {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const tooShort = value.length > 0 && value.length < MIN_PASSWORD_LENGTH;
  const tooLong = value.length > MAX_PASSWORD_LENGTH;
  const invalid = tooShort || tooLong;
  const strength = getPasswordStrength(value);
  const borderColor = invalid ? theme.destructive : theme.border;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
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
        <Pressable
          onPress={() => setShowPassword((current) => !current)}
          hitSlop={8}
          style={styles.eyeButton}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={theme.muted}
          />
        </Pressable>
      </View>
      {tooShort && (
        <ThemedText type="small" style={{ color: theme.destructive }}>
          {PASSWORD_ERROR_MESSAGE}
        </ThemedText>
      )}
      {showStrength && value.length > 0 && (
        <View style={styles.strengthRow}>
          {PASSWORD_STRENGTH_LABELS.map((_, index) => (
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
            {PASSWORD_STRENGTH_LABELS[strength]}
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