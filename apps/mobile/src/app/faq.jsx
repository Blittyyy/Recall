import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useState } from "react";
import { RECALL_COLORS } from "../constants/recallTheme";

const FAQ_ITEMS = [
  {
    question: "How do reminders work?",
    answer:
      "Recall resurfaces saved videos when you choose or when they're worth revisiting.",
  },
  {
    question: "Can I save TikToks, Reels, and YouTube videos?",
    answer: "Yes - Recall supports videos from major platforms.",
  },
  {
    question: "Why didn't I receive a notification?",
    answer:
      "Make sure notifications are enabled in both Recall and your device settings.",
  },
  {
    question: "Can I organize videos into collections?",
    answer:
      "Yes - collections help keep saves grouped and easy to revisit.",
  },
  {
    question: "Does Recall sync across devices?",
    answer:
      "Yes - your saved videos and reminders sync with your account.",
  },
];

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState(0);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: RECALL_COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: pressed
              ? RECALL_COLORS.subtle
              : RECALL_COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: RECALL_COLORS.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 1,
          })}
        >
          <ChevronLeft size={21} color={RECALL_COLORS.text} />
        </Pressable>

        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: 38,
            lineHeight: 44,
            color: RECALL_COLORS.text,
          }}
        >
          FAQ
        </Text>
        <Text
          style={{
            marginTop: 8,
            marginBottom: 28,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            lineHeight: 22,
            color: RECALL_COLORS.secondaryText,
          }}
        >
          A few helpful answers about Recall.
        </Text>

        <View
          style={{
            overflow: "hidden",
            borderRadius: 26,
            backgroundColor: RECALL_COLORS.surface,
            shadowColor: RECALL_COLORS.shadow,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.06,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <View key={item.question}>
                <Pressable
                  onPress={() => setOpenIndex(isOpen ? -1 : index)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 18,
                    paddingVertical: 17,
                    backgroundColor: pressed
                      ? RECALL_COLORS.subtle
                      : RECALL_COLORS.surface,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: "Inter_500Medium",
                        fontSize: 15,
                        lineHeight: 21,
                        color: RECALL_COLORS.text,
                      }}
                    >
                      {item.question}
                    </Text>
                    {isOpen ? (
                      <ChevronUp size={17} color={RECALL_COLORS.mid} />
                    ) : (
                      <ChevronDown size={17} color={RECALL_COLORS.mid} />
                    )}
                  </View>
                  {isOpen ? (
                    <Text
                      style={{
                        marginTop: 10,
                        paddingRight: 24,
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        lineHeight: 20,
                        color: RECALL_COLORS.secondaryText,
                      }}
                    >
                      {item.answer}
                    </Text>
                  ) : null}
                </Pressable>
                {index < FAQ_ITEMS.length - 1 ? (
                  <View
                    style={{
                      height: 1,
                      marginLeft: 18,
                      backgroundColor: RECALL_COLORS.border,
                      opacity: 0.7,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
