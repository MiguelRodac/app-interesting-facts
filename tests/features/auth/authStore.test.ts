import { useAuthStore } from '@/features/auth/stores/authStore';
import type { Author } from '@/types';

describe('useAuthStore', () => {
  const mockUser: Author = {
    id: 'usr_1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarColor: '#ff0000',
  };

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('starts with unauthenticated initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updates state when setAuth is called', () => {
    useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('mock-jwt-token');
  });

  it('clears credentials when clearAuth is called', () => {
    useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
