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
  Bell,
  ChevronRight,
  Search,
  RotateCcw,
  Play,
  Clock,
  X,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useRef, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useRecallStore } from "../../store/useRecallStore";
import { useSupabaseSessionStore } from "../../store/useSupabaseSessionStore";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { RecallSyncState } from "../../components/RecallSyncState";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";
import { getRecallProfile } from "../../services/supabaseClient";
import {
  getWorthRevisitingVideos,
  getRecentlySavedVideos,
  getScheduledReminderVideos,
  isReminderDueToday,
  getResurfacingPrompt,
  getSavedTimeLabel,
  getSavedWeeksLabel,
  getCategoryMeta,
} from "../../utils/resurfacing";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#F7F7F5";
const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F0";
const GREY_MID = "#C7C7CC";
const BLUE = "#007AFF";
const WARM_BG = "#F8F6F3";
const WARM_SURFACE = "#FCFAF7";
const SEARCH_FILL = "#FBF9F6";
const SEARCH_BORDER = "#E7DED3";
const TAN_BORDER = "#E7DED3";
const TAN_TEXT = "#7B7268";
const TAN_ACCENT = "#A57C52";
const TAN_SHADOW = "#B7A28A";
const HOME_TEXT = "#241F1A";
const SERIF = "Georgia";
const SCREEN_W = Dimensions.get("window").width;
const HOME_GRID_GAP = 14;
const HOME_CARD_W = (SCREEN_W - 40 - HOME_GRID_GAP) / 2;
const HOME_STAT_W = Math.min(68, Math.max(58, (SCREEN_W - 174) / 3));
const HOME_BANNER_IMAGE = require("../../../assets/images/home-bottom-card.png");
const YOUTUBE_LOGO = require("../../../assets/images/youtube-logo.png");
const SAVED_FOR_LATER_IMAGE = require("../../../assets/images/saved-for-later.png");

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
function PlatformIcon({ platform, size = 12 }) {
  if (platform === "Instagram")
    return <Instagram size={size} color="#E4405F" />;
  if (platform === "YouTube") return <YouTubeLogo size={size} />;
  return <TikTokIcon size={size} color={BLACK} />;
}

function getEmailHandle(email) {
  return email?.split("@")?.[0]?.trim() || "";
}

function isApplePrivateRelayEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@privaterelay.appleid.com");
}

function isUsableDisplayName(value) {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("@");
}

