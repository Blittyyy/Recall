import { Image } from "expo-image";
import { Globe, Instagram } from "lucide-react-native";
import { TikTokIcon } from "./TikTokIcon";
import { resolvePlatformKey } from "../../utils/urlHelpers";

const YOUTUBE_LOGO = require("../../../assets/images/youtube-logo.png");
const AMAZON_LOGO = require("../../../assets/images/amazon-logo.png");

/**
 * Accepts both raw keys ("tiktok", "instagram", "youtube", "amazon", "web")
 * and display names ("TikTok", "Instagram", "YouTube", "Amazon", "Web").
 */
export function PlatformIcon({ platform, size = 14, color, url }) {
  const p = resolvePlatformKey(platform, url) ?? (platform ?? "").toLowerCase();
  if (p === "instagram") return <Instagram size={size} color="#E4405F" />;
  if (p === "youtube") {
    return (
      <Image
        source={YOUTUBE_LOGO}
        style={{ width: size * 1.25, height: size }}
        contentFit="contain"
      />
    );
  }
  if (p === "amazon") {
    return (
      <Image
        source={AMAZON_LOGO}
        style={{ width: size * 1.15, height: size * 1.15 }}
        contentFit="contain"
      />
    );
  }
  if (p === "web" || p === "website" || p === "webpage") {
    return <Globe size={size} color={color ?? "#1E1915"} />;
  }
  return <TikTokIcon size={size} color={color ?? "#1E1915"} />;
}
