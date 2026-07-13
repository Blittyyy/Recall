import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BarChart3, ChevronLeft, LockKeyhole, Trash2 } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState } from "react";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const BLACK = RECALL_COLORS.text;
const GREY = RECALL_COLORS.secondaryText;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const RED = "#B44D42";

function IconCircle({ children, danger = false }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: danger ? "#FAEFEC" : RECALL_COLORS.subtle, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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

        <Text style={{ fontFamily: "Georgia", fontSize: 38, lineHeight: 44, color: BLACK }}>Privacy</Text>
        <Text style={{ marginTop: 8, marginBottom: 28, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, color: GREY }}>
          Control your account and saved data.
        </Text>

        <View style={{ borderRadius: 26, overflow: "hidden", backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, shadowColor: "#8D7A68", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2 }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <IconCircle><LockKeyhole size={19} color={ACCENT} strokeWidth={1.7} /></IconCircle>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: BLACK }}>Private saves</Text>
              <Text style={{ marginTop: 3, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, color: GREY }}>
                Your saved videos are only visible to you.
              </Text>
            </View>
          </View>

          <View style={{ height: 1, marginLeft: 72, backgroundColor: "rgba(231,222,211,0.7)" }} />

          <View style={{ paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <IconCircle><BarChart3 size={19} color={ACCENT} strokeWidth={1.7} /></IconCircle>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: BLACK }}>Analytics</Text>
              <Text style={{ marginTop: 3, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, color: GREY }}>
                Help improve Recall with anonymous usage data.
              </Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{ false: "#E6DED5", true: BLACK }}
              thumbColor={SURFACE}
            />
          </View>

          <View style={{ height: 1, marginLeft: 72, backgroundColor: "rgba(231,222,211,0.7)" }} />

          <Pressable
            onPress={() => Alert.alert("Delete account", "Account deletion is not available here yet.")}
            style={({ pressed }) => ({
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: pressed ? "#FCF5F2" : SURFACE,
            })}
          >
            <IconCircle danger><Trash2 size={19} color={RED} strokeWidth={1.7} /></IconCircle>
            <Text style={{ flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: RED }}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
