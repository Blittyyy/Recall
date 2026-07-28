import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Dimensions,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Instagram,
  Globe,
  ChevronRight,
  Clock,
  X,
  Play,
  Check,
} from "lucide-react-native";
import { RecallReminderIcon } from "../../components/RecallReminderIcon";
import { RecallSavedContentIcon } from "../../components/RecallSavedContentIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import Reanimated, {
  Easing,
  LinearTransition,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import { useRecallStore } from "../../store/useRecallStore";
import { useSupabaseSessionStore } from "../../store/useSupabaseSessionStore";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { RecallSyncState } from "../../components/RecallSyncState";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";
import { getRecallProfile, isUsableRecallDisplayName } from "../../services/supabaseClient";
import {
  toAnalyticsPlatform,
  trackEvent,
} from "../../services/analytics";
import {
  getHomeWorthRevisitingVideos,
  getHomeWorthRevisitingVideosNeedingExpiry,
  formatReminderScheduleLabel,
  getRecentlySavedVideos,
  getScheduledReminderVideos,
  isReminderDueToday,
  getResurfacingPrompt,
  getSavedTimeLabel,
  getSavedWeeksLabel,
  getCategoryMeta,
  getDismissedUntilDate,
} from "../../utils/resurfacing";
import { getDisplayTitle } from "../../utils/titleHelpers";
import { RemoteThumbnailImage } from "../../components/RemoteThumbnailImage";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";
import { EmptyHomeState } from "../../components/EmptyHomeState";
import { VideoThumbnail } from "../../components/VideoThumbnail";
import { WorthRevisitingCarousel } from "../../components/WorthRevisitingCarousel";
import {
  getHomeCardEnterDelay,
  HomeCardEnter,
} from "../../components/HomeCardEnter";
import { RECALL_COLORS, useRecallTheme } from "../../constants/recallTheme";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = RECALL_COLORS.background;
const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_MID = RECALL_COLORS.mid;
const BLUE = "#007AFF";
const WARM_BG = RECALL_COLORS.background;
const WARM_SURFACE = RECALL_COLORS.surfaceStrong;
const SEARCH_FILL = RECALL_COLORS.surface;
const SEARCH_BORDER = RECALL_COLORS.border;
const TAN_BORDER = RECALL_COLORS.border;
const TAN_TEXT = RECALL_COLORS.secondaryText;
const TAN_ACCENT = RECALL_COLORS.accent;
const TAN_SHADOW = RECALL_COLORS.shadow;
const HOME_TEXT = RECALL_COLORS.text;
const SERIF = "Georgia";
const SCREEN_W = Dimensions.get("window").width;
const HOME_GRID_GAP = 14;
const HOME_CARD_W = (SCREEN_W - 40 - HOME_GRID_GAP) / 2;
const HOME_STAT_W = Math.min(68, Math.max(58, (SCREEN_W - 174) / 3));
const HOME_BANNER_IMAGE = require("../../../assets/images/home-bottom-card.png");
const YOUTUBE_LOGO = require("../../../assets/images/youtube-logo.png");
const AMAZON_LOGO = require("../../../assets/images/amazon-logo.png");
const SAVED_FOR_LATER_IMAGE = require("../../../assets/images/saved-for-later.png");
const REMINDER_CARD_MIN_HEIGHT = 106;
const REMINDER_CARD_MARGIN = 10;
const REMINDER_COMPLETE_MS = 320;
const REMINDER_LIST_LAYOUT = LinearTransition.duration(280).easing(
  Easing.out(Easing.cubic),
);

