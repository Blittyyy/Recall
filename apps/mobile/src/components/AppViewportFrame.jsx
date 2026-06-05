import { Platform, View, useWindowDimensions } from "react-native";

const PAGE_BG = "#ECEAE4";
const APP_BG = "#F7F7F5";

export function AppViewportFrame({ children }) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 560;

  return (
    <View
      style={{
        flex: 1,
        minHeight: Platform.OS === "web" ? "100vh" : undefined,
        backgroundColor: isDesktopWeb ? PAGE_BG : APP_BG,
        paddingHorizontal: isDesktopWeb ? 18 : 0,
        paddingVertical: isDesktopWeb ? 14 : 0,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 430,
          minHeight: Platform.OS === "web" ? "100vh" : undefined,
          backgroundColor: APP_BG,
          borderRadius: isDesktopWeb ? 32 : 0,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: isDesktopWeb ? 0.1 : 0,
          shadowRadius: isDesktopWeb ? 32 : 0,
          elevation: isDesktopWeb ? 8 : 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}
