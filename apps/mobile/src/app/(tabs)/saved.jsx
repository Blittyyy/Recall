import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Search,
  Instagram,
  Youtube,
  Clock,
  ChevronRight,
  Play,
  RotateCcw,
  SlidersHorizontal,
  FolderOpen,
  Plus,
  Bookmark,
  ChevronRight as ChevRight,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState, useRef, useMemo, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CATEGORIES as ADD_CATEGORIES } from "../../constants/addScreen";
// ── NEW: store + resurfacing helpers ──────────────────────────────────────────
import { useRecallStore } from "../../store/useRecallStore";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { RecallSyncState } from "../../components/RecallSyncState";
import { VideoThumbnail } from "../../components/VideoThumbnail";
import { NewCollectionModal } from "../../components/AddScreen/NewCollectionModal";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";
import { daysAgoFromISO, getCategoryMeta } from "../../utils/resurfacing";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";
const LIBRARY_EMPTY_IMAGE = require("../../../assets/images/library-empty.png");

// ─── Helpers ───────────────────────────────────────────────────────────────────
function TikTokMark({ size = 13, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}
function PlatformIcon({ platform, size = 13 }) {
  if (platform === "Instagram")
    return <Instagram size={size} color="#E4405F" />;
  if (platform === "YouTube") return <Youtube size={size} color="#FF0000" />;
  return <TikTokIcon size={size} color={BLACK} />;
}
function timeAgo(weeks, days) {
  if (days !== undefined) {
    if (days === 0) return "Saved today";
    if (days === 1) return "Saved yesterday";
    if (days < 7) return `Saved ${days}d ago`;
    return `Saved ${Math.round(days / 7)}w ago`;
  }
  if (weeks === 0) return "Just saved";
  if (weeks === 1) return "Saved 1 week ago";
  if (weeks < 4) return `Saved ${weeks} weeks ago`;
  return `Saved ${Math.round(weeks / 4)} month${Math.round(weeks / 4) !== 1 ? "s" : ""} ago`;
}

// ─── Collections mock data ─────────────────────────────────────────────────────
const COLLECTIONS = [
  {
    id: "c1",
    name: "Recipes to Try",
    emoji: "🍳",
    videoCount: 8,
    color: "#FFF3ED",
    previews: [
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=300&auto=format&fit=crop",
    ],
  },
  {
    id: "c2",
    name: "Gym Warmups",
    emoji: "💪",
    videoCount: 5,
    color: "#EDF2FF",
    previews: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=300&auto=format&fit=crop",
    ],
  },
  {
    id: "c3",
    name: "Morning Routine",
    emoji: "🌅",
    videoCount: 4,
    color: "#EDFFF4",
    previews: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=300&auto=format&fit=crop",
    ],
  },
  {
    id: "c4",
    name: "Iceland Trip",
    emoji: "🧊",
    videoCount: 12,
    color: "#F3EDFF",
    previews: [
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=300&auto=format&fit=crop",
    ],
  },
  {
    id: "c5",
    name: "Date Night Ideas",
    emoji: "🕯️",
    videoCount: 3,
    color: "#FFF0F5",
    previews: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=300&auto=format&fit=crop",
    ],
  },
  {
    id: "c6",
    name: "Watch Later",
    emoji: "📌",
    videoCount: 0,
    color: "#F7F7F5",
    previews: [],
  },
];

// ─── CATEGORIES — updated to match store category ids (lowercase) ─────────────
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "wellness", label: "Wellness", emoji: "🌿" },
  { id: "cooking", label: "Cooking", emoji: "🍳" },
  { id: "travel", label: "Travel", emoji: "✈️" },
];

// ─── Collection grid card ──────────────────────────────────────────────────────
const BASE_CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  ...ADD_CATEGORIES,
];

