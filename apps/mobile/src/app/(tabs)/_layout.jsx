import { Tabs } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { Easing, Image, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecallTheme } from "../../constants/recallTheme";
import { useAppearanceStore } from "../../store/useAppearanceStore";

const NAV_ICONS = {
  home: require("../../../assets/icons/navigation/nav-home.png"),
  library: require("../../../assets/icons/navigation/nav-library.png"),
  plus: require("../../../assets/icons/navigation/nav-plus.png"),
  reminders: require("../../../assets/icons/navigation/nav-reminders.png"),
  profile: require("../../../assets/icons/navigation/nav-profile.png"),
};

/** Soft cross-fade with a light lift — used for tab bar and in-tab jumps. */
function forPremiumTabScene({ current }) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [10, 0, 10],
          }),
        },
        {
          scale: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.985, 1, 0.985],
          }),
        },
      ],
    },
  };
}

/** Dark mode: fade + lift only. Scale punches white edge gaps through the canvas. */
function forDarkTabScene({ current }) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [8, 0, 8],
          }),
        },
      ],
    },
  };
}

const PREMIUM_TAB_TRANSITION = {
  animation: "fade",
  transitionSpec: {
    animation: "timing",
    config: {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    },
  },
  sceneStyleInterpolator: forPremiumTabScene,
};

const DARK_TAB_TRANSITION = {
  animation: "fade",
  transitionSpec: {
    animation: "timing",
    config: {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    },
  },
  sceneStyleInterpolator: forDarkTabScene,
};

function NavigationIcon({ source, focused, colors }) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{
        width: 27,
        height: 27,
        opacity: focused ? 1 : colors.dark ? 0.84 : 0.58,
        tintColor: focused ? colors.accent : colors.secondaryText,
      }}
    />
  );
}

function AddTabIcon({ colors }) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surfaceStrong,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        marginTop: -24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: colors.dark ? 0.35 : 0.12,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      {/* expo-image avoids iOS tab-bar template tinting so the uploaded asset colors show */}
      <ExpoImage
        source={NAV_ICONS.plus}
        contentFit="contain"
        style={{
          width: 34,
          height: 34,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useRecallTheme();
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const isWeb = Platform.OS === "web";
  const tabBarBottomPadding = Math.max(insets.bottom, isWeb ? 14 : 16);
  const tabBarHeight = 58 + tabBarBottomPadding + (isWeb ? 8 : 10);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        // Animated tab switches + detachInactiveScreens can blank the scene
        // (esp. Profile). Keep screens mounted so the fade can't stick white.
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.background },
          ...(reduceMotion
            ? { animation: "none" }
            : colors.dark
              ? DARK_TAB_TRANSITION
              : PREMIUM_TAB_TRANSITION),
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingBottom: tabBarBottomPadding,
            paddingTop: isWeb ? 10 : 8,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: colors.dark ? 0.28 : 0.05,
            shadowRadius: colors.dark ? 10 : 16,
            elevation: colors.dark ? 8 : 10,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.secondaryText,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            lineHeight: 14,
            marginTop: isWeb ? 5 : 4,
          },
          tabBarIconStyle: { marginTop: isWeb ? 2 : 4 },
          tabBarItemStyle: {
            paddingTop: isWeb ? 2 : 4,
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon
              source={NAV_ICONS.home}
              focused={focused}
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Library",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon
              source={NAV_ICONS.library}
              focused={focused}
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => <AddTabIcon colors={colors} />,
          tabBarLabel: () => null,
          tabBarIconStyle: { marginTop: 0 },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Reminders",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon
              source={NAV_ICONS.reminders}
              focused={focused}
              colors={colors}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon
              source={NAV_ICONS.profile}
              focused={focused}
              colors={colors}
            />
          ),
        }}
      />
      </Tabs>
    </View>
  );
}
