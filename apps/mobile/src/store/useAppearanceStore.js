import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";

const STORAGE_KEY = "recall:appearance-preferences";

const DEFAULT_PREFERENCES = {
  theme: "System",
  reduceMotion: false,
  largerText: false,
};

async function persistPreferences(preferences) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function applyNativeTheme(theme) {
  Appearance.setColorScheme(theme === "System" ? null : theme.toLowerCase());
}

export const useAppearanceStore = create((set, get) => ({
  ...DEFAULT_PREFERENCES,
  isReady: false,

  initialize: async () => {
    if (get().isReady) return;

    try {
      const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
      const storedPreferences = storedValue ? JSON.parse(storedValue) : {};
      const preferences = {
        ...DEFAULT_PREFERENCES,
        ...storedPreferences,
      };

      applyNativeTheme(preferences.theme);
      set({ ...preferences, isReady: true });
    } catch (_error) {
      applyNativeTheme(DEFAULT_PREFERENCES.theme);
      set({ ...DEFAULT_PREFERENCES, isReady: true });
    }
  },

  setTheme: async (theme) => {
    applyNativeTheme(theme);
    set({ theme });
    await persistPreferences({
      theme,
      reduceMotion: get().reduceMotion,
      largerText: get().largerText,
    }).catch(() => null);
  },

  setReduceMotion: async (reduceMotion) => {
    set({ reduceMotion });
    await persistPreferences({
      theme: get().theme,
      reduceMotion,
      largerText: get().largerText,
    }).catch(() => null);
  },

  setLargerText: async (largerText) => {
    set({ largerText });
    await persistPreferences({
      theme: get().theme,
      reduceMotion: get().reduceMotion,
      largerText,
    }).catch(() => null);
  },
}));
