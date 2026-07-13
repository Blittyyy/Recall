import { useEffect } from "react";
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const ENTER_MS = 320;
const CONTENT_DELAY_MS = 80;
const enterEasing = Easing.out(Easing.cubic);

export function useLibraryVideoDetailEnterAnimation({
  enabled,
  reduceMotion,
}) {
  const heroProgress = useSharedValue(enabled && !reduceMotion ? 0 : 1);
  const contentProgress = useSharedValue(enabled && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      heroProgress.value = 1;
      contentProgress.value = 1;
      return;
    }

    heroProgress.value = 0;
    contentProgress.value = 0;
    heroProgress.value = withTiming(1, {
      duration: ENTER_MS,
      easing: enterEasing,
    });
    contentProgress.value = withDelay(
      CONTENT_DELAY_MS,
      withTiming(1, {
        duration: ENTER_MS,
        easing: enterEasing,
      }),
    );
  }, [contentProgress, enabled, heroProgress, reduceMotion]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroProgress.value,
    transform: [
      {
        translateY: interpolate(heroProgress.value, [0, 1], [12, 0]),
      },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
  }));

  const belowTitleStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
  }));

  return {
    heroStyle,
    titleStyle,
    belowTitleStyle,
  };
}
