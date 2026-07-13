import { Image } from "expo-image";

const ICONS = {
  bookmark: require("../../assets/icons/saved-content/bookmark.png"),
  "bookmark-check": require("../../assets/icons/saved-content/bookmark-check.png"),
  archive: require("../../assets/icons/saved-content/archive.png"),
  folder: require("../../assets/icons/saved-content/folder.png"),
  "folder-plus": require("../../assets/icons/saved-content/folder-plus.png"),
  collections: require("../../assets/icons/saved-content/collections.png"),
  "saved-for-later": require("../../assets/icons/saved-content/saved-for-later.png"),
  saved: require("../../assets/icons/saved-content/saved.png"),
  "last-opened": require("../../assets/icons/saved-content/last-opened.png"),
};

/**
 * Recall saved-content icons extracted from recall-icon-sheet.png.
 * Drop-in replacement for Lucide icons; accepts `size` like Lucide.
 */
export function RecallSavedContentIcon({ name, size = 24, style }) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}

export const RECALL_SAVED_FOR_LATER_BANNER = require("../../assets/icons/saved-content/saved-for-later-banner.png");
