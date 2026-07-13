import {
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  X,
  Instagram,
  Youtube,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
} from "lucide-react-native";
import { RecallReminderIcon } from "../components/RecallReminderIcon";
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
import { getDisplayTitle } from "../utils/titleHelpers";

// ─── Design tokens ────────────────────────────────────────────────────────────
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";
const GREEN = "#34C759";
const BLUE = "#007AFF";
const { width: SW, height: SH } = Dimensions.get("window");

// ─── Mock shared video payloads ───────────────────────────────────────────────
const PLATFORMS = {
  youtube: {
    key: "youtube",
    platform: "YouTube",
    color: "#FF0000",
    appBg: "#0F0F0F",
    title: "10-Minute Morning Hip Mobility Routine",
    creator: "FitWithJordan",
    duration: "10 min",
    thumbnail:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop",
  },
  instagram: {
    key: "instagram",
    platform: "Instagram",
    color: "#E4405F",
    appBg: "#000000",
    title: "Full Body Mobility Flow — Try This Every Morning",
    creator: "@movewithgrace",
    duration: "7 min",
    thumbnail:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900&auto=format&fit=crop",
  },
  tiktok: {
    key: "tiktok",
    platform: "TikTok",
    color: "#000000",
    appBg: "#010101",
    title: "5-Minute Deep Stretch You Need Every Day",
    creator: "@wellnesswithsara",
    duration: "5 min",
    thumbnail:
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=900&auto=format&fit=crop",
  },
};

const FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "3x", label: "3× / week" },
  { id: "weekly", label: "Weekly" },
];

const TIMES = [
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "12:00 PM",
  "6:00 PM",
  "9:00 PM",
];

// ─── Platform icon ────────────────────────────────────────────────────────────
function TikTokMark({ size = 13, color = "#000" }) {
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

// ─── Pulsing dot loader ────────────────────────────────────────────────────────
function PulsingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 140),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: GREY_MID,
            opacity: dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
            transform: [
              {
                scale: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── Fake source-app background ───────────────────────────────────────────────
function AppBackground({ video }) {
  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Image
        source={video.thumbnail}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
      />
      <View
        style={{
          position: "absolute",
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.72)",
        }}
      />
    </View>
  );
}

// ─── PHASE 0 — Parsing loader ─────────────────────────────────────────────────
function ParsingView({ video, opacity, translateY }) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingVertical: 36,
        alignItems: "center",
        gap: 0,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 16,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Drag handle */}
      <View
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: GREY_LIGHT,
          marginBottom: 32,
        }}
      />

      {/* App icon */}
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          backgroundColor: BLACK,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 28 }}>◎</Text>
      </View>

      <Text
        style={{
          fontSize: 18,
          fontFamily: "Inter_700Bold",
          color: BLACK,
          letterSpacing: -0.4,
          marginBottom: 6,
        }}
      >
        Recall
      </Text>

      {/* Platform label */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: GREY_LIGHT,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 7,
          marginBottom: 28,
        }}
      >
        <PlatformIcon platform={video.platform} size={13} />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_500Medium",
            color: GREY_TEXT,
          }}
        >
          Importing from {video.platform}
        </Text>
      </View>

      <PulsingDots />

      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: GREY_MID,
          marginTop: 14,
          textAlign: "center",
        }}
      >
        Reading video details…
      </Text>
    </Animated.View>
  );
}

