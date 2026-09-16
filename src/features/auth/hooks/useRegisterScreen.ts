import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from './useAuth';
import { getIdToken } from '../services/firebaseAuth';
import { createApiClient } from '@/shared/api/client';
import { useTheme } from '@/shared/hooks/use-theme';
import {
  isValidEmail,
  isValidUsername,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/utils/validation';
import type { ApiUsernameCheck } from '@/shared/api/types';

const client = createApiClient(getIdToken);

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function useRegisterScreen() {
  const { t } = useTranslation(['auth', 'profile', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const { register } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    if (!isValidUsername(value)) {
      setUsernameStatus('invalid');
      setUsernameError(t('auth:invalidUsername'));
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    try {
      const response = await client.get<ApiUsernameCheck>('/users/check-username', {
        username: value.trim(),
      });
      if (response.available) {
        setUsernameStatus('available');
        setUsernameError(null);
      } else {
        setUsernameStatus('taken');
        setUsernameError(t('auth:usernameTaken'));
      }
    } catch {
      setUsernameStatus('idle');
      setUsernameError(null);
    }
  }, [t]);

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    if (!isValidUsername(value)) {
      setUsernameStatus('invalid');
      setUsernameError(t('auth:invalidUsername'));
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);
    debounceRef.current = setTimeout(() => {
      checkUsername(value);
    }, 500);
  }, [checkUsername, t]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isValid =
    isValidEmail(email) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    displayName.trim().length > 0 &&
    displayName.trim().length <= MAX_DISPLAY_NAME_LENGTH &&
    isValidUsername(username) &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'checking';

  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim(),
      });
      router.replace('/(tabs)');
    } catch {
      // Error handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    router.push('/auth/login');
  };

  const getUsernameBorderColor = () => {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return theme.destructive;
    if (usernameStatus === 'available') return theme.success;
    return theme.border;
  };

  const getUsernameHelperText = () => {
    if (usernameStatus === 'checking') return null;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return usernameError;
    if (usernameStatus === 'available') return t('auth:usernameAvailable');
    return null;
  };

  const helperText = getUsernameHelperText();
  const helperColor = usernameStatus === 'available' ? theme.success : theme.destructive;

  return {
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
  };
}
