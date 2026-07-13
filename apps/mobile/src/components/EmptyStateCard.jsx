import { Pressable, Text, View } from "react-native";
import { RECALL_COLORS } from "../constants/recallTheme";

const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.mutedText;
const GREY_LIGHT = RECALL_COLORS.subtleStrong;
const GREY_BORDER = RECALL_COLORS.border;

export function EmptyStateCard({
  icon = "O",
  title,
  text,
  ctaLabel,
  onPress,
  style,
}) {
  return (
    <View
      style={[
        {
          backgroundColor: WHITE,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: GREY_BORDER,
          paddingHorizontal: 24,
          paddingVertical: 28,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 18,
          elevation: 2,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 22,
          backgroundColor: GREY_LIGHT,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {typeof icon === "string" ? (
          <Text style={{ fontSize: 26, color: BLACK }}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
      <Text
        style={{
          fontSize: 20,
          fontFamily: "Inter_700Bold",
          color: BLACK,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.35,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_400Regular",
          color: GREY_TEXT,
          textAlign: "center",
          lineHeight: 21,
          maxWidth: 308,
        }}
      >
        {text}
      </Text>
      {ctaLabel && onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            marginTop: 20,
            minWidth: 144,
            borderRadius: 16,
            backgroundColor: pressed ? "#1F1F1F" : BLACK,
            paddingHorizontal: 18,
            paddingVertical: 13,
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              color: WHITE,
            }}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
