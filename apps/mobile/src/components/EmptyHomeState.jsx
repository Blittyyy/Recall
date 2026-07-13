import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import { RecallReminderIcon } from "./RecallReminderIcon";
import { RECALL_COLORS } from "../constants/recallTheme";
import { SHARE_EXTENSION_EMPTY_NOTE } from "../constants/shareExtensionEducation";

const BG = RECALL_COLORS.background;
const SURFACE = RECALL_COLORS.surface;
const BORDER = RECALL_COLORS.border;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const ACCENT = RECALL_COLORS.accent;
const ICON_BG = RECALL_COLORS.subtle;
const HERO_IMAGE = require("../../assets/images/empty-home.png");

const STEPS = [
  {
    title: "Save videos",
    subtitle: "Add content from any platform in seconds.",
    savedIconName: "bookmark",
  },
  {
    title: "Organize them",
    subtitle: "Group your saves into collections.",
    savedIconName: "collections",
  },
  {
    title: "Rediscover later",
    subtitle: "Get reminded and return when it matters.",
    reminderIconName: "rediscovery",
  },
];

export function EmptyHomeState({
  greetingName,
  topInset,
  bottomInset,
  onAddVideo,
  onHowSharingWorks,
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
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <RecallSavedContentIcon name="bookmark" size={25} />
            <Text
              style={{
                fontSize: 27,
                lineHeight: 31,
                fontFamily: "Georgia",
                color: TEXT,
                letterSpacing: -0.7,
              }}
            >
              Recall
            </Text>
          </View>
        </View>

        <Text
          style={{
            marginTop: 26,
            marginBottom: 22,
            fontSize: 37,
            lineHeight: 42,
            fontFamily: "Georgia",
            color: TEXT,
            letterSpacing: -1.15,
          }}
        >
          Good morning,{"\n"}
          {greetingName} 👋
        </Text>

        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: "rgba(231,222,211,0.72)",
            paddingHorizontal: 22,
            paddingTop: 24,
            paddingBottom: 26,
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
            style={{ width: 220, height: 190 }}
          />
          <Text
            style={{
              marginTop: 8,
              fontSize: 22,
              lineHeight: 27,
              fontFamily: "Inter_700Bold",
              color: TEXT,
              letterSpacing: -0.45,
              textAlign: "center",
            }}
          >
            Save your first video
          </Text>
          <Text
            style={{
              marginTop: 10,
              maxWidth: 290,
              fontSize: 15,
              lineHeight: 22,
              fontFamily: "Inter_400Regular",
              color: MUTED,
              textAlign: "center",
            }}
          >
            Add a TikTok, Reel, or YouTube{"\n"}video you don’t want to lose.
          </Text>

          <Pressable
            onPress={onAddVideo}
            style={({ pressed }) => ({
              marginTop: 20,
              minWidth: 190,
              height: 52,
              borderRadius: 26,
              backgroundColor: pressed ? RECALL_COLORS.subtleStrong : BG,
              borderWidth: 1,
              borderColor: "rgba(231,222,211,0.72)",
              paddingHorizontal: 22,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              shadowColor: "#9C8976",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 2,
            })}
          >
            <Text
              style={{
                color: TEXT,
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Add a Video
            </Text>
            <Plus size={21} color={TEXT} strokeWidth={2} />
          </Pressable>
        </View>

        <Text
          style={{
            marginTop: 18,
            maxWidth: 320,
            alignSelf: "center",
            fontSize: 14,
            lineHeight: 20,
            fontFamily: "Inter_400Regular",
            color: MUTED,
            textAlign: "center",
          }}
        >
          {SHARE_EXTENSION_EMPTY_NOTE}
        </Text>

        {onHowSharingWorks ? (
          <Pressable
            onPress={onHowSharingWorks}
            style={({ pressed }) => ({
              marginTop: 10,
              alignSelf: "center",
              paddingVertical: 6,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: TEXT,
              }}
            >
              How sharing works
            </Text>
          </Pressable>
        ) : null}

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
          How Recall works
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
          {STEPS.map(({ title, subtitle, savedIconName, reminderIconName }, index) => (
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
                {savedIconName ? (
                  <RecallSavedContentIcon name={savedIconName} size={22} />
                ) : (
                  <RecallReminderIcon name={reminderIconName} size={22} />
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
