import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { RECALL_COLORS } from "../constants/recallTheme";

export default function TermsOfServiceScreen() {
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
          paddingBottom: insets.bottom + 36,
        }}
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
            marginBottom: 24,
          })}
        >
          <ChevronLeft size={21} color={RECALL_COLORS.text} />
        </Pressable>

        <Text style={{ fontFamily: "Georgia", fontSize: 38, lineHeight: 44, color: RECALL_COLORS.text }}>
          Terms of Service
        </Text>
        <Text style={{ marginTop: 8, marginBottom: 28, fontFamily: "Inter_400Regular", fontSize: 14, color: RECALL_COLORS.secondaryText }}>
          Last updated: June 2026
        </Text>

        <View
          style={{
            borderRadius: 26,
            backgroundColor: RECALL_COLORS.surface,
            padding: 22,
            shadowColor: RECALL_COLORS.shadow,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.06,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: RECALL_COLORS.subtle, alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <RecallActionIcon name="document" size={21} />
          </View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 24, color: RECALL_COLORS.text }}>
            By using Recall, you agree to use the app responsibly and in accordance with platform guidelines.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
