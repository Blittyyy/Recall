import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Instagram,
  Youtube,
  Globe,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  ChevronRight as ChevRight,
} from "lucide-react-native";
import { RecallSavedContentIcon } from "../../components/RecallSavedContentIcon";
import { RecallActionIcon } from "../../components/RecallActionIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CATEGORIES as ADD_CATEGORIES } from "../../constants/addScreen";
// ── NEW: store + resurfacing helpers ──────────────────────────────────────────
import { useRecallStore } from "../../store/useRecallStore";
import { EmptyStateCard } from "../../components/EmptyStateCard";
import { RecallSyncState } from "../../components/RecallSyncState";
import { VideoThumbnail } from "../../components/VideoThumbnail";
import {
  toSearchResultCountBucket,
  trackEvent,
} from "../../services/analytics";
import { NewCollectionModal } from "../../components/AddScreen/NewCollectionModal";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";
import { daysAgoFromISO, getCategoryMeta, getWorthRevisitingCount, isActiveReminderSchedule } from "../../utils/resurfacing";
import { SHARE_EXTENSION_EMPTY_NOTE } from "../../constants/shareExtensionEducation";
import { getDisplayTitle } from "../../utils/titleHelpers";
import {
  getSessionLibrarySort,
  setSessionLibrarySort,
  sortLibraryVideos,
  LIBRARY_SORT_OPTIONS,
} from "../../utils/librarySort";
import { LibrarySortSheet } from "../../components/LibrarySortSheet";
import { RECALL_COLORS } from "../../constants/recallTheme";
import Reanimated, {
  Easing,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAppearanceStore } from "../../store/useAppearanceStore";

const LIBRARY_REORDER_LAYOUT = LinearTransition.duration(320).easing(
  Easing.out(Easing.cubic),
);

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = RECALL_COLORS.background;
const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_MID = RECALL_COLORS.mid;
const WARM_SURFACE = RECALL_COLORS.surfaceStrong;
const WARM_INPUT = RECALL_COLORS.surface;
const WARM_BORDER = RECALL_COLORS.border;
const WARM_TEXT = RECALL_COLORS.text;
const WARM_MUTED = RECALL_COLORS.secondaryText;
const WARM_ACCENT = RECALL_COLORS.accent;
const WARM_SHADOW = RECALL_COLORS.shadow;
const LIBRARY_SOFT_OUTLINE = "#EBE3D9";
const LIBRARY_SOFT_OUTLINE_FOCUS = "#DDD2C4";
const SEARCH_FOCUS_MS = 200;
const SEARCH_BLUR_MS = 180;
const SEARCH_EXPAND_SCALE = 1.012;
const SEARCH_PLACEHOLDER = "#A39B92";
const SEARCH_CURSOR = "#1E1915";
const COLLECTION_CARD_SPRING = {
  damping: 18,
  stiffness: 380,
  mass: 0.5,
};
const COLLECTION_CARD_LIFT = 4;
const COLLECTION_CARD_PRESS_SCALE = 0.98;
const LIBRARY_BODY_PADDING = 20;
const LIBRARY_PREVIEW_GAP = 10;
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
  if (platform === "Amazon") {
    return (
      <Image
        source={require("../../../assets/images/amazon-logo.png")}
        style={{ width: size * 1.15, height: size * 1.15 }}
        contentFit="contain"
      />
    );
  }
  if (platform === "Web") return <Globe size={size} color="#5B6B7C" />;
  return <TikTokIcon size={size} color="#1E1915" />;
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

const CHIP_SPRING = {
  damping: 18,
  stiffness: 420,
  mass: 0.45,
};
const CHIP_INDICATOR_SPRING = {
  damping: 24,
  stiffness: 240,
  mass: 0.7,
};
const CHIP_COLOR_MS = 160;
const CHIP_ENTRANCE_MS = 220;
const CHIP_ENTRANCE_STAGGER_MS = 40;
const CHIP_ENTRANCE_OFFSET = 8;
const CATEGORY_FILTER_MS = 225;
const CATEGORY_FILTER_SLIDE = 10;
const CHIP_BORDER_WIDTH = StyleSheet.hairlineWidth;
// Reanimated interpolateColor needs static hex strings (not DynamicColorIOS).
const CHIP_INACTIVE_BG = "transparent";
const CHIP_ACTIVE_BG = "#1E1915";
const CHIP_INACTIVE_BORDER = "#EBE3D9";
const CHIP_ACTIVE_BORDER = "transparent";
const CHIP_INACTIVE_LABEL = "#756E67";
const CHIP_ACTIVE_LABEL = "#FFFFFF";

