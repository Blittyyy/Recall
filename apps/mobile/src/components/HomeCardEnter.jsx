import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useAppearanceStore } from "../store/useAppearanceStore";

export const HOME_CARD_ENTER_STAGGER_MS = 60;

export function getHomeCardEnterDelay(baseDelay, index) {
  return baseDelay + index * HOME_CARD_ENTER_STAGGER_MS;
}

export function HomeCardEnter({ delay = 0, children, style }) {
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1);
      return undefined;
    }

    anim.setValue(0);
    const timeoutId = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 11,
      }).start();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [anim, delay, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
