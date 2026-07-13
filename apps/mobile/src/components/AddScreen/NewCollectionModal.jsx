import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import {
  WHITE,
  BLACK,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
} from "../../constants/addScreen";
import { CollectionCoverSection } from "../CollectionCoverSection";

const BG = "#F7F7F5";

export function NewCollectionModal({
  visible,
  onClose,
  newCollectionName,
  onChangeCollectionName,
  newCollectionEmoji,
  onSelectEmoji,
  onCreateCollection,
  insets,
}) {
  const bottomInset = insets?.bottom ?? 0;
  const canCreate = newCollectionName.trim().length > 0;

  const handleSubmit = () => {
    if (!canCreate) {
      return;
    }

    Keyboard.dismiss();
    onCreateCollection?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingTop: 6,
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
                  Cancel
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: bottomInset + 28,
              }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
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
                New Collection
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 23,
                  marginBottom: 24,
                  maxWidth: 320,
                }}
              >
                Give it a name that means something to you.
              </Text>

              <View
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 28,
                  paddingHorizontal: 18,
                  paddingVertical: 18,
                  marginBottom: 18,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.05,
                  shadowRadius: 18,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: BG,
                    borderRadius: 18,
                    paddingHorizontal: 18,
                    paddingVertical: 16,
                    marginBottom: 18,
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{newCollectionEmoji}</Text>
                  <TextInput
                    value={newCollectionName}
                    onChangeText={onChangeCollectionName}
                    placeholder='e.g. "Date night ideas"'
                    placeholderTextColor={GREY_MID}
                    autoFocus
                    returnKeyType="done"
                    blurOnSubmit={false}
                    onSubmitEditing={handleSubmit}
                    style={{
                      flex: 1,
                      fontSize: 17,
                      fontFamily: "Inter_400Regular",
                      color: BLACK,
                      padding: 0,
                    }}
                  />
                  {newCollectionName.length > 0 ? (
                    <Pressable onPress={() => onChangeCollectionName("")}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: WHITE,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_700Bold",
                            color: GREY_TEXT,
                            lineHeight: 12,
                          }}
                        >
                          x
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                </View>

                <CollectionCoverSection
                  emoji={newCollectionEmoji}
                  onSelectEmoji={onSelectEmoji}
                />

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canCreate}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    marginTop: 24,
                    backgroundColor: canCreate
                      ? pressed
                        ? "#1A1A1A"
                        : BLACK
                      : GREY_LIGHT,
                    borderRadius: 18,
                    paddingVertical: 18,
                    alignItems: "center",
                  })}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      color: canCreate ? WHITE : GREY_MID,
                    }}
                  >
                    Create Collection
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
