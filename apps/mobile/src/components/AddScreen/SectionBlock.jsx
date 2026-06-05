import { View, Text } from "react-native";
import { BLACK, GREY_LIGHT } from "../../constants/addScreen";

export function SectionBlock({ icon, label, children }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: GREY_LIGHT,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_600SemiBold",
            color: BLACK,
          }}
        >
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}
