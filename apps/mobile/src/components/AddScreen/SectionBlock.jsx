import { View, Text } from "react-native";
import { BLACK, GREY_LIGHT } from "../../constants/addScreen";

export function SectionBlock({ icon, label, children }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            backgroundColor: GREY_LIGHT,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontSize: 18,
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
