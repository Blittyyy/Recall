import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppearanceStore } from "../store/useAppearanceStore";

const SURFACE = "#FFFCF8";
const TEXT = "#1E1915";
const MUTED = "#756E67";
const SUBTLE = "#F5F0EA";
const BACKDROP = "rgba(24,20,17,0.42)";

const BENEFITS = [
  "Reminder notifications",
  "Rediscover forgotten saves",
  "Never lose important videos again",
];

export function NotificationPermissionSheets({
  mode,
  visible,
  insets,
  isBusy = false,
  embedded = false,
  onEnable,
  onNotNow,
  onOpenSettings,
  onContinueWithout,
}) {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const sheetY = useRef(new Animated.Value(48)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isPrePrompt = mode === "pre-prompt";

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (reduceMotion) {
      sheetY.setValue(0);
      backdropOpacity.setValue(1);
      return;
    }

    sheetY.setValue(48);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 22,
        stiffness: 210,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, reduceMotion, sheetY, visible, mode]);

  const closeSheet = (afterClose) => {
    if (!visible) {
      afterClose?.();
      return;
    }

    if (reduceMotion) {
      afterClose?.();
      return;
    }

    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 40,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        afterClose?.();
      }
    });
  };

  const handlePrimary = () => {
    if (isBusy) return;
    if (isPrePrompt) {
      onEnable?.();
      return;
    }
    closeSheet(() => onOpenSettings?.());
  };

  const handleSecondary = () => {
    if (isBusy) return;
    closeSheet(() => {
      if (isPrePrompt) {
        onNotNow?.();
      } else {
        onContinueWithout?.();
      }
    });
  };

  if (!visible) {
    return null;
  }

  const content = (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleSecondary} />
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets?.bottom ?? 0, 20),
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>
          {isPrePrompt
            ? "Never forget what you save"
            : "Notifications are turned off"}
        </Text>
        <Text style={styles.body}>
          {isPrePrompt
            ? "Recall uses notifications to bring back saved videos and links at the right time."
            : "Enable notifications in Settings if you'd like Recall to remind you about saved videos and articles."}
        </Text>

        {isPrePrompt ? (
          <View style={styles.benefitsCard}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Text style={styles.benefitBullet}>•</Text>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={handlePrimary}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isBusy) && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isBusy
              ? "Please wait..."
              : isPrePrompt
                ? "Enable Notifications"
                : "Open Settings"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSecondary}
          disabled={isBusy}
          hitSlop={8}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {isPrePrompt ? "Not Now" : "Continue Without Notifications"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );

  // Embedded avoids nested RN Modals (broken on iOS when parent is already a Modal).
  if (embedded) {
    return (
      <View style={[StyleSheet.absoluteFillObject, styles.embeddedHost]}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSecondary}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  embeddedHost: {
    zIndex: 50,
    elevation: 50,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP,
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    shadowColor: "#8D7A68",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2D8CC",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    color: TEXT,
    fontFamily: "Georgia",
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 18,
  },
  benefitsCard: {
    backgroundColor: SUBTLE,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitBullet: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT,
    fontFamily: "Inter_500Medium",
  },
  primaryButton: {
    backgroundColor: TEXT,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: MUTED,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
