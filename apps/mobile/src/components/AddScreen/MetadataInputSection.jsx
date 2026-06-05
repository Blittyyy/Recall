import { View, Text, TextInput } from "react-native";
import { Type, UserRound } from "lucide-react-native";
import {
  BLACK,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
  WHITE,
} from "../../constants/addScreen";

function MetadataField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "sentences",
}) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 20,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        overflow: "hidden",
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
        {icon}
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_500Medium",
            color: GREY_TEXT,
          }}
        >
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GREY_MID}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
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
  );
}

export function MetadataInputSection({
  title,
  creator,
  onChangeTitle,
  onChangeCreator,
}) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24, gap: 12 }}>
      <View
        style={{
          backgroundColor: GREY_LIGHT,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_600SemiBold",
            color: BLACK,
            marginBottom: 4,
          }}
        >
          We could not pull the video details yet
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            lineHeight: 18,
          }}
        >
          You can still save it now, or tweak the title and creator first.
        </Text>
      </View>

      <MetadataField
        icon={<Type size={14} color={GREY_MID} />}
        label="Title"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="Give this save a title"
      />

      <MetadataField
        icon={<UserRound size={14} color={GREY_MID} />}
        label="Creator"
        value={creator}
        onChangeText={onChangeCreator}
        placeholder="Add the creator or channel"
        autoCapitalize="words"
      />
    </View>
  );
}
