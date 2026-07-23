import { View, Text, Animated, TextInput, Pressable } from "react-native";
import {
  Link2,
  Clipboard,
  X,
  AlertCircle,
} from "lucide-react-native";
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
  amazon: "Amazon",
  web: "Web",
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
          marginBottom: 12,
          transform: [{ translateX: errorShake }],
        }}
      >
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 28,
            borderWidth: urlError ? 1.5 : hasLink ? 1.5 : 0,
            borderColor: urlError
              ? RED
              : hasLink
                ? "rgba(52,199,89,0.4)"
                : "transparent",
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.07,
            shadowRadius: 18,
            elevation: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: 14,
              marginBottom: 10,
              paddingHorizontal: 18,
              minHeight: 72,
              borderRadius: 20,
              backgroundColor: "#FBF8F4",
            }}
          >
            <Link2
              size={19}
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
                fontSize: 16,
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
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 28,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "#E7DED3" }} />
                <Text
                  style={{
                    marginHorizontal: 16,
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: GREY_MID,
                  }}
                >
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#E7DED3" }} />
              </View>
              <Pressable
                onPress={onPasteFromClipboard}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 20,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Clipboard size={16} color={BLACK} />
                  <Text
                    numberOfLines={1}
                    style={{
                      flexShrink: 1,
                      fontSize: 14,
                      fontFamily: "Inter_500Medium",
                      color: BLACK,
                    }}
                  >
                    Paste from clipboard
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    flexShrink: 0,
                  }}
                >
                  {["tiktok", "instagram", "youtube", "web"].map((platform) => (
                    <View
                      key={platform}
                      style={{
                        width: platform === "youtube" ? 20 : 16,
                        height: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <PlatformIcon platform={platform} size={14} />
                    </View>
                  ))}
                </View>
              </Pressable>
            </>
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
