import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import { RECALL_COLORS } from "../constants/recallTheme";
import { createThumbnailImageSource } from "../utils/thumbnailImageSource";
import { useAppearanceStore } from "../store/useAppearanceStore";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const INSET = RECALL_COLORS.subtle;
const FLIGHT_SIZE = 44;

export function CollectionSelectionModal({
  visible,
  onClose,
  onSave,
  onCreateCollection,
  collections,
  selectedCollectionIds,
  insets,
  thumbnailUrl,
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const [draftSelection, setDraftSelection] = useState(
    selectedCollectionIds ?? [],
  );
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("📌");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [flightPreview, setFlightPreview] = useState(null);
  const sheetY = useRef(new Animated.Value(80)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const flightAnim = useRef(new Animated.Value(0)).current;
  const collectionRowRefs = useRef(new Map()).current;
  const collectionScaleAnims = useRef(new Map()).current;

  const getCollectionScaleAnim = (collectionId) => {
    if (!collectionScaleAnims.has(collectionId)) {
      collectionScaleAnims.set(collectionId, new Animated.Value(1));
    }
    return collectionScaleAnims.get(collectionId);
  };

  useEffect(() => {
    if (!visible) {
      setIsSaving(false);
      setIsCreating(false);
      setShowInlineCreate(false);
      setFlightPreview(null);
      return;
    }

    setDraftSelection(selectedCollectionIds ?? []);
    sheetY.setValue(80);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 22,
        stiffness: 210,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    backdropOpacity,
    selectedCollectionIds,
    sheetY,
    visible,
  ]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 70,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose?.();
    });
  };

  const startFlightAnimation = ({
    startX,
    startY,
    destinationX,
    destinationY,
  }) => {
    flightAnim.stopAnimation();
    flightAnim.setValue(0);
    setFlightPreview({
      thumbnailUrl,
      startX,
      startY,
      destinationX,
      destinationY,
    });

    Animated.timing(flightAnim, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setFlightPreview(null);
      }
    });
  };

  const animateCollectionSelection = (collectionId, collectionIndex) => {
    const triggerHaptic = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    };

    if (reduceMotion) {
      triggerHaptic();
      return;
    }

    const rowNode = collectionRowRefs.get(collectionId);
    const scaleAnim = getCollectionScaleAnim(collectionId);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.025,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (!rowNode?.measureInWindow) {
      startFlightAnimation({
        startX: screenWidth * 0.5 - FLIGHT_SIZE * 0.5,
        startY: Math.max(112, screenHeight * 0.38),
        destinationX: 30,
        destinationY: Math.min(
          screenHeight - 136,
          Math.max(220, screenHeight * 0.44 + collectionIndex * 93),
        ),
      });
      triggerHaptic();
      return;
    }

    rowNode.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        startFlightAnimation({
          startX: screenWidth * 0.5 - FLIGHT_SIZE * 0.5,
          startY: Math.max(112, screenHeight * 0.38),
          destinationX: 30,
          destinationY: Math.min(
            screenHeight - 136,
            Math.max(220, screenHeight * 0.44 + collectionIndex * 93),
          ),
        });
        triggerHaptic();
        return;
      }

      const startX = screenWidth * 0.5 - FLIGHT_SIZE * 0.5;
      const startY = Math.max(112, y - 118);
      const destinationX = x + 10 + 31 - FLIGHT_SIZE * 0.5;
      const destinationY = y + 10 + 31 - FLIGHT_SIZE * 0.5;

      startFlightAnimation({
        startX,
        startY,
        destinationX,
        destinationY,
      });

      triggerHaptic();
    });
  };

  const toggleCollection = (collectionId, collectionIndex) => {
    const isSelecting = !draftSelection.includes(collectionId);

    if (isSelecting) {
      animateCollectionSelection(collectionId, collectionIndex);
    } else {
      Haptics.selectionAsync().catch(() => null);
    }

    setDraftSelection((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId],
    );
  };

  const openInlineCreate = () => {
    Haptics.selectionAsync().catch(() => null);
    flightAnim.stopAnimation();
    setFlightPreview(null);
    setNewCollectionName("");
    setNewCollectionEmoji("📌");
    setShowInlineCreate(true);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const createdCollection = await onCreateCollection?.({
        name,
        emoji: newCollectionEmoji.trim() || "📌",
        coverType: "icon",
        coverImageUrl: null,
      });

      if (!createdCollection?.id) return;

      setDraftSelection((current) =>
        current.includes(createdCollection.id)
          ? current
          : [...current, createdCollection.id],
      );
      setShowInlineCreate(false);
      setNewCollectionName("");
      setNewCollectionEmoji("📌");
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave?.(draftSelection);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
          <Pressable
            onPress={closeSheet}
            style={StyleSheet.absoluteFillObject}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                flex: 1,
                backgroundColor: "rgba(24,20,17,0.42)",
                opacity: backdropOpacity,
              }}
            />
          </Pressable>

          <Animated.View
            style={{
              zIndex: 1,
              elevation: 20,
              maxHeight: "88%",
              paddingTop: 10,
              paddingHorizontal: 20,
              paddingBottom: Math.max((insets?.bottom ?? 0) + 16, 28),
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              backgroundColor: BG,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.12,
              shadowRadius: 28,
              elevation: 18,
              transform: [{ translateY: sheetY }],
            }}
          >
            <View
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                backgroundColor: RECALL_COLORS.mid,
                alignSelf: "center",
                marginBottom: 17,
                opacity: 0.7,
              }}
            />

            <View
              style={{
                minHeight: 56,
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 18,
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text
                  style={{
                    fontSize: 25,
                    lineHeight: 31,
                    fontFamily: "Georgia",
                    color: TEXT,
                  }}
                >
                  Add to Collection
                </Text>
                <Text
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    lineHeight: 19,
                    fontFamily: "Inter_400Regular",
                    color: MUTED,
                  }}
                >
                  Keep related saves together.
                </Text>
              </View>
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                hitSlop={8}
                style={({ pressed }) => ({
                  paddingHorizontal: 8,
                  paddingVertical: 7,
                  opacity: isSaving ? 0.45 : pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: ACCENT,
                  }}
                >
                  {isSaving ? "Saving" : "Done"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {collections.length === 0 ? (
                <View
                  style={{
                    minHeight: 210,
                    borderRadius: 26,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: SURFACE,
                    paddingHorizontal: 28,
                    paddingVertical: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: RECALL_COLORS.shadow,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.05,
                    shadowRadius: 18,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 22,
                      backgroundColor: INSET,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <RecallSavedContentIcon name="folder-plus" size={24} />
                  </View>
                  <Text
                    style={{
                      fontSize: 17,
                      fontFamily: "Inter_600SemiBold",
                      color: TEXT,
                    }}
                  >
                    No collections yet
                  </Text>
                  <Text
                    style={{
                      marginTop: 7,
                      maxWidth: 285,
                      fontSize: 13,
                      lineHeight: 20,
                      fontFamily: "Inter_400Regular",
                      color: MUTED,
                      textAlign: "center",
                    }}
                  >
                    Create collections to organize saves around topics, moods,
                    or goals.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 11 }}>
                  {collections.map((collection, index) => (
                    <CollectionRow
                      key={collection.id}
                      collection={collection}
                      selected={draftSelection.includes(collection.id)}
                      rowRef={(node) => {
                        if (node) {
                          collectionRowRefs.set(collection.id, node);
                        } else {
                          collectionRowRefs.delete(collection.id);
                        }
                      }}
                      scaleAnim={getCollectionScaleAnim(collection.id)}
                      onPress={() => toggleCollection(collection.id, index)}
                    />
                  ))}
                </View>
              )}

              {showInlineCreate ? (
                <View
                  style={{
                    marginTop: 16,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: SURFACE,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      marginBottom: 12,
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                      color: TEXT,
                    }}
                  >
                    New Collection
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      value={newCollectionEmoji}
                      onChangeText={setNewCollectionEmoji}
                      placeholder="📌"
                      placeholderTextColor={RECALL_COLORS.mid}
                      maxLength={4}
                      style={{
                        width: 58,
                        height: 54,
                        borderRadius: 18,
                        backgroundColor: INSET,
                        textAlign: "center",
                        fontSize: 22,
                        color: TEXT,
                      }}
                    />
                    <TextInput
                      value={newCollectionName}
                      onChangeText={setNewCollectionName}
                      placeholder="Collection name"
                      placeholderTextColor={RECALL_COLORS.mid}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleCreateCollection}
                      style={{
                        flex: 1,
                        height: 54,
                        borderRadius: 18,
                        backgroundColor: INSET,
                        paddingHorizontal: 16,
                        fontSize: 15,
                        fontFamily: "Inter_400Regular",
                        color: TEXT,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      marginTop: 12,
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Pressable
                      onPress={() => setShowInlineCreate(false)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        opacity: pressed ? 0.55 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_500Medium",
                          color: MUTED,
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCreateCollection}
                      disabled={!newCollectionName.trim() || isCreating}
                      style={({ pressed }) => ({
                        minWidth: 82,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        borderRadius: 17,
                        alignItems: "center",
                        backgroundColor:
                          !newCollectionName.trim() || isCreating
                            ? RECALL_COLORS.mid
                            : pressed
                              ? MUTED
                              : TEXT,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_600SemiBold",
                          color: BG,
                        }}
                      >
                        {isCreating ? "Creating" : "Create"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={openInlineCreate}
                  style={({ pressed }) => ({
                    minHeight: 58,
                    marginTop: 16,
                    borderRadius: 29,
                    backgroundColor: pressed ? MUTED : TEXT,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 7 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 4,
                  })}
                >
                  <RecallSavedContentIcon name="folder-plus" size={19} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: BG,
                    }}
                  >
                    New Collection
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
          {!showInlineCreate ? (
            <FlightPreview flightAnim={flightAnim} preview={flightPreview} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FlightPreview({ flightAnim, preview }) {
  if (!preview) return null;

  const translateX = flightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [preview.startX, preview.destinationX],
  });
  const translateY = flightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [preview.startY, preview.destinationY],
  });
  const scale = flightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.55],
  });
  const opacity = flightAnim.interpolate({
    inputRange: [0, 0.1, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: FLIGHT_SIZE,
        height: FLIGHT_SIZE,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: INSET,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      }}
    >
      {preview.thumbnailUrl ? (
        <Image
          source={createThumbnailImageSource(preview.thumbnailUrl)}
          contentFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <LinearGradient
          colors={["#F8EFE4", "#E8D6C2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RecallSavedContentIcon name="bookmark-check" size={20} />
        </LinearGradient>
      )}
    </Animated.View>
  );
}

function CollectionRow({ collection, selected, rowRef, scaleAnim, onPress }) {
  const videoCount = collection.videoIds?.length ?? 0;
  const videoLabel = `${videoCount} ${videoCount === 1 ? "video" : "videos"}`;

  return (
    <Animated.View
      ref={rowRef}
      collapsable={false}
      style={{ transform: [{ scale: scaleAnim }] }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 82,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: selected ? ACCENT : BORDER,
          backgroundColor: selected ? INSET : SURFACE,
          padding: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          shadowColor: RECALL_COLORS.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.045,
          shadowRadius: 12,
          elevation: 1,
        })}
      >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: INSET,
        }}
      >
        {collection.coverImageUrl ? (
          <Image
            source={{ uri: collection.coverImageUrl }}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <LinearGradient
            colors={["#F8EFE4", "#E8D6C2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 25 }}>{collection.emoji || "📌"}</Text>
          </LinearGradient>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            lineHeight: 20,
            fontFamily: "Inter_600SemiBold",
            color: TEXT,
          }}
        >
          {collection.name}
        </Text>
        <Text
          style={{
            marginTop: 5,
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: MUTED,
          }}
        >
          {videoLabel}
        </Text>
      </View>

      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: selected ? 0 : 1,
          borderColor: BORDER,
          backgroundColor: selected ? SURFACE : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <Check size={16} color={TEXT} strokeWidth={2.4} /> : null}
      </View>
      </Pressable>
    </Animated.View>
  );
}
