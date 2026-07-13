import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import { RecallProfileIcon } from "../components/RecallProfileIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const BLACK = RECALL_COLORS.text;
const GREY = RECALL_COLORS.secondaryText;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;

const SUPPORT_EMAIL = "GetRecall@gmail.com";

function openSupportEmail(subject, body) {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  Linking.openURL(url).catch(() => {
    Alert.alert(
      "Email unavailable",
      `Please email us directly at ${SUPPORT_EMAIL}.`,
    );
  });
}

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const rows = [
    {
      label: "Saving from other apps",
      recallIcon: "share",
      onPress: () => router.push("/saving-from-other-apps"),
    },
    {
      label: "FAQ",
      profileIcon: "help",
      onPress: () => router.push("/faq"),
    },
    {
      label: "Contact Support",
      profileIcon: "contact",
      onPress: () =>
        openSupportEmail(
          "Recall Support Request",
          `Hi Recall Team,

I need help with:

[Describe your issue here]

---

App Version:
Device:
iOS Version:
------------`,
        ),
    },
    {
      label: "Suggest a Feature",
      icon: Lightbulb,
      onPress: () =>
        openSupportEmail(
          "Recall Feature Idea",
          `Hi Recall Team,

I'd love to see Recall support:

[Feature idea]

This would help because:

[Optional details]`,
        ),
    },
    {
      label: "Report a Bug",
      icon: Bug,
      onPress: () =>
        openSupportEmail(
          "Recall Bug Report",
          `Hi Recall Team,

I found a bug:

[Describe the issue]

Steps to reproduce:
1.
2.
3.

---

App Version:
Device:
iOS Version:
------------`,
        ),
    },
    {
      label: "Privacy Policy",
      profileIcon: "shield-check",
      onPress: () => router.push("/privacy-policy"),
    },
    {
      label: "Terms of Service",
      recallIcon: "document",
      onPress: () => router.push("/terms-of-service"),
    },
  ];

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: pressed ? "#F1ECE6" : SURFACE,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 1,
          })}
        >
          <ChevronLeft size={21} color={BLACK} />
        </Pressable>

        <Text style={{ fontFamily: "Georgia", fontSize: 38, lineHeight: 44, color: BLACK }}>Help & Support</Text>
        <Text style={{ marginTop: 8, marginBottom: 28, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, color: GREY }}>
          Questions, feedback, or ideas? We'd love to hear from you.
        </Text>

        <View style={{ borderRadius: 26, overflow: "hidden", backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, shadowColor: "#8D7A68", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2 }}>
          {rows.map(({ label, icon: Icon, recallIcon, profileIcon, onPress }, index) => (
            <View key={label}>
              <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                  minHeight: 66,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: pressed ? RECALL_COLORS.subtle : SURFACE,
                })}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: RECALL_COLORS.subtle, alignItems: "center", justifyContent: "center" }}>
                  {profileIcon ? (
                    <RecallProfileIcon name={profileIcon} size={18} />
                  ) : recallIcon ? (
                    <RecallActionIcon name={recallIcon} size={18} />
                  ) : (
                    <Icon size={18} color={ACCENT} strokeWidth={1.7} />
                  )}
                </View>
                <Text style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: BLACK }}>{label}</Text>
                <ChevronRight size={17} color={RECALL_COLORS.mid} />
              </Pressable>
              {index < rows.length - 1 ? (
                <View style={{ height: 1, marginLeft: 70, backgroundColor: BORDER, opacity: 0.7 }} />
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
