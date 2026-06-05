import { View, Text, Animated, TextInput, Pressable } from "react-native";
import {
  Link2,
  Clipboard,
  Instagram,
  Youtube,
  X,
  AlertCircle,
} from "lucide-react-native";
import { TikTokIcon } from "./TikTokIcon";
import { PlatformIcon } from "./PlatformIcon";
import {
  WHITE,
  BLACK,
  GREY_MID,
  GREY_LIGHT,
  GREY_TEXT,
  RED,
} from "../../constants/addScreen";

const GREEN = "#34C759";

const PLATFORM_DISPLAY = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

export function UrlInputSection({
  url,
  onUrlChange,
  onClearUrl,
  onPasteFromClipboard,
  urlError,
  errorShake,
  detectedPlatform,
}) {
  const hasLink = !!detectedPlatform;

  return (
    <>
      <Animated.View
        style={{
          paddingHorizontal: 20,
          marginBottom: 8,
          transform: [{ translateX: errorShake }],
        }}
      >
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 20,
            borderWidth: urlError ? 1.5 : hasLink ? 1.5 : 0,
            borderColor: urlError
              ? RED
              : hasLink
                ? "rgba(52,199,89,0.4)"
                : "transparent",
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 18,
              paddingVertical: 6,
              minHeight: 64,
            }}
          >
            <Link2
              size={20}
              color={urlError ? RED : hasLink ? GREEN : GREY_MID}
              style={{ marginRight: 12 }}
            />
            <TextInput
              value={url}
              onChangeText={onUrlChange}
              placeholder="Paste a link to save it"
              placeholderTextColor={GREY_MID}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              style={{
                flex: 1,
                fontSize: 15,
                fontFamily: "Inter_400Regular",
                color: BLACK,
                paddingVertical: 10,
              }}
            />

            {url.length > 0 && (
              <Pressable
                onPress={onClearUrl}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "#E5E5EA",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <X size={14} color={GREY_TEXT} />
              </Pressable>
            )}
          </View>

          {url.length === 0 && (
            <Pressable
              onPress={onPasteFromClipboard}
              style={{
                borderTopWidth: 1,
                borderTopColor: GREY_LIGHT,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 18,
                paddingVertical: 14,
                gap: 16,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Clipboard size={14} color={GREY_MID} />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: GREY_MID,
                  }}
                >
                  Paste from clipboard
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <TikTokIcon size={13} color={GREY_MID} />
                <Instagram size={13} color={GREY_MID} />
                <Youtube size={13} color={GREY_MID} />
              </View>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {hasLink && !urlError && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <PlatformIcon platform={detectedPlatform} size={13} />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_500Medium",
              color: "#1A7A4A",
              flex: 1,
            }}
          >
            {PLATFORM_DISPLAY[detectedPlatform]} link detected
          </Text>
        </View>
      )}

      {urlError && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 24,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={13} color={RED} />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: RED,
              flex: 1,
            }}
          >
            {urlError}
          </Text>
        </View>
      )}
    </>
  );
}
