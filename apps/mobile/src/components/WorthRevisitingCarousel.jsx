import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { WorthRevisitingCard } from "./WorthRevisitingCard";
import {
  getHomeCardEnterDelay,
  HomeCardEnter,
} from "./HomeCardEnter";
import { useAppearanceStore } from "../store/useAppearanceStore";

const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const INACTIVE_SCALE = 0.96;
const INACTIVE_OPACITY = 0.91;
const TARGET_PEEK_RATIO = 0.18;

function getCarouselMetrics(screenWidth) {
  const cardWidth = Math.round(
    (screenWidth - HORIZONTAL_PADDING - CARD_GAP) /
      (1 + TARGET_PEEK_RATIO),
  );
  const snapInterval = cardWidth + CARD_GAP;

  return {
    cardWidth,
    snapInterval,
  };
}

function CarouselItem({
  video,
  index,
  cardWidth,
  snapInterval,
  scrollX,
  reduceMotion,
  isLast,
  enterDelay,
  onPress,
  onWatch,
  onRemind,
  onNotNow,
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    const centerOffset = index * snapInterval;
    const inputRange = [
      centerOffset - snapInterval,
      centerOffset,
      centerOffset + snapInterval,
    ];

    return {
      opacity: interpolate(
        scrollX.value,
        inputRange,
        [INACTIVE_OPACITY, 1, INACTIVE_OPACITY],
        "clamp",
      ),
      transform: [
        {
          scale: interpolate(
            scrollX.value,
            inputRange,
            [INACTIVE_SCALE, 1, INACTIVE_SCALE],
            "clamp",
          ),
        },
      ],
    };
  });

  const card = (
    <Animated.View style={animatedStyle}>
      <WorthRevisitingCard
        video={video}
        onPress={() => onPress?.(video)}
        onWatch={() => onWatch?.(video)}
        onRemind={() => onRemind?.(video)}
        onNotNow={() => onNotNow?.(video)}
        wrapperStyle={{ marginBottom: 0 }}
      />
    </Animated.View>
  );

  const itemStyle = {
    width: cardWidth,
    marginRight: isLast ? 0 : CARD_GAP,
  };

  if (enterDelay == null) {
    return <View style={itemStyle}>{card}</View>;
  }

  return (
    <HomeCardEnter delay={enterDelay} style={itemStyle}>
      {card}
    </HomeCardEnter>
  );
}

export function WorthRevisitingCarousel({
  videos,
  enterBaseDelay,
  onPress,
  onWatch,
  onRemind,
  onNotNow,
}) {
  const { width } = useWindowDimensions();
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const scrollX = useSharedValue(0);
  const { cardWidth, snapInterval } = useMemo(
    () => getCarouselMetrics(width),
    [width],
  );
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      snapToAlignment="start"
      disableIntervalMomentum
      directionalLockEnabled
      nestedScrollEnabled
      alwaysBounceVertical={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
      contentContainerStyle={{
        paddingLeft: HORIZONTAL_PADDING,
        paddingRight: HORIZONTAL_PADDING,
      }}
      style={{ flexGrow: 0 }}
    >
      {videos.map((video, index) => (
        <CarouselItem
          key={video.id}
          video={video}
          index={index}
          cardWidth={cardWidth}
          snapInterval={snapInterval}
          scrollX={scrollX}
          reduceMotion={reduceMotion}
          isLast={index === videos.length - 1}
          enterDelay={
            enterBaseDelay == null
              ? null
              : getHomeCardEnterDelay(enterBaseDelay, index)
          }
          onPress={onPress}
          onWatch={onWatch}
          onRemind={onRemind}
          onNotNow={onNotNow}
        />
      ))}
    </Animated.ScrollView>
  );
}
