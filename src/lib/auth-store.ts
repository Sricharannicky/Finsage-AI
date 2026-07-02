"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";
import { api } from "./api-client";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } catch {
          // ignore
        }
        set({ user: null });
      },
      refresh: async () => {
        try {
          const res = await api.get<{ user: AuthUser | null }>("/api/auth/me");
          set({ user: res.user, hydrated: true });
        } catch {
          set({ user: null, hydrated: true });
        }
      },
    }),
    {
      name: "finsage-auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
