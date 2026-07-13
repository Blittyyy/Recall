import { DynamicColorIOS, Platform, useColorScheme } from "react-native";
import { useAppearanceStore } from "../store/useAppearanceStore";

export function adaptiveColor(light, dark) {
  return Platform.OS === "ios"
    ? DynamicColorIOS({ light, dark })
    : light;
}

export const RECALL_COLORS = {
  background: adaptiveColor("#F7F5F2", "#151311"),
  surface: adaptiveColor("#FFFCF8", "#24211E"),
  surfaceStrong: adaptiveColor("#FFFFFF", "#292521"),
  text: adaptiveColor("#1E1915", "#F7F2EC"),
  secondaryText: adaptiveColor("#756E67", "#B8AFA6"),
  mutedText: adaptiveColor("#8E8E93", "#A69D95"),
  subtle: adaptiveColor("#F5F0EA", "#302B27"),
  subtleStrong: adaptiveColor("#F2F2F0", "#35302B"),
  border: adaptiveColor("#E7DED3", "#3D3731"),
  mid: adaptiveColor("#B4AAA0", "#8F867D"),
  accent: adaptiveColor("#9C7B5A", "#C3A17D"),
  shadow: adaptiveColor("#8D7A68", "#000000"),
};

export function useRecallTheme() {
  const preference = useAppearanceStore((state) => state.theme);
  const systemColorScheme = useColorScheme();
  const resolvedTheme =
    preference === "System"
      ? systemColorScheme ?? "light"
      : preference.toLowerCase();
  const dark = resolvedTheme === "dark";

  return {
    dark,
    background: dark ? "#151311" : "#F7F5F2",
    surface: dark ? "#24211E" : "#FFFCF8",
    surfaceStrong: dark ? "#292521" : "#FFFFFF",
    text: dark ? "#F7F2EC" : "#1E1915",
    secondaryText: dark ? "#B8AFA6" : "#756E67",
    mutedText: dark ? "#A69D95" : "#8E8E93",
    subtle: dark ? "#302B27" : "#F5F0EA",
    subtleStrong: dark ? "#35302B" : "#F2F2F0",
    border: dark ? "#3D3731" : "#E7DED3",
    mid: dark ? "#8F867D" : "#B4AAA0",
    accent: dark ? "#C3A17D" : "#9C7B5A",
    shadow: dark ? "#000000" : "#8D7A68",
  };
}