function getDisplayName({ profile, user }) {
  const emailHandle = getEmailHandle(user?.email);
  return (
    (isUsableDisplayName(profile?.display_name) ? profile.display_name.trim() : "") ||
    (isUsableDisplayName(user?.user_metadata?.display_name)
      ? user.user_metadata.display_name.trim()
      : "") ||
    (isUsableDisplayName(user?.user_metadata?.name) ? user.user_metadata.name.trim() : "") ||
    (isApplePrivateRelayEmail(user?.email) ? "" : emailHandle) ||
    "Recall User"
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
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: px,
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
        {showAccent ? (
          <View
            style={{
              width: 3,
              height: subtitle ? 72 : 44,
              borderRadius: 2,
              backgroundColor: TAN_ACCENT,
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
              color: editorial ? HOME_TEXT : BLACK,
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
              color: editorial ? TAN_TEXT : GREY_TEXT,
              paddingLeft: icon ? (editorial ? 0 : 25) : 0,
              lineHeight: editorial ? 21 : undefined,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      </View>
      {action ? (
        <Pressable
          onPress={onAction}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingLeft: 12,
            paddingTop: editorial ? 4 : 0,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: editorial ? SERIF : "Inter_500Medium",
              color: editorial ? HOME_TEXT : BLUE,
            }}
          >
            {action}
          </Text>
          <ChevronRight size={14} color={editorial ? HOME_TEXT : BLUE} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Worth Revisiting card (store-connected) ───────────────────────────────────
function WorthRevisitingCard({ video, onPress, onWatch, onRemind, onNotNow }) {
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
          <Image
            source={{ uri: video.thumbnailUrl }}
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
                gap: 5,
                backgroundColor: "rgba(0,0,0,0.48)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <RotateCcw size={10} color="rgba(255,255,255,0.8)" />
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
              numberOfLines={2}
            >
              {video.title}
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: HOME_CARD_W }}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "#211813",
          borderWidth: 1,
          borderColor: "rgba(232,216,196,0.52)",
          shadowColor: TAN_SHADOW,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 20,
          elevation: 4,
        }}
      >
        <View style={{ height: HOME_CARD_W, position: "relative" }}>
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={{
              width: "100%",
              height: "100%",
              transform: [{ scale: 1.24 }],
            }}
            contentFit="cover"
            contentPosition="center"
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
              height: "44%",
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
                fontSize: 13,
                fontFamily: SERIF,
                color: WHITE,
                lineHeight: 18,
                letterSpacing: -0.25,
                marginBottom: 8,
                textShadowColor: "rgba(0,0,0,0.42)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 8,
              }}
              numberOfLines={2}
            >
              {video.title}
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
function ReminderCard({ video, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#F8F4EF" : WARM_SURFACE,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: TAN_BORDER,
        shadowColor: TAN_SHADOW,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 2,
      })}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={{ width: 94, height: 94 }}
          contentFit="cover"
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.12)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 5,
            left: 5,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 8,
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}
        >
          <PlatformIcon platform={video.platform} size={9} />
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: SERIF,
            color: HOME_TEXT,
            letterSpacing: -0.45,
            lineHeight: 22,
            marginBottom: 5,
          }}
          numberOfLines={2}
        >
          {video.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Clock size={11} color={GREY_MID} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: TAN_TEXT,
            }}
          >
            {video.reminderTime} · {video.reminderFrequency}
          </Text>
        </View>
      </View>
      <View style={{ paddingRight: 16 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
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
          <Play size={13} color={WHITE} fill={WHITE} />
        </View>
      </View>
    </Pressable>
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
          <Image
            source={{ uri: video.thumbnailUrl }}
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
            numberOfLines={2}
          >
            {video.title}
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
  const [profile, setProfile] = useState(null);
  const openVideoDetail = (videoId) =>
    router.push({
      pathname: "/video-detail",
      params: { id: videoId },
    });

  // ── Derived data ────────────────────────────────────────────────────────────
  const worthRevisiting = getWorthRevisitingVideos(videos, 4);
  const recentlySaved = getRecentlySavedVideos(videos, 7);
  const activeReminders = getScheduledReminderVideos(videos)
    .filter((v) => v.reminderEnabled)
    .filter((v) => isReminderDueToday(v))
    .slice(0, 3);
  const allSaves = videos.filter((v) => !v.archived);
  const hasSavedVideos = allSaves.length > 0;
  const hasWorthRevisiting = worthRevisiting.length > 0;
  const shouldShowWorthRevisitingEmptyState =
    isLoaded &&
    allSaves.length > 0 &&
    !hasWorthRevisiting &&
    activeReminders.length === 0 &&
    recentlySaved.length === 0;
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

  const saveReminderSetup = (reminder) => {
    if (!reminderSetupVideo) return;
    updateVideo(reminderSetupVideo.id, {
      ...reminder,
      dismissedFromResurfacingUntil: null,
    });
    setReminderSetupVideo(null);
  };

  if (!fontsLoaded) return null;

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
                  icon: <TikTokIcon size={11} color={BLACK} />,
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
                  style={{
                    position: "absolute",
                    width: 142,
                    height: 76,
                    left: -12,
                    top: -19,
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
          <FadeSlide delay={40}>
            <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
              <EmptyStateCard
                icon="▶"
                title="Save your first video"
                text="Add a TikTok, Reel, or YouTube video you don't want to lose."
                ctaLabel="Add a Video"
                onPress={() => router.push("/(tabs)/add")}
              />
            </View>
          </FadeSlide>
        )}
        {isLoaded && allSaves.length > 0 && hasWorthRevisiting && (
          <FadeSlide delay={40}>
            <View style={{ marginTop: 20 }}>
              <SectionHeader
                icon={<RotateCcw size={17} color={BLACK} />}
                title="Worth Revisiting"
                subtitle="Saved a little while ago. Still interested?"
                editorial
              />
              <View style={{ paddingHorizontal: 20 }}>
                {worthRevisiting.map((v) => (
                  <WorthRevisitingCard
                    key={v.id}
                    video={v}
                    onPress={() => openVideoDetail(v.id)}
                    onWatch={() => handleWatchResurfaced(v)}
                    onRemind={() => handleRemindResurfaced(v)}
                    onNotNow={() => dismissFromResurfacing(v.id)}
                  />
                ))}
              </View>
            </View>
          </FadeSlide>
        )}

        {/* ═══ RECENTLY SAVED ══════════════════════════════════════ */}
        {shouldShowWorthRevisitingEmptyState && (
          <FadeSlide delay={40}>
            <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
              <SectionHeader
                icon={<RotateCcw size={17} color={BLACK} />}
                title="Worth Revisiting"
                subtitle="Saved a little while ago. Still interested?"
                px={0}
                editorial
              />
              <EmptyStateCard
                icon="↺"
                title="Nothing to revisit yet"
                text="Once you've saved videos for a little while, Recall will bring them back naturally."
              />
            </View>
          </FadeSlide>
        )}

        {isLoaded && allSaves.length > 0 && recentlySaved.length > 0 && (
          <FadeSlide delay={100}>
            <View style={{ marginTop: 20 }}>
              <SectionHeader
                icon={null}
                title="Recently saved"
                subtitle="Fresh additions from the last few days."
                action="View library"
                onAction={() => router.push("/(tabs)/saved")}
                editorial
                showAccent
              />
              <View
                style={{
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: HOME_GRID_GAP,
                }}
              >
                {recentlySaved.map((v) => (
                  <RecentCard
                    key={v.id}
                    video={v}
                    onPress={() => openVideoDetail(v.id)}
                  />
                ))}
              </View>
            </View>
          </FadeSlide>
        )}

        {/* ═══ COLLECTIONS ═════════════════════════════════════════ */}
        {false && isLoaded && allSaves.length > 0 && <FadeSlide delay={160}>
          <View style={{ marginTop: 32 }}>
            <SectionHeader
              icon={<FolderOpen size={17} color={BLACK} />}
              title="Collections"
              subtitle="Things you cared enough to save for later"
              action="See all"
              onAction={() => router.push("/(tabs)/saved")}
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
                onPress={() => router.push("/(tabs)/saved")}
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
                  <Plus size={16} color={GREY_TEXT} />
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
        {isLoaded && allSaves.length > 0 && activeReminders.length > 0 && (
          <FadeSlide delay={160}>
            <View style={{ marginTop: 32 }}>
              <SectionHeader
                icon={null}
                title="Today's reminders"
                subtitle="Videos you've scheduled"
                action="Manage"
                onAction={() => router.push("/(tabs)/calendar")}
                editorial
                showAccent
              />
              <View
                style={{
                  marginHorizontal: 20,
                  gap: 10,
                }}
              >
                {activeReminders.map((v) => (
                  <ReminderCard
                    key={v.id}
                    video={v}
                    onPress={() => openVideoDetail(v.id)}
                  />
                ))}
              </View>
            </View>
          </FadeSlide>
        )}

        {/* ═══ FROM YOUR SAVES ══════════════════════════════════════ */}
        {false && isLoaded && allSaves.length > 0 && <FadeSlide delay={280}>
          <View style={{ marginTop: 32 }}>
            <SectionHeader
              icon={<Sparkles size={17} color={BLACK} />}
              title="From Your Saves"
              subtitle="Rediscover what you've collected"
              action="See all"
              onAction={() => router.push("/(tabs)/saved")}
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
                backgroundColor: WARM_SURFACE,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: TAN_BORDER,
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
                  contentPosition="right center"
                />
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(252,250,247,0.12)",
                  }}
                />
                <LinearGradient
                  colors={[
                    WARM_SURFACE,
                    "rgba(252,250,247,0.96)",
                    "rgba(252,250,247,0.72)",
                    "rgba(252,250,247,0.28)",
                    "rgba(252,250,247,0)",
                  ]}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: "72%",
                  }}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
                <LinearGradient
                  colors={["rgba(165,124,82,0.08)", "rgba(165,124,82,0.16)"]}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
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
                    color: HOME_TEXT,
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
                    color: TAN_TEXT,
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
