import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Archive, ChevronLeft, RotateCcw, Trash2 } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useMemo } from "react";
import { useRecallStore } from "../store/useRecallStore";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { VideoThumbnail } from "../components/VideoThumbnail";
import { getCategoryMeta, getSavedTimeLabel } from "../utils/resurfacing";

const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const RED = "#FF3B30";

function BackButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: pressed ? "#F0F0EE" : WHITE,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <ChevronLeft size={20} color={BLACK} />
    </Pressable>
  );
}

function ArchivedVideoCard({ video, onOpen, onRestore, onDelete }) {
  const category = getCategoryMeta(video.category);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#F5F5F3" : WHITE,
        borderRadius: 24,
        padding: 14,
        marginBottom: 14,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
      })}
    >
      <View style={{ flexDirection: "row", gap: 14 }}>
        <VideoThumbnail
          thumbnailUrl={video.thumbnailUrl}
          platform={video.platform}
          variant="libraryList"
        />
        <View style={{ flex: 1, minWidth: 0, justifyContent: "space-between" }}>
          <View>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                lineHeight: 22,
                letterSpacing: -0.35,
              }}
              numberOfLines={2}
            >
              {video.title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {video.creator}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 8,
              }}
            >
              Archived from {category.label} · Saved {getSavedTimeLabel(video.savedAt)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: GREY_LIGHT,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: GREY_TEXT,
                }}
              >
                {category.emoji} {category.label}
              </Text>
            </View>

            <Pressable
              onPress={onRestore}
              style={({ pressed }) => ({
                marginLeft: "auto",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 14,
                backgroundColor: pressed ? "#1F1F1F" : BLACK,
              })}
            >
              <RotateCcw size={14} color={WHITE} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                Restore
              </Text>
            </Pressable>

            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: pressed ? "#FEECEB" : "#FFF4F4",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Trash2 size={15} color={RED} />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const videos = useRecallStore((s) => s.videos);
  const restoreArchivedVideo = useRecallStore((s) => s.restoreArchivedVideo);
  const removeVideo = useRecallStore((s) => s.removeVideo);

  const archivedVideos = useMemo(
    () =>
      videos
        .filter((video) => video.archived)
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [videos],
  );

  if (!fontsLoaded) return null;

  const handleRestore = (video) => {
    Alert.alert("Restore this video?", "It will return to your Home and Library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        onPress: async () => {
          const restored = await restoreArchivedVideo(video.id);
          if (restored) {
            Alert.alert("Restored");
          }
        },
      },
    ]);
  };

  const handleDelete = (video) => {
    Alert.alert(
      "Delete this video?",
      "This permanently removes it from Recall. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeVideo(video.id);
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <BackButton onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 30,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.9,
              }}
            >
              Archive
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 2,
              }}
            >
              {archivedVideos.length} archived video{archivedVideos.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {archivedVideos.length === 0 ? (
          <EmptyStateCard
            icon={<Archive size={26} color={BLACK} />}
            title="Nothing archived"
            text="Videos you archive will appear here."
          />
        ) : (
          archivedVideos.map((video) => (
            <ArchivedVideoCard
              key={video.id}
              video={video}
              onOpen={() => router.push(`/video-detail?id=${video.id}`)}
              onRestore={() => handleRestore(video)}
              onDelete={() => handleDelete(video)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
