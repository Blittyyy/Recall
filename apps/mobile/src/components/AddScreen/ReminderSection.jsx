import { View, Text, Switch, Pressable } from "react-native";
import { Bell, ChevronRight } from "lucide-react-native";
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
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <Pressable
        onPress={onOpenReminderSetup}
        style={{
          backgroundColor: WHITE,
          borderRadius: 20,
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 1,
          paddingHorizontal: 18,
          paddingVertical: 16,
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
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: GREY_LIGHT,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Bell size={16} color={GREY_TEXT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                }}
              >
                {reminderEnabled ? "Reminder on" : "Remind me"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
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
              trackColor={{ false: GREY_LIGHT, true: BLACK }}
              thumbColor={WHITE}
            />
            <ChevronRight size={16} color={GREY_TEXT} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
