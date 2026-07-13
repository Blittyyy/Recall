import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react-native";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import {
  BLACK,
  CATEGORIES,
  GREY_MID,
  GREY_TEXT,
  WHITE,
} from "../constants/addScreen";
import { NewCollectionModal } from "./AddScreen/NewCollectionModal";
import { getCategoryMeta } from "../utils/resurfacing";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const INSET = RECALL_COLORS.subtle;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const RED = "#B9473A";

export function EditVideoDetailsModal({
  visible,
  onClose,
  onSave,
  onDelete,
  onCreateCollection,
  video,
  collections,
  insets,
}) {
  const knownCategoryIds = useMemo(
    () => new Set(CATEGORIES.map((category) => category.id)),
    [],
  );

  const [title, setTitle] = useState(video?.title ?? "");
  const [creator, setCreator] = useState(video?.creator ?? "");
  const [notes, setNotes] = useState(video?.notes ?? "");
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [selectedCollections, setSelectedCollections] = useState(
    video?.collections ?? [],
  );
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("📌");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !video) {
      setIsSaving(false);
      return;
    }

    const nextCategory = knownCategoryIds.has(video.category)
      ? video.category
      : "other";

    setTitle(video.title ?? "");
    setCreator(video.creator ?? "");
    setNotes(video.notes ?? "");
    setSelectedCategory(nextCategory);
    setCustomCategoryName(
      nextCategory === "other" && video.category
        ? getCategoryMeta(video.category).label
        : "",
    );
    setSelectedCollections(video.collections ?? []);
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionEmoji("📌");
    setIsSaving(false);
  }, [knownCategoryIds, video, visible]);

  const resolvedCategory =
    selectedCategory === "other"
      ? customCategoryName.trim().toLowerCase() || "other"
      : selectedCategory;
  const canSave = title.trim().length > 0 && creator.trim().length > 0;

  const toggleCollection = (collectionId) => {
    setSelectedCollections((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId],
    );
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    const createdCollection = await onCreateCollection?.({
      name,
      emoji: newCollectionEmoji,
      coverType: "icon",
      coverImageUrl: null,
    });

    if (!createdCollection?.id) return;

    setSelectedCollections((current) =>
      current.includes(createdCollection.id)
        ? current
        : [...current, createdCollection.id],
    );
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionEmoji("📌");
  };

  const handleSave = async () => {
    if (!canSave || isSaving) return;

    setIsSaving(true);
    try {
      await onSave?.({
        title: title.trim(),
        creator: creator.trim(),
        notes: notes.trim(),
        category: resolvedCategory,
        collections: selectedCollections,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: BG }}
          edges={["top", "bottom"]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={{
                minHeight: 62,
                paddingHorizontal: 20,
                paddingTop: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? INSET : SURFACE,
                  shadowColor: RECALL_COLORS.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.07,
                  shadowRadius: 12,
                  elevation: 2,
                })}
              >
                <ChevronLeft size={22} color={BLACK} />
              </Pressable>

              <Text
                style={{
                  position: "absolute",
                  left: 80,
                  right: 80,
                  textAlign: "center",
                  fontSize: 22,
                  lineHeight: 28,
                  fontFamily: "Georgia",
                  color: BLACK,
                }}
              >
                Edit Video
              </Text>

              <Pressable
                onPress={handleSave}
                disabled={!canSave || isSaving}
                style={({ pressed }) => ({
                  minWidth: 76,
                  minHeight: 42,
                  borderRadius: 21,
                  paddingHorizontal: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    !canSave || isSaving
                      ? RECALL_COLORS.mid
                      : pressed
                        ? RECALL_COLORS.secondaryText
                        : BLACK,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: BG,
                  }}
                >
                  {isSaving ? "Saving" : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 26,
                paddingBottom: Math.max((insets?.bottom ?? 0) + 28, 44),
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  alignSelf: "center",
                  maxWidth: 310,
                  marginBottom: 28,
                  textAlign: "center",
                  fontSize: 15,
                  lineHeight: 23,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                }}
              >
                Refine the details so Recall resurfaces this at the right time.
              </Text>

              <View
                style={{
                  overflow: "hidden",
                  borderRadius: 30,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: SURFACE,
                  shadowColor: RECALL_COLORS.shadow,
                  shadowOffset: { width: 0, height: 7 },
                  shadowOpacity: 0.06,
                  shadowRadius: 22,
                  elevation: 2,
                }}
              >
                <FormSection label="TITLE">
                  <InsetInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Video title"
                  />
                </FormSection>

                <Divider />

                <FormSection label="CREATOR">
                  <InsetInput
                    value={creator}
                    onChangeText={setCreator}
                    placeholder="Creator or channel"
                  />
                </FormSection>

                <Divider />

                <FormSection
                  label="CATEGORY"
                  helper="Choose the topic that best fits this video."
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingRight: 8 }}
                    style={{ marginHorizontal: -1 }}
                  >
                    {CATEGORIES.map((category) => {
                      const active = selectedCategory === category.id;
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() => setSelectedCategory(category.id)}
                          style={({ pressed }) => ({
                            minHeight: 48,
                            paddingHorizontal: 17,
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: active ? BLACK : BORDER,
                            backgroundColor: active
                              ? BLACK
                              : pressed
                                ? INSET
                                : SURFACE,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 7,
                            shadowColor: active ? "#000000" : "transparent",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: active ? 0.14 : 0,
                            shadowRadius: 5,
                          })}
                        >
                          <Text style={{ fontSize: 15 }}>{category.emoji}</Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: active
                                ? "Inter_600SemiBold"
                                : "Inter_500Medium",
                              color: active ? BG : BLACK,
                            }}
                          >
                            {category.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {selectedCategory === "other" ? (
                    <View style={{ marginTop: 12 }}>
                      <InsetInput
                        value={customCategoryName}
                        onChangeText={setCustomCategoryName}
                        placeholder="Type a category"
                      />
                    </View>
                  ) : null}
                </FormSection>

                <Divider />

                <FormSection
                  label="COLLECTIONS"
                  helper="Group this video with others you want to revisit."
                >
                  {collections?.length ? (
                    <View
                      style={{
                        marginBottom: 12,
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {collections.map((collection) => {
                        const selected = selectedCollections.includes(
                          collection.id,
                        );
                        return (
                          <Pressable
                            key={collection.id}
                            onPress={() => toggleCollection(collection.id)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              borderRadius: 18,
                              borderWidth: 1,
                              borderColor: selected ? BLACK : BORDER,
                              backgroundColor: selected ? BLACK : INSET,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: 13 }}>
                              {collection.emoji}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: "Inter_500Medium",
                                color: selected ? BG : BLACK,
                              }}
                            >
                              {collection.name}
                            </Text>
                            {selected ? (
                              <Check size={12} color={BG} strokeWidth={2.5} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => setShowNewCollection(true)}
                    style={({ pressed }) => ({
                      minHeight: 58,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor: ACCENT,
                      backgroundColor: pressed ? INSET : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    })}
                  >
                    <RecallSavedContentIcon name="folder-plus" size={19} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: GREY_TEXT,
                      }}
                    >
                      Add to collection
                    </Text>
                  </Pressable>
                </FormSection>

                <Divider />

                <FormSection
                  label="NOTES (OPTIONAL)"
                  helper="Add context, key takeaways, or why you saved this."
                >
                  <InsetInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add a note to yourself..."
                    multiline
                  />
                </FormSection>
              </View>

              <Pressable
                onPress={onDelete}
                disabled={!onDelete}
                style={({ pressed }) => ({
                  minHeight: 88,
                  marginTop: 22,
                  paddingHorizontal: 18,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: BORDER,
                  backgroundColor: pressed ? RECALL_COLORS.subtle : SURFACE,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  opacity: onDelete ? 1 : 0.5,
                  shadowColor: RECALL_COLORS.shadow,
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.05,
                  shadowRadius: 16,
                  elevation: 1,
                })}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "#FAEFEC",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={19} color={RED} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: RED,
                    }}
                  >
                    Delete this save
                  </Text>
                  <Text
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                    }}
                  >
                    This action cannot be undone.
                  </Text>
                </View>
                <ChevronRight size={18} color={RECALL_COLORS.mid} />
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <NewCollectionModal
        visible={showNewCollection}
        onClose={() => setShowNewCollection(false)}
        newCollectionName={newCollectionName}
        onChangeCollectionName={setNewCollectionName}
        newCollectionEmoji={newCollectionEmoji}
        onSelectEmoji={setNewCollectionEmoji}
        onCreateCollection={handleCreateCollection}
        insets={insets}
      />
    </>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: BORDER,
        opacity: 0.72,
      }}
    />
  );
}

function FormSection({ label, helper, children }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      <Text
        style={{
          marginBottom: 12,
          fontSize: 12,
          fontFamily: "Inter_600SemiBold",
          color: GREY_TEXT,
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      {children}
      {helper ? (
        <Text
          style={{
            marginTop: 11,
            fontSize: 12,
            lineHeight: 18,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function InsetInput({
  value,
  onChangeText,
  placeholder,
  multiline = false,
}) {
  return (
    <View
      style={{
        minHeight: multiline ? 112 : 58,
        borderRadius: 20,
        backgroundColor: INSET,
        paddingHorizontal: 16,
        paddingVertical: multiline ? 15 : 0,
        justifyContent: multiline ? "flex-start" : "center",
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GREY_MID}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 80 : undefined,
          padding: 0,
          fontSize: 15,
          lineHeight: multiline ? 22 : 20,
          fontFamily: "Inter_400Regular",
          color: BLACK,
        }}
      />
    </View>
  );
}
