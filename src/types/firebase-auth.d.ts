/**
 * Type shim for `getReactNativePersistence`.
 *
 * @firebase/auth only exports it through the "react-native" condition of its
 * package exports — Metro resolves that at build time, but tsc resolves the
 * default (web) typings, which omit the symbol.
 */
import type * as FirebaseAuth from '@firebase/auth';

declare module '@firebase/auth' {
  interface ReactNativeAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  export const getReactNativePersistence: (storage: ReactNativeAsyncStorage) => FirebaseAuth.Persistence;
}