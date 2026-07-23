import { FontAwesome6 } from "@expo/vector-icons";

export function TikTokIcon({ size = 13, color = "#1E1915" }) {
  return (
    <FontAwesome6
      name="tiktok"
      brand
      size={size}
      color={color}
      style={{ color }}
    />
  );
}
