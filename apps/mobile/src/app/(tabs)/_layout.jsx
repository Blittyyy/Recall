import { Tabs } from "expo-router";
import { Home, Library, Plus, Bell, User } from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AddTabIcon() {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        marginTop: -24,
        borderWidth: 3,
        borderColor: "#F7F7F5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
      }}
    >
      <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabBarBottomPadding = Math.max(insets.bottom, isWeb ? 14 : 16);
  const tabBarHeight = 58 + tabBarBottomPadding + (isWeb ? 8 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#ECEAE4",
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: isWeb ? 10 : 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#8E8E93",
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
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={23}
              color={color}
              fill={focused ? "#000000" : "transparent"}
              strokeWidth={focused ? 2 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Library
              size={23}
              color={color}
              fill={focused ? "#000000" : "transparent"}
              strokeWidth={focused ? 2 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => <AddTabIcon />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color, focused }) => (
            <Bell
              size={23}
              color={color}
              fill={focused ? "#000000" : "transparent"}
              strokeWidth={focused ? 2 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <User
              size={23}
              color={color}
              fill={focused ? "#000000" : "transparent"}
              strokeWidth={focused ? 2 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}
