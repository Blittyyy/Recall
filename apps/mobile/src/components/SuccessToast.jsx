import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RECALL_COLORS } from "../constants/recallTheme";
import { useAppearanceStore } from "../store/useAppearanceStore";

const SURFACE = RECALL_COLORS.surface;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const ACCENT = RECALL_COLORS.accent;
const SHADOW = RECALL_COLORS.shadow;

/**
 * Lightweight floating confirmation banner (Apple-style).
 * Parent controls `visible`; call `onDismissed` after the exit animation.
 */
export function SuccessToast({
  title,
  subtitle,
  visible,
  bottomOffset = 90,
  onDismissed,
}) {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      translateY.value = 12;
      return;
    }

    const finish = () => {
      onDismissed?.();
    };

    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      const timeoutId = setTimeout(finish, 1500);
      return () => clearTimeout(timeoutId);
    }

    opacity.value = 0;
    translateY.value = 12;

    opacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withDelay(
        1200,
        withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(finish)();
          }
        }),
      ),
    );

    translateY.value = withSequence(
      withSpring(0, { damping: 18, stiffness: 260, mass: 0.85 }),
      withDelay(1200, withTiming(-8, { duration: 280, easing: Easing.in(Easing.cubic) })),
    );

    return undefined;
  }, [onDismissed, opacity, reduceMotion, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || !title) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: bottomOffset,
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={[
          {
            maxWidth: "100%",
            backgroundColor: SURFACE,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: SHADOW,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 6,
            borderWidth: 1,
            borderColor: "rgba(231,222,211,0.9)",
          },
          animatedStyle,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontFamily: "Inter_600SemiBold",
              color: ACCENT,
              marginTop: 1,
            }}
          >
            ✓
          </Text>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 20,
                fontFamily: "Inter_600SemiBold",
                color: TEXT,
                letterSpacing: -0.2,
              }}
            >
              {title.replace(/^\s*✓\s*/, "")}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  lineHeight: 18,
                  fontFamily: "Inter_400Regular",
                  color: MUTED,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