function CategoryFilterChip({
  cat,
  index,
  active,
  onPress,
  reduceMotion,
  skipEntrance,
}) {
  const colorProgress = useSharedValue(active ? 1 : 0);
  const pressScale = useSharedValue(1);
  const entranceProgress = useSharedValue(reduceMotion || skipEntrance ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      colorProgress.value = active ? 1 : 0;
      return;
    }

    colorProgress.value = withTiming(active ? 1 : 0, {
      duration: CHIP_COLOR_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, colorProgress, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || skipEntrance) {
      entranceProgress.value = 1;
      return;
    }

    entranceProgress.value = withDelay(
      index * CHIP_ENTRANCE_STAGGER_MS,
      withTiming(1, {
        duration: CHIP_ENTRANCE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [entranceProgress, index, reduceMotion, skipEntrance]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(entranceProgress.value, [0, 1], [CHIP_ENTRANCE_OFFSET, 0]),
      },
      { scale: pressScale.value },
    ],
    borderColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [CHIP_INACTIVE_BORDER, CHIP_ACTIVE_BORDER],
    ),
    borderWidth: CHIP_BORDER_WIDTH,
    backgroundColor: CHIP_INACTIVE_BG,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      colorProgress.value,
      [0, 1],
      [CHIP_INACTIVE_LABEL, CHIP_ACTIVE_LABEL],
    ),
  }));

  const handlePressIn = () => {
    if (reduceMotion) {
      return;
    }
    pressScale.value = withTiming(0.97, { duration: 90 });
  };

  const handlePressOut = () => {
    if (reduceMotion) {
      return;
    }
    pressScale.value = withSpring(1, CHIP_SPRING);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Reanimated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 32,
          },
          chipStyle,
        ]}
      >
        {cat.emoji ? <Text style={{ fontSize: 12 }}>{cat.emoji}</Text> : null}
        <Reanimated.Text
          style={[
            {
              fontSize: 13,
              fontFamily: "Inter_500Medium",
            },
            labelStyle,
          ]}
        >
          {cat.label}
        </Reanimated.Text>
      </Reanimated.View>
    </Pressable>
  );
}

