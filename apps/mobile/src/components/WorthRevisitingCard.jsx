import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Play } from "lucide-react-native";
import { PlatformIcon } from "./AddScreen/PlatformIcon";
import { RECALL_COLORS } from "../constants/recallTheme";
import { getCategoryMeta, getSavedWeeksLabel } from "../utils/resurfacing";
import { getDisplayTitle } from "../utils/titleHelpers";
import { RemoteThumbnailImage } from "../components/RemoteThumbnailImage";

const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_MID = RECALL_COLORS.mid;
const WARM_SURFACE = RECALL_COLORS.surface;
const TAN_BORDER = RECALL_COLORS.border;
const TAN_TEXT = RECALL_COLORS.secondaryText;
const TAN_SHADOW = RECALL_COLORS.shadow;
const HOME_TEXT = RECALL_COLORS.text;
const SERIF = "Georgia";

export function WorthRevisitingCard({
  video,
  onPress,
  onWatch,
  onRemind,
  onNotNow,
  wrapperStyle,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = getCategoryMeta(video.category);

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
          shadowColor: TAN_SHADOW,
          shadowOffset: { width: 0, height: 7 },
          shadowOpacity: 0.1,
          shadowRadius: 22,
          elevation: 4,
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
            colors={["transparent", "rgba(17,13,10,0.12)"]}
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
                backgroundColor: "rgba(255,252,248,0.96)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
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
                  color: BLACK,
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
                backgroundColor: "rgba(25,20,16,0.74)",
                flexShrink: 1,
              }}
            >
              <Clock size={9} color="rgba(255,255,255,0.9)" />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
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
            {video.creator}
          </Text>

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
                backgroundColor: pressed ? "#2B2825" : BLACK,
              })}
            >
              <Play size={13} color={WHITE} fill={WHITE} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                Open Video
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
