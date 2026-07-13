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
  BellOff,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react-native";
import { RecallActionIcon } from "../components/RecallActionIcon";
import { RecallSavedContentIcon } from "../components/RecallSavedContentIcon";
import { RecallReminderIcon } from "../components/RecallReminderIcon";
import { RecallProfileIcon } from "../components/RecallProfileIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useEffect, useState } from "react";
import Animated from "react-native-reanimated";
import { useRecallStore } from "../store/useRecallStore";
import { useAppearanceStore } from "../store/useAppearanceStore";
import { useLibraryVideoDetailEnterAnimation } from "../components/LibraryVideoDetailTransition";
import {
  GREY_LIGHT,
  WHITE,
} from "../constants/addScreen";
import {
  getCategoryMeta,
  getSavedWeeksLabel,
  isActiveReminderSchedule,
  isOnceReminderCompleted,
  isWorthRevisitingEligible,
  formatReminderScheduleLabel,
} from "../utils/resurfacing";
import { getDisplayTitle } from "../utils/titleHelpers";
import { isVideoUnavailable } from "../utils/videoAvailability";
import { PlatformIcon } from "../components/AddScreen/PlatformIcon";
import { VideoThumbnail } from "../components/VideoThumbnail";
import { ReminderSetupModal } from "../components/ReminderSetupModal";
import { RecallSyncState } from "../components/RecallSyncState";
import { CollectionSelectionModal } from "../components/CollectionSelectionModal";
import { EditVideoDetailsModal } from "../components/EditVideoDetailsModal";
import { cancelFollowUpReminderNotificationsForVideo } from "../services/recallNotifications";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.secondaryText;
const GREY_MID = RECALL_COLORS.mid;
const RED = "#FF3B30";
const SERIF = "Georgia";

