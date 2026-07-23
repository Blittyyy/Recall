import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Play } from "lucide-react-native";
import { PlatformIcon } from "./AddScreen/PlatformIcon";
import { RECALL_COLORS, useRecallTheme } from "../constants/recallTheme";
import { getCategoryMeta, getSavedWeeksLabel } from "../utils/resurfacing";
import { getOpenActionLabel } from "../utils/openActionLabel";
import { getDisplayTitle } from "../utils/titleHelpers";
import { RemoteThumbnailImage } from "../components/RemoteThumbnailImage";

const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_MID = RECALL_COLORS.mid;
const WARM_SURFACE = RECALL_COLORS.surfaceStrong;
const TAN_BORDER = RECALL_COLORS.border;
const TAN_TEXT = RECALL_COLORS.secondaryText;
const TAN_SHADOW = RECALL_COLORS.shadow;
const HOME_TEXT = RECALL_COLORS.text;
const INVERSE = RECALL_COLORS.inverse;
const ON_INVERSE = RECALL_COLORS.onInverse;
const SERIF = "Georgia";

export function WorthRevisitingCard({
  video,
  onPress,
  onWatch,
  onRemind,
  onNotNow,
  wrapperStyle,
}) {
  const theme = useRecallTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = getCategoryMeta(video.category);
  const openActionLabel = getOpenActionLabel(video);
  const creatorLabel =
    typeof video.creator === "string" ? video.creator.trim() : "";

  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.982,
      useNativeDriver: true,
      tension: 220,
      friction: 12,
    }).start();

  const handleOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 10,
    }).start();

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], marginBottom: 14 },
        wrapperStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          overflow: "hidden",
          borderRadius: 26,
          backgroundColor: WARM_SURFACE,
          borderWidth: theme.dark ? 1 : 0,
          borderColor: TAN_BORDER,
          shadowColor: TAN_SHADOW,
          shadowOffset: { width: 0, height: theme.dark ? 10 : 7 },
          shadowOpacity: theme.dark ? 0.45 : 0.1,
          shadowRadius: theme.dark ? 18 : 22,
          elevation: theme.dark ? 6 : 4,
        }}
      >
        <View
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            position: "relative",
            backgroundColor: GREY_LIGHT,
          }}
        >
          <RemoteThumbnailImage
            thumbnailUrl={video.thumbnailUrl}
            videoUrl={video.videoUrl}
            videoId={video.id}
            platform={video.platform}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />

          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(17,13,10,0.18)"]}
            locations={[0.68, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "38%",
            }}
          />

          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: "rgba(246,240,232,0.96)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 7,
                elevation: 2,
                flexShrink: 1,
              }}
            >
              <PlatformIcon platform={video.platform} size={10} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  fontFamily: "Inter_600SemiBold",
                  color: "#1E1915",
                }}
              >
                {video.platform}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderRadius: 9,
                paddingHorizontal: 8,
                paddingVertical: 5,
                backgroundColor: "rgba(18,14,11,0.88)",
                borderWidth: 1,
                borderColor: "rgba(240,230,218,0.28)",
                flexShrink: 1,
              }}
            >
              <Clock size={9} color="#F3E9DD" />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  fontFamily: "Inter_600SemiBold",
                  color: "#F3E9DD",
                }}
              >
                Saved {getSavedWeeksLabel(video.savedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 13,
            paddingBottom: 15,
          }}
        >
          <Text
            numberOfLines={3}
            style={{
              fontSize: 19,
              lineHeight: 24,
              fontFamily: SERIF,
              color: HOME_TEXT,
              letterSpacing: -0.25,
            }}
          >
            {getDisplayTitle(video.title)}
          </Text>

          {creatorLabel ? (
            <Text
              numberOfLines={1}
              style={{
                marginTop: 4,
                fontSize: 13,
                lineHeight: 18,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
              }}
            >
              {creatorLabel}
            </Text>
          ) : null}

          <View
            style={{
              marginTop: 7,
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: TAN_TEXT,
              }}
            >
              {meta.emoji} {meta.label}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_500Medium",
                color: GREY_MID,
              }}
            >
              •
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: TAN_TEXT,
              }}
            >
              Worth Revisiting
            </Text>
          </View>

          <View
            style={{
              marginTop: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                onWatch?.();
              }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 15,
                backgroundColor: pressed
                  ? theme.dark
                    ? "#D8CFC3"
                    : "#2B2825"
                  : INVERSE,
              })}
            >
              <Play size={13} color={ON_INVERSE} fill={ON_INVERSE} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: ON_INVERSE,
                }}
              >
                {openActionLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                onRemind?.();
              }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: TAN_BORDER,
                backgroundColor: pressed ? GREY_LIGHT : WARM_SURFACE,
              })}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: HOME_TEXT,
                }}
              >
                Remind me later
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
