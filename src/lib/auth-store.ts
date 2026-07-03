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
      setUser: (user) => set({ user, hydrated: true }),
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
        // Don't override user if it was just set by login
        // Only set user from server response if we don't already have one
        // or if the server says we have no session
        try {
          const res = await api.get<{ user: AuthUser | null }>("/api/auth/me");
          if (res?.user) {
            set({ user: res.user, hydrated: true });
          } else if (!get().user) {
            // Only clear user if we don't already have one (from login)
            set({ user: null, hydrated: true });
          } else {
            // We have a user from login but server says no session
            // Keep the user — the cookie might just not be set yet
            set({ hydrated: true });
          }
        } catch {
          // Only clear on error if we don't have a user
          if (!get().user) {
            set({ user: null, hydrated: true });
          } else {
            set({ hydrated: true });
          }
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
