import { Instagram, Youtube } from "lucide-react-native";
import { TikTokIcon } from "./TikTokIcon";

/**
 * Accepts both raw keys ("tiktok", "instagram", "youtube")
 * and display names ("TikTok", "Instagram", "YouTube").
 */
export function PlatformIcon({ platform, size = 14 }) {
  const p = (platform ?? "").toLowerCase();
  if (p === "instagram") return <Instagram size={size} color="#E4405F" />;
  if (p === "youtube") return <Youtube size={size} color="#FF0000" />;
  return <TikTokIcon size={size} color="#000000" />;
}
