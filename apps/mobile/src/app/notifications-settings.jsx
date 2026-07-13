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
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { RecallReminderIcon } from "../components/RecallReminderIcon";
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
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const WHITE = RECALL_COLORS.surface;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.secondaryText;
const GREY_LIGHT = RECALL_COLORS.subtle;
const GREY_MID = RECALL_COLORS.mid;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;

function SettingsCard({ children }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#8D7A68",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 2,
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
        backgroundColor: "rgba(231,222,211,0.68)",
        marginLeft: indent,
        marginRight: 18,
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
        paddingVertical: 14,
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
        trackColor={{ false: "#E9E2DA", true: BLACK }}
        thumbColor={WHITE}
      />
    </View>
  );
}

function InfoRow({ title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
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
              marginTop: 2,
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 17,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={17} color={GREY_MID} /> : null}
    </Pressable>
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
  const activeReminderCount = videos.filter(
    (video) => video.reminderEnabled && !video.archived,
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
      ? "Notifications enabled"
      : permissionStatus === "denied"
        ? "Notifications blocked"
        : permissionStatus === "unavailable"
          ? "Notifications unavailable"
          : "Allow notifications";
  const permissionDescription =
    permissionStatus === "granted"
      ? "Recall can gently resurface saved videos."
      : permissionStatus === "denied"
        ? "Turn notifications on in your device settings to get reminder nudges."
        : permissionStatus === "unavailable"
          ? "Local notifications are available on iPhone and Android."
          : "Allow gentle reminder nudges for videos you wanted to revisit.";

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          paddingTop: insets.top + 18,
          paddingBottom: 18,
          paddingHorizontal: 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pressed ? "#EEE7DE" : WHITE,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 2,
          })}
        >
          <ChevronLeft size={20} color={BLACK} />
        </Pressable>

        <Text
          style={{
            fontSize: 36,
            lineHeight: 42,
            fontFamily: "Georgia",
            color: BLACK,
            letterSpacing: -1,
          }}
        >
          Notifications
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            marginTop: 4,
          }}
        >
          Gentle nudges for moments worth returning to.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 28,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsCard>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: GREY_LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RecallReminderIcon name="bell" size={17} />
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
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  permissionStatus === "granted" ? "#4CB477" : GREY_MID,
              }}
            />
          </View>

          {permissionStatus !== "granted" ? (
            <>
              <Divider />
              <Pressable
            onPress={
              permissionStatus === "denied"
                ? () => Linking.openSettings()
                : handleRequestPermission
            }
            disabled={permissionStatus === "unavailable" || isLoading}
            style={({ pressed }) => ({
              marginHorizontal: 16,
              marginVertical: 14,
              borderRadius: 16,
              backgroundColor: pressed ? "#2A241F" : BLACK,
              paddingVertical: 13,
              alignItems: "center",
              opacity: isLoading ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              {permissionStatus === "denied"
                  ? "Open Device Settings"
                  : permissionStatus === "unavailable"
                    ? "Available on mobile"
                    : "Allow Notifications"}
            </Text>
              </Pressable>
            </>
          ) : null}
        </SettingsCard>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 4,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: "#F2EADF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RecallReminderIcon name="this-week" size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: ACCENT,
              }}
            >
              This week
            </Text>
            <Text
              style={{
                marginTop: 1,
                fontSize: 14,
                fontFamily: "Inter_500Medium",
                color: BLACK,
              }}
            >
              {activeReminderCount} reminder
              {activeReminderCount === 1 ? "" : "s"} ready to resurface.
            </Text>
          </View>
        </View>

        <SettingsCard>
          <ToggleRow
            title="Reminders"
            subtitle="Reminder nudges for videos you wanted to revisit."
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
            subtitle={
              reminderFollowUpCount > 0
                ? `${reminderFollowUpCount} reminder${reminderFollowUpCount === 1 ? "" : "s"} currently check back in.`
                : "Choose when Recall checks back in."
            }
            onPress={() => router.push("/(tabs)/calendar")}
          />
        </SettingsCard>

        <SettingsCard>
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 13,
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
              Keep a reminder in view
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                lineHeight: 18,
              }}
            >
              Use Persistent banners when you want a nudge to stay visible.
            </Text>
          </View>

          <Divider />

          <Pressable
            onPress={showPersistentBannerHelp}
            style={({ pressed }) => ({
              paddingHorizontal: 18,
              paddingVertical: 14,
              backgroundColor: pressed ? "#F8F3ED" : WHITE,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            })}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: GREY_LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RecallReminderIcon name="later" size={16} />
            </View>
            <View style={{ flex: 1 }}>
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
                  fontSize: 11.5,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 17,
                  marginTop: 3,
                }}
              >
                Settings &gt; Notifications &gt; Recall &gt; Banner Style
              </Text>
            </View>
            <ChevronRight size={17} color={GREY_MID} />
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
