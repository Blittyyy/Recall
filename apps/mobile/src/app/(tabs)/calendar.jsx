import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  BellOff,
  Clock,
  Instagram,
  Plus,
  RotateCcw,
  Youtube,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useRecallStore } from "../../store/useRecallStore";
import { getReminderVideos, isReminderDueToday } from "../../utils/resurfacing";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";
import { RecallSyncState } from "../../components/RecallSyncState";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";

const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";

function TikTokMark({ size = 12, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}

function PlatformIcon({ platform, size = 12 }) {
  if (platform === "Instagram") {
    return <Instagram size={size} color="#E4405F" />;
  }
  if (platform === "YouTube") {
    return <Youtube size={size} color="#FF0000" />;
  }
  return <TikTokIcon size={size} color={BLACK} />;
}

function ReminderCard({ item, enabled, onToggle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#F5F5F5" : WHITE,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: enabled ? 0.06 : 0.03,
        shadowRadius: 18,
        elevation: 3,
        opacity: enabled ? 1 : 0.58,
      })}
    >
      <Image
        source={item.thumbnail}
        style={{ width: 84, height: 104 }}
        contentFit="cover"
      />

      <View style={{ flex: 1, paddingHorizontal: 15, paddingVertical: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginBottom: 4,
          }}
        >
          <PlatformIcon platform={item.platform} size={11} />
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            {item.platform}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_600SemiBold",
            color: BLACK,
            marginBottom: 4,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            marginBottom: 6,
          }}
          numberOfLines={1}
        >
          {item.creator}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock size={11} color={GREY_MID} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_500Medium",
              color: GREY_TEXT,
            }}
          >
            {item.time}
          </Text>
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: GREY_MID,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            {item.frequency}
          </Text>
        </View>
      </View>

      <View style={{ paddingRight: 16 }}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: GREY_LIGHT, true: BLACK }}
          thumbColor={WHITE}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>
    </Pressable>
  );
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const videos = useRecallStore((s) => s.videos);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const toggleReminder = useRecallStore((s) => s.toggleReminder);
  const updateReminder = useRecallStore((s) => s.updateReminder);
  const deleteReminder = useRecallStore((s) => s.deleteReminder);
  const [editingReminder, setEditingReminder] = useState(null);

  const reminders = getReminderVideos(videos);
  const activeCount = reminders.filter((v) => v.reminderEnabled).length;
  const todayReminders = reminders.filter((v) => isReminderDueToday(v));

  if (!fontsLoaded) return null;

  const adaptForCard = (video) => ({
    ...video,
    thumbnail: video.thumbnailUrl,
    time: video.reminderTime ?? "Scheduled",
    frequency: video.reminderFrequency ?? "Custom",
  });

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.8,
              }}
            >
              Reminders
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 2,
              }}
            >
              {activeCount} reminder{activeCount === 1 ? "" : "s"} on
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/add")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: pressed ? "#1A1A1A" : BLACK,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 9,
            })}
          >
            <Plus size={14} color={WHITE} strokeWidth={2.5} />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 24,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <RecallSyncState
          isLoading={isLoading}
          isLoaded={isLoaded}
          errorMessage={errorMessage}
          onRetry={reloadData}
          style={{ marginBottom: 18 }}
        />

        {todayReminders.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.4,
                marginBottom: 14,
              }}
            >
              Today's Reminders
            </Text>
            {todayReminders.map((item) => (
              <ReminderCard
                key={item.id}
                item={adaptForCard(item)}
                enabled={item.reminderEnabled}
                onToggle={() => toggleReminder(item.id)}
                onPress={() => setEditingReminder(item)}
              />
            ))}
          </View>
        )}

        {reminders.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.4,
                marginBottom: 14,
              }}
            >
              All Reminders
            </Text>
            {reminders.map((item) => (
              <ReminderCard
                key={item.id}
                item={adaptForCard(item)}
                enabled={item.reminderEnabled}
                onToggle={() => toggleReminder(item.id)}
                onPress={() => setEditingReminder(item)}
              />
            ))}
          </View>
        )}

        {reminders.length === 0 && !errorMessage && (
          <EmptyStateCard
            icon={<BellOff size={28} color={BLACK} />}
            title="No reminders set"
            text="Add reminders to videos you want to revisit on specific days."
            ctaLabel="Browse Library"
            onPress={() => router.push("/(tabs)/saved")}
          />
        )}

        {reminders.length > 0 && activeCount === 0 && (
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 20,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: GREY_LIGHT,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <RotateCcw size={20} color={GREY_TEXT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  marginBottom: 3,
                }}
              >
                No reminders are active right now
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                Turn one back on any time you want a gentle nudge.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ReminderSetupModal
        visible={!!editingReminder}
        insets={insets}
        videoContext={
          editingReminder
            ? {
                thumbnailUrl: editingReminder.thumbnailUrl,
                title: editingReminder.title,
                platform: editingReminder.platform,
                category: editingReminder.category,
              }
            : null
        }
        initialReminder={
          editingReminder
            ? {
                hasReminder: editingReminder.hasReminder,
                reminderEnabled: editingReminder.reminderEnabled,
                reminderTime: editingReminder.reminderTime,
                reminderFrequency: editingReminder.reminderFrequency,
                reminderFollowUpDelayMinutes:
                  editingReminder.reminderFollowUpDelayMinutes ?? null,
                reminderDays: editingReminder.reminderDays ?? [],
              }
            : null
        }
        allowDelete={!!editingReminder?.hasReminder}
        onClose={() => setEditingReminder(null)}
        onSave={(reminder) => {
          if (!editingReminder) return;
          updateReminder(editingReminder.id, reminder);
          setEditingReminder(null);
        }}
        onDelete={() => {
          if (!editingReminder) return;
          deleteReminder(editingReminder.id);
          setEditingReminder(null);
        }}
      />
    </View>
  );
}
