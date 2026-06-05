import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useRecallStore } from "../store/useRecallStore";
import {
  getNotificationPermissionStatus,
  getNotificationPreferences,
  requestNotificationPermission,
  resyncReminderNotifications,
  scheduleDebugNotificationInTenSeconds,
  updateNotificationPreferences,
} from "../services/recallNotifications";

const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";

function SettingsCard({ children }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

function Divider({ indent = 18 }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: GREY_LIGHT,
        marginLeft: indent,
      }}
    />
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_500Medium",
            color: BLACK,
            marginBottom: subtitle ? 2 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 18,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: GREY_LIGHT, true: BLACK }}
        thumbColor={WHITE}
      />
    </View>
  );
}

function InfoRow({ title, subtitle }) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 2,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_500Medium",
          color: BLACK,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videos = useRecallStore((s) => s.videos);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [permissionStatus, setPermissionStatus] = useState("undetermined");
  const [preferences, setPreferences] = useState({
    enableAllNotifications: true,
    reminderNotifications: true,
    resurfacingNotifications: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [testMessage, setTestMessage] = useState("");
  const reminderFollowUpCount = videos.filter(
    (video) => (video.reminderFollowUpDelayMinutes ?? 0) > 0,
  ).length;

  useEffect(() => {
    let active = true;

    Promise.all([
      getNotificationPermissionStatus(),
      getNotificationPreferences(),
    ])
      .then(([status, storedPreferences]) => {
        if (!active) return;
        setPermissionStatus(status);
        setPreferences(storedPreferences);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!fontsLoaded) return null;

  const handleRequestPermission = async () => {
    const nextStatus = await requestNotificationPermission();
    setPermissionStatus(nextStatus);
    if (nextStatus === "granted") {
      await resyncReminderNotifications(videos, { requestPermission: false });
    }
  };

  const handleToggleReminders = async (value) => {
    const next = await updateNotificationPreferences({
      ...(value ? { enableAllNotifications: true } : {}),
      reminderNotifications: value,
    });
    setPreferences(next);
    await resyncReminderNotifications(videos, { requestPermission: value });
  };

  const handleDebugTestNotification = async () => {
    setTestMessage("");
    const result = await scheduleDebugNotificationInTenSeconds();
    if (!result.scheduled) {
      setTestMessage(
        result.permissionStatus === "denied"
          ? "Notification permission is denied on this device."
          : "Test notification could not be scheduled.",
      );
      return;
    }

    setTestMessage("Test notification scheduled for about 10 seconds from now.");
  };

  const showPersistentBannerHelp = () => {
    Alert.alert(
      "How to make reminders persistent",
      "Settings > Notifications > Recall > Banner Style > Persistent",
    );
  };

  const permissionTitle =
    permissionStatus === "granted"
      ? "Notifications allowed"
      : permissionStatus === "denied"
        ? "Notifications blocked"
        : permissionStatus === "unavailable"
          ? "Notifications unavailable"
          : "Allow notifications";
  const permissionDescription =
    permissionStatus === "granted"
      ? "Recall can send reminder nudges for saved videos."
      : permissionStatus === "denied"
        ? "Turn notifications on in your device settings to get reminder nudges."
        : permissionStatus === "unavailable"
          ? "Local notifications are available on iPhone and Android."
          : "Allow notifications so Recall can send reminder nudges for saved videos.";

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          backgroundColor: WHITE,
          paddingTop: insets.top + 12,
          paddingBottom: 20,
          paddingHorizontal: 20,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pressed ? "#ECECEA" : GREY_LIGHT,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          })}
        >
          <ChevronLeft size={20} color={BLACK} />
        </Pressable>

        <Text
          style={{
            fontSize: 28,
            fontFamily: "Inter_700Bold",
            color: BLACK,
            letterSpacing: -0.8,
          }}
        >
          Notifications
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            marginTop: 4,
          }}
        >
          Manage reminder nudges for your saved videos.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 28,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsCard>
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 16,
              flexDirection: "row",
              gap: 14,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: GREY_LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} color={BLACK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  marginBottom: 2,
                }}
              >
                {permissionTitle}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                {permissionDescription}
              </Text>
            </View>
          </View>

          <Divider />

          <Pressable
            onPress={
              permissionStatus === "denied"
                ? () => Linking.openSettings()
                : handleRequestPermission
            }
            disabled={permissionStatus === "granted" || isLoading}
            style={({ pressed }) => ({
              marginHorizontal: 18,
              marginTop: 16,
              marginBottom: 18,
              borderRadius: 16,
              backgroundColor:
                permissionStatus === "granted"
                  ? GREY_LIGHT
                  : pressed
                    ? "#1F1F1F"
                    : BLACK,
              paddingVertical: 14,
              alignItems: "center",
              opacity: isLoading ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: permissionStatus === "granted" ? BLACK : WHITE,
              }}
            >
              {permissionStatus === "granted"
                ? "Notifications allowed"
                : permissionStatus === "denied"
                  ? "Open Device Settings"
                  : permissionStatus === "unavailable"
                    ? "Available on mobile"
                    : "Allow Notifications"}
            </Text>
          </Pressable>
        </SettingsCard>

        <SettingsCard>
          <ToggleRow
            title="Reminders"
            subtitle="Send notifications for videos you schedule."
            value={preferences.reminderNotifications}
            onValueChange={handleToggleReminders}
            disabled={
              permissionStatus === "unavailable" ||
              isLoading
            }
          />
          <Divider />
          <InfoRow
            title="Reminder follow-up"
            subtitle="Set per reminder when you want another nudge if you don’t open it."
          />
        </SettingsCard>

        <SettingsCard>
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
                marginBottom: 4,
              }}
            >
              Want reminders to stay on screen?
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                lineHeight: 18,
              }}
            >
              Set Recall banners to Persistent in iPhone Settings.
            </Text>
          </View>

          <Divider />

          <Pressable
            onPress={showPersistentBannerHelp}
            style={({ pressed }) => ({
              paddingHorizontal: 18,
              paddingVertical: 16,
              backgroundColor: pressed ? "#FAFAFA" : WHITE,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
              }}
            >
              How to make reminders persistent
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Settings &gt; Notifications &gt; Recall &gt; Banner Style &gt;
              Persistent
            </Text>
          </Pressable>
        </SettingsCard>

        {__DEV__ && Platform.OS !== "web" ? (
          <SettingsCard>
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  marginBottom: 4,
                }}
              >
                Dev notification test
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                Schedule a local notification 10 seconds from now and log the
                trigger details.
              </Text>
            </View>

            <Divider />

            <Pressable
              onPress={handleDebugTestNotification}
              style={({ pressed }) => ({
                marginHorizontal: 18,
                marginTop: 16,
                marginBottom: testMessage ? 10 : 18,
                borderRadius: 16,
                backgroundColor: pressed ? "#1F1F1F" : BLACK,
                paddingVertical: 14,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                Test notification in 10 seconds
              </Text>
            </Pressable>

            {testMessage ? (
              <Text
                style={{
                  paddingHorizontal: 18,
                  paddingBottom: 18,
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                {testMessage}
              </Text>
            ) : null}
          </SettingsCard>
        ) : null}

        {Platform.OS === "web" ? (
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 20,
              padding: 18,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
                marginBottom: 6,
              }}
            >
              Local notifications work on mobile
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                lineHeight: 18,
              }}
            >
              This web preview can show the settings, but scheduled Expo local
              notifications are meant for iPhone and Android.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
