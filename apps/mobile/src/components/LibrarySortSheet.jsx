import { useEffect, useRef } from "react";
import { Check } from "lucide-react-native";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LIBRARY_SORT_OPTIONS } from "../utils/librarySort";
import { RECALL_COLORS } from "../constants/recallTheme";
import { useAppearanceStore } from "../store/useAppearanceStore";

const WHITE = RECALL_COLORS.surfaceStrong;
const TEXT = RECALL_COLORS.text;
const MUTED = RECALL_COLORS.secondaryText;
const GREY_MID = RECALL_COLORS.mid;
const BACKDROP = "rgba(24,20,17,0.42)";

export function LibrarySortSheet({
  visible,
  selectedSort,
  onSelect,
  onClose,
  insets,
}) {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const sheetY = useRef(new Animated.Value(48)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
  }, [backdropOpacity, reduceMotion, sheetY, visible]);

  const closeSheet = (afterClose) => {
    if (!visible) {
      afterClose?.();
      onClose?.();
      return;
    }

    if (reduceMotion) {
      afterClose?.();
      onClose?.();
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
        onClose?.();
      }
    });
  };

  const handleSelect = (sortId) => {
    closeSheet(() => {
      if (sortId !== selectedSort) {
        onSelect?.(sortId);
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => closeSheet()}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <Pressable
          onPress={() => closeSheet()}
          style={StyleSheet.absoluteFillObject}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              flex: 1,
              backgroundColor: BACKDROP,
              opacity: backdropOpacity,
            }}
          />
        </Pressable>

        <Animated.View
          style={{
            zIndex: 1,
            backgroundColor: WHITE,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: (insets?.bottom ?? 0) + 24,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.12,
            shadowRadius: 28,
            elevation: 18,
            transform: [{ translateY: sheetY }],
          }}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: GREY_MID,
              alignSelf: "center",
              marginBottom: 18,
              opacity: 0.7,
            }}
          />
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Inter_700Bold",
              color: TEXT,
              letterSpacing: -0.4,
              marginBottom: 12,
            }}
          >
            Sort by
          </Text>
          {LIBRARY_SORT_OPTIONS.map((option) => {
            const isSelected = option.id === selectedSort;

            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelect(option.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(235,227,217,0.9)",
                  backgroundColor: pressed ? "rgba(247,241,234,0.7)" : "transparent",
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium",
                    color: TEXT,
                  }}
                >
                  {option.label}
                </Text>
                {isSelected ? <Check size={18} color={TEXT} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => closeSheet()}
            style={({ pressed }) => ({
              marginTop: 14,
              alignItems: "center",
              paddingVertical: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: MUTED,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
