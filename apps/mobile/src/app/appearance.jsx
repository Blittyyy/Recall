import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, ChevronLeft, Type } from "lucide-react-native";
import { RecallReminderIcon } from "../components/RecallReminderIcon";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useEffect } from "react";
import { useAppearanceStore } from "../store/useAppearanceStore";

const ACCENT = "#9C7B5A";

const LIGHT_COLORS = {
  background: "#F7F5F2",
  surface: "#FFFCF8",
  text: "#1E1915",
  secondaryText: "#7A746D",
  border: "#E7DED3",
  iconBackground: "#F5EFE8",
  pressed: "#F1ECE6",
  switchOff: "#E6DED5",
};

const DARK_COLORS = {
  background: "#171513",
  surface: "#24211E",
  text: "#F6F1EA",
  secondaryText: "#B7AEA5",
  border: "#3B3530",
  iconBackground: "#332D28",
  pressed: "#302B27",
  switchOff: "#49413A",
};

function Divider({ colors }) {
  return (
    <View
      style={{
        height: 1,
        marginLeft: 58,
        backgroundColor: colors.border,
        opacity: 0.72,
      }}
    />
  );
}

function ToggleRow({
  colors,
  icon,
  largerText,
  title,
  subtitle,
  value,
  onValueChange,
}) {
  const scale = largerText ? 1.12 : 1;

  return (
    <View style={{ minHeight: 76, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.iconBackground, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15 * scale, color: colors.text }}>{title}</Text>
        <Text style={{ marginTop: 3, fontFamily: "Inter_400Regular", fontSize: 12 * scale, lineHeight: 17 * scale, color: colors.secondaryText }}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.switchOff, true: colors.text }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const theme = useAppearanceStore((state) => state.theme);
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const largerText = useAppearanceStore((state) => state.largerText);
  const isAppearanceReady = useAppearanceStore((state) => state.isReady);
  const initializeAppearance = useAppearanceStore((state) => state.initialize);
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setReduceMotion = useAppearanceStore((state) => state.setReduceMotion);
  const setLargerText = useAppearanceStore((state) => state.setLargerText);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initializeAppearance();
  }, [initializeAppearance]);

  if (!fontsLoaded || !isAppearanceReady) return null;

  const resolvedTheme =
    theme === "System" ? systemColorScheme ?? "light" : theme.toLowerCase();
  const colors = resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const textScale = largerText ? 1.12 : 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: pressed ? colors.pressed : colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 1,
          })}
        >
          <ChevronLeft size={21} color={colors.text} />
        </Pressable>

        <Text style={{ fontFamily: "Georgia", fontSize: 38 * textScale, lineHeight: 44 * textScale, color: colors.text }}>Appearance</Text>
        <Text style={{ marginTop: 8, marginBottom: 28, fontFamily: "Inter_400Regular", fontSize: 15 * textScale, lineHeight: 22 * textScale, color: colors.secondaryText }}>
          Choose how Recall feels on your device.
        </Text>

        <Text style={{ marginLeft: 4, marginBottom: 10, fontFamily: "Inter_600SemiBold", fontSize: 14 * textScale, color: colors.text }}>Theme</Text>
        <View style={{ padding: 6, borderRadius: 24, backgroundColor: colors.surface, flexDirection: "row", gap: 6, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
          {["System", "Light", "Dark"].map((option) => {
            const selected = theme === option;
            return (
              <Pressable
                key={option}
                onPress={() => setTheme(option)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 18,
                  backgroundColor: selected ? colors.text : pressed ? colors.iconBackground : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                })}
              >
                {selected ? <Check size={14} color={colors.background} /> : null}
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14 * textScale, color: selected ? colors.background : colors.secondaryText }}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ borderRadius: 26, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: "#8D7A68", shadowOffset: { width: 0, height: 5 }, shadowOpacity: resolvedTheme === "dark" ? 0 : 0.06, shadowRadius: 18, elevation: 2 }}>
          <ToggleRow
            colors={colors}
            icon={<RecallReminderIcon name="sparkles" size={19} />}
            largerText={largerText}
            title="Reduce motion"
            subtitle="Use quieter transitions throughout Recall."
            value={reduceMotion}
            onValueChange={setReduceMotion}
          />
          <Divider colors={colors} />
          <ToggleRow
            colors={colors}
            icon={<Type size={19} color={ACCENT} strokeWidth={1.7} />}
            largerText={largerText}
            title="Larger text"
            subtitle="Make supporting text easier to read."
            value={largerText}
            onValueChange={setLargerText}
          />
        </View>
      </ScrollView>
    </View>
  );
}
