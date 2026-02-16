import { useAuthStore } from './auth.store';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  setAccessToken: vi.fn(),
}));

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('stores user after setUser', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      isAdmin: false,
      twoFactorEnabled: false,
      createdAt: '2024-01-01T00:00:00Z',
    };

    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears user when setUser is called with null', () => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      isAdmin: false,
      twoFactorEnabled: false,
      createdAt: '2024-01-01T00:00:00Z',
    });

    useAuthStore.getState().setUser(null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
