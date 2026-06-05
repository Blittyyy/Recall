import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  ChevronLeft,
  Play,
  CheckCircle2,
  Instagram,
  Youtube,
  Clock,
  RefreshCw,
  Tag,
  CalendarDays,
  RotateCcw,
  BookmarkCheck,
  MoreHorizontal,
  Share2,
  Bell,
  Edit3,
  Trash2,
} from "lucide-react-native";
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

// ─── Design tokens (matches app-wide system) ─────────────────────────────────
const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";
const GREEN = "#34C759";
const ORANGE = "#FF9500";
const HERO_HEIGHT = 320;

// ─── Mock video data ───────────────────────────────────────────────────────
const ROUTINE = {
  id: "1",
  title: "Morning Hip Mobility",
  platform: "YouTube",
  creator: "FitWithJordan",
  duration: "10 min",
  thumbnail:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop",
  reminderTime: "7:00 AM",
  frequency: "Daily",
  category: "Fitness",
  categoryEmoji: "💪",
  savedWeeksAgo: 3,
  addedDate: "May 1, 2026",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function TikTokMark({ size = 14, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}

function PlatformIcon({ platform, size = 14 }) {
  if (platform === "Instagram")
    return <Instagram size={size} color="#E4405F" />;
  if (platform === "YouTube") return <Youtube size={size} color="#FF0000" />;
  return <TikTokIcon size={size} color={BLACK} />;
}

// ─── Info Row Item ───────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, isLast = false }) {
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 15,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: GREY_LIGHT,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {icon}
          </View>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            {label}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_600SemiBold",
            color: BLACK,
          }}
        >
          {value}
        </Text>
      </View>
      {!isLast && (
        <View
          style={{
            height: 1,
            backgroundColor: GREY_LIGHT,
            marginLeft: 46,
          }}
        />
      )}
    </View>
  );
}

