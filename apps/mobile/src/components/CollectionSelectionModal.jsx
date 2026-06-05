import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FolderPlus } from "lucide-react-native";
import { CollectionPicker } from "./AddScreen/CollectionPicker";
import { NewCollectionModal } from "./AddScreen/NewCollectionModal";

const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_LIGHT = "#F2F2F7";
const GREY_TEXT = "#8E8E93";

export function CollectionSelectionModal({
  visible,
  onClose,
  onSave,
  onCreateCollection,
  collections,
  selectedCollectionIds,
  insets,
}) {
  const [draftSelection, setDraftSelection] = useState(
    selectedCollectionIds ?? [],
  );
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionEmoji, setNewCollectionEmoji] = useState("ðŸ“Œ");
  const [newCollectionCoverType, setNewCollectionCoverType] = useState("icon");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSaving(false);
      return;
    }

    setDraftSelection(selectedCollectionIds ?? []);
  }, [visible, selectedCollectionIds]);

  const toggleCollection = (collectionId) => {
    setDraftSelection((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId],
    );
  };

  const openNewCollection = () => {
    setNewCollectionName("");
    setNewCollectionEmoji("ðŸ“Œ");
    setNewCollectionCoverType("icon");
    setShowNewCollection(true);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      return;
    }

    const createdCollection = await onCreateCollection?.({
      name,
      emoji: newCollectionEmoji,
      coverType: newCollectionCoverType,
      coverImageUrl: null,
    });

    if (!createdCollection?.id) {
      return;
    }

    setDraftSelection((current) =>
      current.includes(createdCollection.id)
        ? current
        : [...current, createdCollection.id],
    );
    setShowNewCollection(false);
    setNewCollectionName("");
    setNewCollectionEmoji("ðŸ“Œ");
    setNewCollectionCoverType("icon");
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.(draftSelection);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.34)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => null}
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "86%",
              paddingTop: 12,
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#D1D1D6",
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <Text
              style={{
                fontSize: 20,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.4,
              }}
            >
              Add to Collection
            </Text>
            <Text
              style={{
                marginTop: 6,
                marginBottom: 18,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
                lineHeight: 20,
              }}
            >
              Choose one or more collections for this save.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {collections.length === 0 ? (
                <View
                  style={{
                    backgroundColor: GREY_LIGHT,
                    borderRadius: 22,
                    padding: 22,
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: WHITE,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <FolderPlus size={20} color={BLACK} />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: BLACK,
                    }}
                  >
                    Create your first collection
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                      textAlign: "center",
                      lineHeight: 19,
                    }}
                  >
                    Group saves by recipes, workouts, travel ideas,
                    inspiration, or anything else.
                  </Text>
                  <Pressable
                    onPress={openNewCollection}
                    style={({ pressed }) => ({
                      marginTop: 6,
                      backgroundColor: pressed ? "#1A1A1A" : BLACK,
                      borderRadius: 14,
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: WHITE,
                      }}
                    >
                      Create Collection
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <CollectionPicker
                  collections={collections}
                  selectedCollections={draftSelection}
                  onToggleCollection={toggleCollection}
                  onShowNewCollection={openNewCollection}
                />
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 10,
              }}
            >
              <Pressable onPress={onClose} hitSlop={8}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_500Medium",
                    color: GREY_TEXT,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => ({
                  backgroundColor: isSaving
                    ? "#4A4A4A"
                    : pressed
                      ? "#1A1A1A"
                      : BLACK,
                  borderRadius: 16,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_600SemiBold",
                    color: WHITE,
                  }}
                >
                  {isSaving ? "Saving..." : "Save Collections"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <NewCollectionModal
        visible={showNewCollection}
        onClose={() => setShowNewCollection(false)}
        newCollectionName={newCollectionName}
        onChangeCollectionName={setNewCollectionName}
        newCollectionEmoji={newCollectionEmoji}
        newCollectionCoverType={newCollectionCoverType}
        onSelectEmoji={setNewCollectionEmoji}
        onSelectCoverType={setNewCollectionCoverType}
        onCreateCollection={handleCreateCollection}
        insets={insets}
      />
    </>
  );
}
