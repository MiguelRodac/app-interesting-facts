import { useAuthStore } from '@/features/auth/stores/authStore';
import * as authService from '@/features/auth/services/authService';
import type { Author } from '@/types';

jest.mock('@/features/auth/services/authService', () => ({
  login: jest.fn(),
  registerNewUser: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  initLocalAuth: jest.fn(),
  syncProfile: jest.fn().mockResolvedValue(null),
}));

describe('useAuthStore', () => {
  const mockUser: Author = {
    id: 'usr_1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarColor: '#ff0000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('hydrates user immediately from local auth without blocking', async () => {
    (authService.initLocalAuth as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
      hasSession: true,
    });

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
    expect(authService.syncProfile).toHaveBeenCalled();
  });

  it('sets unauthenticated state when initLocalAuth has no session', async () => {
    (authService.initLocalAuth as jest.Mock).mockResolvedValueOnce({
      user: null,
      hasSession: false,
    });

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
