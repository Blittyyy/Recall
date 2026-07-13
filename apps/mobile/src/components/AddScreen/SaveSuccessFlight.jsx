import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image as RNImage,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { RecallSavedContentIcon } from "../RecallSavedContentIcon";
import { BLACK, GREY_TEXT, WHITE } from "../../constants/addScreen";
import { createThumbnailImageSource } from "../../utils/thumbnailImageSource";

const LIBRARY_ICON = require("../../../assets/icons/navigation/nav-library.png");
const CARD_WIDTH = 124;
const CARD_HEIGHT = 92;
const FLIGHT_MS = 520;
const BOUNCE_DELAY_MS = 360;

export function SaveSuccessFlight({
  visible,
  thumbnailUrl,
  title,
  insets,
  onHaptic,
  onFinish,
}) {
  const { width, height } = useWindowDimensions();
  const flight = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return undefined;

    let didFinish = false;
    flight.setValue(0);
    iconScale.setValue(1);
    const hapticId = setTimeout(() => {
      onHaptic?.();
    }, BOUNCE_DELAY_MS + 90);

    Animated.parallel([
      Animated.timing(flight, {
        toValue: 1,
        duration: FLIGHT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(BOUNCE_DELAY_MS),
        Animated.timing(iconScale, {
          toValue: 1.12,
          duration: 70,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished && !didFinish) {
        didFinish = true;
        onFinish?.();
      }
    });

    return () => {
      didFinish = true;
      clearTimeout(hapticId);
      flight.stopAnimation();
      iconScale.stopAnimation();
    };
  }, [flight, iconScale, onFinish, onHaptic, visible]);

  if (!visible) return null;

  const tabBarBottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 14 : 16);
  const startLeft = width / 2 - CARD_WIDTH / 2;
  const startTop = Math.max(132, height - tabBarBottomPadding - 238);
  const targetCenterX = width * 0.3;
  const targetCenterY = height - tabBarBottomPadding - 47;
  const targetLeft = targetCenterX - CARD_WIDTH / 2;
  const targetTop = targetCenterY - CARD_HEIGHT / 2;

  const cardOpacity = flight.interpolate({
    inputRange: [0, 0.08, 0.82, 1],
    outputRange: [0, 1, 1, 0],
  });
  const cardScale = flight.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.84],
  });
  const translateX = flight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetLeft - startLeft],
  });
  const translateY = flight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetTop - startTop],
  });
  const iconOpacity = flight.interpolate({
    inputRange: [0, 0.62, 0.72, 1],
    outputRange: [0, 0, 1, 0],
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: targetCenterX - 25,
          top: targetCenterY - 25,
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: "rgba(255,255,255,0.96)",
          justifyContent: "center",
          alignItems: "center",
          opacity: iconOpacity,
          transform: [{ scale: iconScale }],
          shadowColor: BLACK,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <RNImage
          source={LIBRARY_ICON}
          resizeMode="contain"
          style={{ width: 28, height: 28 }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          left: startLeft,
          top: startTop,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          opacity: cardOpacity,
          transform: [{ translateX }, { translateY }, { scale: cardScale }],
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 22,
            backgroundColor: WHITE,
            overflow: "hidden",
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.16,
            shadowRadius: 22,
            elevation: 10,
          }}
        >
          {thumbnailUrl ? (
            <Image
              source={createThumbnailImageSource(thumbnailUrl)}
              style={{ width: "100%", height: 56 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                height: 56,
                backgroundColor: "#F3ECE3",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <RecallSavedContentIcon name="bookmark-check" size={24} />
            </View>
          )}
          <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontFamily: "Inter_700Bold",
                color: BLACK,
                letterSpacing: -0.2,
              }}
            >
              {title?.trim() || "Saved to Recall"}
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontSize: 10,
                fontFamily: "Inter_500Medium",
                color: GREY_TEXT,
              }}
            >
              Added to Library
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