export default function VideoDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, fromLibrary } = useLocalSearchParams();
  const videoId = Array.isArray(id) ? id[0] : id;
  const openedFromLibrary = Array.isArray(fromLibrary)
    ? fromLibrary[0] === "1"
    : fromLibrary === "1";
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const shouldRunLibraryEnter =
    openedFromLibrary && !reduceMotion;
  const { heroStyle, titleStyle, belowTitleStyle } =
    useLibraryVideoDetailEnterAnimation({
      enabled: shouldRunLibraryEnter,
      reduceMotion,
    });

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
  const setDevWorthRevisitingForTesting = useRecallStore(
    (s) => s.setDevWorthRevisitingForTesting,
  );

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

  const markOnceReminderDelivered = useRecallStore(
    (s) => s.markOnceReminderDelivered,
  );

  useEffect(() => {
    if (!videoId) {
      return;
    }

    cancelFollowUpReminderNotificationsForVideo(videoId).catch(() => null);
  }, [videoId]);

  useEffect(() => {
    if (!video || video.reminderFrequency !== "Once") {
      return;
    }

    if (video.onceReminderCompletedAt || !isOnceReminderCompleted(video)) {
      return;
    }

    markOnceReminderDelivered(video.id).catch(() => null);
  }, [video, markOnceReminderDelivered]);

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
  const showActiveReminderSchedule = isActiveReminderSchedule(video);
  const onceReminderCompleted = isOnceReminderCompleted(video);

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
    const enabled = await setDevWorthRevisitingForTesting(video.id);
    if (!enabled) {
      return;
    }

    Alert.alert(
      "Dev: Worth Revisiting enabled",
      "This save will appear in Worth Revisiting for testing. The saved date shown on cards stays accurate.",
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <View style={styles.navRow}>
          <BackButton onPress={() => router.back()} />
          <ActionIconButton
            onPress={() => setShowEditVideo(true)}
            icon={<RecallActionIcon name="edit" size={20} />}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 34,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
            <Animated.View style={heroStyle}>
              <VideoThumbnail
                thumbnailUrl={video.thumbnailUrl}
                videoUrl={video.videoUrl}
                videoId={video.id}
                platform={video.platform}
                variant="detailHero"
                showPlatformBadge={false}
              >
                <View style={styles.platformBadge}>
                  <PlatformIcon platform={video.platform} size={14} />
                  <Text style={styles.platformText}>{video.platform}</Text>
                </View>
              </VideoThumbnail>
            </Animated.View>
          </View>

          {isVideoUnavailable(video) ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: "#F3EFEA",
                borderRadius: 18,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text
                style={{
                  color: GREY_TEXT,
                  fontSize: 14,
                  lineHeight: 20,
                  fontFamily: "Inter_500Medium",
                }}
              >
                This video may have been deleted or made private.
              </Text>
            </View>
          ) : null}

          <Animated.View style={[{ marginTop: 24 }, titleStyle]}>
            <Text style={styles.title}>{getDisplayTitle(video.title)}</Text>
            <View style={styles.creatorRow}>
              <RecallProfileIcon name="user" size={14} />
              <Text style={styles.creator}>{video.creator}</Text>
            </View>
            <Text style={styles.savedPrompt}>
              {getSavedWeeksLabel(video.savedAt)}. Still interested?
            </Text>
          </Animated.View>

          <Animated.View style={belowTitleStyle}>
            <Pressable
              onPress={openVideo}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? "#1F1F1F" : BLACK },
              ]}
            >
              <RecallActionIcon name="play" size={17} />
              <Text style={styles.primaryButtonText}>Open Video</Text>
            </Pressable>

            <View style={styles.card}>
              <InfoRow
                icon={<RecallSavedContentIcon name="saved" size={17} />}
                label="Saved"
                value={`${getSavedWeeksLabel(video.savedAt)}\n${savedDate}`}
              />
              <InfoRow
                icon={<RecallSavedContentIcon name="collections" size={17} />}
                label="Category"
                value={`${category.emoji} ${category.label}`}
              />
              <InfoRow
                icon={<RecallReminderIcon name="worth-revisiting" size={17} />}
                label="Revisits"
                value={openedLabel}
              />
              <InfoRow
                icon={<RecallSavedContentIcon name="last-opened" size={17} />}
                label="Last opened"
                value={lastOpened ? `${lastOpened}` : "Not opened yet"}
                isLast
              />
            </View>
          </Animated.View>

          <View style={styles.card}>
            <ActionRow
              title={
                showActiveReminderSchedule
                  ? "Reminder on"
                  : onceReminderCompleted
                    ? "Reminder completed"
                    : "Add reminder"
              }
              subtitle={
                showActiveReminderSchedule
                  ? formatReminderScheduleLabel(video)
                  : onceReminderCompleted
                    ? "This one-time reminder already fired."
                    : "Set a gentle reminder for this save."
              }
              icon={
                video.reminderEnabled ? (
                  <RecallReminderIcon name="bell" size={16} />
                ) : (
                  <BellOff size={16} color={GREY_TEXT} />
                )
              }
              onPress={() => setShowReminderSetup(true)}
            />
            <View style={styles.groupDivider} />
            <ActionRow
              title="Add to Collection"
              subtitle={
                videoCollections.length > 0
                  ? videoCollections.map((c) => c.name).join(", ")
                  : "Not in a collection yet"
              }
              icon={<RecallSavedContentIcon name="collections" size={16} />}
              onPress={() => setShowCollectionPicker(true)}
            />
          </View>

          <View style={styles.card}>
            <InfoRow
              icon={<RecallReminderIcon name="bell" size={17} />}
              label="Reminder"
              value={
                showActiveReminderSchedule
                  ? formatReminderScheduleLabel(video)
                  : onceReminderCompleted
                    ? "Completed"
                    : "Reminder off"
              }
            />
            <InfoRow
              icon={<RecallReminderIcon name="worth-revisiting" size={17} />}
              label="Signal"
              value={
                isWorthRevisitingEligible(video)
                  ? video.devWorthRevisitingOverride
                    ? "Worth revisiting (dev)"
                    : "Worth revisiting"
                  : "Recently saved"
              }
              isLast
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <SecondaryButton
              icon={<RecallSavedContentIcon name="archive" size={16} />}
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
            <View style={{ marginTop: 12 }}>
              <SecondaryButton
                icon={<RecallReminderIcon name="worth-revisiting" size={16} />}
                label="Make Worth Revisiting"
                onPress={makeWorthRevisitingForDebug}
              />
            </View>
          ) : null}
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
        thumbnailUrl={video.thumbnailUrl}
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
        onDelete={() => {
          setShowEditVideo(false);
          requestAnimationFrame(deleteCurrentVideo);
        }}
        onSave={async (details) => {
          const result = await updateVideo(video.id, {
            title: details.title,
            creator: details.creator,
            category: details.category,
            notes: details.notes,
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

function ActionRow({ title, subtitle, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.actionRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCopy} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={17} color={GREY_TEXT} />
    </Pressable>
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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    shadowColor: "#8D7A68",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  heroCard: {
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: WHITE,
    shadowColor: "#8D7A68",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 3,
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
    fontSize: 30,
    fontFamily: SERIF,
    color: BLACK,
    letterSpacing: -0.9,
    lineHeight: 34,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  creator: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
  },
  savedPrompt: {
    marginTop: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 19,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
  card: {
    marginTop: 14,
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#8D7A68",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },
  infoRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(231,222,211,0.65)",
    gap: 11,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F7F1EA",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
  },
  infoValue: {
    flex: 1.35,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
    lineHeight: 17,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupDivider: {
    height: 1,
    marginLeft: 42,
    backgroundColor: "rgba(231,222,211,0.65)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: BLACK,
    letterSpacing: -0.15,
  },
  sectionCopy: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 16,
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
    borderRadius: 19,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#8D7A68",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
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
