// Global Jest setup for Expo / React Native
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/shared/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', languageTag: 'es-ES' }],
}));

jest.mock('expo-router', () => ({
  useSegments: jest.fn(() => ['(tabs)']),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue ?? key,
    i18n: {
      language: 'es',
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  firebaseSignOut: jest.fn(),
  onAuthStateChanged: jest.fn((_, callback) => {
    callback(null);
    return jest.fn();
  }),
  sendPasswordResetEmail: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
  updatePassword: jest.fn(),
  verifyBeforeUpdateEmail: jest.fn(),
  applyActionCode: jest.fn(),
  checkActionCode: jest.fn(),
  confirmPasswordReset: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
}));