function CategoryFilterChipRow({
  categoryFilters,
  activeCategory,
  onSelectCategory,
  reduceMotion,
  chipListPaddingTop = 0,
  entranceDoneRef,
}) {
  const scrollRef = useRef(null);
  const scrollWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const chipLayoutsRef = useRef({});
  const skipEntrance = entranceDoneRef?.current ?? false;
  const indicatorX = useSharedValue(0);
  const indicatorY = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const indicatorH = useSharedValue(0);
  const indicatorReady = useSharedValue(0);

  const moveIndicatorTo = useCallback(
    (categoryId, animated = true) => {
      const layout = chipLayoutsRef.current[categoryId];
      if (!layout) {
        return;
      }

      const shouldAnimate =
        animated && !reduceMotion && indicatorReady.value === 1;

      if (!shouldAnimate) {
        indicatorX.value = layout.x;
        indicatorY.value = layout.y;
        indicatorW.value = layout.width;
        indicatorH.value = layout.height;
        indicatorReady.value = 1;
        return;
      }

      indicatorX.value = withSpring(layout.x, CHIP_INDICATOR_SPRING);
      indicatorY.value = withSpring(layout.y, CHIP_INDICATOR_SPRING);
      indicatorW.value = withSpring(layout.width, CHIP_INDICATOR_SPRING);
      indicatorH.value = withSpring(layout.height, CHIP_INDICATOR_SPRING);
    },
    [
      indicatorH,
      indicatorReady,
      indicatorW,
      indicatorX,
      indicatorY,
      reduceMotion,
    ],
  );

  useEffect(() => {
    if (reduceMotion || skipEntrance || !entranceDoneRef) {
      return;
    }

    const totalDuration =
      Math.max(0, categoryFilters.length - 1) * CHIP_ENTRANCE_STAGGER_MS +
      CHIP_ENTRANCE_MS;
    const timer = setTimeout(() => {
      entranceDoneRef.current = true;
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [categoryFilters.length, entranceDoneRef, reduceMotion, skipEntrance]);

  const scrollToActiveChip = useCallback(
    (categoryId, animated = true) => {
      const layout = chipLayoutsRef.current[categoryId];
      if (!layout || scrollWidthRef.current <= 0) {
        return;
      }

      const targetX = layout.x + layout.width / 2 - scrollWidthRef.current / 2;
      const maxScroll = Math.max(0, contentWidthRef.current - scrollWidthRef.current);
      scrollRef.current?.scrollTo({
        x: Math.min(maxScroll, Math.max(0, targetX)),
        animated: reduceMotion ? false : animated,
      });
    },
    [reduceMotion],
  );

  useEffect(() => {
    moveIndicatorTo(activeCategory, true);
    const frame = requestAnimationFrame(() => {
      scrollToActiveChip(activeCategory);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeCategory, categoryFilters.length, moveIndicatorTo, scrollToActiveChip]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorReady.value,
    position: "absolute",
    left: indicatorX.value,
    top: indicatorY.value,
    width: indicatorW.value,
    height: indicatorH.value,
    borderRadius: 32,
    backgroundColor: CHIP_ACTIVE_BG,
    zIndex: 0,
  }));

  const handleSelectCategory = useCallback(
    (categoryId) => {
      if (categoryId !== activeCategory) {
        Haptics.selectionAsync().catch(() => null);
        // Start the pill move on press so it doesn't wait for React state.
        moveIndicatorTo(categoryId, true);
      }
      onSelectCategory(categoryId);
    },
    [activeCategory, moveIndicatorTo, onSelectCategory],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => {
        scrollWidthRef.current = event.nativeEvent.layout.width;
        scrollToActiveChip(activeCategory, false);
      }}
      onContentSizeChange={(width) => {
        contentWidthRef.current = width;
        scrollToActiveChip(activeCategory, false);
      }}
      contentContainerStyle={{ paddingTop: chipListPaddingTop }}
      style={{
        flexGrow: 0,
        marginHorizontal: -20,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Reanimated.View pointerEvents="none" style={indicatorStyle} />
        {categoryFilters.map((cat, index) => (
          <View
            key={cat.id}
            style={{ zIndex: 1 }}
            onLayout={(event) => {
              chipLayoutsRef.current[cat.id] = event.nativeEvent.layout;
              if (cat.id === activeCategory) {
                moveIndicatorTo(cat.id, false);
              }
            }}
          >
            <CategoryFilterChip
              cat={cat}
              index={index}
              active={activeCategory === cat.id}
              onPress={() => handleSelectCategory(cat.id)}
              reduceMotion={reduceMotion}
              skipEntrance={skipEntrance}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function LibraryCategorySectionHeader({
  title,
  videoCount,
  showSortButton,
  activeSortLabel,
  onOpenSort,
  reduceMotion,
}) {
  const headerTransition = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      headerTransition.value = 1;
      return;
    }

    headerTransition.value = 0;
    headerTransition.value = withTiming(1, {
      duration: CATEGORY_FILTER_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [headerTransition, reduceMotion, title, videoCount]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion
      ? 1
      : interpolate(headerTransition.value, [0, 1], [0, 1]),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(headerTransition.value, [0, 1], [CATEGORY_FILTER_SLIDE, 0]),
      },
    ],
  }));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: WARM_ACCENT,
        paddingLeft: 12,
      }}
    >
      <Reanimated.View style={[{ flex: 1 }, headerAnimatedStyle]}>
        <Text
          style={{
            fontSize: 17,
            fontFamily: "Inter_700Bold",
            color: WARM_TEXT,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        {videoCount > 0 ? (
          <Text
            style={{
              marginTop: 3,
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: WARM_MUTED,
            }}
          >
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </Text>
        ) : null}
      </Reanimated.View>
      {showSortButton ? (
        <Pressable
          onPress={onOpenSort}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            marginLeft: 12,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: WARM_MUTED,
            }}
          >
            {activeSortLabel}
          </Text>
          <ChevronDown size={14} color={WARM_MUTED} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

function LibrarySearchField({ value, onChangeText, reduceMotion }) {
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    if (reduceMotion) {
      focusProgress.value = 1;
      return;
    }
    focusProgress.value = withTiming(1, {
      duration: SEARCH_FOCUS_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleBlur = () => {
    if (reduceMotion) {
      focusProgress.value = 0;
      return;
    }
    focusProgress.value = withTiming(0, {
      duration: SEARCH_BLUR_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduceMotion
          ? 1
          : interpolate(focusProgress.value, [0, 1], [1, SEARCH_EXPAND_SCALE]),
      },
    ],
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [LIBRARY_SOFT_OUTLINE, LIBRARY_SOFT_OUTLINE_FOCUS],
    ),
  }));

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [1, 0.38]),
  }));

  return (
    <Reanimated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: WARM_INPUT,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 10,
          borderWidth: StyleSheet.hairlineWidth,
        },
        containerStyle,
      ]}
    >
      <RecallActionIcon name="search" size={17} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder=""
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: WARM_TEXT,
            padding: 0,
          }}
          selectionColor={SEARCH_CURSOR}
          cursorColor={SEARCH_CURSOR}
          returnKeyType="search"
        />
        {value.length === 0 ? (
          <Reanimated.Text
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                fontSize: 15,
                fontFamily: "Inter_400Regular",
                color: SEARCH_PLACEHOLDER,
              },
              placeholderStyle,
            ]}
          >
            Search your saves...
          </Reanimated.Text>
        ) : null}
      </View>
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")}>
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
      ) : null}
    </Reanimated.View>
  );
}

