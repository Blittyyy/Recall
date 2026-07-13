import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { RecallActionIcon } from "./RecallActionIcon";
import { RecallReminderIcon } from "./RecallReminderIcon";
import { RECALL_COLORS } from "../constants/recallTheme";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const BORDER = RECALL_COLORS.border;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const ACCENT = RECALL_COLORS.accent;
const ICON_BG = RECALL_COLORS.subtle;
const HERO_IMAGE = require("../../assets/images/reminders-empty.png");

const STEPS = [
  {
    title: "Pick a time",
    subtitle: "Choose when you want to be reminded.",
    iconName: "today",
  },
  {
    title: "We’ll remind you",
    subtitle: "Get notified when it matters.",
    iconName: "bell",
  },
  {
    title: "Return later",
    subtitle: "Rediscover saved videos at the right moment.",
    actionIconName: "play",
  },
];

export function EmptyRemindersState({
  topInset,
  bottomInset,
  onCreateReminder,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topInset + 18,
          paddingHorizontal: 20,
          paddingBottom: Math.max(bottomInset + 72, 92),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            minHeight: 46,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 29,
              lineHeight: 34,
              fontFamily: "Georgia",
              color: TEXT,
              letterSpacing: -0.75,
            }}
          >
            Reminders
          </Text>
        </View>

        <View
          style={{
            marginTop: 22,
            backgroundColor: SURFACE,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(231,222,211,0.7)",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 28,
            alignItems: "center",
            shadowColor: "#9C8976",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 3,
          }}
        >
          <Image
            source={HERO_IMAGE}
            contentFit="contain"
            style={{ width: 230, height: 210 }}
          />

          <Text
            style={{
              marginTop: 3,
              fontSize: 30,
              lineHeight: 36,
              fontFamily: "Georgia",
              color: TEXT,
              letterSpacing: -0.9,
              textAlign: "center",
            }}
          >
            No reminders yet
          </Text>
          <Text
            style={{
              marginTop: 12,
              maxWidth: 300,
              fontSize: 15,
              lineHeight: 22,
              fontFamily: "Inter_400Regular",
              color: MUTED,
              textAlign: "center",
            }}
          >
            Save videos and choose when you want to revisit them.
          </Text>

          <Pressable
            onPress={onCreateReminder}
            style={({ pressed }) => ({
              marginTop: 22,
              minWidth: 258,
              height: 54,
              borderRadius: 27,
              backgroundColor: pressed ? "#282828" : "#090909",
              paddingHorizontal: 22,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 7 },
              shadowOpacity: 0.14,
              shadowRadius: 14,
              elevation: 3,
            })}
          >
            <Text
              style={{
                color: BG,
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Create your first reminder
            </Text>
            <Plus size={20} color={BG} strokeWidth={2} />
          </Pressable>
        </View>

        <Text
          style={{
            marginTop: 24,
            marginBottom: 12,
            marginLeft: 2,
            fontSize: 18,
            lineHeight: 23,
            fontFamily: "Inter_700Bold",
            color: TEXT,
            letterSpacing: -0.25,
          }}
        >
          How reminders work
        </Text>

        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(231,222,211,0.68)",
            paddingHorizontal: 16,
            shadowColor: "#9C8976",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 2,
          }}
        >
          {STEPS.map(({ title, subtitle, Icon, iconName, actionIconName }, index) => (
            <View
              key={title}
              style={{
                minHeight: 86,
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: index === STEPS.length - 1 ? 0 : 1,
                borderBottomColor: BORDER,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: ICON_BG,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                {iconName ? (
                  <RecallReminderIcon name={iconName} size={22} />
                ) : actionIconName ? (
                  <RecallActionIcon name={actionIconName} size={22} />
                ) : (
                  <Icon size={22} color={ACCENT} strokeWidth={1.8} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 20,
                    fontFamily: "Inter_600SemiBold",
                    color: TEXT,
                    letterSpacing: -0.2,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 13,
                    lineHeight: 18,
                    fontFamily: "Inter_400Regular",
                    color: MUTED,
                  }}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
