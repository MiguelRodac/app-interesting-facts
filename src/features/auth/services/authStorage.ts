import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Author } from '@/types';

const STORED_AUTHOR_KEY = '@auth/stored_author';

/**
 * Get the cached Author profile from local device storage.
 */
export async function getStoredAuthor(): Promise<Author | null> {
  try {
    const raw = await AsyncStorage.getItem(STORED_AUTHOR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Author;
  } catch {
    return null;
  }
}

/**
 * Cache Author profile in local device storage for instant offline/cold-start restore.
 */
export async function setStoredAuthor(author: Author): Promise<void> {
  try {
    await AsyncStorage.setItem(STORED_AUTHOR_KEY, JSON.stringify(author));
  } catch {
    // Non-fatal
  }
}

/**
 * Clear cached Author profile on logout.
 */
export async function clearStoredAuthor(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORED_AUTHOR_KEY);
  } catch {
    // Non-fatal
  }
}