// ─── Collections (display-only, not from store yet) ───────────────────────────
const COLLECTIONS = [
  {
    id: "c1",
    name: "Recipes to Try",
    emoji: "🍳",
    videoCount: 8,
    color: "#FFF3ED",
  },
  {
    id: "c2",
    name: "Gym Warmups",
    emoji: "💪",
    videoCount: 5,
    color: "#EDF2FF",
  },
  {
    id: "c3",
    name: "Morning Routine",
    emoji: "🌅",
    videoCount: 4,
    color: "#EDFFF4",
  },
  {
    id: "c4",
    name: "Iceland Trip",
    emoji: "🧊",
    videoCount: 12,
    color: "#F3EDFF",
  },
  {
    id: "c5",
    name: "Date Night Ideas",
    emoji: "🕯️",
    videoCount: 3,
    color: "#FFF0F5",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TikTokMark({ size = 13, color = "#111" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}
function YouTubeLogo({ size = 12 }) {
  return (
    <Image
      source={YOUTUBE_LOGO}
      style={{ width: size * 1.58, height: size }}
      contentFit="contain"
    />
  );
}
function AmazonLogo({ size = 12 }) {
  return (
    <Image
      source={AMAZON_LOGO}
      style={{ width: size * 1.15, height: size * 1.15 }}
      contentFit="contain"
    />
  );
}
function PlatformIcon({ platform, size = 12 }) {
  if (platform === "Instagram")
    return <Instagram size={size} color="#E4405F" />;
  if (platform === "YouTube") return <YouTubeLogo size={size} />;
  if (platform === "Amazon") return <AmazonLogo size={size} />;
  if (platform === "Web") return <Globe size={size} color="#5B6B7C" />;
  return <TikTokIcon size={size} color="#1E1915" />;
}

function getDisplayName({ profile, user }) {
  const email = user?.email ?? null;
  return (
    (isUsableRecallDisplayName(profile?.display_name, email)
      ? profile.display_name.trim()
      : "") ||
    (isUsableRecallDisplayName(user?.user_metadata?.display_name, email)
      ? user.user_metadata.display_name.trim()
      : "") ||
    (isUsableRecallDisplayName(user?.user_metadata?.name, email)
      ? user.user_metadata.name.trim()
      : "") ||
    "there"
  );
}

// ─── Entrance animation ────────────────────────────────────────────────────────
function FadeSlide({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 11,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  subtitle,
  action,
  onAction,
  px = 20,
  editorial = false,
  showAccent = editorial,
  subtitleOneLine = false,
  overlayAction = false,
}) {
  const theme = useRecallTheme();
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const actionPress = useRef(new Animated.Value(1)).current;
  const accentColor = theme.dark ? theme.accent : TAN_ACCENT;
  const titleColor = editorial
    ? theme.dark
      ? theme.text
      : HOME_TEXT
    : BLACK;
  const subtitleColor = editorial
    ? theme.dark
      ? theme.secondaryText
      : TAN_TEXT
    : GREY_TEXT;
  // Use warm sand/tan accent — DynamicColorIOS can stay "light" black when
  // the in-app theme is Dark but the system scheme is still light.
  const actionColor = editorial ? accentColor : BLUE;

  const handleActionIn = () => {
    if (reduceMotion) {
      actionPress.setValue(0.94);
      return;
    }
    Animated.spring(actionPress, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 320,
      friction: 18,
    }).start();
  };

  const handleActionOut = () => {
    if (reduceMotion) {
      actionPress.setValue(1);
      return;
    }
    Animated.spring(actionPress, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 14,
    }).start();
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: px,
        position: "relative",
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
        {showAccent ? (
          <View
            style={{
              width: 3,
              height: subtitle ? 72 : 44,
              borderRadius: 2,
              backgroundColor: accentColor,
              marginRight: 14,
              marginTop: 0,
            }}
          />
        ) : null}
        <View style={{ flex: 1, marginTop: editorial ? -4 : 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: editorial ? "flex-start" : "center",
            gap: icon ? 8 : 0,
            marginBottom: subtitle ? (editorial ? 5 : 3) : 0,
          }}
        >
          {icon}
          <Text
            style={{
              fontSize: editorial ? 22 : 19,
              fontFamily: editorial ? SERIF : "Inter_700Bold",
              color: titleColor,
              letterSpacing: editorial ? -0.8 : -0.5,
              lineHeight: editorial ? 30 : 24,
            }}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: subtitleColor,
              paddingLeft: icon ? (editorial ? 0 : 25) : 0,
              lineHeight: editorial ? 21 : undefined,
            }}
            numberOfLines={subtitleOneLine ? 1 : undefined}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      </View>
      {action ? (
        <Animated.View
          style={{
            transform: [{ scale: actionPress }],
            opacity: actionPress.interpolate({
              inputRange: [0.94, 1],
              outputRange: [0.72, 1],
            }),
            ...(overlayAction
              ? { position: "absolute", right: px, top: 0, zIndex: 2 }
              : null),
          }}
        >
          <Pressable
            onPress={onAction}
            onPressIn={handleActionIn}
            onPressOut={handleActionOut}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingLeft: overlayAction ? 4 : 12,
              paddingTop: editorial ? 4 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: editorial ? SERIF : "Inter_500Medium",
                color: actionColor,
              }}
            >
              {action}
            </Text>
            <ChevronRight size={14} color={actionColor} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── Worth Revisiting card (store-connected) ───────────────────────────────────
function LegacyWorthRevisitingCard({
  video,
  onPress,
  onWatch,
  onRemind,
  onNotNow,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.976,
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
  const meta = getCategoryMeta(video.category);

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], marginBottom: 14 }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          borderRadius: 26,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.13,
          shadowRadius: 28,
          elevation: 6,
          backgroundColor: BLACK,
        }}
      >
        <View style={{ height: 264, position: "relative" }}>
          <RemoteThumbnailImage
            thumbnailUrl={video.thumbnailUrl}
            videoUrl={video.videoUrl}
            videoId={video.id}
            platform={video.platform}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          {/* Gradient layers */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              backgroundColor: "rgba(0,0,0,0.28)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 180,
              opacity: 0.85,
              backgroundColor: "#000",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 80,
              left: 0,
              right: 0,
              height: 100,
              opacity: 0.5,
              backgroundColor: "#000",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 140,
              left: 0,
              right: 0,
              height: 60,
              opacity: 0.2,
              backgroundColor: "#000",
            }}
          />

          {/* Top badges */}
          <View
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <PlatformIcon platform={video.platform} size={12} />
              <Text
                style={{
                  fontSize: 12,
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
                gap: 5,
                backgroundColor: "rgba(0,0,0,0.48)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <RecallReminderIcon name="worth-revisiting" size={10} />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                {getSavedWeeksLabel(video.savedAt)}
              </Text>
            </View>
          </View>

          {/* Bottom content */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 18,
              paddingBottom: 20,
            }}
          >
            {/* Category chip */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                alignSelf: "flex-start",
                backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 12,
                paddingHorizontal: 9,
                paddingVertical: 4,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {meta.label}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: WHITE,
                letterSpacing: -0.5,
                lineHeight: 25,
                marginBottom: 4,
              }}
            >
              {getDisplayTitle(video.title)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.65)",
                marginBottom: 14,
              }}
            >
              {video.creator}
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  onWatch?.();
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: pressed ? "rgba(255,255,255,0.85)" : WHITE,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 4,
                })}
              >
                <Play size={12} color={BLACK} fill={BLACK} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_700Bold",
                    color: BLACK,
                  }}
                >
                  Open
                </Text>
              </Pressable>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  onRemind?.();
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  borderRadius: 13,
                  paddingVertical: 10,
                  backgroundColor: pressed
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.12)",
                })}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: WHITE,
                  }}
                >
                  Remind me
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                onNotNow?.();
              }}
              style={({ pressed }) => ({
                alignSelf: "flex-end",
                marginTop: 10,
                opacity: pressed ? 0.7 : 1,
                paddingVertical: 2,
              })}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Recently Saved portrait card ─────────────────────────────────────────────
