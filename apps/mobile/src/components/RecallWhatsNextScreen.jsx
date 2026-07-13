import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Instagram, Lightbulb, Link2 } from "lucide-react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Marker, Path, Polygon } from "react-native-svg";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { RecallActionIcon } from "./RecallActionIcon";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import { TikTokIcon } from "./AddScreen/TikTokIcon";
import { useAppearanceStore } from "../store/useAppearanceStore";

const BG = "#F7F7F5";
const BLACK = "#111111";
const WHITE = "#FFFFFF";
const BODY = "#4F4F54";
const MUTED = "#8E8E93";
const ACCENT = "#C4A67A";
const ACCENT_SOFT = "#D6C2A0";
const TIP_BG = "#F1E7DB";
const DIVIDER = "#E8E2DA";
const STEP_BADGE = "#F0E6D8";

const YOUTUBE_LOGO = require("../../assets/images/youtube-logo.png");
const RECALL_APP_ICON = require("../../assets/images/icon.png");

const ENTRANCE_MS = 220;
const EASE = Easing.out(Easing.cubic);

const HOW_IT_WORKS = [
  {
    title: "Tap Share",
    body: "On any video or webpage.",
  },
  {
    title: "Choose Recall",
    body: "From the share sheet.",
  },
  {
    title: "We’ll open with everything",
    body: "ready to save.",
  },
];

function Sparkle({ size = 10, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.22,
          height: size,
          borderRadius: 99,
          backgroundColor: ACCENT,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size * 0.22,
          borderRadius: 99,
          backgroundColor: ACCENT,
        }}
      />
    </View>
  );
}

function FadeSlideIn({ progress, distance = 10, children, style }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [distance, 0]),
      },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function PlatformTile({ label, children, tileSize }) {
  return (
    <View style={{ alignItems: "center", minWidth: Math.max(tileSize + 14, 78) }}>
      <View
        style={{
          width: tileSize,
          height: tileSize,
          borderRadius: tileSize * 0.28,
          backgroundColor: WHITE,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {children}
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 7,
          fontSize: 12,
          lineHeight: 15,
          color: MUTED,
          fontFamily: "Inter_500Medium",
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionPill({ icon, label }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E8E4DE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: 15,
          lineHeight: 18,
          color: BLACK,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function DashedVerticalConnector({ height, progress, markerId }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scaleY: interpolate(progress.value, [0, 1], [0.55, 1]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          width: 18,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedStyle,
      ]}
    >
      <Svg width={18} height={height}>
        <Defs>
          <Marker
            id={markerId}
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Polygon points="0,0 6,3 0,6" fill={ACCENT} />
          </Marker>
        </Defs>
        <Path
          d={`M9 2 L9 ${height - 8}`}
          stroke={ACCENT}
          strokeWidth={1.4}
          strokeDasharray="3.5 4.5"
          strokeLinecap="round"
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      </Svg>
    </Animated.View>
  );
}

function PlatformToShareConnectors({ width, height, progress }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const leftX = width * 0.18;
  const midX = width * 0.5;
  const rightX = width * 0.82;
  const startY = 4;
  const endY = height - 6;

  return (
    <Animated.View style={[{ width, height }, animatedStyle]}>
      <Svg width={width} height={height}>
        <Defs>
          <Marker
            id="whatsNextArrowShare"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Polygon points="0,0 6,3 0,6" fill={ACCENT} />
          </Marker>
        </Defs>
        <Path
          d={`M${leftX} ${startY} C ${leftX} ${height * 0.55}, ${midX - 18} ${endY - 10}, ${midX} ${endY}`}
          stroke={ACCENT}
          strokeWidth={1.35}
          strokeDasharray="3.5 4.5"
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#whatsNextArrowShare)"
        />
        <Path
          d={`M${midX} ${startY} L ${midX} ${endY}`}
          stroke={ACCENT}
          strokeWidth={1.35}
          strokeDasharray="3.5 4.5"
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#whatsNextArrowShare)"
        />
        <Path
          d={`M${rightX} ${startY} C ${rightX} ${height * 0.55}, ${midX + 18} ${endY - 10}, ${midX} ${endY}`}
          stroke={ACCENT}
          strokeWidth={1.35}
          strokeDasharray="3.5 4.5"
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#whatsNextArrowShare)"
        />
      </Svg>
    </Animated.View>
  );
}

function RecallMark({ size }) {
  const rays = [
    { top: size * 0.08, left: -size * 0.18, rotate: "-28deg", length: size * 0.22 },
    { top: size * 0.42, left: -size * 0.24, rotate: "0deg", length: size * 0.2 },
    { top: size * 0.74, left: -size * 0.16, rotate: "28deg", length: size * 0.2 },
    { top: size * 0.08, right: -size * 0.18, rotate: "28deg", length: size * 0.22 },
    { top: size * 0.42, right: -size * 0.24, rotate: "0deg", length: size * 0.2 },
    { top: size * 0.74, right: -size * 0.16, rotate: "-28deg", length: size * 0.2 },
  ];

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: size + 28,
          height: size + 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {rays.map((ray, index) => (
          <View
            key={`ray-${index}`}
            style={{
              position: "absolute",
              top: ray.top,
              left: ray.left,
              right: ray.right,
              width: ray.length,
              height: 1.4,
              borderRadius: 99,
              backgroundColor: index % 2 === 0 ? ACCENT : ACCENT_SOFT,
              transform: [{ rotate: ray.rotate }],
            }}
          />
        ))}
        <Image
          source={RECALL_APP_ICON}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.22,
          }}
          contentFit="cover"
        />
      </View>
      <Text
        style={{
          marginTop: 4,
          fontSize: 13,
          lineHeight: 16,
          color: BLACK,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: -0.15,
        }}
      >
        Recall
      </Text>
    </View>
  );
}

