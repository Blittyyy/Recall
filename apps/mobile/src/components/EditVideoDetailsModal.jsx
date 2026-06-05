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
import { ChevronLeft } from "lucide-react-native";
import {
  BLACK,
  CATEGORIES,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
  WHITE,
} from "../constants/addScreen";
import { CategorySelector } from "./AddScreen/CategorySelector";
import { CollectionPicker } from "./AddScreen/CollectionPicker";
import { NewCollectionModal } from "./AddScreen/NewCollectionModal";
import { getCategoryMeta } from "../utils/resurfacing";

const BG = "#F7F7F5";

export function EditVideoDetailsModal({
  visible,
  onClose,
  onSave,
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
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [selectedCollections, setSelectedCollections] = useState(
    video?.collections ?? [],
  );
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("ðŸ“Œ");
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
    setSelectedCategory(nextCategory);
    setCustomCategoryName(
      nextCategory === "other" && video.category
        ? getCategoryMeta(video.category).label
        : "",
    );
    setSelectedCollections(video.collections ?? []);
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionEmoji("ðŸ“Œ");
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
    if (!name) {
      return;
    }

    const createdCollection = await onCreateCollection?.({
      name,
      emoji: newCollectionEmoji,
      coverType: "icon",
      coverImageUrl: null,
    });

    if (!createdCollection?.id) {
      return;
    }

    setSelectedCollections((current) =>
      current.includes(createdCollection.id)
        ? current
        : [...current, createdCollection.id],
    );
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionEmoji("ðŸ“Œ");
  };

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({
        title: title.trim(),
        creator: creator.trim(),
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
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: Math.max((insets?.top ?? 0) * 0.35, 12),
                paddingBottom: 10,
              }}
            >
              <Pressable
                onPress={onClose}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  minHeight: 36,
                }}
                hitSlop={8}
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

              <Pressable
                onPress={handleSave}
                disabled={!canSave || isSaving}
                hitSlop={8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: !canSave || isSaving ? GREY_MID : BLACK,
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: (insets?.bottom ?? 0) + 28,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 30,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.8,
                  marginBottom: 8,
                }}
              >
                Edit Video
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 23,
                  marginBottom: 22,
                  maxWidth: 320,
                }}
              >
                Clean up the details for this save.
              </Text>

              <View
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 28,
                  padding: 18,
                  gap: 18,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.05,
                  shadowRadius: 18,
                  elevation: 2,
                }}
              >
                <Field label="Title">
                  <Input
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Video title"
                  />
                </Field>

                <Field label="Creator">
                  <Input
                    value={creator}
                    onChangeText={setCreator}
                    placeholder="Creator or channel"
                  />
                </Field>

                <Field label="Category">
                  <CategorySelector
                    selectedCategory={selectedCategory}
                    customCategoryName={customCategoryName}
                    onSelectCategory={setSelectedCategory}
                    onChangeCustomCategory={setCustomCategoryName}
                  />
                </Field>

                <Field label="Collections">
                  <CollectionPicker
                    collections={collections}
                    selectedCollections={selectedCollections}
                    onToggleCollection={toggleCollection}
                    onShowNewCollection={() => setShowNewCollection(true)}
                  />
                </Field>
              </View>
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

function Field({ label, children }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: GREY_TEXT,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Input({ value, onChangeText, placeholder }) {
  return (
    <View
      style={{
        backgroundColor: BG,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GREY_MID}
        style={{
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: BLACK,
          padding: 0,
        }}
      />
    </View>
  );
}
