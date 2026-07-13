import { Tabs } from "expo-router";
import { Image, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecallTheme } from "../../constants/recallTheme";

const NAV_ICONS = {
  home: require("../../../assets/icons/navigation/nav-home.png"),
  library: require("../../../assets/icons/navigation/nav-library.png"),
  plus: require("../../../assets/icons/navigation/nav-plus.png"),
  reminders: require("../../../assets/icons/navigation/nav-reminders.png"),
  profile: require("../../../assets/icons/navigation/nav-profile.png"),
};

function NavigationIcon({ source, focused }) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{
        width: 27,
        height: 27,
        opacity: focused ? 1 : 0.58,
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
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        marginTop: -24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      <Image
        source={NAV_ICONS.plus}
        resizeMode="contain"
        style={{ width: 34, height: 34 }}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useRecallTheme();
  const isWeb = Platform.OS === "web";
  const tabBarBottomPadding = Math.max(insets.bottom, isWeb ? 14 : 16);
  const tabBarHeight = 58 + tabBarBottomPadding + (isWeb ? 8 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: isWeb ? 10 : 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedText,
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
            <NavigationIcon source={NAV_ICONS.home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Library",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon source={NAV_ICONS.library} focused={focused} />
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
            <NavigationIcon source={NAV_ICONS.reminders} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <NavigationIcon source={NAV_ICONS.profile} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
