import { create } from 'zustand';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth';
import { setAccessToken } from '../api/client';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<{ requiresTwoFactor?: boolean }>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (payload) => {
    const { data } = await authApi.login(payload);
    const result = data.data || data;
    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }
    setAccessToken(result.accessToken);
    set({ user: result.user, isAuthenticated: true });
    return {};
  },

  register: async (payload) => {
    const { data } = await authApi.register(payload);
    const result = data.data || data;
    setAccessToken(result.accessToken);
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false });
    }
  },

  refreshToken: async () => {
    try {
      const { data } = await authApi.refresh();
      const result = data.data || data;
      setAccessToken(result.accessToken);
      set({ user: result.user, isAuthenticated: true });
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.me();
      const user = data.data || data;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
