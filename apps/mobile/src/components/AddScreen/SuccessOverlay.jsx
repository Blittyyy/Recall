import { View, Text, Modal, Animated, Pressable } from "react-native";
import { CheckCircle } from "lucide-react-native";
import { useRef, useEffect } from "react";

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_LIGHT = "#F2F2F7";
const GREY_TEXT = "#8E8E93";
const GREEN = "#34C759";

export function SuccessOverlay({
  visible,
  mode = "saved",
  onViewLibrary,
  onAddReminder,
  onSaveAnother,
  onDone,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.86)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.86);
    checkAnim.setValue(0);

    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 11,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 11,
      }),
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(checkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }),
      ]),
    ]).start();
  }, [checkAnim, fadeAnim, scaleAnim, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.42)",
          justifyContent: "center",
          alignItems: "center",
          opacity: fadeAnim,
          paddingHorizontal: 28,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: WHITE,
            borderRadius: 32,
            padding: 30,
            alignItems: "center",
            width: "100%",
            transform: [{ scale: scaleAnim }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.2,
            shadowRadius: 48,
            elevation: 12,
          }}
        >
          <Animated.View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: GREEN,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 22,
              transform: [{ scale: checkAnim }],
              shadowColor: GREEN,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 18,
              elevation: 8,
            }}
          >
            <CheckCircle size={40} color={WHITE} strokeWidth={2.5} />
          </Animated.View>

          <Text
            style={{
              fontSize: 23,
              fontFamily: "Inter_700Bold",
              color: BLACK,
              letterSpacing: -0.7,
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            {mode === "duplicate"
              ? "You already saved this video."
              : "Saved to Recall"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              marginBottom: 24,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {mode === "duplicate"
              ? "You can find it in your Library anytime."
              : "We'll keep it safe and bring it back when it matters."}
          </Text>

          <View style={{ width: "100%", gap: 10 }}>
            <Pressable
              onPress={onViewLibrary}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#1A1A1A" : BLACK,
                borderRadius: 18,
                paddingVertical: 15,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                  color: WHITE,
                }}
              >
                View in Library
              </Text>
            </Pressable>

            {mode === "duplicate" ? (
              <SecondaryButton label="Save Another" onPress={onSaveAnother} />
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <SecondaryButton label="Add Reminder" onPress={onAddReminder} />
                <SecondaryButton label="Save Another" onPress={onSaveAnother} />
              </View>
            )}

            <Pressable
              onPress={onDone}
              style={({ pressed }) => ({
                marginTop: 4,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: pressed ? "#E8E8ED" : "transparent",
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: GREY_TEXT,
                }}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SecondaryButton({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: pressed ? "#E8E8ED" : GREY_LIGHT,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_600SemiBold",
          color: BLACK,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
