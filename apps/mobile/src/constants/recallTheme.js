import { DynamicColorIOS, Platform, useColorScheme } from "react-native";
import { useAppearanceStore } from "../store/useAppearanceStore";

export function adaptiveColor(light, dark) {
  return Platform.OS === "ios"
    ? DynamicColorIOS({ light, dark })
    : light;
}

/**
 * Single source of truth for Recall light/dark palettes.
 * Keep light values stable; polish dark for warm archival contrast.
 */
export const RECALL_PALETTE = {
  light: {
    background: "#F7F5F2",
    surface: "#FFFCF8",
    surfaceStrong: "#FFFFFF",
    text: "#1E1915",
    secondaryText: "#756E67",
    mutedText: "#8E8E93",
    subtle: "#F5F0EA",
    subtleStrong: "#F2F2F0",
    border: "#E7DED3",
    mid: "#B4AAA0",
    accent: "#9C7B5A",
    shadow: "#8D7A68",
    inverse: "#1E1915",
    onInverse: "#FFFCF8",
  },
  dark: {
    // Keep the warm brown-black page canvas nearly identical
    background: "#100E0C",
    // Nav / chrome — slightly above the page
    surface: "#1E1A16",
    // Cards / elevated sheets — warmer and clearer lift
    surfaceStrong: "#2F2923",
    // Soft warm cream (avoid harsh white)
    text: "#E4DBD0",
    // Secondary: a bit more contrast
    secondaryText: "#C2B5A7",
    // Muted but still readable
    mutedText: "#A39688",
    subtle: "#27221D",
    subtleStrong: "#342E28",
    // Warm separators — visible without feeling outlined
    border: "#4F463C",
    mid: "#A09486",
    // Existing sand/gold — do not brighten
    accent: "#C9B089",
    shadow: "#050403",
    inverse: "#E4DBD0",
    onInverse: "#171310",
  },
};

export const RECALL_COLORS = {
  background: adaptiveColor(
    RECALL_PALETTE.light.background,
    RECALL_PALETTE.dark.background,
  ),
  surface: adaptiveColor(
    RECALL_PALETTE.light.surface,
    RECALL_PALETTE.dark.surface,
  ),
  surfaceStrong: adaptiveColor(
    RECALL_PALETTE.light.surfaceStrong,
    RECALL_PALETTE.dark.surfaceStrong,
  ),
  text: adaptiveColor(RECALL_PALETTE.light.text, RECALL_PALETTE.dark.text),
  secondaryText: adaptiveColor(
    RECALL_PALETTE.light.secondaryText,
    RECALL_PALETTE.dark.secondaryText,
  ),
  mutedText: adaptiveColor(
    RECALL_PALETTE.light.mutedText,
    RECALL_PALETTE.dark.mutedText,
  ),
  subtle: adaptiveColor(RECALL_PALETTE.light.subtle, RECALL_PALETTE.dark.subtle),
  subtleStrong: adaptiveColor(
    RECALL_PALETTE.light.subtleStrong,
    RECALL_PALETTE.dark.subtleStrong,
  ),
  border: adaptiveColor(RECALL_PALETTE.light.border, RECALL_PALETTE.dark.border),
  mid: adaptiveColor(RECALL_PALETTE.light.mid, RECALL_PALETTE.dark.mid),
  accent: adaptiveColor(RECALL_PALETTE.light.accent, RECALL_PALETTE.dark.accent),
  shadow: adaptiveColor(RECALL_PALETTE.light.shadow, RECALL_PALETTE.dark.shadow),
  inverse: adaptiveColor(
    RECALL_PALETTE.light.inverse,
    RECALL_PALETTE.dark.inverse,
  ),
  onInverse: adaptiveColor(
    RECALL_PALETTE.light.onInverse,
    RECALL_PALETTE.dark.onInverse,
  ),
};

export function useRecallTheme() {
  const preference = useAppearanceStore((state) => state.theme);
  const systemColorScheme = useColorScheme();
  const resolvedTheme =
    preference === "System"
      ? systemColorScheme ?? "light"
      : preference.toLowerCase();
  const dark = resolvedTheme === "dark";
  const palette = dark ? RECALL_PALETTE.dark : RECALL_PALETTE.light;

  return {
    dark,
    ...palette,
  };
}
