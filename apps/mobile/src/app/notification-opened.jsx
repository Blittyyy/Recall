import {
  View,
  Text,
  Pressable,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Instagram,
  Youtube,
  Globe,
  X,
  ChevronRight,
} from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import { RecallReminderIcon } from "../components/RecallReminderIcon";
import { RecallSavedContentIcon } from "../components/RecallSavedContentIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { TikTokIcon } from "../components/AddScreen/TikTokIcon";
import { RECALL_COLORS } from "../constants/recallTheme";
import { getOpenActionLabel } from "../utils/openActionLabel";
import { getDisplayTitle } from "../utils/titleHelpers";

// ─── Design tokens ────────────────────────────────────────────────────────────
const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_MID = RECALL_COLORS.mid;
const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.48;

// ─── Mock video payload (the saved video being surfaced) ─────────────────────
const VIDEO = {
  id: "1",
  title: "Morning Hip Mobility Flow",
  platform: "YouTube",
  creator: "FitWithJordan",
  duration: "10 min",
  categoryEmoji: "💪",
  savedWeeksAgo: 3,
  reminderTime: "7:00 AM",
  resurfacePrompts: ["You saved this 3 weeks ago.", "Worth revisiting today?"],
  thumbnail:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TikTokMark({ size = 13, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}
function PlatformIcon({ platform, size = 13 }) {
  if (platform === "Instagram")
    return <Instagram size={size} color="#E4405F" />;
  if (platform === "YouTube") return <Youtube size={size} color="#FF0000" />;
  if (platform === "Web") return <Globe size={size} color="#5B6B7C" />;
  return <TikTokIcon size={size} color={BLACK} />;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NotificationOpenedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  // Entrance animations
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const promptAnim = useRef(new Animated.Value(0)).current;
  const openBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
      Animated.spring(sheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 10,
      }),
      Animated.spring(promptAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 10,
        delay: 60,
      }),
    ]).start();
  }, []);

  const pressBounce = useCallback((anim, cb) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 6,
      }),
    ]).start(cb);
  }, []);

  const handleSnooze = useCallback(() => {
    setSnoozed(true);
    setTimeout(() => router.back(), 1400);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(() => router.back(), 1200);
  }, []);

  if (!fontsLoaded) return null;

  const v = VIDEO;
  const openActionLabel = getOpenActionLabel(v);

  return (
    <View style={{ flex: 1, backgroundColor: BLACK }}>
      <StatusBar barStyle="light-content" />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <View
        style={{ height: HERO_H, position: "relative", overflow: "hidden" }}
      >
        <Image
          source={v.thumbnail}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />

        {/* Scrim layers */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 130,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
        />

        {/* ── Top nav ───────────────────────────────────────────────── */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 10,
            left: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Recall notification pill */}
          <Animated.View
            style={{
              flex: 1,
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-16, 0],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignSelf: "flex-start",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <RecallReminderIcon name="bell" size={12} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                  letterSpacing: 0.1,
                }}
              >
                Recall
              </Text>
              <View
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: "rgba(255,255,255,0.4)",
                }}
              />
              <RecallReminderIcon name="today" size={11} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {v.reminderTime}
              </Text>
            </View>
          </Animated.View>

          {/* Close */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              marginLeft: 10,
              backgroundColor: pressed
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.16)",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <X size={16} color={WHITE} />
          </Pressable>
        </View>

        {/* Platform badge at bottom of hero */}
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            paddingHorizontal: 11,
            paddingVertical: 6,
          }}
        >
          <PlatformIcon platform={v.platform} size={12} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_600SemiBold",
              color: WHITE,
            }}
          >
            {v.platform}
          </Text>
        </View>
      </View>

      {/* ── CONTENT SHEET ───────────────────────────────────────────── */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: WHITE,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -32,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 12,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          elevation: 10,
          transform: [
            {
              translateY: sheetAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0],
              }),
            },
          ],
          opacity: sheetAnim,
        }}
      >
        {/* Handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: GREY_LIGHT,
            alignSelf: "center",
            marginBottom: 22,
          }}
        />

        {/* ── Resurfacing prompt ─────────────────────────────────── */}
        <Animated.View
          style={{
            opacity: promptAnim,
            transform: [
              {
                translateY: promptAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
            backgroundColor: "#F0F4FF",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(0,122,255,0.12)",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <RecallReminderIcon name="rediscovery" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: "#1C3D7A",
                marginBottom: 2,
              }}
            >
              {v.resurfacePrompts[0]}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: "#2D5BB5",
                lineHeight: 18,
              }}
            >
              {v.resurfacePrompts[1]}
            </Text>
          </View>
        </Animated.View>

        {/* ── Title + meta ──────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 27,
            fontFamily: "Inter_700Bold",
            color: BLACK,
            letterSpacing: -0.8,
            lineHeight: 32,
            marginBottom: 10,
          }}
        >
          {getDisplayTitle(v.title)}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 28,
          }}
        >
          {[
            v.creator,
            v.duration,
            `${v.categoryEmoji} ${v.savedWeeksAgo} weeks ago`,
          ].map((label, i) => (
            <View
              key={i}
              style={{
                backgroundColor: GREY_LIGHT,
                borderRadius: 20,
                paddingHorizontal: 11,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: GREY_TEXT,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── CTAs ──────────────────────────────────────────────── */}
        <View style={{ gap: 12 }}>
          {/* PRIMARY — Watch Now */}
          <Animated.View style={{ transform: [{ scale: openBtnScale }] }}>
            <Pressable
              onPress={() => pressBounce(openBtnScale)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#1A1A1A" : BLACK,
                borderRadius: 20,
                paddingVertical: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 11,
                shadowColor: BLACK,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.22,
                shadowRadius: 22,
                elevation: 8,
              })}
            >
              <RecallActionIcon name="play" size={18} />
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Inter_700Bold",
                  color: WHITE,
                  letterSpacing: -0.4,
                }}
              >
                {openActionLabel}
              </Text>
            </Pressable>
          </Animated.View>

          {/* SECONDARY — Remind me later */}
          <Pressable
            onPress={handleSnooze}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#E8E8ED" : GREY_LIGHT,
              borderRadius: 20,
              paddingVertical: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            })}
          >
            <RecallReminderIcon name="bell" size={16} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: snoozed ? GREY_MID : GREY_TEXT,
                letterSpacing: -0.2,
              }}
            >
              {snoozed ? "Reminder set for tomorrow" : "Remind me later"}
            </Text>
          </Pressable>

          {/* TERTIARY — View in Library */}
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingVertical: 12,
            }}
          >
            <RecallSavedContentIcon name="bookmark-check" size={14} />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
              }}
            >
              View in Library
            </Text>
            <ChevronRight size={14} color={GREY_MID} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
