import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import {
  CATEGORIES,
  BLACK,
  WHITE,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
} from "../../constants/addScreen";

export function CategorySelector({
  selectedCategory,
  customCategoryName,
  onSelectCategory,
  onChangeCustomCategory,
}) {
  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {CATEGORIES.map((c) => {
          const active = selectedCategory === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelectCategory(c.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 11,
                borderRadius: 32,
                backgroundColor: active ? BLACK : GREY_LIGHT,
              }}
            >
              <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: active ? WHITE : "#3C3C43",
                }}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedCategory === "other" ? (
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_500Medium",
              color: GREY_TEXT,
              marginBottom: 8,
            }}
          >
            Custom category
          </Text>
          <TextInput
            value={customCategoryName}
            onChangeText={onChangeCustomCategory}
            placeholder="Type a category for filtering"
            placeholderTextColor={GREY_MID}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              color: BLACK,
              padding: 0,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
