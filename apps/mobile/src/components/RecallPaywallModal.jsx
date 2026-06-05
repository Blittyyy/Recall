import { Modal, Pressable, Text, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { Sparkles } from "lucide-react-native";
import { usePaywallStore } from "../store/usePaywallStore";
import { PAYWALL_TRIGGERS } from "../utils/freemium";

const BG = "#F7F7F5";
const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F0";

function getTriggerSubtitle(trigger) {
  if (trigger === PAYWALL_TRIGGERS.SAVE_VIDEO) {
    return "Free includes up to 25 saved videos.";
  }

  if (trigger === PAYWALL_TRIGGERS.CREATE_REMINDER) {
    return "Free includes up to 3 active reminders.";
  }

  if (trigger === PAYWALL_TRIGGERS.CREATE_COLLECTION) {
    return "Free includes up to 3 collections.";
  }

  if (trigger === PAYWALL_TRIGGERS.ADVANCED_RESURFACING) {
    return "Advanced resurfacing controls will be part of Pro.";
  }

  return "Upgrade to keep unlimited videos, reminders, and collections in Recall.";
}

export function RecallPaywallModal() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isVisible = usePaywallStore((state) => state.isVisible);
  const trigger = usePaywallStore((state) => state.trigger);
  const hidePaywall = usePaywallStore((state) => state.hidePaywall);

  if (!fontsLoaded) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={hidePaywall}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(17,17,17,0.34)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 30,
            paddingHorizontal: 24,
            paddingTop: 26,
            paddingBottom: 22,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 28,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 22,
              backgroundColor: BG,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Sparkles size={28} color={BLACK} />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontFamily: "Inter_700Bold",
              color: BLACK,
              letterSpacing: -0.8,
              marginBottom: 10,
            }}
          >
            Save more of what matters.
          </Text>

          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 22,
              marginBottom: 12,
            }}
          >
            Upgrade to keep unlimited videos, reminders, and collections in
            Recall.
          </Text>

          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_500Medium",
              color: GREY_TEXT,
              lineHeight: 19,
              marginBottom: 24,
            }}
          >
            {getTriggerSubtitle(trigger)}
          </Text>

          <Pressable
            onPress={hidePaywall}
            style={({ pressed }) => ({
              borderRadius: 18,
              backgroundColor: pressed ? "#1F1F1F" : BLACK,
              paddingVertical: 15,
              alignItems: "center",
              marginBottom: 10,
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              Upgrade to Pro
            </Text>
          </Pressable>

          <Pressable
            onPress={hidePaywall}
            style={({ pressed }) => ({
              borderRadius: 18,
              backgroundColor: pressed ? "#ECECE8" : GREY_LIGHT,
              paddingVertical: 15,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
              }}
            >
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
