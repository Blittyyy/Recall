import { View, Text, Pressable, Animated } from "react-native";
import { BookmarkCheck, Sparkles } from "lucide-react-native";
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
        paddingBottom: insets.bottom + 16,
        paddingTop: 14,
        backgroundColor: BG,
        borderTopWidth: 1,
        borderTopColor: GREY_LIGHT,
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
            borderRadius: 20,
            paddingVertical: 18,
            minHeight: 58,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: buttonOpacity,
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: hasLink ? 0.18 : 0,
            shadowRadius: 20,
            elevation: hasLink ? 6 : 0,
          })}
        >
          {isSaved ? (
            <BookmarkCheck size={20} color={WHITE} />
          ) : (
            <Sparkles size={18} color={WHITE} />
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
          TikTok, Instagram, and YouTube links are supported
        </Text>
      )}
    </View>
  );
}
