import { View, Text, Animated } from "react-native";
import { Image } from "expo-image";
import { PlatformIcon } from "./PlatformIcon";
import { getCategoryMeta } from "../../utils/resurfacing";
import { getDisplayTitle } from "../../utils/titleHelpers";
import { createThumbnailImageSource } from "../../utils/thumbnailImageSource";
import { WHITE, BLACK, GREY_TEXT } from "../../constants/addScreen";
import { useRecallTheme } from "../../constants/recallTheme";

const PLATFORM_DISPLAY = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  amazon: "Amazon",
  web: "Web",
};

export function VideoPreviewCard({
  detectedPlatform,
  selectedCategory,
  previewTitle,
  previewCreator,
  customThumbnail,
  metadataStatus,
  previewAnim,
}) {
  const theme = useRecallTheme();
  if (!detectedPlatform) return null;

  const catMeta = getCategoryMeta(selectedCategory ?? "other");
  const platformLabel = PLATFORM_DISPLAY[detectedPlatform] ?? detectedPlatform;
  const thumbnail = customThumbnail ?? catMeta.thumbnail;
  const fallbackTitle = `${catMeta.emoji}  Saved ${platformLabel} ${catMeta.label} video`;
  const title = getDisplayTitle(
    previewTitle?.trim() || fallbackTitle,
    fallbackTitle,
  );
  const creator = previewCreator?.trim() || "Unknown creator";
  // Platform sits on a light badge — always true black.
  const platformLabelColor = "#1E1915";
  // Category sits on a dark badge — match warm title cream/tan.
  const categoryLabelColor = theme.dark ? theme.text : "#FFFCF8";

  const helperText =
    metadataStatus === "loading"
      ? detectedPlatform === "web" || detectedPlatform === "amazon"
        ? "Fetching the page title, site, and thumbnail..."
        : "Fetching the real title, creator, and thumbnail..."
      : metadataStatus === "error"
        ? "We couldn't load the details automatically. You can edit them below."
        : detectedPlatform === "web" || detectedPlatform === "amazon"
          ? "Ready to save with the page details we found."
          : "Ready to save with the video details we found.";

  return (
    <Animated.View
      style={{
        pointerEvents: "auto",
        opacity: previewAnim,
        transform: [
          {
            translateY: previewAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
          {
            scale: previewAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.96, 1],
            }),
          },
        ],
        paddingHorizontal: 20,
        marginBottom: 28,
      }}
    >
      <View
        style={{
          backgroundColor: WHITE,
          borderRadius: 26,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 22,
          elevation: 4,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={createThumbnailImageSource(thumbnail, detectedPlatform)}
            style={{ width: "100%", aspectRatio: 4 / 5 }}
            contentFit="cover"
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.07)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "rgba(255,255,255,0.95)",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <PlatformIcon platform={detectedPlatform} size={13} />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: platformLabelColor,
              }}
            >
              {platformLabel}
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(0,0,0,0.46)",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: 11 }}>{catMeta.emoji}</Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                color: categoryLabelColor,
              }}
            >
              {catMeta.label}
            </Text>
          </View>
        </View>

        <View style={{ padding: 18 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_700Bold",
              color: BLACK,
              marginBottom: 5,
              letterSpacing: -0.3,
              lineHeight: 21,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_500Medium",
              color: BLACK,
              opacity: 0.72,
              marginBottom: 6,
            }}
          >
            {creator}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 18,
            }}
          >
            {helperText}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
