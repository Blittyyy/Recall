import { Text, View } from "react-native";
import { Image } from "expo-image";
import { PlatformIcon } from "./AddScreen/PlatformIcon";
import { useThumbnailImageSource } from "../hooks/useThumbnailImageSource";
import { getThumbnailFallbackUrls } from "../utils/thumbnailImageSource";
import { isVideoUnavailable } from "../utils/videoAvailability";
import { useRecallStore } from "../store/useRecallStore";

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

  if (variant === "homeRecent") {
    return {
      width: "100%",
      height: "100%",
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
  videoUrl,
  videoId,
  platform,
  variant = "libraryList",
  showPlatformBadge = true,
  style,
  imageStyle,
  children,
}) {
  const frameStyle = getVariantStyle(variant, platform);
  const availabilityStatus = useRecallStore((state) => {
    if (!videoId) {
      return null;
    }

    return state.videos.find((video) => video.id === videoId)?.availabilityStatus ?? null;
  });
  const showUnavailableBadge = isVideoUnavailable(availabilityStatus);
  const { source, onError } = useThumbnailImageSource({
    thumbnailUrl,
    videoUrl,
    platform,
    videoId,
  });
  const hasThumbnailUrl = getThumbnailFallbackUrls(thumbnailUrl, platform).length > 0;
  const badgeSize = variant === "detailHero" ? 14 : 11;
  const badgePaddingHorizontal = variant === "detailHero" ? 11 : 6;
  const badgePaddingVertical = variant === "detailHero" ? 7 : 4;
  const badgeOffset = variant === "detailHero" ? 14 : 8;
  const resolvedImageStyle = [
    { width: "100%", height: "100%" },
    variant === "detailHero" ? { transform: [{ scale: 1.12 }] } : null,
    imageStyle,
  ].filter(Boolean);

  return (
    <View
      style={[
        frameStyle,
        style,
        {
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#ECEAE5",
        },
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={resolvedImageStyle}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="none"
          onError={onError}
        />
      ) : null}

      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: source ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.02)",
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

      {showUnavailableBadge ? (
        <View
          style={{
            position: "absolute",
            left: badgeOffset,
            right: badgeOffset,
            bottom: badgeOffset,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(18,18,18,0.82)",
              borderRadius: variant === "detailHero" ? 14 : 10,
              paddingHorizontal: variant === "detailHero" ? 12 : 8,
              paddingVertical: variant === "detailHero" ? 7 : 5,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: variant === "detailHero" ? 12 : 10,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Video unavailable
            </Text>
          </View>
        </View>
      ) : null}

      {!hasThumbnailUrl ? (
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
