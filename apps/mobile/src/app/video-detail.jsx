import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Archive,
  Bell,
  BellOff,
  CalendarDays,
  ChevronLeft,
  Clock,
  ChevronRight,
  FolderOpen,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useEffect, useState } from "react";
import { useRecallStore } from "../store/useRecallStore";
import {
  GREY_LIGHT,
  WHITE,
} from "../constants/addScreen";
import {
  daysAgoFromISO,
  getCategoryMeta,
  getSavedWeeksLabel,
} from "../utils/resurfacing";
import { PlatformIcon } from "../components/AddScreen/PlatformIcon";
import { VideoThumbnail } from "../components/VideoThumbnail";
import { ReminderSetupModal } from "../components/ReminderSetupModal";
import { RecallSyncState } from "../components/RecallSyncState";
import { CollectionSelectionModal } from "../components/CollectionSelectionModal";
import { EditVideoDetailsModal } from "../components/EditVideoDetailsModal";
import { cancelFollowUpReminderNotificationsForVideo } from "../services/recallNotifications";

const BG = "#F7F7F5";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_MID = "#C7C7CC";
const RED = "#FF3B30";

export default function VideoDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const videoId = Array.isArray(id) ? id[0] : id;

  const video = useRecallStore((s) => s.videos.find((v) => v.id === videoId));
  const collections = useRecallStore((s) => s.collections);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const markOpened = useRecallStore((s) => s.markOpened);
  const updateReminder = useRecallStore((s) => s.updateReminder);
  const deleteReminder = useRecallStore((s) => s.deleteReminder);
  const updateVideo = useRecallStore((s) => s.updateVideo);
  const setVideoCollections = useRecallStore((s) => s.setVideoCollections);
  const addCollection = useRecallStore((s) => s.addCollection);
  const archiveVideo = useRecallStore((s) => s.archiveVideo);
  const removeVideo = useRecallStore((s) => s.removeVideo);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showEditVideo, setShowEditVideo] = useState(false);
  const [showSavedNotice, setShowSavedNotice] = useState(false);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    cancelFollowUpReminderNotificationsForVideo(videoId).catch(() => null);
  }, [videoId]);

  useEffect(() => {
    if (!showSavedNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setShowSavedNotice(false);
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [showSavedNotice]);

  if (!fontsLoaded) return null;

  if (!video) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
        }}
      >
        <BackButton onPress={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center", gap: 10 }}>
          {!isLoaded || isLoading || errorMessage ? (
            <RecallSyncState
              isLoading={isLoading}
              isLoaded={isLoaded}
              errorMessage={errorMessage}
              onRetry={reloadData}
            />
          ) : (
            <>
              <Text style={styles.emptyTitle}>This save is no longer here</Text>
              <Text style={styles.emptyText}>
                It may have been archived or deleted.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const category = getCategoryMeta(video.category);
  const videoCollections = collections.filter(
    (collection) =>
      collection.videoIds.includes(video.id) ||
      video.collections?.includes(collection.id),
  );
  const savedDate = formatDate(video.savedAt);
  const lastOpened = video.lastOpenedAt ? formatDate(video.lastOpenedAt) : null;
  const openedLabel =
    video.revisitCount === 1
      ? "Opened 1 time"
      : `Opened ${video.revisitCount} times`;

  const openVideo = async () => {
    markOpened(video.id);
    try {
      await Linking.openURL(video.videoUrl);
    } catch {
      Alert.alert("Could not open video", "The original link may be invalid.");
    }
  };

  const archiveCurrentVideo = () => {
    Alert.alert(
      "Move to Archive?",
      "This video will be removed from Home and Library but kept in Recall.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to Archive",
          onPress: async () => {
            const archived = await archiveVideo(video.id);
            if (!archived) {
              return;
            }

            Alert.alert("Moved to Archive");
            router.back();
          },
        },
      ],
    );
  };

  const deleteCurrentVideo = () => {
    Alert.alert(
      "Delete this video?",
      "This permanently removes it from Recall. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const removed = await removeVideo(video.id);
            if (!removed) {
              return;
            }

            router.back();
          },
        },
      ],
    );
  };

  const makeWorthRevisitingForDebug = async () => {
    const fifteenDaysAgoIso = new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const result = await updateVideo(video.id, {
      savedAt: fifteenDaysAgoIso,
      lastOpenedAt: null,
      archived: false,
      dismissedFromResurfacingUntil: null,
    });

    if (result === null) {
      return;
    }

    Alert.alert(
      "Ready for Worth Revisiting",
      "This save should now be eligible for Worth Revisiting.",
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BackButton onPress={() => router.back()} />
          <ActionIconButton
            onPress={() => setShowEditVideo(true)}
            icon={<Pencil size={18} color={BLACK} />}
          />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={styles.heroCard}>
            <VideoThumbnail
              thumbnailUrl={video.thumbnailUrl}
              platform={video.platform}
              variant="detailHero"
              showPlatformBadge={false}
            >
              <View style={styles.heroShade} />
              <View style={styles.platformBadge}>
                <PlatformIcon platform={video.platform} size={14} />
                <Text style={styles.platformText}>{video.platform}</Text>
              </View>
            </VideoThumbnail>
          </View>

          <View style={{ marginTop: 22 }}>
            <Text style={styles.title}>{video.title}</Text>
            <View style={styles.creatorRow}>
              <UserRound size={14} color={GREY_TEXT} />
              <Text style={styles.creator}>{video.creator}</Text>
            </View>
            <Text style={styles.savedPrompt}>
              {getSavedWeeksLabel(video.savedAt)}. Still interested?
            </Text>
          </View>

          <Pressable
            onPress={openVideo}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: pressed ? "#1F1F1F" : BLACK },
            ]}
          >
            <Play size={17} color={WHITE} fill={WHITE} />
            <Text style={styles.primaryButtonText}>Open Video</Text>
          </Pressable>

          <View style={styles.card}>
            <InfoRow
              icon={<CalendarDays size={17} color={GREY_TEXT} />}
              label="Saved"
              value={`${getSavedWeeksLabel(video.savedAt)} - ${savedDate}`}
            />
            <InfoRow
              icon={<FolderOpen size={17} color={GREY_TEXT} />}
              label="Category"
              value={`${category.emoji} ${category.label}`}
            />
            <InfoRow
              icon={<RotateCcw size={17} color={GREY_TEXT} />}
              label="Revisits"
              value={openedLabel}
            />
            <InfoRow
              icon={<Clock size={17} color={GREY_TEXT} />}
              label="Last opened"
              value={lastOpened ? `${lastOpened}` : "Not opened yet"}
              isLast
            />
          </View>

          <SectionCard
            title={video.reminderEnabled ? "Reminder on" : "Add reminder"}
            icon={
              video.reminderEnabled ? (
                <Bell size={17} color={BLACK} />
              ) : (
                <BellOff size={17} color={BLACK} />
              )
            }
            trailing={<ChevronRight size={16} color={GREY_TEXT} />}
            onPress={() => setShowReminderSetup(true)}
          >
            <Text style={styles.sectionCopy}>
              {video.reminderEnabled
                ? `${video.reminderTime} - ${video.reminderFrequency}`
                : "Set a gentle reminder for this save."}
            </Text>
          </SectionCard>

          <SectionCard
            title="Add to Collection"
            icon={<FolderOpen size={17} color={BLACK} />}
            trailing={<ChevronRight size={16} color={GREY_TEXT} />}
            onPress={() => setShowCollectionPicker(true)}
          >
            <Text style={styles.sectionCopy}>
              {videoCollections.length > 0
                ? videoCollections.map((c) => c.name).join(", ")
                : "Not in a collection yet"}
            </Text>
            {videoCollections.length > 0 ? (
              <View style={styles.chipWrap}>
                {videoCollections.map((collection) => (
                  <View
                    key={collection.id}
                    style={[styles.chip, styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, styles.chipTextSelected]}>
                      {collection.emoji} {collection.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </SectionCard>

          <View style={styles.card}>
            <InfoRow
              icon={<Bell size={17} color={GREY_TEXT} />}
              label="Reminder"
              value={
                video.reminderEnabled
                  ? `Reminder on - ${video.reminderTime}`
                  : "Reminder off"
              }
            />
            <InfoRow
              icon={<RotateCcw size={17} color={GREY_TEXT} />}
              label="Signal"
              value={
                daysAgoFromISO(video.savedAt) >= 14
                  ? "Worth revisiting"
                  : "Recently saved"
              }
              isLast
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <SecondaryButton
              icon={<Archive size={16} color={BLACK} />}
              label="Archive"
              onPress={archiveCurrentVideo}
            />
            <SecondaryButton
              danger
              icon={<Trash2 size={16} color={RED} />}
              label="Delete"
              onPress={deleteCurrentVideo}
            />
          </View>

          {__DEV__ ? (
            <View style={{ marginTop: 10 }}>
              <SecondaryButton
                icon={<RotateCcw size={16} color={BLACK} />}
                label="Make Worth Revisiting"
                onPress={makeWorthRevisitingForDebug}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ReminderSetupModal
        visible={showReminderSetup}
        insets={insets}
        videoContext={{
          thumbnailUrl: video.thumbnailUrl,
          title: video.title,
          platform: video.platform,
          category: video.category,
        }}
        initialReminder={{
          hasReminder: video.hasReminder,
          reminderEnabled: video.reminderEnabled,
          reminderTime: video.reminderTime,
          reminderFrequency: video.reminderFrequency,
          reminderFollowUpDelayMinutes:
            video.reminderFollowUpDelayMinutes ?? null,
          reminderDays: video.reminderDays ?? [],
        }}
        allowDelete={video.hasReminder}
        onClose={() => setShowReminderSetup(false)}
        onSave={(reminder) => {
          updateReminder(video.id, reminder);
          setShowReminderSetup(false);
        }}
        onDelete={() => {
          deleteReminder(video.id);
          setShowReminderSetup(false);
        }}
      />

      <CollectionSelectionModal
        visible={showCollectionPicker}
        insets={insets}
        collections={collections}
        selectedCollectionIds={videoCollections.map((collection) => collection.id)}
        onClose={() => setShowCollectionPicker(false)}
        onCreateCollection={addCollection}
        onSave={async (collectionIds) => {
          setShowCollectionPicker(false);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await setVideoCollections(video.id, collectionIds);
        }}
      />

      <EditVideoDetailsModal
        visible={showEditVideo}
        insets={insets}
        video={video}
        collections={collections}
        onClose={() => setShowEditVideo(false)}
        onCreateCollection={addCollection}
        onSave={async (details) => {
          const result = await updateVideo(video.id, {
            title: details.title,
            creator: details.creator,
            category: details.category,
          });
          if (result === null) {
            return;
          }
          await setVideoCollections(video.id, details.collections);
          setShowEditVideo(false);
          setShowSavedNotice(true);
        }}
      />

      {showSavedNotice ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 18,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(17,17,17,0.96)",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              Changes saved
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function BackButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.backButton}>
      <ChevronLeft size={22} color={BLACK} />
    </Pressable>
  );
}

function ActionIconButton({ onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={styles.backButton}>
      {icon}
    </Pressable>
  );
}

function InfoRow({ icon, label, value, isLast = false }) {
  return (
    <View style={[styles.infoRow, isLast ? { borderBottomWidth: 0 } : null]}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, icon, trailing, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <View style={styles.infoIcon}>{icon}</View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {trailing}
      </View>
      {children}
    </Pressable>
  );
}

function SecondaryButton({ icon, label, onPress, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { backgroundColor: pressed ? "#EFEFED" : WHITE },
      ]}
    >
      {icon}
      <Text style={[styles.secondaryText, danger ? { color: RED } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = {
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  heroCard: {
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: WHITE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 7,
  },
  heroShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  platformBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  platformText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  creator: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
  },
  savedPrompt: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 22,
    borderRadius: 20,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: WHITE,
  },
  card: {
    marginTop: 16,
    backgroundColor: WHITE,
    borderRadius: 26,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  infoRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: GREY_LIGHT,
    gap: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: GREY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
  },
  infoValue: {
    flex: 1.25,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.3,
  },
  sectionCopy: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 19,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: GREY_LIGHT,
  },
  chipSelected: {
    backgroundColor: BLACK,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: BLACK,
  },
  chipTextSelected: {
    color: WHITE,
  },
  secondaryButton: {
    flex: 1,
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    textAlign: "center",
  },
};