function RecentCard({ video, onPress }) {
  const theme = useRecallTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  // Always a warm cream on the dark gradient — matches section title tone in dark mode.
  const overlayTitleColor = theme.dark ? theme.text : "#F7F2EC";

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(232,216,196,0.52)",
        shadowColor: TAN_SHADOW,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 4,
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          borderRadius: 23,
          overflow: "hidden",
          backgroundColor: "#ECEAE5",
        }}
      >
        <View
          style={{
            height: HOME_CARD_W,
            width: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <VideoThumbnail
            thumbnailUrl={video.thumbnailUrl}
            videoUrl={video.videoUrl}
            videoId={video.id}
            platform={video.platform}
            variant="homeRecent"
            showPlatformBadge={false}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
            imageStyle={{ transform: [{ scale: 1.08 }] }}
          />
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(255,255,255,0.93)",
              borderRadius: 12,
              paddingHorizontal: 7,
              paddingVertical: 5,
            }}
          >
            <PlatformIcon platform={video.platform} size={10} />
          </View>
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(255,250,243,0.95)",
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: SERIF,
                color: "#3B2A20",
              }}
            >
              {getSavedTimeLabel(video.savedAt)}
            </Text>
          </View>
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.56)", "rgba(0,0,0,0.74)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "58%",
            }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 11.5,
                fontFamily: SERIF,
                color: overlayTitleColor,
                lineHeight: 15,
                letterSpacing: -0.18,
                marginBottom: 7,
                textShadowColor: "rgba(0,0,0,0.42)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 8,
              }}
            >
              {getDisplayTitle(video.title)}
            </Text>
            <View
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                backgroundColor: "rgba(244,229,210,0.95)",
              }}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Reminder compact card ─────────────────────────────────────────────────────
