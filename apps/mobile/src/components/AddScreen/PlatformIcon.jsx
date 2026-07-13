import { Image } from "expo-image";
import { Instagram } from "lucide-react-native";
import { TikTokIcon } from "./TikTokIcon";

const YOUTUBE_LOGO = require("../../../assets/images/youtube-logo.png");

/**
 * Accepts both raw keys ("tiktok", "instagram", "youtube")
 * and display names ("TikTok", "Instagram", "YouTube").
 */
export function PlatformIcon({ platform, size = 14 }) {
  const p = (platform ?? "").toLowerCase();
  if (p === "instagram") return <Instagram size={size} color="#E4405F" />;
  if (p === "youtube") {
    return (
      <Image
        source={YOUTUBE_LOGO}
        style={{ width: size * 1.58, height: size }}
        contentFit="contain"
      />
    );
  }
  return <TikTokIcon size={size} color="#000000" />;
}
