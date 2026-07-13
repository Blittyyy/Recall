import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, Play } from "lucide-react-native";
import { RecallReminderIcon } from "../../components/RecallReminderIcon";
import { RecallActionIcon } from "../../components/RecallActionIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useRecallStore } from "../../store/useRecallStore";
import { getReminderVideos, getNextReminderDate, formatReminderScheduleLabel } from "../../utils/resurfacing";
import { getDisplayTitle } from "../../utils/titleHelpers";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";
import { RecallSyncState } from "../../components/RecallSyncState";
import { EmptyRemindersState } from "../../components/EmptyRemindersState";
import { VideoThumbnail } from "../../components/VideoThumbnail";
import { RECALL_COLORS } from "../../constants/recallTheme";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const ACCENT_SOFT = RECALL_COLORS.subtle;
const WHITE = RECALL_COLORS.surfaceStrong;
const SERIF = "Georgia";

const FILTERS = ["All", "Today", "This Week", "Later"];

const SECTION_META = {
  today: {
    label: "Today",
    iconName: "today",
  },
  tomorrow: {
    label: "Tomorrow",
    iconName: "tomorrow",
  },
  thisWeek: {
    label: "This Week",
    iconName: "this-week",
  },
  later: {
    label: "Later",
    iconName: "later",
  },
};

function getReminderBucket(nextDate, now = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const nextStart = new Date(nextDate);
  nextStart.setHours(0, 0, 0, 0);
  const daysAway = Math.round((nextStart - start) / dayMs);

  if (daysAway <= 0) return "today";
  if (daysAway === 1) return "tomorrow";
  if (daysAway <= 7) return "thisWeek";
  return "later";
}

function ReminderSectionHeader({ sectionKey, count }) {
  const { label, iconName } = SECTION_META[sectionKey];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
        paddingHorizontal: 2,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: ACCENT_SOFT,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <RecallReminderIcon name={iconName} size={18} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 19,
          fontFamily: "Inter_600SemiBold",
          color: TEXT,
          letterSpacing: -0.3,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_500Medium",
          color: MUTED,
          marginRight: 5,
        }}
      >
        {count}
      </Text>
      <ChevronDown size={16} color={MUTED} strokeWidth={1.8} />
    </View>
  );
}

