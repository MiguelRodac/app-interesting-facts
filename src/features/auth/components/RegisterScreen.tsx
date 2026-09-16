import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { PasswordField } from './PasswordField';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';
import { LanguageToggle } from '@/shared/ui/LanguageToggle';
import { MAX_DISPLAY_NAME_LENGTH } from '@/utils/validation';
import { useRegisterScreen } from '../hooks/useRegisterScreen';
import { RegisterUsernameField } from './RegisterUsernameField';

export function RegisterScreen() {
  const { t } = useTranslation(['auth', 'profile', 'common']);
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  const {
    email,
    setEmail,
    password,
    setPassword,
    username,
    displayName,
    setDisplayName,
    isSubmitting,
    usernameStatus,
    isValid,
    emailInvalid,
    helperText,
    helperColor,
    handleUsernameChange,
    handleSubmit,
    goToLogin,
    getUsernameBorderColor,
  } = useRegisterScreen();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: topInset + Spacing.three,
              paddingBottom: Math.max(Spacing.six, bottomInset + Spacing.four),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <AppPressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              style={styles.closeButton}
              hitSlop={8}>
              <Ionicons name="close" size={28} color={theme.text} />
            </AppPressable>
            <LanguageToggle />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title">{t('auth:createAccountTitle')}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              {t('auth:joinCommunity')}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('profile:displayName')}
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
                placeholder={t('profile:displayNamePlaceholder')}
                placeholderTextColor={theme.muted}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <RegisterUsernameField
              username={username}
              onChangeUsername={handleUsernameChange}
              status={usernameStatus}
              borderColor={getUsernameBorderColor()}
              helperText={helperText}
              helperColor={helperColor}
              isSubmitting={isSubmitting}
            />

            <View style={styles.field}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('auth:email')}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: emailInvalid ? theme.destructive : theme.border,
                  },
                ]}
                placeholder={t('auth:emailPlaceholder')}
                placeholderTextColor={theme.muted}
                value={email}
                onChangeText={setEmail}
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {emailInvalid && (
                <ThemedText type="small" style={{ color: theme.destructive }}>
                  {t('auth:invalidEmail')}
                </ThemedText>
              )}
            </View>

            <PasswordField
              value={password}
              onChangeText={setPassword}
              label={t('auth:password')}
              placeholder={t('auth:passwordPlaceholder')}
              editable={!isSubmitting}
              showStrength
            />

            <AppPressable
              onPress={isValid && !isSubmitting ? handleSubmit : undefined}
              style={[
                styles.submitButton,
                {
                  backgroundColor: isValid ? theme.primary : theme.muted,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.submitText}>
                {isSubmitting ? t('auth:creatingAccount') : t('auth:createAccountTitle')}
              </ThemedText>
            </AppPressable>

            <AppPressable onPress={goToLogin} style={styles.linkButton}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('auth:hasAccountPrompt')}{' '}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {t('auth:signInLink')}
              </ThemedText>
            </AppPressable>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  closeButton: {
    padding: Spacing.one,
  },
  header: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitText: {
    color: '#FFFFFF',
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
