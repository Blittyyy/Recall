import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useRef, useState } from "react";
import { useRecallStore } from "../store/useRecallStore";
import { getSavedWeeksLabel } from "../utils/resurfacing";
import { PlatformIcon } from "../components/AddScreen/PlatformIcon";
import { RecallSyncState } from "../components/RecallSyncState";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { CollectionCoverSection } from "../components/CollectionCoverSection";

const BG = "#F7F7F5";
const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_MID = "#C7C7CC";
const RED = "#FF3B30";

export default function CollectionDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const collectionId = Array.isArray(id) ? id[0] : id;

  const collection = useRecallStore((s) =>
    s.collections.find((item) => item.id === collectionId),
  );
  const videos = useRecallStore((s) => s.videos);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const updateCollection = useRecallStore((s) => s.updateCollection);
  const deleteCollection = useRecallStore((s) => s.deleteCollection);
  const removeVideoFromCollection = useRecallStore(
    (s) => s.removeVideoFromCollection,
  );

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(collection?.name ?? "");
  const [editEmoji, setEditEmoji] = useState(collection?.emoji ?? "📌");
  const editNameInputRef = useRef(null);

  if (!fontsLoaded) return null;

  if (!collection) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top + 16 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <BackButton onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          {!isLoaded || isLoading || errorMessage ? (
            <RecallSyncState
              isLoading={isLoading}
              isLoaded={isLoaded}
              errorMessage={errorMessage}
              onRetry={reloadData}
            />
          ) : (
            <>
              <Text style={styles.emptyTitle}>Collection not found</Text>
              <Text style={styles.emptyText}>
                It may have been deleted from your Recall library.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const collectionVideos = videos.filter(
    (video) =>
      !video.archived &&
      (collection.videoIds.includes(video.id) ||
        video.collections?.includes(collection.id)),
  );
  const coverThumbnailUrl = collectionVideos[0]?.thumbnailUrl ?? null;

  const saveName = () => {
    const name = editName.trim();
    if (!name) return;
    updateCollection(collection.id, {
      name,
      emoji: editEmoji,
    });
    setIsEditing(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete "${collection.name}"?`,
      "Your saved videos will stay in Recall. Only this collection is removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCollection(collection.id);
            router.back();
          },
        },
      ],
    );
  };

  const openVideoDetail = (videoId) =>
    router.push({
      pathname: "/video-detail",
      params: { id: videoId },
    });
  const openLibraryPicker = () =>
    router.replace({
      pathname: "/(tabs)/saved",
      params: {
        addToCollection: collection.id,
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 18,
        }}
      >
        <View style={styles.navRow}>
          <BackButton onPress={() => router.back()} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton
              onPress={() => {
                setEditName(collection.name);
                setEditEmoji(collection.emoji ?? "📌");
                setIsEditingName(false);
                setIsEditing(true);
              }}
              icon={<Pencil size={17} color={BLACK} />}
            />
            <IconButton
              onPress={confirmDelete}
              icon={<Trash2 size={17} color={RED} />}
            />
          </View>
        </View>

        <View style={styles.headerCard}>
          {coverThumbnailUrl && !isEditing ? (
            <View style={styles.coverFrame}>
              <Image
                source={{ uri: coverThumbnailUrl }}
                style={styles.coverImage}
                contentFit="cover"
              />
            </View>
          ) : (
            <Text style={{ fontSize: 42, marginBottom: 10 }}>
              {isEditing ? editEmoji : collection.emoji}
            </Text>
          )}

          {isEditing ? (
            <View style={{ gap: 14 }}>
              {isEditingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    ref={editNameInputRef}
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.titleInput}
                    returnKeyType="done"
                    onSubmitEditing={saveName}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setIsEditingName(true);
                    requestAnimationFrame(() => {
                      editNameInputRef.current?.focus?.();
                    });
                  }}
                  style={styles.editNameButton}
                >
                  <Text style={styles.editNameButtonText}>{editName}</Text>
                  <Text style={styles.editNameHint}>Tap to edit name</Text>
                </Pressable>
              )}

              <CollectionCoverSection
                emoji={editEmoji}
                onSelectEmoji={setEditEmoji}
              />

              <View style={styles.editActions}>
                <Pressable
                  onPress={() => {
                    setEditName(collection.name);
                    setEditEmoji(collection.emoji ?? "📌");
                    setIsEditingName(false);
                    setIsEditing(false);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveName} style={styles.saveButton}>
                  <Check size={16} color={WHITE} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.title}>{collection.name}</Text>
          )}

          <Text style={styles.subtitle}>
            {collectionVideos.length} video
            {collectionVideos.length === 1 ? "" : "s"} saved for later
          </Text>
          <Text style={styles.helperText}>
            These are things you cared enough to keep close.
          </Text>

          {!isEditing && collectionVideos.length > 0 ? (
            <Pressable
              onPress={openLibraryPicker}
              style={({ pressed }) => [
                styles.addVideoButton,
                { backgroundColor: pressed ? "#1A1A1A" : BLACK },
              ]}
            >
              <Plus size={16} color={WHITE} />
              <Text style={styles.addVideoButtonText}>Add Video</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {collectionVideos.length === 0 ? (
          <EmptyStateCard
            icon={<Text style={{ fontSize: 28 }}>{collection.emoji}</Text>}
            title="Nothing here yet"
            text="Add videos from the save flow or from Video Detail whenever you want to group them."
            ctaLabel="Add Video"
            onPress={openLibraryPicker}
          />
        ) : (
          collectionVideos.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              onPress={() => openVideoDetail(video.id)}
              onRemove={() =>
                removeVideoFromCollection(video.id, collection.id)
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function BackButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.circleButton}>
      <ChevronLeft size={22} color={BLACK} />
    </Pressable>
  );
}

function IconButton({ onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={styles.circleButton}>
      {icon}
    </Pressable>
  );
}

function VideoRow({ video, onPress, onRemove }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.videoRow,
        { backgroundColor: pressed ? "#F0F0EE" : WHITE },
      ]}
    >
      <Image
        source={{ uri: video.thumbnailUrl }}
        style={{ width: 88, height: 110 }}
        contentFit="cover"
      />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <PlatformIcon platform={video.platform} size={11} />
          <Text style={styles.meta}>{video.platform}</Text>
        </View>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={styles.meta}>{getSavedWeeksLabel(video.savedAt)}</Text>
      </View>
      <Pressable onPress={onRemove} style={styles.removeButton}>
        <X size={15} color={GREY_TEXT} />
      </Pressable>
    </Pressable>
  );
}

const styles = {
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  headerCard: {
    backgroundColor: WHITE,
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  coverFrame: {
    height: 176,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 18,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    lineHeight: 19,
  },
  addVideoButton: {
    alignSelf: "flex-start",
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addVideoButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editNameButton: {
    borderRadius: 18,
    backgroundColor: "#F7F7F5",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  editNameButtonText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    letterSpacing: -0.5,
  },
  editNameHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
  },
  titleInput: {
    flex: 1,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    borderBottomWidth: 2,
    borderBottomColor: GREY_MID,
    paddingVertical: 2,
  },
  saveButton: {
    minWidth: 88,
    height: 38,
    borderRadius: 19,
    backgroundColor: BLACK,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: GREY_TEXT,
  },
  videoRow: {
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  videoTitle: {
    marginTop: 7,
    marginBottom: 6,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
  },
  removeButton: {
    width: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    textAlign: "center",
    lineHeight: 20,
  },
};
