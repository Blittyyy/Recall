import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useMemo, useState } from "react";
import { useRecallStore } from "../store/useRecallStore";
import { WorthRevisitingCard } from "../components/WorthRevisitingCard";
import { ReminderSetupModal } from "../components/ReminderSetupModal";
import { RecallSyncState } from "../components/RecallSyncState";
import { EmptyStateCard } from "../components/EmptyStateCard";
import {
  getAllWorthRevisitingVideos,
  getDismissedUntilDate,
} from "../utils/resurfacing";
import {
  toAnalyticsPlatform,
  trackEvent,
} from "../services/analytics";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const HOME_TEXT = RECALL_COLORS.text;
const SERIF = "Georgia";

function BackButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingVertical: 4,
      }}
    >
      <ChevronLeft size={22} color={BLACK} />
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Inter_500Medium",
          color: BLACK,
        }}
      >
        Back
      </Text>
    </Pressable>
  );
}

export default function WorthRevisitingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videos = useRecallStore((s) => s.videos);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const markOpened = useRecallStore((s) => s.markOpened);
  const updateVideo = useRecallStore((s) => s.updateVideo);
  const dismissFromResurfacing = useRecallStore((s) => s.dismissFromResurfacing);
  const clearFromHomeWorthRevisiting = useRecallStore(
    (s) => s.clearFromHomeWorthRevisiting,
  );

  const [reminderSetupVideo, setReminderSetupVideo] = useState(null);
  const [selectedReminderTime, setSelectedReminderTime] = useState("07:00 AM");
  const [selectedReminderFrequency, setSelectedReminderFrequency] =
    useState("Daily");
  const [selectedReminderDays, setSelectedReminderDays] = useState([]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const worthRevisiting = useMemo(
    () => getAllWorthRevisitingVideos(videos),
    [videos],
  );

  const navigateToVideoDetail = (videoId) => {
    markOpened(videoId);
    router.push({
      pathname: "/video-detail",
      params: { id: videoId },
    });
  };

  const openVideoDetail = (videoId) => {
    const video = videos.find((entry) => entry.id === videoId);
    trackEvent("worth_revisiting_opened", {
      item_platform: toAnalyticsPlatform(video?.platform),
    });
    navigateToVideoDetail(videoId);
  };

  const handleWatchResurfaced = async (video) => {
    trackEvent("worth_revisiting_opened", {
      item_platform: toAnalyticsPlatform(video?.platform),
    });
    clearFromHomeWorthRevisiting(video.id);
    markOpened(video.id);
    try {
      await Linking.openURL(video.videoUrl);
    } catch {
      navigateToVideoDetail(video.id);
    }
  };

  const handleRemindResurfaced = (video) => {
    setSelectedReminderTime(video.reminderTime ?? "07:00 AM");
    setSelectedReminderFrequency(video.reminderFrequency ?? "Daily");
    setSelectedReminderDays(video.reminderDays ?? []);
    setReminderSetupVideo(video);
  };

  const handleNotNow = (video) => {
    clearFromHomeWorthRevisiting(video.id);
    dismissFromResurfacing(video.id);
  };

  const saveReminderSetup = (reminder) => {
    if (!reminderSetupVideo) return;
    const id = reminderSetupVideo.id;
    clearFromHomeWorthRevisiting(id);
    updateVideo(id, {
      ...reminder,
      dismissedFromResurfacingUntil: getDismissedUntilDate(),
    });
    setReminderSetupVideo(null);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom + 24, 32),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <BackButton onPress={() => router.back()} />
          <Text
            style={{
              marginTop: 18,
              fontSize: 32,
              fontFamily: SERIF,
              color: HOME_TEXT,
              letterSpacing: -1,
              lineHeight: 38,
            }}
          >
            Worth Revisiting
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              lineHeight: 21,
            }}
          >
            Every save Recall thinks is worth another look.
          </Text>
        </View>

        <RecallSyncState
          isLoading={isLoading}
          isLoaded={isLoaded}
          errorMessage={errorMessage}
          onRetry={reloadData}
          style={{ marginHorizontal: 20, marginBottom: 16 }}
        />

        {isLoaded && !errorMessage && worthRevisiting.length === 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <EmptyStateCard
              icon="↺"
              title="Nothing to revisit right now"
              text="Once you've saved videos for a little while, Recall will bring them back naturally."
            />
          </View>
        ) : null}

        {isLoaded && !errorMessage && worthRevisiting.length > 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            {worthRevisiting.map((video) => (
              <WorthRevisitingCard
                key={video.id}
                video={video}
                onPress={() => openVideoDetail(video.id)}
                onWatch={() => handleWatchResurfaced(video)}
                onRemind={() => handleRemindResurfaced(video)}
                onNotNow={() => handleNotNow(video)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ReminderSetupModal
        visible={!!reminderSetupVideo}
        insets={insets}
        videoContext={
          reminderSetupVideo
            ? {
                thumbnailUrl: reminderSetupVideo.thumbnailUrl,
                title: reminderSetupVideo.title,
                platform: reminderSetupVideo.platform,
                category: reminderSetupVideo.category,
              }
            : null
        }
        initialReminder={
          reminderSetupVideo
            ? {
                hasReminder: reminderSetupVideo.hasReminder,
                reminderEnabled: reminderSetupVideo.reminderEnabled,
                reminderTime: selectedReminderTime,
                reminderFrequency: selectedReminderFrequency,
                reminderFollowUpDelayMinutes:
                  reminderSetupVideo.reminderFollowUpDelayMinutes ?? null,
                reminderDays: selectedReminderDays,
              }
            : null
        }
        allowDelete={!!reminderSetupVideo?.hasReminder}
        onClose={() => setReminderSetupVideo(null)}
        onSave={saveReminderSetup}
        onDelete={() => {
          if (!reminderSetupVideo) return;
          clearFromHomeWorthRevisiting(reminderSetupVideo.id);
          updateVideo(reminderSetupVideo.id, {
            hasReminder: false,
            reminderEnabled: false,
            reminderTime: null,
            reminderFrequency: null,
            reminderFollowUpDelayMinutes: null,
            reminderDays: [],
          });
          setReminderSetupVideo(null);
        }}
      />
    </View>
  );
}
