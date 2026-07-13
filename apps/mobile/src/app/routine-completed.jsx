import { View, Text, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { CheckCircle2, ChevronRight } from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import { RecallSavedContentIcon } from "../components/RecallSavedContentIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { getDisplayTitle } from "../utils/titleHelpers";

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const BG = "#FAFAFA";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";
const GREEN = "#34C759";

const VIDEO = {
  title: "Morning Hip Mobility Flow",
  platform: "YouTube",
  creator: "FitWithJordan",
  duration: "10 min",
  savedWeeksAgo: 3,
  thumbnail:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop",
};

function Particle({ angle, distance, delay, size = 5, color = GREEN }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.sequence([
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const rad = (angle * Math.PI) / 180;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(rad) * distance],
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(rad) * distance],
            }),
          },
          {
            scale: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1, 0.5],
            }),
          },
        ],
      }}
    />
  );
}

const PARTICLES = [
  { angle: -80, distance: 48, delay: 0, size: 5, color: GREEN },
  { angle: -30, distance: 54, delay: 40, size: 4, color: "#5AC8FA" },
  { angle: 20, distance: 50, delay: 20, size: 5, color: GREEN },
  { angle: 70, distance: 46, delay: 60, size: 4, color: "#34C759" },
  { angle: 130, distance: 52, delay: 30, size: 4, color: "#5AC8FA" },
  { angle: 200, distance: 48, delay: 50, size: 5, color: GREEN },
  { angle: 270, distance: 50, delay: 10, size: 4, color: GREEN },
];

export default function VideoWatchedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const quoteAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const doneBtnScale = useRef(new Animated.Value(1)).current;
  const vidBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(ringAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 5,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 130,
        friction: 7,
      }),
      Animated.spring(titleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.parallel([
        Animated.spring(cardAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
        }),
        Animated.spring(quoteAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
        }),
        Animated.spring(ctaAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
        }),
      ]),
    ]).start();
  }, []);

  const pressBounce = (anim, cb) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.94,
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
  };

  if (!fontsLoaded) return null;

  const v = VIDEO;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        justifyContent: "center",
        paddingHorizontal: 28,
      }}
    >
      {/* Check animation */}
      <View style={{ alignItems: "center", marginBottom: 36 }}>
        <View
          style={{
            width: 120,
            height: 120,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "rgba(52,199,89,0.08)",
              opacity: glowAnim,
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ],
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: "rgba(52,199,89,0.10)",
              opacity: glowAnim,
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ],
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              width: 84,
              height: 84,
              borderRadius: 42,
              borderWidth: 1.5,
              borderColor: GREEN,
              opacity: ringOpacity,
              transform: [
                {
                  scale: ringAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.6],
                  }),
                },
              ],
            }}
          />
          <Animated.View
            style={{
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: GREEN,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: GREEN,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.26,
              shadowRadius: 18,
              elevation: 8,
              opacity: checkAnim,
              transform: [
                {
                  scale: checkAnim.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.2, 1.06, 1],
                  }),
                },
              ],
            }}
          >
            <CheckCircle2
              size={40}
              color={WHITE}
              fill="rgba(255,255,255,0.18)"
            />
          </Animated.View>
          {PARTICLES.map((p, i) => (
            <Particle key={i} {...p} />
          ))}
        </View>

        <Animated.Text
          style={{
            fontSize: 36,
            fontFamily: "Inter_700Bold",
            color: BLACK,
            letterSpacing: -1.1,
            textAlign: "center",
            lineHeight: 42,
            marginTop: 4,
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          Nice.
        </Animated.Text>
        <Animated.Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            textAlign: "center",
            marginTop: 6,
            opacity: titleAnim,
          }}
        >
          Glad you watched it.
        </Animated.Text>
      </View>

      {/* Video identity card */}
      <Animated.View
        style={{
          backgroundColor: WHITE,
          borderRadius: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          marginBottom: 14,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          elevation: 2,
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        }}
      >
        <Image
          source={v.thumbnail}
          style={{ width: 56, height: 56, borderRadius: 14 }}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_600SemiBold",
              color: BLACK,
              letterSpacing: -0.2,
            }}
          >
            {getDisplayTitle(v.title)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              marginTop: 3,
            }}
          >
            {v.creator} · saved {v.savedWeeksAgo} weeks ago
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
          <CheckCircle2 size={15} color={WHITE} fill="rgba(255,255,255,0.2)" />
        </View>
      </Animated.View>

      {/* Quiet quote */}
      <Animated.View
        style={{
          marginBottom: 32,
          opacity: quoteAnim,
          transform: [
            {
              translateY: quoteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 20,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: GREY_MID,
              marginBottom: 12,
            }}
          />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              textAlign: "center",
              lineHeight: 21,
              letterSpacing: -0.1,
            }}
          >
            This one's still saved in your library for next time.
          </Text>
        </View>
      </Animated.View>

      {/* CTAs */}
      <Animated.View
        style={{
          gap: 10,
          opacity: ctaAnim,
          transform: [
            {
              translateY: ctaAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
        <Animated.View style={{ transform: [{ scale: doneBtnScale }] }}>
          <Pressable
            onPress={() => pressBounce(doneBtnScale, () => router.back())}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#1A1A1A" : BLACK,
              borderRadius: 20,
              paddingVertical: 20,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 8,
            })}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Inter_700Bold",
                color: WHITE,
                letterSpacing: -0.4,
              }}
            >
              Done
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: vidBtnScale }] }}>
          <Pressable
            onPress={() => pressBounce(vidBtnScale)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#EBEBF0" : GREY_LIGHT,
              borderRadius: 20,
              paddingVertical: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
            })}
          >
            <RecallActionIcon name="play" size={14} />
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
                letterSpacing: -0.2,
              }}
            >
              Watch Again
            </Text>
          </Pressable>
        </Animated.View>

        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 14,
          }}
          onPress={() => router.push("/(tabs)/saved")}
        >
          <RecallSavedContentIcon name="collections" size={14} />
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            View Library
          </Text>
          <ChevronRight size={14} color={GREY_MID} />
        </Pressable>
      </Animated.View>

      <View style={{ height: insets.bottom + 8 }} />
    </View>
  );
}