function ReminderCard({ item, onOpen, onEdit }) {
  const frequency = item.reminderFrequency ?? "Daily";
  const showFrequency = frequency !== "Once";

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: 138,
        backgroundColor: pressed ? "#FBF7F2" : SURFACE,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 6,
        marginBottom: 12,
        shadowColor: "#8D7A68",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: pressed ? 0.04 : 0.07,
        shadowRadius: 18,
        elevation: 2,
        opacity: item.reminderEnabled ? 1 : 0.62,
      })}
    >
      <VideoThumbnail
        thumbnailUrl={item.thumbnailUrl}
        videoUrl={item.videoUrl}
        videoId={item.id}
        platform={item.platform}
        style={{
          width: 124,
          height: 126,
          borderRadius: 20,
        }}
        imageStyle={{ transform: [{ scale: 1.24 }] }}
      >
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 8,
            height: 3,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.45)",
          }}
        >
          <View
            style={{
              width: "46%",
              height: "100%",
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.92)",
            }}
          />
        </View>
      </VideoThumbnail>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 126,
          paddingLeft: 12,
          paddingRight: 5,
          paddingTop: 11,
          paddingBottom: 8,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 16,
              fontFamily: "Inter_600SemiBold",
              color: TEXT,
              letterSpacing: -0.15,
              marginBottom: 2,
            }}
          >
            {getDisplayTitle(item.title)}
          </Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              fontSize: 10.5,
              lineHeight: 13,
              fontFamily: "Inter_400Regular",
              color: MUTED,
            }}
          >
            {item.creator}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: 5,
            rowGap: 5,
            marginTop: "auto",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#F4EEE7",
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 4,
            }}
          >
            <RecallReminderIcon name="today" size={11} />
            <Text
              style={{
                fontSize: 9.5,
                fontFamily: "Inter_500Medium",
                color: "#755A40",
              }}
            >
              {item.timingLabel}
            </Text>
          </View>

          {showFrequency ? (
            <View
              style={{
                backgroundColor: "#F5F0EA",
                borderRadius: 10,
                paddingHorizontal: 7,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Inter_500Medium",
                  color: "#755A40",
                }}
              >
                {frequency}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          width: 44,
          height: 126,
          paddingVertical: 6,
          paddingRight: 2,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          style={{
            width: 34,
            height: 28,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RecallActionIcon name="edit" size={18} />
        </Pressable>

        <Pressable
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={22} color={ACCENT} fill={ACCENT} strokeWidth={1.5} />
        </Pressable>
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
  const updateReminder = useRecallStore((s) => s.updateReminder);
  const deleteReminder = useRecallStore((s) => s.deleteReminder);
  const [editingReminder, setEditingReminder] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const reminders = getReminderVideos(videos);

  useEffect(() => {
    const markOnceReminderDelivered =
      useRecallStore.getState().markOnceReminderDelivered;

    videos.forEach((video) => {
      if (video.reminderFrequency !== "Once" || video.onceReminderCompletedAt) {
        return;
      }

      const fireAt = video.onceReminderScheduledFireAt;
      if (fireAt && new Date(fireAt).getTime() <= Date.now()) {
        markOnceReminderDelivered(video.id).catch(() => null);
      }
    });
  }, [videos]);

  const groupedReminders = useMemo(() => {
    const now = new Date();
    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
    };

    reminders.forEach((video) => {
      const nextDate = getNextReminderDate(video, now);
      if (!nextDate) return;

      const bucket = getReminderBucket(nextDate, now);
      groups[bucket].push({
        ...video,
        nextDate,
        timingLabel: formatReminderScheduleLabel(video, now),
      });
    });

    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.nextDate - b.nextDate);
    });

    return groups;
  }, [reminders]);

  const visibleSectionKeys = useMemo(() => {
    if (activeFilter === "Today") return ["today"];
    if (activeFilter === "This Week") {
      return ["today", "tomorrow", "thisWeek"];
    }
    if (activeFilter === "Later") return ["later"];
    return ["today", "tomorrow", "thisWeek", "later"];
  }, [activeFilter]);

  if (!fontsLoaded) return null;

  if (isLoaded && !errorMessage && reminders.length === 0) {
    return (
      <EmptyRemindersState
        topInset={insets.top}
        bottomInset={insets.bottom}
        onCreateReminder={() => router.push("/(tabs)/saved")}
      />
    );
  }

  const openVideo = (video) => {
    router.push({
      pathname: "/video-detail",
      params: { id: video.id },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 74, 96),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 34,
              lineHeight: 40,
              fontFamily: SERIF,
              color: TEXT,
              letterSpacing: -0.9,
            }}
          >
            Reminders
          </Text>
        </View>

        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            lineHeight: 21,
            fontFamily: "Inter_400Regular",
            color: MUTED,
          }}
        >
          Your saved moments, resurfaced intentionally.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 9,
            paddingTop: 19,
            paddingBottom: 25,
          }}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={({ pressed }) => ({
                  minWidth: filter === "This Week" ? 116 : 76,
                  height: 44,
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active
                    ? pressed
                      ? "#26221E"
                      : "#151311"
                    : pressed
                      ? "#F4EEE7"
                      : SURFACE,
                  borderWidth: active ? 0 : 1,
                  borderColor: BORDER,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: active ? WHITE : "#654B34",
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <RecallSyncState
          isLoading={isLoading}
          isLoaded={isLoaded}
          errorMessage={errorMessage}
          onRetry={reloadData}
          style={{ marginBottom: 18 }}
        />

        {visibleSectionKeys.map((sectionKey) => {
          const sectionReminders = groupedReminders[sectionKey];
          if (sectionReminders.length === 0) return null;

          return (
            <View key={sectionKey} style={{ marginBottom: 18 }}>
              <ReminderSectionHeader
                sectionKey={sectionKey}
                count={sectionReminders.length}
              />
              {sectionReminders.map((item) => (
                <ReminderCard
                  key={item.id}
                  item={item}
                  onOpen={() => openVideo(item)}
                  onEdit={() => setEditingReminder(item)}
                />
              ))}
            </View>
          );
        })}
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
