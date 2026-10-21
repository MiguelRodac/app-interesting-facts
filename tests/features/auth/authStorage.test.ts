import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStoredAuthor,
  setStoredAuthor,
  clearStoredAuthor,
} from '@/features/auth/services/authStorage';
import type { Author } from '@/types';

describe('authStorage', () => {
  const mockAuthor: Author = {
    id: 'user_123',
    username: 'rodac',
    displayName: 'Rodac Developer',
    avatarUrl: 'https://example.com/avatar.png',
    avatarColor: '#123456',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no author is stored', async () => {
    const author = await getStoredAuthor();
    expect(author).toBeNull();
  });

  it('stores and retrieves author correctly', async () => {
    await setStoredAuthor(mockAuthor);
    const author = await getStoredAuthor();
    expect(author).toEqual(mockAuthor);
  });

  it('clears stored author correctly', async () => {
    await setStoredAuthor(mockAuthor);
    await clearStoredAuthor();
    const author = await getStoredAuthor();
    expect(author).toBeNull();
  });
});
