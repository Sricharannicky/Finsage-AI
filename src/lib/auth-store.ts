"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";
import { api, ApiError } from "./api-client";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  // Bumps on every login/logout/profile change. Lets refresh() ignore
  // stale responses that resolve after a newer session already landed.
  generation: number;
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
      generation: 0,
      setUser: (user) => set((s) => ({ user, hydrated: true, generation: s.generation + 1 })),
      setAuth: (user, token) =>
        set((s) => ({ user, token, hydrated: true, generation: s.generation + 1 })),
      setLoading: (loading) => set({ loading }),
      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } catch {
          // ignore
        }
        set((s) => ({ user: null, token: null, generation: s.generation + 1 }));
      },
      refresh: async () => {
        const genAtStart = get().generation;
        const stillCurrent = () => get().generation === genAtStart;
        try {
          const res = await api.get<{ user: AuthUser | null }>("/api/auth/me");
          // A login/logout happened while this request was in flight
          // (e.g. mount-time check resolving after Google exchange):
          // never let the stale response touch the fresh session.
          if (!stillCurrent()) return;
          if (res?.user) {
            set({ user: res.user, hydrated: true });
          } else if (!get().user) {
            set({ user: null, token: null, hydrated: true });
          } else {
            set({ hydrated: true });
          }
        } catch (err) {
          if (!stillCurrent()) return;
          // Network unreachable (status 0): keep the persisted session and
          // let the user retry instead of bouncing to login in a loop.
          if (err instanceof ApiError && err.status === 0) {
            set({ hydrated: true });
            return;
          }
          // Stale/invalid token (e.g. JWT secret rotated or user deleted):
          // drop the persisted session so the user lands on login
          // instead of a stuck "session expired" dashboard.
          if (err instanceof ApiError && err.status === 401) {
            set({ user: null, token: null, hydrated: true });
          } else if (!get().user) {
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
