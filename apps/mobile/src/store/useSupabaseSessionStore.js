import { create } from "zustand";

export const useSupabaseSessionStore = create((set) => ({
  isReady: false,
  session: null,
  user: null,
  setSession: (session) =>
    set({
      isReady: true,
      session: session ?? null,
      user: session?.user ?? null,
    }),
}));
