import { Image } from "expo-image";

const ICONS = {
  crown: require("../../assets/icons/profile-settings/crown.png"),
  shield: require("../../assets/icons/profile-settings/shield.png"),
  "shield-check": require("../../assets/icons/profile-settings/shield-check.png"),
  help: require("../../assets/icons/profile-settings/help.png"),
  contact: require("../../assets/icons/profile-settings/contact.png"),
  settings: require("../../assets/icons/profile-settings/settings.png"),
  user: require("../../assets/icons/profile-settings/user.png"),
};

/**
 * Recall profile and settings icons extracted from recall-icon-sheet.png.
 */
export function RecallProfileIcon({ name, size = 24, style }) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