// ─── PHASE 1 — Preview + Quick Setup ─────────────────────────────────────────
function SetupView({ video, insets, opacity, translateY, onSave }) {
  const [freq, setFreq] = useState("daily");
  const [time, setTime] = useState("7:00 AM");
  const [showTimes, setShowTimes] = useState(false);

  const saveBtnScale = useRef(new Animated.Value(1)).current;

  const handleSave = () => {
    Animated.sequence([
      Animated.timing(saveBtnScale, {
        toValue: 0.94,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(saveBtnScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 6,
      }),
    ]).start(() => onSave());
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: insets.bottom + 16,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 16,
        opacity,
        transform: [{ translateY }],
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
          marginTop: 14,
          marginBottom: 0,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 20,
          paddingBottom: 8,
        }}
      >
        {/* ── Video card ────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 22,
            overflow: "hidden",
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.09,
            shadowRadius: 18,
            elevation: 5,
            marginBottom: 22,
          }}
        >
          {/* Thumbnail */}
          <View style={{ position: "relative" }}>
            <Image
              source={video.thumbnail}
              style={{ width: "100%", height: 160 }}
              contentFit="cover"
            />
            {/* Scrim */}
            <View
              style={{
                position: "absolute",
                inset: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.22)",
              }}
            />
            {/* Platform badge */}
            <View
              style={{
                position: "absolute",
                top: 11,
                left: 11,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "rgba(255,255,255,0.96)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 5,
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
            {/* Duration badge */}
            <View
              style={{
                position: "absolute",
                top: 11,
                right: 11,
                backgroundColor: "rgba(0,0,0,0.52)",
                borderRadius: 12,
                paddingHorizontal: 9,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                  color: WHITE,
                }}
              >
                {video.duration}
              </Text>
            </View>
          </View>

          {/* Info row */}
          <View style={{ paddingHorizontal: 15, paddingVertical: 14 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.35,
                marginBottom: 3,
                lineHeight: 21,
              }}
            >
              {getDisplayTitle(video.title)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
              }}
            >
              {video.creator}
            </Text>
          </View>
        </View>

        {/* ── Quick Setup ───────────────────────────────────────── */}
        {/* Section label */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 13,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: GREY_LIGHT,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <RecallReminderIcon name="rediscovery" size={13} />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: BLACK,
            }}
          >
            How often?
          </Text>
        </View>

        {/* Frequency chips */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {FREQUENCIES.map((f) => {
            const active = freq === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFreq(f.id)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 32,
                  backgroundColor: active ? BLACK : GREY_LIGHT,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: active
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                    color: active ? WHITE : "#3C3C43",
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Time row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 13,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: GREY_LIGHT,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Clock size={13} color={GREY_TEXT} />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: BLACK,
            }}
          >
            When?
          </Text>
        </View>

        {/* Time selector row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          style={{ flexGrow: 0, marginBottom: 24 }}
        >
          {TIMES.map((t) => {
            const active = time === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTime(t)}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: active ? BLACK : GREY_LIGHT,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: active
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                    color: active ? WHITE : BLACK,
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: saveBtnScale }] }}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#1A1A1A" : BLACK,
              borderRadius: 20,
              paddingVertical: 19,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.22,
              shadowRadius: 22,
              elevation: 8,
              marginBottom: 6,
            })}
          >
            <RecallReminderIcon name="sparkles" size={17} />
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: WHITE,
                letterSpacing: -0.3,
              }}
            >
              Start Routine
            </Text>
          </Pressable>
        </Animated.View>

        {/* Tagline */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: GREY_MID,
            marginTop: 10,
            lineHeight: 17,
          }}
        >
          Stop losing the things that inspire you online.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

// ─── PHASE 2 — Success ────────────────────────────────────────────────────────
function SuccessView({ video, insets, opacity, translateY, onDone }) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger: ring → check → content
    Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1.5,
          useNativeDriver: true,
          tension: 60,
          friction: 6,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(contentAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 40,
        paddingBottom: insets.bottom + 28,
        alignItems: "center",
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 16,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {/* Check icon with ripple ring */}
      <View
        style={{
          width: 96,
          height: 96,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        {/* Ripple ring */}
        <Animated.View
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 2,
            borderColor: GREEN,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        {/* Filled circle */}
        <Animated.View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: GREEN,
            justifyContent: "center",
            alignItems: "center",
            opacity: checkOpacity,
            transform: [{ scale: checkScale }],
            shadowColor: GREEN,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <CheckCircle2 size={42} color={WHITE} fill="rgba(255,255,255,0.18)" />
        </Animated.View>
      </View>

      {/* Text block */}
      <Animated.View
        style={{
          alignItems: "center",
          opacity: contentAnim,
          transform: [
            {
              translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
          marginBottom: 28,
          width: "100%",
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontFamily: "Inter_700Bold",
            color: BLACK,
            letterSpacing: -0.7,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Routine created!
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", color: BLACK }}>
            {getDisplayTitle(video.title)}
          </Text>
          {"\n"}will remind you every day at 7:00 AM.
        </Text>

        {/* Confirmation row */}
        <Animated.View
          style={{
            marginTop: 22,
            backgroundColor: GREY_LIGHT,
            borderRadius: 18,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            width: "100%",
            opacity: contentAnim,
          }}
        >
          <Image
            source={video.thumbnail}
            style={{ width: 52, height: 52, borderRadius: 12 }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginBottom: 4,
              }}
            >
              <PlatformIcon platform={video.platform} size={11} />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                  color: GREY_TEXT,
                }}
              >
                {video.platform}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
              }}
            >
              {getDisplayTitle(video.title)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 1,
              }}
            >
              Daily · 7:00 AM
            </Text>
          </View>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: GREEN,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CheckCircle2
              size={15}
              color={WHITE}
              fill="rgba(255,255,255,0.2)"
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Done button */}
      <Animated.View style={{ width: "100%", opacity: contentAnim }}>
        <Pressable
          onPress={onDone}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1A1A1A" : BLACK,
            borderRadius: 20,
            paddingVertical: 18,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 18,
            elevation: 6,
            marginBottom: 12,
          })}
        >
          <Text
            style={{
              fontSize: 17,
              fontFamily: "Inter_700Bold",
              color: WHITE,
              letterSpacing: -0.3,
            }}
          >
            Done
          </Text>
        </Pressable>
        <Pressable style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            View in Recall
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ShareImportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Cycle through the three source platforms for demo
  const platformKeys = ["youtube", "instagram", "tiktok"];
  const [platformIdx, setPlatformIdx] = useState(0);
  const video = PLATFORMS[platformKeys[platformIdx]];

  // phase: "parsing" → "setup" → "success"
  const [phase, setPhase] = useState("parsing");

  // ── Sheet slide-up ──
  const sheetAnim = useRef(new Animated.Value(1)).current; // 0=up, 1=down
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  // ── Per-phase anims ──
  const parsingAnim = useRef(new Animated.Value(1)).current;
  const setupAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const SHEET_HEIGHT = 330;
  const SETUP_HEIGHT = SH * 0.78;

  // Animate sheet entrance on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
        delay: 80,
      }),
    ]).start();

    // Auto-advance from parsing → setup after 2s
    const t = setTimeout(() => advanceTo("setup"), 2000);
    return () => clearTimeout(t);
  }, []);

  const advanceTo = useCallback((target) => {
    if (target === "setup") {
      Animated.parallel([
        Animated.timing(parsingAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(setupAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
          delay: 80,
        }),
      ]).start(() => setPhase("setup"));
    } else if (target === "success") {
      Animated.parallel([
        Animated.timing(setupAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
          delay: 80,
        }),
      ]).start(() => setPhase("success"));
    }
  }, []);

  const handleSave = useCallback(() => advanceTo("success"), []);

  const handleDone = useCallback(() => {
    router.back();
  }, []);

  const handleReset = useCallback(() => {
    // Cycle to next platform and reset
    setPhase("parsing");
    parsingAnim.setValue(1);
    setupAnim.setValue(0);
    successAnim.setValue(0);
    setPlatformIdx((i) => (i + 1) % platformKeys.length);
    const t = setTimeout(() => advanceTo("setup"), 2000);
    return () => clearTimeout(t);
  }, [platformIdx]);

  if (!fontsLoaded) return null;

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  // Per-phase translateY helpers
  const phaseTranslate = (anim) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={{ flex: 1 }}>
      {/* ── Source app backdrop ───────────────────────────────────── */}
      <AppBackground video={video} />

      {/* ── Dim overlay ──────────────────────────────────────────── */}
      <Animated.View
        style={{
          position: "absolute",
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.46)",
          opacity: sheetOpacity,
        }}
      />

      {/* ── Back / platform switcher (demo UI) ───────────────────── */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: pressed
              ? "rgba(255,255,255,0.25)"
              : "rgba(255,255,255,0.16)",
            justifyContent: "center",
            alignItems: "center",
          })}
        >
          <ArrowLeft size={18} color={WHITE} />
        </Pressable>

        {/* Platform switcher pills */}
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          {platformKeys.map((k, i) => {
            const active = i === platformIdx;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  setPlatformIdx(i);
                  setPhase("parsing");
                  parsingAnim.setValue(1);
                  setupAnim.setValue(0);
                  successAnim.setValue(0);
                  setTimeout(() => advanceTo("setup"), 2000);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: active
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.16)",
                  borderRadius: 18,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <PlatformIcon platform={PLATFORMS[k].platform} size={11} />
                {active && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Inter_600SemiBold",
                      color: BLACK,
                    }}
                  >
                    {PLATFORMS[k].platform}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Dismiss X */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
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

      {/* ── Step indicator (demo only) ────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 66,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          zIndex: 20,
        }}
      >
        {[
          { key: "parsing", label: "1  Sharing" },
          { key: "setup", label: "2  Setup" },
          { key: "success", label: "3  Saved" },
        ].map((step, i) => {
          const isActive = phase === step.key;
          const isDone =
            (step.key === "parsing" &&
              (phase === "setup" || phase === "success")) ||
            (step.key === "setup" && phase === "success");
          return (
            <View
              key={step.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.95)"
                  : isDone
                    ? "rgba(52,199,89,0.85)"
                    : "rgba(255,255,255,0.18)",
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              {isDone && (
                <CheckCircle2
                  size={11}
                  color={WHITE}
                  fill="rgba(255,255,255,0.2)"
                />
              )}
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: isActive
                    ? "Inter_600SemiBold"
                    : "Inter_500Medium",
                  color: isActive ? BLACK : WHITE,
                }}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Phase: PARSING ───────────────────────────────────────── */}
      <ParsingView
        video={video}
        opacity={parsingAnim}
        translateY={sheetTranslate}
      />

      {/* ── Phase: SETUP ─────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={phase === "setup" ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          opacity: setupAnim,
          transform: [{ translateY: phaseTranslate(setupAnim) }],
        }}
      >
        <SetupView
          video={video}
          insets={insets}
          opacity={setupAnim}
          translateY={phaseTranslate(setupAnim)}
          onSave={handleSave}
        />
      </Animated.View>

      {/* ── Phase: SUCCESS ────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={phase === "success" ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          opacity: successAnim,
          transform: [{ translateY: phaseTranslate(successAnim) }],
        }}
      >
        <SuccessView
          video={video}
          insets={insets}
          opacity={successAnim}
          translateY={phaseTranslate(successAnim)}
          onDone={handleDone}
        />
      </Animated.View>
    </View>
  );
}
