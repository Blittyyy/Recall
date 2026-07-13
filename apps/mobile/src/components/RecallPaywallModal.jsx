import { Modal, Pressable, Text, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { Check } from "lucide-react-native";
import { RecallReminderIcon } from "./RecallReminderIcon";
import { usePaywallStore } from "../store/usePaywallStore";
import { PAYWALL_TRIGGERS } from "../utils/freemium";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.subtle;
const WHITE = RECALL_COLORS.surface;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.secondaryText;
const GREY_LIGHT = RECALL_COLORS.subtle;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;

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
          backgroundColor: "rgba(28,24,20,0.3)",
          justifyContent: "center",
          paddingHorizontal: 22,
        }}
      >
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: 26,
            paddingTop: 30,
            paddingBottom: 24,
            shadowColor: "#6F5C4C",
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.12,
            shadowRadius: 32,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 20,
              backgroundColor: BG,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <RecallReminderIcon name="sparkles" size={25} />
          </View>

          <Text
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontFamily: "Georgia",
              color: BLACK,
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            Rediscover what matters.
          </Text>

          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 23,
              marginBottom: 24,
            }}
          >
            Recall Pro helps saved moments return at the right time.
          </Text>

          <View
            style={{
              gap: 14,
              marginBottom: 26,
            }}
          >
            {[
              "Smart resurfacing",
              "Unlimited reminders & collections",
              "Advanced rediscovery controls",
            ].map((feature) => (
              <View
                key={feature}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: GREY_LIGHT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={15} color={ACCENT} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "Inter_500Medium",
                    color: BLACK,
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={hidePaywall}
            style={({ pressed }) => ({
              borderRadius: 20,
              backgroundColor: pressed ? "#1F1F1F" : BLACK,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 13,
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              Upgrade to Recall Pro
            </Text>
          </Pressable>

          <Pressable
            onPress={hidePaywall}
            style={({ pressed }) => ({
              paddingVertical: 8,
              alignItems: "center",
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_500Medium",
                color: GREY_TEXT,
              }}
            >
              Maybe later
            </Text>
          </Pressable>

          <Text
            style={{
              marginTop: 14,
              fontSize: 12,
              lineHeight: 17,
              fontFamily: "Inter_400Regular",
              color: "#9A938C",
              textAlign: "center",
            }}
          >
            Users revisit more saved videos with Pro.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