// ─── Options Menu ────────────────────────────────────────────────────────────
function OptionsMenu({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const OPTIONS = [
    { icon: <Edit3 size={16} color={BLACK} />, label: "Edit Routine" },
    { icon: <Bell size={16} color={BLACK} />, label: "Change Reminder" },
    { icon: <Share2 size={16} color={BLACK} />, label: "Share Video" },
    {
      icon: <Trash2 size={16} color="#FF3B30" />,
      label: "Delete Routine",
      danger: true,
    },
  ];

  return (
    <Pressable
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
      onPress={onClose}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 90,
          right: 20,
          backgroundColor: WHITE,
          borderRadius: 18,
          overflow: "hidden",
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.14,
          shadowRadius: 28,
          elevation: 12,
          opacity: slideAnim,
          transform: [
            {
              scale: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.88, 1],
              }),
            },
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
          minWidth: 210,
        }}
      >
        {OPTIONS.map((opt, i) => (
          <View key={opt.label}>
            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 18,
                paddingVertical: 15,
                backgroundColor: pressed ? GREY_LIGHT : WHITE,
              })}
            >
              {opt.icon}
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_500Medium",
                  color: opt.danger ? "#FF3B30" : BLACK,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
            {i < OPTIONS.length - 1 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: GREY_LIGHT,
                  marginHorizontal: 18,
                }}
              />
            )}
          </View>
        ))}
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RoutineDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [isWatched, setIsWatched] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const completeAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // Sheet entrance animation
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 55,
      friction: 10,
      delay: 80,
    }).start();
  }, []);

  const handleComplete = useCallback(() => {
    if (isWatched) {
      setIsWatched(false);
      Animated.timing(checkAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }
    // Bounce + complete
    Animated.sequence([
      Animated.timing(completeAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(completeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 6,
      }),
    ]).start();
    Animated.spring(checkAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 7,
    }).start();
    setIsWatched(true);
  }, [isWatched]);

  if (!fontsLoaded) return null;

  const routine = ROUTINE;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* Options overlay */}
      <OptionsMenu
        visible={showOptions}
        onClose={() => setShowOptions(false)}
      />

      {/* ── Hero Thumbnail ─────────────────────────────────────── */}
      <View style={{ height: HERO_HEIGHT, position: "relative" }}>
        <Image
          source={routine.thumbnail}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />

        {/* Top-to-bottom dark gradient scrim */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 120,
            backgroundColor: "rgba(0,0,0,0.42)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: "rgba(0,0,0,0.15)",
          }}
        />

        {/* Completed overlay on thumbnail */}
        {isWatched && (
          <Animated.View
            style={{
              position: "absolute",
              inset: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(52,199,89,0.25)",
              justifyContent: "center",
              alignItems: "center",
              opacity: checkAnim,
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: checkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ],
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(52,199,89,0.9)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CheckCircle2
                size={42}
                color={WHITE}
                fill="rgba(255,255,255,0.2)"
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* Top navigation bar */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.18)",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <ChevronLeft size={22} color={WHITE} />
          </Pressable>

          {/* Platform badge — center */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "rgba(255,255,255,0.18)",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <PlatformIcon platform={routine.platform} size={13} />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              {routine.platform}
            </Text>
          </View>

          {/* Options button */}
          <Pressable
            onPress={() => setShowOptions((v) => !v)}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: pressed
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.18)",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <MoreHorizontal size={20} color={WHITE} />
          </Pressable>
        </View>
      </View>

      {/* ── Main Sheet ────────────────────────────────────────────── */}
      <Animated.View
        style={{
          flex: 1,
          marginTop: -28,
          transform: [
            {
              translateY: sheetAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
          opacity: sheetAnim,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* ── Title Card ─────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: 24,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: GREY_LIGHT,
                alignSelf: "center",
                marginBottom: 24,
              }}
            />

            {/* Title + meta */}
            <Text
              style={{
                fontSize: 26,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.7,
                marginBottom: 8,
                lineHeight: 32,
              }}
            >
              {routine.title}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
              }}
            >
              {/* Creator pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                  }}
                >
                  {routine.creator}
                </Text>
              </View>

              {/* Duration pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                  }}
                >
                  {routine.duration}
                </Text>
              </View>

              {/* Category emoji pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 12 }}>{routine.categoryEmoji}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                  }}
                >
                  {routine.category}
                </Text>
              </View>
            </View>

            {/* ── Primary Actions ─────────────────────────────── */}
            <View style={{ gap: 12 }}>
              {/* Open Video — primary */}
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#1A1A1A" : BLACK,
                  borderRadius: 18,
                  paddingVertical: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  shadowColor: BLACK,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 18,
                  elevation: 6,
                })}
              >
                <Play size={17} color={WHITE} fill={WHITE} />
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: "Inter_700Bold",
                    color: WHITE,
                    letterSpacing: -0.3,
                  }}
                >
                  Open Video
                </Text>
              </Pressable>

              {/* Mark as Watched — updated label */}
              <Animated.View style={{ transform: [{ scale: completeAnim }] }}>
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => ({
                    backgroundColor: isWatched
                      ? GREEN
                      : pressed
                        ? "#E8E8ED"
                        : GREY_LIGHT,
                    borderRadius: 18,
                    paddingVertical: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    shadowColor: isWatched ? GREEN : "transparent",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    elevation: isWatched ? 4 : 0,
                  })}
                >
                  <CheckCircle2
                    size={17}
                    color={isWatched ? WHITE : GREY_TEXT}
                    fill={isWatched ? "rgba(255,255,255,0.2)" : "transparent"}
                  />
                  <Text
                    style={{
                      fontSize: 17,
                      fontFamily: "Inter_700Bold",
                      color: isWatched ? WHITE : GREY_TEXT,
                      letterSpacing: -0.3,
                    }}
                  >
                    {isWatched ? "Watched ✓" : "Mark as Watched"}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>

          {/* ── Spacer ─────────────────────────────────────────── */}
          <View style={{ height: 12, backgroundColor: BG }} />

          {/* ── From Your Saves — replaces Consistency Block ────── */}
          <View
            style={{
              backgroundColor: WHITE,
              paddingHorizontal: 24,
              paddingVertical: 24,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.4,
                marginBottom: 16,
              }}
            >
              From Your Saves
            </Text>
            <View
              style={{
                backgroundColor: "#F0F4FF",
                borderRadius: 18,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(0,122,255,0.12)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <RotateCcw size={20} color="#007AFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: "#1C3D7A",
                    marginBottom: 3,
                    letterSpacing: -0.2,
                  }}
                >
                  Saved {routine.savedWeeksAgo} weeks ago
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: "#2D5BB5",
                    lineHeight: 18,
                  }}
                >
                  Worth revisiting today?
                </Text>
              </View>
            </View>
          </View>

          {/* ── Spacer ─────────────────────────────────────────── */}
          <View style={{ height: 12, backgroundColor: BG }} />

          {/* ── Video Details — remove Last done row ───────────── */}
          <View
            style={{
              backgroundColor: WHITE,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 8,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.4,
                paddingTop: 16,
                paddingBottom: 4,
              }}
            >
              Video Details
            </Text>
            <InfoRow
              icon={<Clock size={16} color="#007AFF" />}
              label="Reminder"
              value={routine.reminderTime}
            />
            <InfoRow
              icon={<RefreshCw size={16} color="#34C759" />}
              label="Repeats"
              value={routine.frequency}
            />
            <InfoRow
              icon={<Tag size={16} color={ORANGE} />}
              label="Category"
              value={`${routine.categoryEmoji}  ${routine.category}`}
            />
            <InfoRow
              icon={<CalendarDays size={16} color={GREY_TEXT} />}
              label="Saved"
              value={routine.addedDate}
              isLast
            />
          </View>

          {/* ── Spacer ─────────────────────────────────────────── */}
          <View style={{ height: 12, backgroundColor: BG }} />

          {/* ── Library nudge — replaces motivational footer ────── */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              backgroundColor: WHITE,
              borderRadius: 20,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: GREY_LIGHT,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <BookmarkCheck size={22} color={BLACK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  marginBottom: 3,
                  letterSpacing: -0.2,
                }}
              >
                This is saved in your library
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                Come back whenever you need it — Recall keeps it safe.
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
