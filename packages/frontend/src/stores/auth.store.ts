import { create } from 'zustand';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth';

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
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (payload) => {
    const { data } = await authApi.login(payload);
    const result = data.data || data;
    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }
    // Cookie is set by the backend — fetch user data
    await get().checkAuth();
    return {};
  },

  register: async (payload) => {
    await authApi.register(payload);
    await get().checkAuth();
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
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