function ShareFlowDiagram() {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const { width: windowWidth } = useWindowDimensions();

  const platformsProgress = useSharedValue(reduceMotion ? 1 : 0);
  const shareProgress = useSharedValue(reduceMotion ? 1 : 0);
  const recallProgress = useSharedValue(reduceMotion ? 1 : 0);
  const savedProgress = useSharedValue(reduceMotion ? 1 : 0);

  const contentWidth = Math.min(340, Math.max(280, windowWidth - 48));
  const scale = contentWidth / 340;
  const tileSize = Math.round(52 * scale);
  const iconSize = Math.round(23 * scale);
  const recallSize = Math.round(56 * scale);
  const connectorHeight = Math.round(30 * scale);
  const platformConnectorHeight = Math.round(36 * scale);

  useEffect(() => {
    if (reduceMotion) {
      platformsProgress.value = 1;
      shareProgress.value = 1;
      recallProgress.value = 1;
      savedProgress.value = 1;
      return;
    }

    platformsProgress.value = 0;
    shareProgress.value = 0;
    recallProgress.value = 0;
    savedProgress.value = 0;

    platformsProgress.value = withDelay(
      0,
      withTiming(1, { duration: ENTRANCE_MS, easing: EASE }),
    );
    shareProgress.value = withDelay(
      150,
      withTiming(1, { duration: ENTRANCE_MS, easing: EASE }),
    );
    recallProgress.value = withDelay(
      320,
      withTiming(1, { duration: ENTRANCE_MS, easing: EASE }),
    );
    savedProgress.value = withDelay(
      500,
      withTiming(1, { duration: ENTRANCE_MS, easing: EASE }),
    );
  }, [
    platformsProgress,
    recallProgress,
    reduceMotion,
    savedProgress,
    shareProgress,
  ]);

  return (
    <View
      style={{
        width: "100%",
        maxWidth: 360,
        alignSelf: "center",
        alignItems: "center",
      }}
    >
      <FadeSlideIn progress={platformsProgress} distance={12} style={{ width: "100%" }}>
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: Math.round(16 * scale),
          }}
        >
          <PlatformTile label="TikTok" tileSize={tileSize}>
            <TikTokIcon size={iconSize} color="#000000" />
          </PlatformTile>
          <PlatformTile label="Instagram" tileSize={tileSize}>
            <Instagram size={iconSize} color="#E4405F" />
          </PlatformTile>
          <PlatformTile label="YouTube" tileSize={tileSize}>
            <Image
              source={YOUTUBE_LOGO}
              style={{ width: iconSize * 1.55, height: iconSize }}
              contentFit="contain"
            />
          </PlatformTile>
        </View>
      </FadeSlideIn>

      <PlatformToShareConnectors
        width={contentWidth}
        height={platformConnectorHeight}
        progress={shareProgress}
      />

      <FadeSlideIn progress={shareProgress} distance={10}>
        <ActionPill
          label="Share"
          icon={<RecallActionIcon name="share" size={Math.round(17 * scale)} />}
        />
      </FadeSlideIn>

      <DashedVerticalConnector
        height={connectorHeight}
        progress={recallProgress}
        markerId="whatsNextArrowRecall"
      />

      <FadeSlideIn progress={recallProgress} distance={10}>
        <RecallMark size={recallSize} />
      </FadeSlideIn>

      <DashedVerticalConnector
        height={connectorHeight}
        progress={savedProgress}
        markerId="whatsNextArrowSaved"
      />

      <FadeSlideIn progress={savedProgress} distance={10} style={{ position: "relative" }}>
        <Sparkle
          size={Math.round(11 * scale)}
          style={{ position: "absolute", left: -16, top: 2 }}
        />
        <Sparkle
          size={Math.round(9 * scale)}
          style={{ position: "absolute", right: -14, top: 8 }}
        />
        <ActionPill
          label="Saved"
          icon={
            <RecallSavedContentIcon
              name="bookmark-check"
              size={Math.round(17 * scale)}
            />
          }
        />
      </FadeSlideIn>
    </View>
  );
}

