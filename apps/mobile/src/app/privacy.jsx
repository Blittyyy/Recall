import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
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
import {
  deleteRecallAccount,
  getFriendlySupabaseError,
} from "../services/supabaseClient";
import { useSupabaseSessionStore } from "../store/useSupabaseSessionStore";
import { useRecallStore } from "../store/useRecallStore";
import { resetRecallOnboardingState } from "../services/onboardingService";
import { resetAnalyticsUser } from "../services/analytics";
import { cancelAllReminderNotifications } from "../services/recallNotifications";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const BLACK = RECALL_COLORS.text;
const GREY = RECALL_COLORS.secondaryText;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const RED = "#B44D42";

function IconCircle({ children, danger = false }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: danger ? "#FAEFEC" : RECALL_COLORS.subtle,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const supabaseUser = useSupabaseSessionStore((s) => s.user);
  const initializeRecall = useRecallStore((s) => s.initialize);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const performDeleteAccount = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const userId = supabaseUser?.id ?? null;
      await deleteRecallAccount();
      await cancelAllReminderNotifications().catch(() => null);
      await resetRecallOnboardingState(userId).catch(() => null);
      resetAnalyticsUser();
      await initializeRecall({ user: null, accessToken: null }).catch(() => null);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Couldn't delete account",
        getFriendlySupabaseError(
          error,
          "Please try again in a moment. If this keeps happening, email GetRecall@outlook.com.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeleting) return;

    Alert.alert(
      "Delete your Recall account?",
      "This permanently deletes your account, saves, collections, and reminders. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "Your library will be removed from Recall and you will be signed out.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete account",
                  style: "destructive",
                  onPress: () => {
                    performDeleteAccount();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={isDeleting}
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
            opacity: isDeleting ? 0.5 : 1,
          })}
        >
          <ChevronLeft size={21} color={BLACK} />
        </Pressable>

        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: 38,
            lineHeight: 44,
            color: BLACK,
          }}
        >
          Privacy
        </Text>
        <Text
          style={{
            marginTop: 8,
            marginBottom: 28,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            lineHeight: 22,
            color: GREY,
          }}
        >
          Control your account and saved data.
        </Text>

        <View
          style={{
            borderRadius: 26,
            overflow: "hidden",
            backgroundColor: SURFACE,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.06,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <IconCircle>
              <LockKeyhole size={19} color={ACCENT} strokeWidth={1.7} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                  color: BLACK,
                }}
              >
                Private saves
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  lineHeight: 18,
                  color: GREY,
                }}
              >
                Your saved videos are only visible to you.
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              marginLeft: 72,
              backgroundColor: "rgba(231,222,211,0.7)",
            }}
          />

          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <IconCircle>
              <BarChart3 size={19} color={ACCENT} strokeWidth={1.7} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                  color: BLACK,
                }}
              >
                Analytics
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  lineHeight: 18,
                  color: GREY,
                }}
              >
                Help improve Recall with anonymous usage data.
              </Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              disabled={isDeleting}
              trackColor={{ false: "#E6DED5", true: BLACK }}
              thumbColor={SURFACE}
            />
          </View>

          <View
            style={{
              height: 1,
              marginLeft: 72,
              backgroundColor: "rgba(231,222,211,0.7)",
            }}
          />

          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            style={({ pressed }) => ({
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: pressed ? "#FCF5F2" : SURFACE,
              opacity: isDeleting ? 0.7 : 1,
            })}
          >
            <IconCircle danger>
              {isDeleting ? (
                <ActivityIndicator size="small" color={RED} />
              ) : (
                <Trash2 size={19} color={RED} strokeWidth={1.7} />
              )}
            </IconCircle>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                  color: RED,
                }}
              >
                {isDeleting ? "Deleting account…" : "Delete account"}
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  lineHeight: 18,
                  color: GREY,
                }}
              >
                Permanently remove your account and library.
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