function ReminderCard({
  video,
  onPress,
  onMarkWatched,
  onRemoveComplete,
  reduceMotion,
}) {
  const completionProgress = useSharedValue(0);
  const cardHeight = useSharedValue(REMINDER_CARD_MIN_HEIGHT);
  const isCompletingRef = useRef(false);

  const finishRemoval = useCallback(() => {
    onRemoveComplete?.();
  }, [onRemoveComplete]);

  const startCompletion = useCallback(() => {
    if (isCompletingRef.current) {
      return;
    }
    isCompletingRef.current = true;
    onMarkWatched?.();

    if (reduceMotion) {
      completionProgress.value = 1;
      finishRemoval();
      return;
    }

    completionProgress.value = withTiming(
      1,
      {
        duration: REMINDER_COMPLETE_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishRemoval)();
        }
      },
    );
  }, [completionProgress, finishRemoval, onMarkWatched, reduceMotion]);

  const wrapperStyle = useAnimatedStyle(() => ({
    height: interpolate(
      completionProgress.value,
      [0, 1],
      [cardHeight.value + REMINDER_CARD_MARGIN, 0],
    ),
    opacity: interpolate(completionProgress.value, [0, 0.3, 1], [1, 0.72, 0]),
    overflow: "hidden",
  }));

  const cardFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(completionProgress.value, [0, 0.45, 1], [1, 0.78, 0.42]),
  }));

  const playIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(completionProgress.value, [0, 0.28], [1, 0]),
    transform: [
      {
        scale: interpolate(completionProgress.value, [0, 0.28], [1, 0.55]),
      },
    ],
  }));

  const checkIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(completionProgress.value, [0.12, 0.48], [0, 1]),
    transform: [
      {
        scale: interpolate(completionProgress.value, [0.12, 0.48, 1], [0.45, 1, 1]),
      },
    ],
  }));

  return (
    <Reanimated.View style={wrapperStyle}>
      <Reanimated.View
        style={cardFadeStyle}
        onLayout={(event) => {
          if (!isCompletingRef.current) {
            cardHeight.value = event.nativeEvent.layout.height;
          }
        }}
      >
        <View
          style={{
            minHeight: REMINDER_CARD_MIN_HEIGHT,
            backgroundColor: WARM_SURFACE,
            borderRadius: 24,
            flexDirection: "row",
            alignItems: "flex-start",
            padding: 6,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.07,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-start",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <VideoThumbnail
              thumbnailUrl={video.thumbnailUrl}
              videoUrl={video.videoUrl}
              videoId={video.id}
              platform={video.platform}
              style={{ width: 94, height: 94, borderRadius: 19 }}
              imageStyle={{ transform: [{ scale: 1.24 }] }}
            />
            <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 14 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: HOME_TEXT,
                  letterSpacing: -0.2,
                  lineHeight: 18,
                  marginBottom: 6,
                }}
              >
                {getDisplayTitle(video.title)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <RecallReminderIcon name="today" size={11} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: TAN_TEXT,
                  }}
                >
                  {formatReminderScheduleLabel(video)}
                </Text>
              </View>
            </View>
          </Pressable>
          <View
            style={{
              paddingRight: 10,
              alignSelf: "stretch",
              justifyContent: "center",
            }}
          >
            <Pressable
              onPress={startCompletion}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Mark reminder as done"
              style={({ pressed }) => ({
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: BLACK,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: TAN_SHADOW,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                <Reanimated.View style={playIconStyle}>
                  <Check size={16} color={WHITE} strokeWidth={2.6} />
                </Reanimated.View>
                <Reanimated.View
                  style={[
                    {
                      position: "absolute",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                    checkIconStyle,
                  ]}
                >
                  <Check size={16} color={WHITE} strokeWidth={3} />
                </Reanimated.View>
              </View>
            </Pressable>
          </View>
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
}

// ─── From Your Saves grid card ────────────────────────────────────────────────
function SavesGridCard({ video, width, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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
  const meta = getCategoryMeta(video.category);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width }}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          backgroundColor: WHITE,
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 2,
        }}
      >
        <View style={{ height: 128, position: "relative" }}>
          <RemoteThumbnailImage
            thumbnailUrl={video.thumbnailUrl}
            videoUrl={video.videoUrl}
            videoId={video.id}
            platform={video.platform}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.1)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "rgba(255,255,255,0.95)",
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 3,
            }}
          >
            <PlatformIcon platform={video.platform} size={9} />
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
          </View>
        </View>
        <View style={{ padding: 11 }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_600SemiBold",
              color: BLACK,
              lineHeight: 17,
              marginBottom: 4,
              letterSpacing: -0.1,
            }}
          >
            {getDisplayTitle(video.title)}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            {getSavedWeeksLabel(video.savedAt)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Collection home card ──────────────────────────────────────────────────────
function CollectionHomeCard({ item, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
      style={{ transform: [{ scale: scaleAnim }], marginRight: 12 }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          width: 148,
          height: 112,
          borderRadius: 22,
          backgroundColor: item.color,
          justifyContent: "flex-end",
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 14,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 32, marginBottom: 6 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: BLACK,
            letterSpacing: -0.2,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
          }}
        >
          {item.videoCount} video{item.videoCount !== 1 ? "s" : ""}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ── Store ───────────────────────────────────────────────────────────────────
  const videos = useRecallStore((s) => s.videos);
  const supabaseUser = useSupabaseSessionStore((s) => s.user);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const markOpened = useRecallStore((s) => s.markOpened);
  const updateVideo = useRecallStore((s) => s.updateVideo);
  const dismissFromResurfacing = useRecallStore((s) => s.dismissFromResurfacing);
  const markShownInWorthRevisitingHome = useRecallStore(
    (s) => s.markShownInWorthRevisitingHome,
  );
  const clearFromHomeWorthRevisiting = useRecallStore(
    (s) => s.clearFromHomeWorthRevisiting,
  );
  const expireFromHomeWorthRevisiting = useRecallStore(
    (s) => s.expireFromHomeWorthRevisiting,
  );
  const [profile, setProfile] = useState(null);
  const theme = useRecallTheme();
  const openVideoDetail = (videoId) =>
    router.push({
      pathname: "/video-detail",
      params: { id: videoId },
    });

  // ── Derived data ────────────────────────────────────────────────────────────
  const homeWorthRevisiting = useMemo(
    () => getHomeWorthRevisitingVideos(videos, 5),
    [videos],
  );
  const recentlySaved = getRecentlySavedVideos(videos, 7);
  const activeReminders = getScheduledReminderVideos(videos)
    .filter((v) => v.reminderEnabled)
    .filter((v) => isReminderDueToday(v))
    .slice(0, 3);
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const reminderListLayout = reduceMotion ? undefined : REMINDER_LIST_LAYOUT;
  const [completedReminderIds, setCompletedReminderIds] = useState([]);
  const visibleActiveReminders = useMemo(
    () => activeReminders.filter((video) => !completedReminderIds.includes(video.id)),
    [activeReminders, completedReminderIds],
  );

  useEffect(() => {
    const markOnceReminderDelivered =
      useRecallStore.getState().markOnceReminderDelivered;

    videos.forEach((video) => {
      if (video.reminderFrequency !== "Once" || video.onceReminderCompletedAt) {
        return;
      }

      const fireAt = video.onceReminderScheduledFireAt;
      if (fireAt && new Date(fireAt).getTime() <= Date.now()) {
        markOnceReminderDelivered(video.id).catch(() => null);
      }
    });
  }, [videos]);
  const allSaves = videos.filter((v) => !v.archived);
  const hasSavedVideos = allSaves.length > 0;
  const hasWorthRevisiting = homeWorthRevisiting.length > 0;
  const displayName = useMemo(
    () => getDisplayName({ profile, user: supabaseUser }),
    [profile, supabaseUser],
  );
  const greetingName = displayName.split(" ")[0] || displayName;

  // Live platform counts
  const ytCount = allSaves.filter((v) => v.platform === "YouTube").length;
  const ttCount = allSaves.filter((v) => v.platform === "TikTok").length;
  const igCount = allSaves.filter((v) => v.platform === "Instagram").length;

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!supabaseUser?.id) {
        if (isMounted) {
          setProfile(null);
        }
        return;
      }

      try {
        const data = await getRecallProfile(supabaseUser.id);
        if (isMounted) {
          setProfile(data ?? null);
        }
      } catch (_error) {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [supabaseUser?.id]);

  useEffect(() => {
    getHomeWorthRevisitingVideosNeedingExpiry(videos).forEach((video) => {
      expireFromHomeWorthRevisiting(video.id);
    });
  }, [videos, expireFromHomeWorthRevisiting]);

  useEffect(() => {
    homeWorthRevisiting.forEach((video) => {
      if (!video.shownInWorthRevisitingAt) {
        markShownInWorthRevisitingHome(video.id);
      }
    });
  }, [homeWorthRevisiting, markShownInWorthRevisitingHome]);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reminderSetupVideo, setReminderSetupVideo] = useState(null);
  const [selectedReminderTime, setSelectedReminderTime] = useState("07:00 AM");
  const [selectedReminderFrequency, setSelectedReminderFrequency] =
    useState("Daily");
  const [selectedReminderDays, setSelectedReminderDays] = useState([]);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };
  const searchBorder = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [TAN_BORDER, "#D6BDA3"],
  });

  const handleWatchResurfaced = async (video) => {
    trackEvent("worth_revisiting_opened", {
      item_platform: toAnalyticsPlatform(video?.platform),
    });
    clearFromHomeWorthRevisiting(video.id);
    markOpened(video.id);
    try {
      await Linking.openURL(video.videoUrl);
    } catch {
      openVideoDetail(video.id);
    }
  };

  const handleRemindResurfaced = (video) => {
    setSelectedReminderTime(video.reminderTime ?? "07:00 AM");
    setSelectedReminderFrequency(video.reminderFrequency ?? "Daily");
    setSelectedReminderDays(video.reminderDays ?? []);
    setReminderSetupVideo(video);
  };

  const handleNotNowResurfaced = (video) => {
    clearFromHomeWorthRevisiting(video.id);
    dismissFromResurfacing(video.id);
  };

  const handleReminderWatched = useCallback(
    (videoId) => {
      markOpened(videoId);
    },
    [markOpened],
  );

  const handleReminderRemoveComplete = useCallback((videoId) => {
    setCompletedReminderIds((current) =>
      current.includes(videoId) ? current : [...current, videoId],
    );
  }, []);

  const saveReminderSetup = (reminder) => {
    if (!reminderSetupVideo) return;
    const id = reminderSetupVideo.id;
    clearFromHomeWorthRevisiting(id);
    updateVideo(id, {
      ...reminder,
      dismissedFromResurfacingUntil: getDismissedUntilDate(),
    });
    setReminderSetupVideo(null);
  };

  if (!fontsLoaded) return null;

  if (isLoaded && !errorMessage && !hasSavedVideos) {
    return (
      <EmptyHomeState
        greetingName={greetingName}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onAddVideo={() => router.push("/(tabs)/add")}
        onHowSharingWorks={() => router.push("/saving-from-other-apps")}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: hasSavedVideos ? WARM_BG : BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 56, 72) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ HEADER ══════════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: hasSavedVideos ? "transparent" : WHITE,
            paddingTop: insets.top + (hasSavedVideos ? 16 : 30),
            paddingBottom: hasSavedVideos ? 8 : 16,
            paddingHorizontal: 20,
            shadowColor: hasSavedVideos ? "transparent" : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: hasSavedVideos ? 0 : 0.05,
            shadowRadius: 16,
            elevation: hasSavedVideos ? 0 : 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: hasSavedVideos ? "flex-start" : "center",
              marginBottom: hasSavedVideos ? 16 : 10,
              minHeight: hasSavedVideos ? 0 : 52,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              {hasSavedVideos ? (
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: SERIF,
                    color: TAN_TEXT,
                    marginBottom: 6,
                    letterSpacing: -0.2,
                  }}
                >
                  Good to see you,
                </Text>
              ) : null}
              <Text
                style={{
                  fontSize: hasSavedVideos ? 36 : 25,
                  fontFamily: hasSavedVideos ? SERIF : "Inter_700Bold",
                  color: hasSavedVideos ? HOME_TEXT : BLACK,
                  letterSpacing: hasSavedVideos ? -1.25 : -0.8,
                  lineHeight: hasSavedVideos ? 42 : 29,
                  flexShrink: 1,
                  maxWidth: "100%",
                }}
              >
                {hasSavedVideos
                  ? `${greetingName} 👋`
                  : `Good morning, ${displayName} 👋`}
              </Text>
              <Text
                style={{
                  fontSize: hasSavedVideos ? 28 : 25,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.8,
                  lineHeight: hasSavedVideos ? 32 : 29,
                  flexShrink: 1,
                  maxWidth: "100%",
                  display: "none",
                }}
              >
                {hasSavedVideos ? "Grant 👋" : "Good morning, Grant 👋"}
              </Text>
            </View>
          </View>

          {hasSavedVideos ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {[
                {
                  icon: <YouTubeLogo size={11} />,
                  count: ytCount,
                  label: "YouTube",
                },
                {
                  icon: <TikTokIcon size={11} color="#1E1915" />,
                  count: ttCount,
                  label: "TikTok",
                },
                {
                  icon: <Instagram size={11} color="#E4405F" />,
                  count: igCount,
                  label: "Instagram",
                },
              ].map((p) => (
                <View
                  key={p.label}
                  style={{
                    width: HOME_STAT_W,
                    paddingVertical: 3,
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    {p.icon}
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: SERIF,
                        color: HOME_TEXT,
                        lineHeight: 18,
                      }}
                    >
                      {p.count}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: SERIF,
                      color: TAN_TEXT,
                      textAlign: "center",
                      lineHeight: 12,
                    }}
                    numberOfLines={1}
                  >
                    {p.label}
                  </Text>
                </View>
              ))}
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 38,
                  marginLeft: 2,
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                  alignSelf: "center",
                }}
              >
                <Image
                  source={SAVED_FOR_LATER_IMAGE}
                  contentFit="contain"
                  tintColor={theme.dark ? theme.accent : undefined}
                  style={{
                    position: "absolute",
                    width: 142,
                    height: 76,
                    left: -12,
                    top: -19,
                    opacity: theme.dark ? 0.82 : 1,
                  }}
                />
              </View>
            </View>
          ) : null}

        </View>

        {/* ═══ WORTH REVISITING ════════════════════════════════════ */}
        <RecallSyncState
          isLoading={isLoading}
          isLoaded={isLoaded}
          errorMessage={errorMessage}
          onRetry={reloadData}
          style={{ marginTop: hasSavedVideos ? 12 : 22, marginHorizontal: 20 }}
        />
        {isLoaded && !errorMessage && allSaves.length === 0 && (
          <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <HomeCardEnter delay={40}>
              <EmptyStateCard
                icon="▶"
                title="Save your first video"
                text="Add a TikTok, Reel, or YouTube video you don't want to lose."
                ctaLabel="Add a Video"
                onPress={() => router.push("/(tabs)/add")}
              />
            </HomeCardEnter>
          </View>
        )}
        {isLoaded && allSaves.length > 0 && hasWorthRevisiting && (
          <View style={{ marginTop: 20 }}>
            <SectionHeader
              icon={null}
              title="Worth Revisiting"
              subtitle="Saved a little while ago. Still interested?"
              action="See all"
              onAction={() => {
                router.push("/worth-revisiting");
              }}
              editorial
            />
            <WorthRevisitingCarousel
              enterBaseDelay={40}
              videos={homeWorthRevisiting}
              onPress={(video) => {
                trackEvent("worth_revisiting_opened", {
                  item_platform: toAnalyticsPlatform(video?.platform),
                });
                markOpened(video.id);
                openVideoDetail(video.id);
              }}
              onWatch={handleWatchResurfaced}
              onRemind={handleRemindResurfaced}
              onNotNow={handleNotNowResurfaced}
            />
          </View>
        )}

        {/* ═══ RECENTLY SAVED ══════════════════════════════════════ */}
        {isLoaded && allSaves.length > 0 && recentlySaved.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <SectionHeader
              icon={null}
              title="Recently saved"
              subtitle="Fresh additions from the last few days."
              action="View library"
              onAction={() => router.navigate("/(tabs)/saved")}
              editorial
              showAccent
              subtitleOneLine
              overlayAction
            />
            <View
              style={{
                paddingHorizontal: 20,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: HOME_GRID_GAP,
              }}
            >
              {recentlySaved.map((v, index) => (
                <HomeCardEnter
                  key={v.id}
                  delay={getHomeCardEnterDelay(100, index)}
                  style={{ width: HOME_CARD_W }}
                >
                  <RecentCard
                    video={v}
                    onPress={() => openVideoDetail(v.id)}
                  />
                </HomeCardEnter>
              ))}
            </View>
          </View>
        )}

        {/* ═══ COLLECTIONS ═════════════════════════════════════════ */}
        {false && isLoaded && allSaves.length > 0 && <FadeSlide delay={160}>
          <View style={{ marginTop: 32 }}>
            <SectionHeader
              icon={<RecallSavedContentIcon name="collections" size={17} />}
              title="Collections"
              subtitle="Things you cared enough to save for later"
              action="See all"
              onAction={() => router.navigate("/(tabs)/saved")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              style={{ flexGrow: 0 }}
              decelerationRate="fast"
            >
              {collectionCards.map((col) => (
                <CollectionHomeCard
                  key={col.id}
                  item={col}
                  onPress={() =>
                    router.push({
                      pathname: "/collection-detail",
                      params: { id: col.id },
                    })
                  }
                />
              ))}
              <Pressable
                onPress={() => router.navigate("/(tabs)/saved")}
                style={{
                  width: 148,
                  height: 112,
                  borderRadius: 22,
                  backgroundColor: WHITE,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: GREY_MID,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: GREY_LIGHT,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <RecallSavedContentIcon name="folder-plus" size={16} />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                    textAlign: "center",
                    lineHeight: 17,
                  }}
                >
                  New{"\n"}Collection
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </FadeSlide>}

        {/* ═══ TODAY'S REMINDERS ═══════════════════════════════════ */}
        {isLoaded && allSaves.length > 0 && visibleActiveReminders.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <SectionHeader
              icon={null}
              title="Today's reminders"
              subtitle="Videos you've scheduled"
              action="Manage"
              onAction={() => router.navigate("/(tabs)/calendar")}
              editorial
              showAccent
            />
            <View
              style={{
                marginHorizontal: 20,
              }}
            >
              {visibleActiveReminders.map((v, index) => (
                <Reanimated.View key={v.id} layout={reminderListLayout}>
                  <HomeCardEnter delay={getHomeCardEnterDelay(160, index)}>
                    <ReminderCard
                      video={v}
                      onPress={() => openVideoDetail(v.id)}
                      onMarkWatched={() => handleReminderWatched(v.id)}
                      onRemoveComplete={() => handleReminderRemoveComplete(v.id)}
                      reduceMotion={reduceMotion}
                    />
                  </HomeCardEnter>
                </Reanimated.View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ FROM YOUR SAVES ══════════════════════════════════════ */}
        {false && isLoaded && allSaves.length > 0 && <FadeSlide delay={280}>
          <View style={{ marginTop: 32 }}>
            <SectionHeader
              icon={<RecallReminderIcon name="sparkles" size={17} />}
              title="From Your Saves"
              subtitle="Rediscover what you've collected"
              action="See all"
              onAction={() => router.navigate("/(tabs)/saved")}
            />

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              style={{ flexGrow: 0, marginBottom: 16 }}
            >
              {ALL_CATS.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 32,
                      backgroundColor: active ? BLACK : GREY_LIGHT,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: active
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                        color: active ? WHITE : "#3C3C43",
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Masonry grid */}
            <View
              style={{
                paddingHorizontal: 20,
                flexDirection: "row",
                gap: CARD_GAP,
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1, gap: CARD_GAP }}>
                {leftCol.map((v) => (
                  <SavesGridCard
                    key={v.id}
                    video={v}
                    width={CARD_W}
                    onPress={() => openVideoDetail(v.id)}
                  />
                ))}
              </View>
              <View style={{ flex: 1, gap: CARD_GAP, marginTop: 28 }}>
                {rightCol.map((v) => (
                  <SavesGridCard
                    key={v.id}
                    video={v}
                    width={CARD_W}
                    onPress={() => openVideoDetail(v.id)}
                  />
                ))}
              </View>
            </View>

            {gridItems.length === 0 && (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 40,
                  paddingHorizontal: 20,
                }}
              >
                <Text style={{ fontSize: 28, marginBottom: 10 }}>📂</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_600SemiBold",
                    color: BLACK,
                    marginBottom: 6,
                  }}
                >
                  No saved videos found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                    textAlign: "center",
                    lineHeight: 19,
                  }}
                >
                  Try another keyword or category.
                </Text>
              </View>
            )}
          </View>
        </FadeSlide>}

        {/* ═══ TAGLINE ══════════════════════════════════════════════ */}
        <FadeSlide delay={220}>
          {hasSavedVideos ? (
            <View
              style={{
                marginTop: 32,
                marginHorizontal: 20,
                backgroundColor: WHITE,
                borderRadius: 28,
                overflow: "hidden",
                shadowColor: TAN_SHADOW,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 18,
                elevation: 2,
                flexDirection: "row",
                minHeight: 178,
                position: "relative",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <Image
                  source={HOME_BANNER_IMAGE}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  contentPosition="left center"
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={
                    theme.dark
                      ? [
                          "rgba(22,17,13,0.78)",
                          "rgba(22,17,13,0.42)",
                          "rgba(22,17,13,0.08)",
                          "transparent",
                        ]
                      : [
                          "rgba(255,252,248,0.42)",
                          "rgba(255,252,248,0.18)",
                          "transparent",
                          "transparent",
                        ]
                  }
                  locations={[0, 0.42, 0.7, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                  }}
                />
              </View>
              <View
                style={{
                  width: "56%",
                  paddingVertical: 20,
                  paddingLeft: 20,
                  paddingRight: 12,
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 21,
                    fontFamily: SERIF,
                    color: theme.dark ? "#F0E6DA" : HOME_TEXT,
                    lineHeight: 28,
                    letterSpacing: -0.6,
                    marginBottom: 8,
                    textAlign: "left",
                  }}
                  numberOfLines={2}
                >
                  Saved for the{"\n"}right moment.
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_400Regular",
                    color: theme.dark ? "#D2C4B4" : TAN_TEXT,
                    lineHeight: 18,
                    textAlign: "left",
                  }}
                >
                  Recall keeps what inspires you safe and brings it back when it matters.
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 18, marginHorizontal: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  marginBottom: 10,
                  letterSpacing: -0.2,
                }}
              >
                How Recall works
              </Text>
              <View
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 22,
                  padding: 18,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  elevation: 1,
                  gap: 12,
                }}
              >
                {["Save videos", "Organize them", "Rediscover later"].map(
                  (item, index) => (
                    <View
                      key={item}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: GREY_LIGHT,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_700Bold",
                            color: BLACK,
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_500Medium",
                          color: BLACK,
                          lineHeight: 19,
                        }}
                      >
                        {item}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}
        </FadeSlide>
      </ScrollView>
      <ReminderSetupModal
        visible={!!reminderSetupVideo}
        insets={insets}
        videoContext={
          reminderSetupVideo
            ? {
                thumbnailUrl: reminderSetupVideo.thumbnailUrl,
                title: reminderSetupVideo.title,
                platform: reminderSetupVideo.platform,
                category: reminderSetupVideo.category,
              }
            : null
        }
        initialReminder={
          reminderSetupVideo
            ? {
                hasReminder: reminderSetupVideo.hasReminder,
                reminderEnabled: reminderSetupVideo.reminderEnabled,
                reminderTime: selectedReminderTime,
                reminderFrequency: selectedReminderFrequency,
                reminderFollowUpDelayMinutes:
                  reminderSetupVideo.reminderFollowUpDelayMinutes ?? null,
                reminderDays: selectedReminderDays,
              }
            : null
        }
        allowDelete={!!reminderSetupVideo?.hasReminder}
        onClose={() => setReminderSetupVideo(null)}
        onSave={saveReminderSetup}
        onDelete={() => {
          if (!reminderSetupVideo) return;
          updateVideo(reminderSetupVideo.id, {
            hasReminder: false,
            reminderEnabled: false,
            reminderTime: null,
            reminderFrequency: null,
            reminderFollowUpDelayMinutes: null,
            reminderDays: [],
          });
          setReminderSetupVideo(null);
        }}
      />
    </View>
  );
}