function CollectionGridCard({ item, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  const handleOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();

  const hasPreviews = item.previews && item.previews.length > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          backgroundColor: WHITE,
          borderRadius: 22,
          overflow: "hidden",
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 3,
        }}
      >
        {/* Thumbnail strip */}
        <View
          style={{
            height: 96,
            backgroundColor: item.color,
            position: "relative",
            flexDirection: "row",
          }}
        >
          {hasPreviews ? (
            <>
              <Image
                source={item.previews[0]}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.08)",
                }}
              />
            </>
          ) : (
            /* Empty state — emoji centered */
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 34 }}>{item.emoji}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ padding: 12, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
                flex: 1,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            {item.videoCount === 0
              ? "Empty"
              : `${item.videoCount} video${item.videoCount !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Library card ──────────────────────────────────────────────────────────────
function LibraryCard({ item, onPress, isHighlighted = false }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handleIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  const handleOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();

  const isForgotten = item.savedWeeks >= 4;

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], marginBottom: 12 }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={{
          backgroundColor: WHITE,
          borderRadius: 24,
          borderWidth: isHighlighted ? 1.5 : 0,
          borderColor: isHighlighted ? "rgba(0,0,0,0.1)" : "transparent",
          flexDirection: "row",
          alignItems: "center",
          minHeight: 116,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 3,
          overflow: "hidden",
        }}
      >
        {/* Thumbnail */}
        <View style={{ paddingLeft: 12 }}>
          <VideoThumbnail
            thumbnailUrl={item.thumbnail}
            platform={item.platform}
            variant="libraryList"
          >
            <View style={{ position: "absolute", bottom: 8, left: 8 }}>
              <Text style={{ fontSize: 14 }}>{item.categoryEmoji}</Text>
            </View>
          </VideoThumbnail>
        </View>

        {/* Info */}
        <View
          style={{
            flex: 1,
            minHeight: 116,
            paddingVertical: 13,
            paddingLeft: 14,
            paddingRight: 14,
            justifyContent: "space-between",
          }}
        >
          <View style={{ marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.3,
                marginBottom: 2,
                lineHeight: 19,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
              }}
              numberOfLines={1}
            >
              {item.creator}
            </Text>
            {isHighlighted ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 8,
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_600SemiBold",
                    color: BLACK,
                  }}
                >
                  Just saved
                </Text>
              </View>
            ) : null}
          </View>

          {/* Meta row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_500Medium",
                color: isForgotten ? "#FF9500" : GREY_TEXT,
              }}
            >
              {timeAgo(item.savedWeeks)}
            </Text>
            {item.hasReminder && (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: GREY_MID,
                  }}
                />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                >
                  <Clock size={11} color={GREY_MID} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                    }}
                  >
                    {item.reminderTime}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Bottom row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {isForgotten ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#FFF8F0",
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <RotateCcw size={10} color="#FF9500" />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_600SemiBold",
                    color: "#FF9500",
                  }}
                >
                  Revisit?
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 9,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                  }}
                >
                  {item.category}
                </Text>
              </View>
            )}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: BLACK,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Play size={11} color={WHITE} fill={WHITE} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const highlightId = Array.isArray(params.highlight)
    ? params.highlight[0]
    : params.highlight;
  const addToCollectionId = Array.isArray(params.addToCollection)
    ? params.addToCollection[0]
    : params.addToCollection;
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ── Store — live data ──────────────────────────────────────────────────────
  const storeVideos = useRecallStore((s) => s.videos);
  const storeCollections = useRecallStore((s) => s.collections);
  const isLoaded = useRecallStore((s) => s.isLoaded);
  const isLoading = useRecallStore((s) => s.isLoading);
  const errorMessage = useRecallStore((s) => s.errorMessage);
  const reloadData = useRecallStore((s) => s.reloadData);
  const addCollection = useRecallStore((s) => s.addCollection);
  const setVideoCollections = useRecallStore((s) => s.setVideoCollections);
  const openVideoDetail = (videoId) =>
    router.push({
      pathname: "/video-detail",
      params: { id: videoId },
    });
  const ALL_SAVES = useMemo(
    () => storeVideos.filter((v) => !v.archived),
    [storeVideos],
  );
  const collectionCards = useMemo(
    () =>
      storeCollections.map((collection) => {
        const collectionVideos = ALL_SAVES.filter(
          (video) =>
            collection.videoIds.includes(video.id) ||
            video.collections?.includes(collection.id),
        );

        return {
          ...collection,
          videoCount: collectionVideos.length,
          color: "#F7F7F5",
          previews: collectionVideos
            .slice(0, 3)
            .map((video) => video.thumbnailUrl),
        };
      }),
    [ALL_SAVES, storeCollections],
  );

  /** Adapt store video shape → what LibraryCard expects */
  const addToCollection = useMemo(
    () =>
      addToCollectionId
        ? storeCollections.find((collection) => collection.id === addToCollectionId) ??
          null
        : null,
    [addToCollectionId, storeCollections],
  );
  const librarySource = useMemo(() => {
    if (!addToCollection) {
      return ALL_SAVES;
    }

    return ALL_SAVES.filter(
      (video) =>
        !(
          addToCollection.videoIds.includes(video.id) ||
          video.collections?.includes(addToCollection.id)
        ),
    );
  }, [ALL_SAVES, addToCollection]);

  function adaptVideo(v) {
    const meta = getCategoryMeta(v.category);
    return {
      ...v,
      thumbnail: v.thumbnailUrl,
      categoryEmoji: meta.emoji,
      category: meta.label,
      savedWeeks: Math.round(daysAgoFromISO(v.savedAt) / 7),
      reminderTime: v.reminderTime ?? "",
    };
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeView, setActiveView] = useState("saves"); // "saves" | "collections"
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("📌");
  const [newCollectionCoverType, setNewCollectionCoverType] = useState("icon");
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlightId && !addToCollectionId) return;

    setActiveView("saves");
    setActiveCategory("all");
    setSearchQuery("");
  }, [addToCollectionId, highlightId]);

  const handleSearchFocus = () =>
    Animated.timing(searchFocusAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  const handleSearchBlur = () =>
    Animated.timing(searchFocusAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();

  const searchBorderColor = searchFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.12)"],
  });

  const categoryFilters = useMemo(() => {
    const builtInIds = new Set(BASE_CATEGORY_FILTERS.map((category) => category.id));
    const customCategories = Array.from(
      new Set(
        librarySource
          .map((video) => video.category)
          .filter((categoryId) => categoryId && !builtInIds.has(categoryId)),
      ),
    ).map((categoryId) => {
      const meta = getCategoryMeta(categoryId);
      return {
        id: categoryId,
        label: meta.label,
        emoji: meta.emoji,
      };
    });

    return [...BASE_CATEGORY_FILTERS, ...customCategories];
  }, [librarySource]);

  const filtered = useMemo(() => {
    let list = librarySource;
    if (activeCategory !== "all")
      list = list.filter((s) => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.creator.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
        );
    }
    if (highlightId) {
      list = [...list].sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        return 0;
      });
    }
    return list;
  }, [activeCategory, searchQuery, librarySource, highlightId]);

  // Live stats from store
  const withReminders = ALL_SAVES.filter(
    (s) => s.hasReminder && s.reminderEnabled,
  ).length;
  const oldSaves = ALL_SAVES.filter(
    (s) => daysAgoFromISO(s.savedAt) >= 14 && !s.lastOpenedAt,
  ).length;
  const saveCount = ALL_SAVES.length;
  const savedVideosLabel = `${saveCount} ${saveCount === 1 ? "video" : "videos"} saved`;
  const isEmptyLibrary = saveCount === 0;
  const isAddToCollectionMode = !!addToCollection;
  const isEarlyLibrary = saveCount > 0 && saveCount < 5;
  const isEstablishedLibrary = saveCount >= 5;
  const showViewToggle = !isAddToCollectionMode;
  const showSortButton =
    !isAddToCollectionMode && activeView === "saves" && isEstablishedLibrary;
  const showSearchBar =
    activeView === "saves" && !isEmptyLibrary;
  const showCategoryChips = activeView === "saves" && !isEmptyLibrary;
  const showStatsCards =
    !isAddToCollectionMode &&
    activeView === "saves" &&
    isEstablishedLibrary &&
    activeCategory === "all" &&
    !searchQuery;
  const showCollectionsPreview =
    !isAddToCollectionMode &&
    activeView === "saves" &&
    isEstablishedLibrary &&
    ALL_SAVES.length > 0 &&
    collectionCards.length > 0;
  const selectionCountLabel = `${librarySource.length} ${
    librarySource.length === 1 ? "video" : "videos"
  } available`;

  const openCreateCollectionModal = () => {
    setNewCollectionName("");
    setNewCollectionEmoji("📌");
    setNewCollectionCoverType("icon");
    setShowNewCollectionModal(true);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      return;
    }

    const collection = await addCollection({
      name,
      emoji: newCollectionEmoji,
      coverType: newCollectionCoverType,
      coverImageUrl: null,
    });

    if (!collection?.id) {
      return;
    }

    setShowNewCollectionModal(false);
    setActiveView("collections");
  };

  const handleSelectVideoForCollection = async (video) => {
    if (!addToCollection) {
      return;
    }

    const nextCollectionIds = Array.from(
      new Set([...(video.collections ?? []), addToCollection.id]),
    );
    await setVideoCollections(video.id, nextCollectionIds);
    router.replace({
      pathname: "/collection-detail",
      params: { id: addToCollection.id },
    });
  };

  const handleExitAddToCollectionMode = () => {
    if (!addToCollection) {
      router.replace("/(tabs)/saved");
      return;
    }

    router.replace({
      pathname: "/collection-detail",
      params: { id: addToCollection.id },
    });
  };

  if (!fontsLoaded) return null;

  const showFirstUseLibrary =
    isLoaded &&
    !errorMessage &&
    isEmptyLibrary &&
    collectionCards.length === 0 &&
    !isAddToCollectionMode &&
    activeView === "saves";

  if (showFirstUseLibrary) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FBF8F3" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 18,
            paddingBottom: Math.max(insets.bottom + 116, 142),
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              minHeight: 52,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Bookmark size={21} color="#17130F" strokeWidth={1.8} />
              <Text
                style={{
                  fontSize: 25,
                  lineHeight: 30,
                  fontFamily: "Georgia",
                  color: "#17130F",
                }}
              >
                Recall
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityLabel="Open profile"
              style={({ pressed }) => ({
                position: "absolute",
                right: 0,
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#2A2A2A" : "#111111",
              })}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Georgia",
                  color: WHITE,
                }}
              >
                R
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: 48,
            }}
          >
            <Image
              source={LIBRARY_EMPTY_IMAGE}
              style={{
                width: 142,
                height: 142,
                marginBottom: 26,
              }}
              contentFit="contain"
            />

            <Text
              style={{
                fontSize: 21,
                lineHeight: 27,
                fontFamily: "Inter_700Bold",
                color: "#17130F",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Your library is empty
            </Text>
            <Text
              style={{
                maxWidth: 260,
                fontSize: 14,
                lineHeight: 21,
                fontFamily: "Inter_400Regular",
                color: "#77716B",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              Videos you save will appear here{"\n"}so you can find them anytime.
            </Text>

            <Pressable
              onPress={() => router.push("/(tabs)/add")}
              style={({ pressed }) => ({
                minWidth: 150,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed ? "#2A2A2A" : "#111111",
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.14,
                shadowRadius: 12,
                elevation: 3,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                Add a Video
              </Text>
              <Plus size={17} color={WHITE} strokeWidth={2} />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom + 168, 212),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* ── STICKY HEADER ─────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: WHITE,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: 20,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* Title row — unchanged */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 14,
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
              Library
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                marginTop: 2,
              }}
            >
              {isAddToCollectionMode
                ? selectionCountLabel
                : activeView === "saves"
                ? savedVideosLabel
                : `${collectionCards.length} collections`}
            </Text>
          </View>
          {activeView === "collections" ? (
            <Pressable
              onPress={openCreateCollectionModal}
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
              <Plus size={14} color={WHITE} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: WHITE,
                }}
              >
                New
              </Text>
            </Pressable>
          ) : showSortButton ? (
            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: pressed ? "#E5E5EA" : GREY_LIGHT,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 9,
              })}
            >
              <SlidersHorizontal size={14} color={GREY_TEXT} />
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: GREY_TEXT,
                }}
              >
                Sort
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* ── View toggle (segmented control) ── */}
        {isAddToCollectionMode ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              backgroundColor: GREY_LIGHT,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                }}
              >
                Add to {addToCollection?.name}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 18,
                }}
              >
                Tap a saved video below to add it to this collection.
              </Text>
            </View>
            <Pressable onPress={handleExitAddToCollectionMode} hitSlop={8}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: GREY_TEXT,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : null}

        {showViewToggle ? (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: GREY_LIGHT,
              borderRadius: 14,
              padding: 3,
              marginBottom: 14,
            }}
          >
            {[
              { key: "saves", label: "All Saves" },
              { key: "collections", label: "Collections" },
            ].map((view) => {
              const active = activeView === view.key;
              return (
                <Pressable
                  key={view.key}
                  onPress={() => setActiveView(view.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 11,
                    backgroundColor: active ? WHITE : "transparent",
                    alignItems: "center",
                    shadowColor: active ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: active ? 2 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: active
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                      color: active ? BLACK : GREY_TEXT,
                    }}
                  >
                    {view.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Search bar — only show in saves view */}
        {showSearchBar && (
          <>
            <Animated.View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: GREY_LIGHT,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 11,
                gap: 10,
                borderWidth: 1.5,
                borderColor: searchBorderColor,
              }}
            >
              <Search size={16} color={GREY_MID} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder="Search your saves..."
                placeholderTextColor={GREY_MID}
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontFamily: "Inter_400Regular",
                  color: BLACK,
                  padding: 0,
                }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: GREY_MID,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: WHITE,
                        lineHeight: 12,
                      }}
                    >
                      ✕
                    </Text>
                  </View>
                </Pressable>
              )}
            </Animated.View>

            {/* Category chips */}
            {showCategoryChips ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingTop: 14 }}
              style={{
                flexGrow: 0,
                marginHorizontal: -20,
                paddingHorizontal: 20,
              }}
            >
              {categoryFilters.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 32,
                      backgroundColor: active ? BLACK : GREY_LIGHT,
                    }}
                  >
                    {cat.emoji && (
                      <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: active
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                        color: active ? WHITE : "#3C3C43",
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            ) : null}
          </>
        )}
        {!showSearchBar && showCategoryChips ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{
              flexGrow: 0,
              marginHorizontal: -20,
              paddingHorizontal: 20,
            }}
          >
            {categoryFilters.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 32,
                    backgroundColor: active ? BLACK : GREY_LIGHT,
                  }}
                >
                  {cat.emoji && <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>}
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: active
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                      color: active ? WHITE : "#3C3C43",
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 20,
        }}
      >
        <RecallSyncState
          isLoading={isLoading}
          isLoaded={isLoaded}
          errorMessage={errorMessage}
          onRetry={reloadData}
          style={{ marginBottom: 18 }}
        />

        {showCollectionsPreview && (
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.4,
                }}
              >
                Collections
              </Text>
              <Pressable onPress={() => setActiveView("collections")}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: GREY_TEXT,
                  }}
                >
                  See all
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
            >
        {collectionCards.map((collection) => (
                <Pressable
                  key={collection.id}
                  onPress={() =>
                    router.push({
                      pathname: "/collection-detail",
                      params: { id: collection.id },
                    })
                  }
                  style={{
                    width: 150,
                    backgroundColor: WHITE,
                    borderRadius: 20,
                    padding: 12,
                    shadowColor: BLACK,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 14,
                    elevation: 2,
                  }}
                >
                  <View style={{ height: 54, marginBottom: 10 }}>
                    {collection.previews.length > 0 ? (
                      <Image
                        source={{ uri: collection.previews[0] }}
                        style={{
                          width: 94,
                          height: 54,
                          borderRadius: 14,
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          backgroundColor: GREY_LIGHT,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{collection.emoji}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_700Bold",
                      color: BLACK,
                    }}
                    numberOfLines={1}
                  >
                    {collection.name}
                  </Text>
                  <Text
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                    }}
                  >
                    {collection.videoCount} video
                    {collection.videoCount === 1 ? "" : "s"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {activeView === "collections" ? (
          /* ── COLLECTIONS GRID VIEW ──────────────────────────────── */
          <View>
            {/* Section label */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.4,
                }}
              >
                Your Collections
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                }}
              >
                {collectionCards.length} total
              </Text>
            </View>

            {/* 2-column grid */}
            {!errorMessage && collectionCards.length === 0 && (
              <EmptyStateCard
                icon="🗂"
                title="Create your first collection"
                text="Group saves by recipes, workouts, travel ideas, inspiration, or anything else."
                ctaLabel="Create Collection"
                onPress={openCreateCollectionModal}
              />
            )}
            {collectionCards.length > 0 &&
              Array.from(
              { length: Math.ceil(collectionCards.length / 2) },
              (_, rowIndex) => (
                <View
                  key={rowIndex}
                  style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                >
                  <CollectionGridCard
                    item={collectionCards[rowIndex * 2]}
                    onPress={() =>
                      router.push({
                        pathname: "/collection-detail",
                        params: { id: collectionCards[rowIndex * 2].id },
                      })
                    }
                  />
                  {collectionCards[rowIndex * 2 + 1] ? (
                    <CollectionGridCard
                      item={collectionCards[rowIndex * 2 + 1]}
                      onPress={() =>
                        router.push({
                          pathname: "/collection-detail",
                          params: { id: collectionCards[rowIndex * 2 + 1].id },
                        })
                      }
                    />
                  ) : (
                    /* New Collection placeholder card */
                    <Pressable
                      onPress={openCreateCollectionModal}
                      style={{
                        flex: 1,
                        backgroundColor: WHITE,
                        borderRadius: 22,
                        height: 140,
                        borderWidth: 1.5,
                        borderStyle: "dashed",
                        borderColor: GREY_MID,
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: GREY_LIGHT,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Plus size={16} color={GREY_TEXT} />
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_500Medium",
                          color: GREY_TEXT,
                          textAlign: "center",
                        }}
                      >
                        New Collection
                      </Text>
                    </Pressable>
                  )}
                </View>
              ),
            )}

            {/* Tip */}
            {collectionCards.length > 0 && (
            <View
              style={{
                marginTop: 8,
                backgroundColor: "#F7F7F5",
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 20 }}>💡</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 19,
                }}
              >
                When saving a video, tap "Add to Collection" to keep things
                organized.
              </Text>
            </View>
            )}
          </View>
        ) : (
          /* ── SAVES LIST VIEW — unchanged ────────────────────────── */
          <>
            {/* Quick stats */}
            {showStatsCards && (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                {[
                  {
                    value: withReminders,
                    label: "With reminders",
                    bg: "#F0F4FF",
                    color: "#1C64F2",
                  },
                  {
                    value: oldSaves,
                    label: "Worth revisiting",
                    bg: "#FFF8F0",
                    color: "#FF9500",
                  },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: stat.bg,
                      borderRadius: 16,
                      padding: 16,
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 26,
                        fontFamily: "Inter_700Bold",
                        color: stat.color,
                        letterSpacing: -0.6,
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                        color: stat.color,
                        textAlign: "center",
                        opacity: 0.8,
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Section label */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.4,
                }}
              >
                {activeCategory === "all"
                  ? "All Saves"
                  : (categoryFilters.find((c) => c.id === activeCategory)?.label ??
                    activeCategory)}
              </Text>
              {filtered.length > 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                  }}
                >
                  {filtered.length} {filtered.length === 1 ? "video" : "videos"}
                </Text>
              )}
            </View>

            {/* List or empty state */}
            {filtered.length === 0 ? (
              errorMessage ? null : (
              <View
                style={{ alignItems: "center", paddingVertical: 52, gap: 10 }}
              >
                <Text style={{ fontSize: 36 }}>🔍</Text>
                <Text
                  style={{
                    fontSize: 17,
                    fontFamily: "Inter_600SemiBold",
                    color: BLACK,
                    letterSpacing: -0.3,
                  }}
                >
                  {ALL_SAVES.length === 0
                    ? "Your library is empty"
                    : isAddToCollectionMode
                      ? "Nothing left to add"
                      : "No saved videos found"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                    textAlign: "center",
                    lineHeight: 20,
                    maxWidth: 240,
                  }}
                >
                  {ALL_SAVES.length === 0
                    ? "Save TikToks, Reels, and YouTube videos you don't want to lose."
                    : isAddToCollectionMode
                      ? "Every saved video is already in this collection, or your filters are hiding the rest."
                      : "Try another keyword or category."}
                </Text>
                <Pressable
                  style={({ pressed }) => ({
                    marginTop: 8,
                    backgroundColor: pressed ? "#1A1A1A" : BLACK,
                    borderRadius: 14,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                  })}
                  onPress={() => {
                    if (ALL_SAVES.length === 0) {
                      router.push("/(tabs)/add");
                      return;
                    }
                    if (isAddToCollectionMode) {
                      handleExitAddToCollectionMode();
                      return;
                    }
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: WHITE,
                    }}
                  >
                    {ALL_SAVES.length === 0
                      ? "Save to Recall"
                      : isAddToCollectionMode
                        ? "Back to collection"
                        : "Clear filters"}
                  </Text>
                </Pressable>
              </View>
              )
            ) : (
              filtered.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={adaptVideo(item)}
                  isHighlighted={item.id === highlightId}
                  onPress={() =>
                    isAddToCollectionMode
                      ? handleSelectVideoForCollection(item)
                      : openVideoDetail(item.id)
                  }
                />
              ))
            )}
          </>
        )}
      </View>
      </ScrollView>

      <NewCollectionModal
        visible={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        newCollectionName={newCollectionName}
        onChangeCollectionName={setNewCollectionName}
        newCollectionEmoji={newCollectionEmoji}
        newCollectionCoverType={newCollectionCoverType}
        onSelectEmoji={setNewCollectionEmoji}
        onSelectCoverType={setNewCollectionCoverType}
        onCreateCollection={handleCreateCollection}
        insets={insets}
      />
    </View>
  );
}