function CollectionCardPressShell({
  onPress,
  reduceMotion,
  shellStyle,
  pressableStyle,
  children,
}) {
  const pressProgress = useSharedValue(0);

  const handlePressIn = () => {
    if (reduceMotion) {
      pressProgress.value = 1;
      return;
    }
    pressProgress.value = withSpring(1, COLLECTION_CARD_SPRING);
  };

  const handlePressOut = () => {
    if (reduceMotion) {
      pressProgress.value = 0;
      return;
    }
    pressProgress.value = withSpring(0, COLLECTION_CARD_SPRING);
  };

  const animatedShellStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(pressProgress.value, [0, 1], [0, -COLLECTION_CARD_LIFT]),
      },
      {
        scale: reduceMotion
          ? 1
          : interpolate(
              pressProgress.value,
              [0, 1],
              [1, COLLECTION_CARD_PRESS_SCALE],
            ),
      },
    ],
    shadowColor: "#8D7A68",
    shadowOpacity: interpolate(pressProgress.value, [0, 1], [0.07, 0.13]),
    shadowRadius: interpolate(pressProgress.value, [0, 1], [18, 24]),
    shadowOffset: {
      width: 0,
      height: interpolate(pressProgress.value, [0, 1], [5, 10]),
    },
    elevation: interpolate(pressProgress.value, [0, 1], [2, 5]),
  }));

  return (
    <Reanimated.View style={[animatedShellStyle, shellStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={pressableStyle}
      >
        {children}
      </Pressable>
    </Reanimated.View>
  );
}

function CollectionGridCard({ item, onPress, reduceMotion }) {
  const hasPreviews = item.previews && item.previews.length > 0;

  return (
    <CollectionCardPressShell
      onPress={onPress}
      reduceMotion={reduceMotion}
      shellStyle={{ flex: 1 }}
      pressableStyle={{
        backgroundColor: WARM_SURFACE,
        borderRadius: 20,
        overflow: "hidden",
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
        <View style={{ padding: 13, gap: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
              color: WARM_TEXT,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: WARM_MUTED,
            }}
          >
            {item.videoCount === 0
              ? "Empty"
              : `${item.videoCount} video${item.videoCount !== 1 ? "s" : ""}`}
          </Text>
        </View>
    </CollectionCardPressShell>
  );
}

// ─── Library card ──────────────────────────────────────────────────────────────
function LibraryCard({
  item,
  onPress,
  isSelected = false,
  selectionMode = false,
  reorderLayout,
}) {
  const scale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 120 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <Reanimated.View
      layout={reorderLayout}
      style={[{ marginBottom: 14 }, cardAnimatedStyle]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: WARM_SURFACE,
          borderRadius: 24,
          flexDirection: "row",
          alignItems: "flex-start",
          minHeight: 138,
          padding: 6,
          shadowColor: "#8D7A68",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.07,
          shadowRadius: 18,
          elevation: 2,
          borderWidth: selectionMode && isSelected ? 1.5 : 0,
          borderColor: selectionMode && isSelected ? WARM_ACCENT : "transparent",
        }}
      >
        {/* Thumbnail */}
        <View>
          <VideoThumbnail
            thumbnailUrl={item.thumbnail}
            videoUrl={item.videoUrl}
            videoId={item.id}
            platform={item.platform}
            variant="libraryList"
            style={{
              width: 124,
              height: 126,
              borderRadius: 20,
            }}
            imageStyle={{ transform: [{ scale: 1.24 }] }}
          />
        </View>

        {/* Info */}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 126,
            paddingLeft: 12,
            paddingRight: 4,
            paddingVertical: 6,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: WARM_TEXT,
                letterSpacing: -0.15,
                marginBottom: 2,
                lineHeight: 16,
              }}
            >
              {getDisplayTitle(item.title)}
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                fontFamily: "Inter_400Regular",
                color: WARM_MUTED,
                lineHeight: 13,
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {item.creator}
            </Text>
          </View>

          {/* Meta row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Inter_400Regular",
                color: WARM_MUTED,
              }}
              numberOfLines={1}
            >
              {timeAgo(item.savedWeeks)}
            </Text>
            {item.reminderEnabled && isActiveReminderSchedule(item) && (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: "#C9C0B6",
                  }}
                />
                <Text
                  style={{
                  fontSize: 10,
                    fontFamily: "Inter_400Regular",
                    color: WARM_MUTED,
                  }}
                  numberOfLines={1}
                >
                  {item.reminderTime}
                </Text>
              </>
            )}
          </View>

          {/* Bottom row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <View
              style={{
                backgroundColor: "#F3EEE8",
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
                maxWidth: "75%",
              }}
            >
              <Text
                style={{
                  fontSize: 9.5,
                  fontFamily: "Inter_500Medium",
                  color: WARM_MUTED,
                }}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
            <View
              style={{
                width: 25,
                height: 25,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selectionMode ? (
                isSelected ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: WARM_TEXT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={13} color={WHITE} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: LIBRARY_SOFT_OUTLINE,
                      backgroundColor: WARM_SURFACE,
                    }}
                  />
                )
              ) : (
                <ChevronRight size={19} color={WARM_TEXT} strokeWidth={2.1} />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const libraryReorderLayout = reduceMotion ? undefined : LIBRARY_REORDER_LAYOUT;
  const openVideoDetail = (videoId) => {
    router.push({
      pathname: "/video-detail",
      params: {
        id: videoId,
        fromLibrary: "1",
      },
    });
  };
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
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [sortOption, setSortOption] = useState(getSessionLibrarySort);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const categoryChipsEntranceDoneRef = useRef(false);
  const categoryFilterTransition = useSharedValue(1);
  const prevActiveCategoryRef = useRef("all");

  useEffect(() => {
    if (prevActiveCategoryRef.current === activeCategory) {
      return;
    }
    prevActiveCategoryRef.current = activeCategory;

    if (reduceMotion) {
      categoryFilterTransition.value = 1;
      return;
    }

    categoryFilterTransition.value = 0;
    categoryFilterTransition.value = withTiming(1, {
      duration: CATEGORY_FILTER_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeCategory, categoryFilterTransition, reduceMotion]);

  const categoryResultsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion
      ? 1
      : interpolate(categoryFilterTransition.value, [0, 1], [0.62, 1]),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(
              categoryFilterTransition.value,
              [0, 1],
              [CATEGORY_FILTER_SLIDE, 0],
            ),
      },
    ],
  }));

  useEffect(() => {
    if (!highlightId && !addToCollectionId) return;

    setActiveView("saves");
    setActiveCategory("all");
    setSearchQuery("");
  }, [addToCollectionId, highlightId]);

  useEffect(() => {
    if (!addToCollectionId) {
      setSelectedVideoIds([]);
    }
  }, [addToCollectionId]);

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
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.creator ?? "").toLowerCase().includes(q) ||
          (s.category ?? "").toLowerCase().includes(q),
      );
    }
    list = sortLibraryVideos(list, sortOption);
    if (highlightId) {
      list = [...list].sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        return 0;
      });
    }
    return list;
  }, [activeCategory, searchQuery, librarySource, highlightId, sortOption]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return undefined;
    }

    const resultCount = filtered.length;
    const timeoutId = setTimeout(() => {
      trackEvent("search_used", {
        result_count_bucket: toSearchResultCountBucket(resultCount),
        search_scope: "library",
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [filtered.length, searchQuery]);

  const handleSelectSort = (nextSort) => {
    setSessionLibrarySort(nextSort);
    setSortOption(nextSort);
  };

  const activeSortLabel =
    LIBRARY_SORT_OPTIONS.find((option) => option.id === sortOption)?.label ??
    "Newest saved";

  // Live stats from store
  const withReminders = ALL_SAVES.filter(
    (s) => s.reminderEnabled && isActiveReminderSchedule(s),
  ).length;
  const worthRevisitingCount = useMemo(
    () => getWorthRevisitingCount(ALL_SAVES),
    [ALL_SAVES],
  );
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
  const addToCollectionSelectionLabel =
    selectedVideoIds.length === 0
      ? selectionCountLabel
      : `${selectedVideoIds.length} selected`;
  const collectionPreviewCardWidth =
    (screenWidth - LIBRARY_BODY_PADDING * 2 - LIBRARY_PREVIEW_GAP) / 2;

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

    if (collection?.blockedByPaywall) {
      setShowNewCollectionModal(false);
      return;
    }

    if (!collection?.id) {
      return;
    }

    trackEvent("collection_created", { source: "collections_screen" });
    setShowNewCollectionModal(false);
    setActiveView("collections");
  };

  const toggleVideoSelection = (video) => {
    if (!addToCollection) {
      return;
    }

    setSelectedVideoIds((current) =>
      current.includes(video.id)
        ? current.filter((id) => id !== video.id)
        : [...current, video.id],
    );
  };

  const handleDoneAddToCollection = async () => {
    if (!addToCollection || selectedVideoIds.length === 0) {
      return;
    }

    for (const videoId of selectedVideoIds) {
      const video = librarySource.find((entry) => entry.id === videoId);
      if (!video) {
        continue;
      }

      const nextCollectionIds = Array.from(
        new Set([...(video.collections ?? []), addToCollection.id]),
      );
      await setVideoCollections(video.id, nextCollectionIds);
    }

    setSelectedVideoIds([]);
    router.replace({
      pathname: "/collection-detail",
      params: { id: addToCollection.id },
    });
  };

  const handleExitAddToCollectionMode = () => {
    setSelectedVideoIds([]);

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
              <RecallSavedContentIcon name="bookmark" size={21} />
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
                backgroundColor: pressed ? GREY_LIGHT : BLACK,
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

            <Text
              style={{
                marginTop: 18,
                maxWidth: 280,
                fontSize: 13,
                lineHeight: 19,
                fontFamily: "Inter_400Regular",
                color: "#77716B",
                textAlign: "center",
              }}
            >
              {SHARE_EXTENSION_EMPTY_NOTE}
            </Text>

            <Pressable
              onPress={() => router.push("/saving-from-other-apps")}
              style={({ pressed }) => ({
                marginTop: 10,
                paddingVertical: 6,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: "#17130F",
                }}
              >
                How sharing works
              </Text>
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
          backgroundColor: BG,
          paddingTop: insets.top + 16,
          paddingBottom: 12,
          paddingHorizontal: 20,
        }}
      >
        {/* Title row — unchanged */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 38,
                lineHeight: 43,
                fontFamily: "Georgia",
                color: WARM_TEXT,
                letterSpacing: -0.9,
              }}
            >
              Library
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: WARM_MUTED,
                marginTop: 3,
              }}
            >
              {isAddToCollectionMode
                ? addToCollectionSelectionLabel
                : activeView === "saves"
                ? savedVideosLabel
                : `${collectionCards.length} collections`}
            </Text>
          </View>
          {isAddToCollectionMode ? (
            <Pressable
              onPress={handleDoneAddToCollection}
              disabled={selectedVideoIds.length === 0}
              style={({ pressed }) => ({
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor:
                  selectedVideoIds.length === 0
                    ? "#E8E2DA"
                    : pressed
                      ? "#332B25"
                      : WARM_TEXT,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color:
                    selectedVideoIds.length === 0 ? WARM_MUTED : WHITE,
                }}
              >
                Done
              </Text>
            </Pressable>
          ) : activeView === "collections" ? (
            <Pressable
              onPress={openCreateCollectionModal}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: pressed ? "#332B25" : WARM_TEXT,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
              })}
            >
              <RecallSavedContentIcon name="folder-plus" size={14} />
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
              backgroundColor: WARM_SURFACE,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: WARM_BORDER,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: WARM_TEXT,
                }}
              >
                Add to {addToCollection?.name}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: WARM_MUTED,
                  lineHeight: 18,
                }}
              >
                Select videos below, then tap Done.
              </Text>
            </View>
            <Pressable onPress={handleExitAddToCollectionMode} hitSlop={8}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: WARM_MUTED,
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
              backgroundColor: "#EEE8E0",
              borderRadius: 18,
              padding: 4,
              marginBottom: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: LIBRARY_SOFT_OUTLINE,
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
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: active ? WARM_SURFACE : "transparent",
                    alignItems: "center",
                    shadowColor: active ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.05 : 0,
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
                      color: active ? WARM_TEXT : WARM_MUTED,
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
            <LibrarySearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              reduceMotion={reduceMotion}
            />

            {/* Category chips */}
            {showCategoryChips ? (
              <CategoryFilterChipRow
                categoryFilters={categoryFilters}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                reduceMotion={reduceMotion}
                chipListPaddingTop={14}
                entranceDoneRef={categoryChipsEntranceDoneRef}
              />
            ) : null}
          </>
        )}
        {!showSearchBar && showCategoryChips ? (
          <CategoryFilterChipRow
            categoryFilters={categoryFilters}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            reduceMotion={reduceMotion}
            entranceDoneRef={categoryChipsEntranceDoneRef}
          />
        ) : null}
      </View>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: 14,
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
                borderLeftWidth: 3,
                borderLeftColor: WARM_ACCENT,
                paddingLeft: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  color: WARM_TEXT,
                  letterSpacing: -0.2,
                }}
              >
                Collections
              </Text>
              <Pressable onPress={() => setActiveView("collections")}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: WARM_MUTED,
                  }}
                >
                  See all
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: LIBRARY_PREVIEW_GAP,
                paddingHorizontal: LIBRARY_BODY_PADDING,
              }}
              style={{ marginHorizontal: -LIBRARY_BODY_PADDING }}
            >
        {collectionCards.map((collection) => (
                <CollectionCardPressShell
                  key={collection.id}
                  onPress={() =>
                    router.push({
                      pathname: "/collection-detail",
                      params: { id: collection.id },
                    })
                  }
                  reduceMotion={reduceMotion}
                  shellStyle={{ width: collectionPreviewCardWidth }}
                  pressableStyle={{
                    backgroundColor: WARM_SURFACE,
                    borderRadius: 20,
                    padding: 12,
                  }}
                >
                  <View style={{ height: 54, marginBottom: 10, width: "100%" }}>
                    {collection.previews.length > 0 ? (
                      <Image
                        source={{ uri: collection.previews[0] }}
                        style={{
                          width: "100%",
                          height: 54,
                          borderRadius: 14,
                        }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: 54,
                          borderRadius: 14,
                          backgroundColor: "#F4EEE7",
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
                      color: WARM_TEXT,
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
                      color: WARM_MUTED,
                    }}
                  >
                    {collection.videoCount} video
                    {collection.videoCount === 1 ? "" : "s"}
                  </Text>
                </CollectionCardPressShell>
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
                borderLeftWidth: 3,
                borderLeftColor: WARM_ACCENT,
                paddingLeft: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: "Inter_700Bold",
                  color: WARM_TEXT,
                  letterSpacing: -0.2,
                }}
              >
                Your Collections
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: WARM_MUTED,
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
                style={{
                  backgroundColor: WARM_SURFACE,
                  borderWidth: 0,
                  shadowColor: "#8D7A68",
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.07,
                  shadowRadius: 18,
                  elevation: 2,
                }}
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
                    reduceMotion={reduceMotion}
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
                      reduceMotion={reduceMotion}
                    />
                  ) : (
                    /* New Collection placeholder card */
                    <Pressable
                      onPress={openCreateCollectionModal}
                      style={{
                        flex: 1,
                        backgroundColor: WARM_SURFACE,
                        borderRadius: 22,
                        height: 140,
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8,
                        shadowColor: "#8D7A68",
                        shadowOffset: { width: 0, height: 5 },
                        shadowOpacity: 0.07,
                        shadowRadius: 18,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: "#F4EEE7",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <RecallSavedContentIcon name="folder-plus" size={16} />
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_500Medium",
                          color: WARM_MUTED,
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
                backgroundColor: WARM_SURFACE,
                borderRadius: 20,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                shadowColor: "#8D7A68",
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.07,
                shadowRadius: 18,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 20 }}>💡</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: WARM_MUTED,
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
              <View
                style={{
                  flexDirection: "row",
                  gap: LIBRARY_PREVIEW_GAP,
                  marginBottom: 22,
                }}
              >
                {[
                  {
                    value: withReminders,
                    label: "With reminders",
                    detail:
                      withReminders === 1
                        ? "1 scheduled"
                        : `${withReminders} scheduled`,
                    onPress: () => router.push("/(tabs)/calendar"),
                  },
                  {
                    value: worthRevisitingCount,
                    label: "Worth revisiting",
                    detail:
                      worthRevisitingCount === 1
                        ? "1 ready now"
                        : `${worthRevisitingCount} ready now`,
                    onPress: () => router.push("/worth-revisiting"),
                  },
                ].map((stat) => (
                  <Pressable
                    key={stat.label}
                    onPress={stat.onPress}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: WARM_SURFACE,
                      borderRadius: 24,
                      paddingHorizontal: 16,
                      paddingTop: 8,
                      paddingBottom: 8,
                      alignItems: "center",
                      shadowColor: "#8D7A68",
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 0.07,
                      shadowRadius: 18,
                      elevation: 2,
                      opacity: pressed ? 0.94 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 30,
                        fontFamily: "Inter_700Bold",
                        color: WARM_TEXT,
                        letterSpacing: -0.8,
                        marginTop: 2,
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Inter_500Medium",
                        color: WARM_MUTED,
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      {stat.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                        color: GREY_TEXT,
                        textAlign: "center",
                        marginTop: 1,
                        opacity: 0.55,
                      }}
                    >
                      {stat.detail}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <LibraryCategorySectionHeader
              title={
                activeCategory === "all"
                  ? "All Saves"
                  : (categoryFilters.find((c) => c.id === activeCategory)?.label ??
                    activeCategory)
              }
              videoCount={filtered.length}
              showSortButton={showSortButton}
              activeSortLabel={activeSortLabel}
              onOpenSort={() => setShowSortSheet(true)}
              reduceMotion={reduceMotion}
            />

            <Reanimated.View style={categoryResultsAnimatedStyle}>
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
                  reorderLayout={libraryReorderLayout}
                  selectionMode={isAddToCollectionMode}
                  isSelected={selectedVideoIds.includes(item.id)}
                  onPress={() =>
                    isAddToCollectionMode
                      ? toggleVideoSelection(item)
                      : openVideoDetail(item.id)
                  }
                />
              ))
            )}
            </Reanimated.View>
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

      <LibrarySortSheet
        visible={showSortSheet}
        selectedSort={sortOption}
        onSelect={handleSelectSort}
        onClose={() => setShowSortSheet(false)}
        insets={insets}
      />
    </View>
  );
}