export function RecallWhatsNextScreen({ onContinue }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [isContinuing, setIsContinuing] = useState(false);

  const handleContinue = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    try {
      await onContinue?.();
    } finally {
      setIsContinuing(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 18,
          paddingBottom: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: ACCENT,
            fontFamily: "Inter_600SemiBold",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          What’s Next
        </Text>

        <Text
          style={{
            fontSize: 34,
            lineHeight: 38,
            color: BLACK,
            fontFamily: Platform.OS === "ios" ? "Georgia" : undefined,
            fontWeight: Platform.OS === "ios" ? undefined : "700",
            letterSpacing: -0.9,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Welcome to Recall
        </Text>

        <Text
          style={{
            fontSize: 20,
            lineHeight: 26,
            color: BLACK,
            fontFamily: "Inter_600SemiBold",
            letterSpacing: -0.35,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Save from anywhere.
        </Text>

        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: BODY,
            fontFamily: "Inter_400Regular",
            textAlign: "center",
            maxWidth: 340,
            alignSelf: "center",
            marginBottom: 28,
          }}
        >
          Save from TikTok, Instagram, YouTube, or Safari without copying links.
        </Text>

        <ShareFlowDiagram />

        <View
          style={{
            marginTop: 32,
            marginBottom: 18,
            height: 1,
            backgroundColor: DIVIDER,
          }}
        />

        <Text
          style={{
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 1.3,
            textTransform: "uppercase",
            color: ACCENT,
            fontFamily: "Inter_600SemiBold",
            marginBottom: 16,
          }}
        >
          How it works
        </Text>

        {HOW_IT_WORKS.map((step, index) => (
          <View key={step.title}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
                paddingVertical: 14,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: STEP_BADGE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: ACCENT,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 22,
                    color: BLACK,
                    fontFamily: "Inter_600SemiBold",
                    letterSpacing: -0.2,
                  }}
                >
                  {step.title}
                </Text>
                {step.body ? (
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      lineHeight: 20,
                      color: BODY,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    {step.body}
                  </Text>
                ) : null}
              </View>
            </View>
            {index < HOW_IT_WORKS.length - 1 ? (
              <View style={{ height: 1, backgroundColor: DIVIDER, marginLeft: 42 }} />
            ) : null}
          </View>
        ))}

        <View
          style={{
            marginTop: 18,
            borderRadius: 18,
            backgroundColor: TIP_BG,
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: WHITE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lightbulb size={18} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 20,
                color: BLACK,
                fontFamily: "Inter_600SemiBold",
                marginBottom: 4,
              }}
            >
              Don’t see Recall?
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: BODY,
                fontFamily: "Inter_400Regular",
              }}
            >
              Tap More or Share to once, then choose Recall. It’ll appear faster
              next time.
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 18,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Link2 size={15} color={MUTED} />
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: MUTED,
              fontFamily: "Inter_400Regular",
              textAlign: "center",
            }}
          >
            Or paste a link anytime using the + button.
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: BG,
        }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={isContinuing}
          style={({ pressed }) => ({
            borderRadius: 24,
            backgroundColor: isContinuing
              ? "#C7C7CC"
              : pressed
                ? "#1F1F1F"
                : BLACK,
            paddingVertical: 18,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.14,
            shadowRadius: 24,
            elevation: 6,
          })}
        >
          <Text
            style={{
              fontSize: 17,
              fontFamily: "Inter_600SemiBold",
              color: WHITE,
            }}
          >
            {isContinuing ? "Opening Recall..." : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
