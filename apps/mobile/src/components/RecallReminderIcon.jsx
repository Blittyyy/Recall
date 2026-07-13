import { Image } from "expo-image";

const ICONS = {
  today: require("../../assets/icons/reminders/today.png"),
  tomorrow: require("../../assets/icons/reminders/tomorrow.png"),
  "this-week": require("../../assets/icons/reminders/this-week.png"),
  later: require("../../assets/icons/reminders/later.png"),
  rediscovery: require("../../assets/icons/reminders/rediscovery.png"),
  "worth-revisiting": require("../../assets/icons/reminders/worth-revisiting.png"),
  sparkles: require("../../assets/icons/reminders/sparkles.png"),
  bell: require("../../assets/icons/reminders/bell.png"),
};

/**
 * Recall reminder icons extracted from recall-icon-sheet.png.
 */
export function RecallReminderIcon({ name, size = 24, style }) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
