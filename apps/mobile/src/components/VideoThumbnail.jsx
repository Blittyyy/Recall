import { View } from "react-native";
import { Image } from "expo-image";
import { PlatformIcon } from "./AddScreen/PlatformIcon";

const WHITE = "#FFFFFF";
const BLACK = "#111111";

function getVariantStyle(variant, platform) {
  const normalizedPlatform = (platform ?? "").toLowerCase();
  const isYouTube = normalizedPlatform === "youtube";

  if (variant === "detailHero") {
    return {
      width: "100%",
      aspectRatio: isYouTube ? 16 / 9 : 4 / 5,
      borderRadius: 30,
    };
  }

  if (variant === "gridCard") {
    return {
      width: "100%",
      aspectRatio: isYouTube ? 16 / 10 : 4 / 5,
      borderRadius: 18,
    };
  }

  return {
    width: 112,
    height: 96,
    borderRadius: 20,
  };
}

export function VideoThumbnail({
  thumbnailUrl,
  platform,
  variant = "libraryList",
  showPlatformBadge = true,
  children,
}) {
  const frameStyle = getVariantStyle(variant, platform);
  const badgeSize = variant === "detailHero" ? 14 : 11;
  const badgePaddingHorizontal = variant === "detailHero" ? 11 : 6;
  const badgePaddingVertical = variant === "detailHero" ? 7 : 4;
  const badgeOffset = variant === "detailHero" ? 14 : 8;

  return (
    <View
      style={[
        frameStyle,
        {
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#ECEAE5",
        },
      ]}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      ) : null}

      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: thumbnailUrl
            ? "rgba(0,0,0,0.08)"
            : "rgba(0,0,0,0.02)",
        }}
      />

      {showPlatformBadge ? (
        <View
          style={{
            position: "absolute",
            top: badgeOffset,
            left: badgeOffset,
            backgroundColor: "rgba(255,255,255,0.94)",
            borderRadius: variant === "detailHero" ? 18 : 10,
            paddingHorizontal: badgePaddingHorizontal,
            paddingVertical: badgePaddingVertical,
          }}
        >
          <PlatformIcon platform={platform} size={badgeSize} />
        </View>
      ) : null}

      {!thumbnailUrl ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: variant === "detailHero" ? 56 : 40,
              height: variant === "detailHero" ? 56 : 40,
              borderRadius: variant === "detailHero" ? 18 : 14,
              backgroundColor: "rgba(255,255,255,0.72)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <PlatformIcon
              platform={platform}
              size={variant === "detailHero" ? 20 : 16}
            />
          </View>
        </View>
      ) : null}

      {children}
    </View>
  );
}
