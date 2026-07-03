"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";
import { api } from "./api-client";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setAuth: (user: AuthUser, token: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      hydrated: false,
      setUser: (user) => set({ user, hydrated: true }),
      setAuth: (user, token) => set({ user, token, hydrated: true }),
      setLoading: (loading) => set({ loading }),
      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } catch {
          // ignore
        }
        set({ user: null, token: null });
      },
      refresh: async () => {
        try {
          const res = await api.get<{ user: AuthUser | null }>("/api/auth/me");
          if (res?.user) {
            set({ user: res.user, hydrated: true });
          } else if (!get().user) {
            set({ user: null, token: null, hydrated: true });
          } else {
            set({ hydrated: true });
          }
        } catch {
          if (!get().user) {
            set({ user: null, token: null, hydrated: true });
          } else {
            set({ hydrated: true });
          }
        }
      },
    }),
    {
      name: "finsage-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
