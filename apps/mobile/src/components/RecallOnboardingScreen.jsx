import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { ChevronLeft } from "lucide-react-native";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import { RecallReminderIcon } from "./RecallReminderIcon";

const BG = "#F7F7F5";
const BLACK = "#111111";
const WHITE = "#FFFFFF";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F0";
const ONBOARDING_PAGE_ONE_IMAGE = require("../../assets/images/onboarding-page-1.png");
const ONBOARDING_PAGE_TWO_IMAGE = require("../../assets/images/onboarding-page-2.png");
const ONBOARDING_PAGE_THREE_IMAGE = require("../../assets/images/onboarding-page-3.png");
const ONBOARDING_PAGE_FOUR_IMAGE = require("../../assets/images/onboarding-page-4.png");

function StepIcon({ index }) {
  const icons = [
    <RecallSavedContentIcon key="bookmark" name="bookmark" size={32} />,
    <RecallSavedContentIcon key="save" name="bookmark" size={32} />,
    <RecallSavedContentIcon key="folder" name="folder" size={32} />,
    <RecallReminderIcon key="sparkles" name="sparkles" size={32} />,
  ];

  return icons[index] ?? icons[0];
}

function SlideFooter({
  isCompleting,
  label,
  onPress,
  onBack,
  showBackText = false,
  steps,
  stepIndex,
}) {
  return (
    <View style={{ gap: 22, marginTop: 8 }}>
      <Pressable
        onPress={onPress}
        disabled={isCompleting}
        style={({ pressed }) => ({
          borderRadius: 24,
          backgroundColor: isCompleting ? "#C7C7CC" : pressed ? "#1F1F1F" : BLACK,
          paddingVertical: 19,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.14,
          shadowRadius: 24,
          elevation: 6,
        })}
      >
        <Text
          style={{
            fontSize: 17,
            fontFamily: "Inter_600SemiBold",
            color: WHITE,
          }}
        >
          {label}
        </Text>
      </Pressable>

      {showBackText ? (
        <Pressable
          onPress={onBack}
          disabled={isCompleting}
          style={({ pressed }) => ({
            alignItems: "center",
            paddingVertical: 2,
            opacity: isCompleting ? 0.5 : pressed ? 0.65 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Inter_500Medium",
              color: BLACK,
            }}
          >
            Back
          </Text>
        </Pressable>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {steps.map((item, index) => (
          <View
            key={item.title}
            style={{
              width: index === stepIndex ? 10 : 8,
              height: index === stepIndex ? 10 : 8,
              borderRadius: 999,
              backgroundColor: index === stepIndex ? BLACK : "#D8D8D4",
            }}
          />
        ))}
      </View>
    </View>
  );
}

function FirstSlide({ step }) {
  return (
    <View style={{ flex: 1, width: "100%" }}>
      <View
        style={{
          flex: 0.5,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <RecallSavedContentIcon name="bookmark" size={28} />
          <Text
            style={{
              fontSize: 32,
              color: BLACK,
              fontFamily: "Georgia",
              letterSpacing: -1.2,
            }}
          >
            Recall
          </Text>
        </View>

        <Image
          source={ONBOARDING_PAGE_ONE_IMAGE}
          contentFit="contain"
          style={{
            width: 400,
            height: 400,
            minHeight: 380,
            marginTop: 52,
            transform: [{ scale: 2.08 }],
          }}
        />
      </View>

      <View
        style={{
          flex: 0.38,
          alignItems: "center",
          justifyContent: "flex-start",
          paddingHorizontal: 12,
          marginTop: 170,
          marginBottom: 0,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            color: BLACK,
            fontFamily: "Georgia",
            letterSpacing: -1.3,
            lineHeight: 34,
            textAlign: "center",
            marginBottom: 12,
            maxWidth: 350,
          }}
          numberOfLines={2}
        >
          {step.title}
        </Text>

        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_400Regular",
            color: "#4F4F54",
            lineHeight: 22,
            textAlign: "center",
            maxWidth: 348,
          }}
        >
          {step.text}
        </Text>
      </View>
    </View>
  );
}

function DefaultSlide({ stepIndex, step }) {
  return (
    <View style={{ flex: 1, justifyContent: "space-between" }}>
      <View
        style={{
          flex: 0.56,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 22,
            backgroundColor: GREY_LIGHT,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <StepIcon index={stepIndex} />
        </View>

        <Text
          style={{
            fontSize: 34,
            fontFamily: "Inter_700Bold",
            color: BLACK,
            letterSpacing: -1,
            lineHeight: 40,
            marginBottom: 14,
            maxWidth: 320,
          }}
          numberOfLines={2}
        >
          {step.title}
        </Text>
      </View>

      <View
        style={{
          flex: 0.24,
          justifyContent: "flex-start",
          marginBottom: 32,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Inter_400Regular",
            color: GREY_TEXT,
            lineHeight: 24,
            maxWidth: 330,
          }}
          numberOfLines={3}
        >
          {step.text}
        </Text>
      </View>
    </View>
  );
}

const ONBOARDING_COPY_TOP = 338;

function OnboardingSlideCopy({
  title,
  body,
  titleStyle,
  bodyStyle,
  maxWidth = 360,
  titleProps = {},
  top = ONBOARDING_COPY_TOP,
}) {
  return (
    <View
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        alignItems: "center",
      }}
    >
      <View style={{ width: "100%", maxWidth, alignItems: "center" }}>
        <Text style={titleStyle} {...titleProps}>
          {title}
        </Text>
        <Text style={bodyStyle}>{body}</Text>
      </View>
    </View>
  );
}

function SecondSlide({ step }) {
  return (
    <View style={{ flex: 1, width: "100%" }}>
      <View
        style={{
          position: "absolute",
          top: -18,
          left: 0,
          right: 0,
          height: 352,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={ONBOARDING_PAGE_TWO_IMAGE}
          contentFit="contain"
          style={{
            width: 480,
            height: 480,
            transform: [{ scale: 1.44 }],
          }}
        />
      </View>

      <OnboardingSlideCopy
        title={step.title}
        body={step.text}
        maxWidth={340}
        top={358}
        titleProps={{
          numberOfLines: 1,
          adjustsFontSizeToFit: true,
          minimumFontScale: 0.88,
        }}
        titleStyle={{
          fontSize: 31,
          color: BLACK,
          fontFamily: "Georgia",
          letterSpacing: -0.9,
          lineHeight: 34,
          textAlign: "center",
          marginBottom: 12,
          width: "100%",
        }}
        bodyStyle={{
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: "#4F4F54",
          lineHeight: 22,
          textAlign: "center",
        }}
      />
    </View>
  );
}

function ThirdSlide({ step }) {
  return (
    <View style={{ flex: 1, width: "100%", overflow: "visible" }}>
      <View
        style={{
          position: "absolute",
          top: -12,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Image
          source={ONBOARDING_PAGE_THREE_IMAGE}
          contentFit="contain"
          style={{
            width: 540,
            height: 540,
            minHeight: 500,
            transform: [{ scale: 1.66 }],
          }}
        />
      </View>

      <OnboardingSlideCopy
        title={step.title}
        body={step.text}
        maxWidth={360}
        titleStyle={{
          fontSize: 30,
          color: BLACK,
          fontFamily: "Georgia",
          letterSpacing: -1.3,
          lineHeight: 32,
          textAlign: "center",
          marginBottom: 10,
        }}
        bodyStyle={{
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: "#4F4F54",
          lineHeight: 22,
          textAlign: "center",
        }}
      />
    </View>
  );
}

function FourthSlide({ step }) {
  return (
    <View style={{ flex: 1, width: "100%", overflow: "visible" }}>
      <View
        style={{
          position: "absolute",
          top: -6,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Image
          source={ONBOARDING_PAGE_FOUR_IMAGE}
          contentFit="contain"
          style={{
            width: 540,
            height: 540,
            minHeight: 500,
            transform: [{ scale: 1.64 }],
          }}
        />
      </View>

      <OnboardingSlideCopy
        title={step.title}
        body={step.text}
        maxWidth={360}
        titleStyle={{
          fontSize: 32,
          color: BLACK,
          fontFamily: "Georgia",
          letterSpacing: -1.3,
          lineHeight: 34,
          textAlign: "center",
          marginBottom: 12,
        }}
        bodyStyle={{
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: "#4F4F54",
          lineHeight: 22,
          textAlign: "center",
        }}
      />
    </View>
  );
}

export function RecallOnboardingScreen({ initialStep = 0, onComplete }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [isCompleting, setIsCompleting] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const previousStepIndex = useRef(initialStep);

  const steps = useMemo(
    () => [
      {
        title: "Don't lose the videos you save.",
        text: "Recall keeps TikToks, Reels, and YouTube videos organized and brings them back when they matter.",
        primaryLabel: "Next",
      },
      {
        title: "Save from anywhere",
        text: "Tap Share, choose Recall, and your video opens ready to save.",
        primaryLabel: "Next",
      },
      {
        title: "Organize Your Saves",
        text: "Keep videos organized with collections, reminders, and categories.",
        primaryLabel: "Next",
      },
      {
        title: "Rediscover Later",
        text: "Recall gently brings forgotten saves back when they're worth revisiting.",
        primaryLabel: "Start Saving",
      },
    ],
    [],
  );

  useEffect(() => {
    const nextStep = Math.max(0, Math.min(initialStep, steps.length - 1));
    setStepIndex(nextStep);
    previousStepIndex.current = nextStep;
    contentOpacity.setValue(1);
    contentTranslateX.setValue(0);
  }, [contentOpacity, contentTranslateX, initialStep, steps.length]);

  useEffect(() => {
    if (previousStepIndex.current === stepIndex) {
      return;
    }

    const direction = stepIndex > previousStepIndex.current ? 1 : -1;
    contentOpacity.setValue(0);
    contentTranslateX.setValue(direction * 22);

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.spring(contentTranslateX, {
        toValue: 0,
        useNativeDriver: false,
        tension: 75,
        friction: 11,
      }),
    ]).start();

    previousStepIndex.current = stepIndex;
  }, [contentOpacity, contentTranslateX, stepIndex]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 12,
        onPanResponderRelease: (_event, gestureState) => {
          if (isCompleting) {
            return;
          }

          if (gestureState.dx <= -40 && stepIndex < steps.length - 1) {
            setStepIndex((current) => Math.min(current + 1, steps.length - 1));
            return;
          }

          if (gestureState.dx >= 40 && stepIndex > 0) {
            setStepIndex((current) => Math.max(current - 1, 0));
          }
        },
      }),
    [isCompleting, stepIndex, steps.length],
  );

  if (!fontsLoaded) return null;

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const isFirstStep = stepIndex === 0;
  const isSecondStep = stepIndex === 1;
  const isThirdStep = stepIndex === 2;
  const isFourthStep = stepIndex === 3;
  const usesFooterBackText = isSecondStep || isThirdStep || isFourthStep;

  const handleContinue = async () => {
    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete?.();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{
        flex: 1,
        backgroundColor: BG,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: stepIndex > 0 ? 10 : 6,
          paddingBottom: Math.max(insets.bottom + 10, 20),
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            minHeight: stepIndex > 0 ? 48 : 0,
            justifyContent: "center",
            marginBottom: stepIndex > 0 ? 14 : 0,
          }}
        >
          {stepIndex > 0 && !usesFooterBackText ? (
            <Pressable
              onPress={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={isCompleting}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: pressed ? "#ECECE8" : GREY_LIGHT,
                justifyContent: "center",
                alignItems: "center",
                opacity: isCompleting ? 0.6 : 1,
              })}
            >
              <ChevronLeft size={20} color={BLACK} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          <Animated.View
            style={{
              flex: 1,
              opacity: contentOpacity,
              transform: [{ translateX: contentTranslateX }],
            }}
          >
            {isFirstStep ? (
              <FirstSlide step={step} />
            ) : isSecondStep ? (
              <SecondSlide step={step} />
            ) : isThirdStep ? (
              <ThirdSlide step={step} />
            ) : isFourthStep ? (
              <FourthSlide step={step} />
            ) : (
              <DefaultSlide stepIndex={stepIndex} step={step} />
            )}
          </Animated.View>
        </View>

        <SlideFooter
          isCompleting={isCompleting}
          label={isCompleting ? "Opening Recall..." : step.primaryLabel}
          onPress={handleContinue}
          onBack={() => setStepIndex((current) => Math.max(current - 1, 0))}
          showBackText={usesFooterBackText}
          steps={steps}
          stepIndex={stepIndex}
        />
      </View>
    </SafeAreaView>
  );
}
