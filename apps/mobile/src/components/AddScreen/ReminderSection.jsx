import { View, Text, Switch, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { RecallReminderIcon } from "../RecallReminderIcon";
import { WHITE, BLACK, GREY_LIGHT, GREY_TEXT } from "../../constants/addScreen";

export function ReminderSection({
  reminderEnabled,
  selectedTime,
  selectedFrequency,
  selectedDays,
  onToggleReminder,
  onOpenReminderSetup,
}) {
  const summary =
    reminderEnabled
      ? `${selectedTime} · ${
          selectedFrequency === "Custom" && selectedDays.length > 0
            ? `${selectedDays.length} day${selectedDays.length === 1 ? "" : "s"}`
            : selectedFrequency
        }`
      : "Optional - remind me later";

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
      <Pressable
        onPress={onOpenReminderSetup}
        style={{
          backgroundColor: WHITE,
          borderRadius: 26,
          shadowColor: "#8D7A68",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.07,
          shadowRadius: 18,
          elevation: 2,
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
              paddingRight: 12,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: GREY_LIGHT,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <RecallReminderIcon name="bell" size={19} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                }}
              >
                {reminderEnabled ? "Reminder on" : "Remind me"}
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {summary}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Switch
              value={reminderEnabled}
              onValueChange={onToggleReminder}
              trackColor={{ false: "#E9E2DA", true: BLACK }}
              thumbColor={WHITE}
            />
            <ChevronRight size={16} color={GREY_TEXT} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
