import { Pressable, Text, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { RecallReminderIcon } from "../components/RecallReminderIcon";

const WHITE = "#FFFFFF";
const BLACK = "#111111";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F0";

export function RecallSyncState({
  isLoading,
  isLoaded,
  errorMessage,
  onRetry,
  style,
}) {
  if (isLoading && !isLoaded) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.iconWrap}>
          <RecallReminderIcon name="rediscovery" size={24} />
        </View>
        <Text style={styles.title}>Loading your library</Text>
        <Text style={styles.text}>
          Recall is bringing your latest saves into view.
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.iconWrap}>
          <WifiOff size={24} color={BLACK} />
        </View>
        <Text style={styles.title}>Could not refresh Recall</Text>
        <Text style={styles.text}>{errorMessage}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              pressed && { backgroundColor: "#1F1F1F" },
            ]}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return null;
}

const styles = {
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECEAE4",
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: GREY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: BLACK,
    textAlign: "center",
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: GREY_TEXT,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: BLACK,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
};
