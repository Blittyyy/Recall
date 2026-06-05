import { ScrollView, Text, Pressable, View } from "react-native";
import { COLLECTION_EMOJIS, BLACK, GREY_TEXT } from "../constants/addScreen";

const BG = "#F7F7F5";

export function CollectionCoverSection({
  emoji = "ðŸ“Œ",
  onSelectEmoji,
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: GREY_TEXT,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        Icon
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        style={{ marginHorizontal: -4, paddingHorizontal: 4 }}
      >
        {COLLECTION_EMOJIS.map((nextEmoji) => {
          const active = nextEmoji === emoji;
          return (
            <Pressable
              key={nextEmoji}
              onPress={() => onSelectEmoji?.(nextEmoji)}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: active
                  ? BLACK
                  : pressed
                    ? "#ECECF1"
                    : BG,
                justifyContent: "center",
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: active ? 22 : 24 }}>{nextEmoji}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
