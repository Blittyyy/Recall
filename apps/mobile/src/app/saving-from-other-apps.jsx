import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import { RecallSavedContentIcon } from "../components/RecallSavedContentIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import {
  SHARE_EXTENSION_COMPATIBILITY,
  SHARE_EXTENSION_FLOW_STEPS,
  SHARE_EXTENSION_HELP_SUBTITLE,
  SHARE_EXTENSION_TIP,
} from "../constants/shareExtensionEducation";
import { RECALL_COLORS } from "../constants/recallTheme";

const PRIMARY_BUTTON = "#111111";
const PRIMARY_BUTTON_TEXT = "#FFFFFF";

function StepIcon({ step }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: RECALL_COLORS.subtle,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {step.actionIcon ? (
        <RecallActionIcon name={step.actionIcon} size={20} />
      ) : (
        <RecallSavedContentIcon name={step.savedIcon} size={20} />
      )}
    </View>
  );
}

function FlowStep({ step, index, isLast }) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ alignItems: "center", width: 44 }}>
        <StepIcon step={step} />
        {!isLast ? (
          <View
            style={{
              width: 1,
              flex: 1,
              minHeight: 28,
              marginTop: 8,
              backgroundColor: RECALL_COLORS.border,
              opacity: 0.75,
            }}
          />
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          paddingBottom: isLast ? 0 : 26,
          paddingTop: 2,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            lineHeight: 16,
            color: RECALL_COLORS.mid,
            letterSpacing: 0.2,
            marginBottom: 4,
          }}
        >
          Step {index + 1}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
            lineHeight: 22,
            color: RECALL_COLORS.text,
            letterSpacing: -0.25,
            marginBottom: 4,
          }}
        >
          {step.title}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            lineHeight: 20,
            color: RECALL_COLORS.secondaryText,
          }}
        >
          {step.body}
        </Text>
      </View>
    </View>
  );
}

export default function SavingFromOtherAppsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: RECALL_COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: pressed
              ? RECALL_COLORS.subtle
              : RECALL_COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 22,
          })}
        >
          <ChevronLeft size={21} color={RECALL_COLORS.text} />
        </Pressable>

        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: 32,
            lineHeight: 36,
            color: RECALL_COLORS.text,
            letterSpacing: -0.6,
          }}
        >
          Saving from other apps
        </Text>
        <Text
          style={{
            marginTop: 10,
            marginBottom: 22,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            lineHeight: 22,
            color: RECALL_COLORS.secondaryText,
            maxWidth: 340,
          }}
        >
          {SHARE_EXTENSION_HELP_SUBTITLE}
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 28,
          }}
        >
          {SHARE_EXTENSION_COMPATIBILITY.map((label) => (
            <View
              key={label}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: RECALL_COLORS.border,
                backgroundColor: RECALL_COLORS.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  lineHeight: 16,
                  color: RECALL_COLORS.secondaryText,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 24 }}>
          {SHARE_EXTENSION_FLOW_STEPS.map((step, index) => (
            <FlowStep
              key={step.title}
              step={step}
              index={index}
              isLast={index === SHARE_EXTENSION_FLOW_STEPS.length - 1}
            />
          ))}
        </View>

        <View
          style={{
            borderRadius: 20,
            backgroundColor: RECALL_COLORS.surface,
            paddingHorizontal: 18,
            paddingVertical: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <RecallSavedContentIcon name="bookmark-check" size={16} />
            <Text
              style={{
                flex: 1,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                lineHeight: 18,
                color: RECALL_COLORS.text,
              }}
            >
              {SHARE_EXTENSION_TIP.title}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              lineHeight: 19,
              color: RECALL_COLORS.secondaryText,
            }}
          >
            {SHARE_EXTENSION_TIP.body}
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 12, 20),
          borderTopWidth: 1,
          borderTopColor: RECALL_COLORS.border,
          backgroundColor: RECALL_COLORS.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            borderRadius: 18,
            backgroundColor: pressed ? "#1F1F1F" : PRIMARY_BUTTON,
            paddingVertical: 16,
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_700Bold",
              color: PRIMARY_BUTTON_TEXT,
            }}
          >
            Got it
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
