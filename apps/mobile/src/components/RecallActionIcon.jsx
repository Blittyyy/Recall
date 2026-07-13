import { Image } from "expo-image";

const ICONS = {
  play: require("../../assets/icons/actions/play.png"),
  search: require("../../assets/icons/actions/search.png"),
  tag: require("../../assets/icons/actions/tag.png"),
  share: require("../../assets/icons/actions/share.png"),
  "share-alt": require("../../assets/icons/actions/share-alt.png"),
  email: require("../../assets/icons/actions/email.png"),
  document: require("../../assets/icons/actions/document.png"),
  edit: require("../../assets/icons/actions/edit.png"),
  camera: require("../../assets/icons/actions/camera.png"),
};

/**
 * Recall action icons extracted from recall-icon-sheet.png.
 */
export function RecallActionIcon({ name, size = 24, style }) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
