import { Text, TextInput, View } from "react-native";
import { Type } from "lucide-react-native";
import { BLACK, GREY_MID, GREY_TEXT, WHITE } from "../../constants/addScreen";

export function TitleInputSection({ title, onChangeTitle }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <View
        style={{
          backgroundColor: WHITE,
          borderRadius: 20,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 18,
            paddingTop: 16,
          }}
        >
          <Type size={14} color={GREY_MID} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_500Medium",
              color: GREY_TEXT,
            }}
          >
            Title
          </Text>
        </View>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Give this save a title"
          placeholderTextColor={GREY_MID}
          autoCapitalize="sentences"
          autoCorrect
          style={{
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: BLACK,
            paddingHorizontal: 18,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        />
      </View>
    </View>
  );
}
