import { View, Text, Pressable, Animated } from "react-native";
import { RecallSavedContentIcon } from "../RecallSavedContentIcon";
import { RecallReminderIcon } from "../RecallReminderIcon";
import {
  BG,
  BLACK,
  WHITE,
  GREY_LIGHT,
  GREY_MID,
  GREEN,
} from "../../constants/addScreen";

/**
 * SaveButton
 *
 * Opacity / enabled states:
 *   - No URL typed   → 0.38 opacity, always tappable (shows validation error)
 *   - URL but no platform detected → 0.72 opacity, tappable (shows inline error)
 *   - Platform detected → full opacity, fully enabled
 *   - Saving / Saved → locked, shows appropriate label
 */
export function SaveButton({
  url,
  detectedPlatform,
  onSave,
  saveState,
  saveAnim,
  insets,
}) {
  const isSaved = saveState === "saved";
  const isSaving = saveState === "saving";
  const hasUrl = url.trim().length > 0;
  const hasLink = !!detectedPlatform;
  const isDisabled = !hasLink || isSaving || isSaved;

  // Determine button opacity:
  // no URL → very dim; URL but no recognised platform → half dim; recognised → full
  const buttonOpacity = !hasUrl ? 0.38 : !hasLink ? 0.72 : 1;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 14,
        paddingTop: 16,
        backgroundColor: BG,
        borderTopWidth: 1,
        borderTopColor: "#E7DED3",
      }}
    >
      <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
        <Pressable
          onPress={onSave}
          disabled={isDisabled}
          style={({ pressed }) => ({
            backgroundColor: isSaved
              ? GREEN
              : hasLink && pressed
                ? "#1A1A1A"
                : isDisabled
                  ? "#2B2B2B"
                  : BLACK,
            borderRadius: 24,
            minHeight: 64,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: buttonOpacity,
            shadowColor: "#6E5845",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: hasLink ? 0.2 : 0,
            shadowRadius: 24,
            elevation: hasLink ? 7 : 0,
          })}
        >
          {isSaved ? (
            <RecallSavedContentIcon name="bookmark-check" size={20} />
          ) : (
            <RecallReminderIcon name="sparkles" size={18} />
          )}
          <Text
            style={{
              fontSize: 17,
              fontFamily: "Inter_600SemiBold",
              color: WHITE,
              letterSpacing: -0.3,
            }}
          >
            {isSaved ? "Saved!" : isSaving ? "Saving…" : "Save to Recall"}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Contextual hint below button */}
      {!hasUrl && (
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: GREY_MID,
            marginTop: 10,
          }}
        >
          Paste a link to keep it close for later
        </Text>
      )}
      {hasUrl && !hasLink && (
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: GREY_MID,
            marginTop: 10,
          }}
        >
          TikTok, Instagram, YouTube, and webpage links are supported
        </Text>
      )}
    </View>
  );
}
