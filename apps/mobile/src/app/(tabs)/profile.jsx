import {
  Alert,
  Modal,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  Instagram,
  Youtube,
  Bell,
  ChevronRight,
  HelpCircle,
  LogOut,
  Archive,
  Sparkles,
  Shield,
  Pencil,
  Mail,
  UserCircle2,
  Camera,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import { useEffect, useMemo, useState } from "react";
import { useRecallStore } from "../../store/useRecallStore";
import { usePaywallStore } from "../../store/usePaywallStore";
import { useSupabaseSessionStore } from "../../store/useSupabaseSessionStore";
import {
  getFriendlySupabaseError,
  getRecallProfile,
  signOutOfRecall,
  updateRecallProfile,
} from "../../services/supabaseClient";
import { TikTokIcon } from "../../components/AddScreen/TikTokIcon";
import { PAYWALL_TRIGGERS } from "../../utils/freemium";
import { resetRecallOnboardingState } from "../../services/onboardingService";

const BG = "#F8F8F8";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F7";
const GREY_MID = "#C7C7CC";

function TikTokMark({ size = 13, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}

function getEmailHandle(email) {
  return email?.split("@")?.[0]?.trim() || "";
}

function isApplePrivateRelayEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@privaterelay.appleid.com");
}

function isUsableDisplayName(value) {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("@");
}

function getDisplayName({ profile, user }) {
  const emailHandle = getEmailHandle(user?.email);
  return (
    (isUsableDisplayName(profile?.display_name) ? profile.display_name.trim() : "") ||
    (isUsableDisplayName(user?.user_metadata?.display_name)
      ? user.user_metadata.display_name.trim()
      : "") ||
    (isUsableDisplayName(user?.user_metadata?.name) ? user.user_metadata.name.trim() : "") ||
    (isApplePrivateRelayEmail(user?.email) ? "" : emailHandle) ||
    "Recall User"
  );
}

function getAvatarUrl({ profile, user }) {
  return (
    profile?.avatar_url?.trim() ||
    user?.user_metadata?.avatar_url?.trim() ||
    user?.user_metadata?.picture?.trim() ||
    null
  );
}

function getInitials(value) {
  return (
    value
      ?.split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "R"
  );
}

function formatJoinedDate(profileCreatedAt, userCreatedAt) {
  const source = profileCreatedAt || userCreatedAt;
  if (!source) return "May 2026";

  return new Date(source).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function SectionLabel({ children }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontFamily: "Inter_600SemiBold",
        color: GREY_TEXT,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginLeft: 20,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  danger = false,
  showChevron = true,
}) {
  const isPressable = Boolean(onPress);

  return (
    <Pressable
      disabled={!isPressable}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
        backgroundColor: isPressable && pressed ? "#F5F5F5" : WHITE,
        gap: 14,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: danger ? "rgba(255,59,48,0.08)" : GREY_LIGHT,
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_500Medium",
            color: danger ? "#FF3B30" : BLACK,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showChevron ? <ChevronRight size={16} color={GREY_MID} /> : null}
    </Pressable>
  );
}

function Divider({ indent = 64 }) {
  return (
    <View
      style={{ height: 1, backgroundColor: GREY_LIGHT, marginLeft: indent }}
    />
  );
}

function SettingsGroup({ children }) {
  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 20,
        overflow: "hidden",
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

function EditProfileModal({
  visible,
  onClose,
  onSave,
  initialName,
  initialAvatarUrl,
  canEditAvatarUrl,
  isSaving,
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  useEffect(() => {
    if (!visible) return;
    setDisplayName(initialName);
    setAvatarUrl(initialAvatarUrl);
  }, [visible, initialName, initialAvatarUrl]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: WHITE,
            borderBottomWidth: 1,
            borderBottomColor: "#ECEAE4",
          }}
        >
          <Pressable onPress={onClose}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_500Medium",
                color: GREY_TEXT,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: 17,
              fontFamily: "Inter_700Bold",
              color: BLACK,
              letterSpacing: -0.3,
            }}
          >
            Edit Profile
          </Text>
          <Pressable onPress={() => onSave(displayName, avatarUrl)} disabled={isSaving}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: isSaving ? GREY_MID : BLACK,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 22,
              padding: 20,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
              gap: 16,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_600SemiBold",
                  color: GREY_TEXT,
                  marginBottom: 8,
                }}
              >
                Display name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={GREY_MID}
                style={{
                  backgroundColor: GREY_LIGHT,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  fontSize: 15,
                  fontFamily: "Inter_400Regular",
                  color: BLACK,
                }}
              />
            </View>

            {canEditAvatarUrl ? (
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_600SemiBold",
                    color: GREY_TEXT,
                    marginBottom: 8,
                  }}
                >
                  Avatar image URL
                </Text>
                <TextInput
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  placeholder="https://..."
                  placeholderTextColor={GREY_MID}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    backgroundColor: GREY_LIGHT,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    fontSize: 15,
                    fontFamily: "Inter_400Regular",
                    color: BLACK,
                  }}
                />
              </View>
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 19,
                }}
              >
                Avatar upload isn't set up yet, so you can update your name for now.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [profile, setProfile] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const videos = useRecallStore((s) => s.videos);
  const supabaseUser = useSupabaseSessionStore((s) => s.user);
  const showPaywall = usePaywallStore((s) => s.showPaywall);
  const active = videos.filter((v) => !v.archived);
  const hasSavedVideos = active.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!supabaseUser?.id) {
        if (isMounted) setProfile(null);
        return;
      }

      try {
        const data = await getRecallProfile(supabaseUser.id);
        if (isMounted) {
          setProfile(data ?? null);
        }
      } catch (_error) {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [supabaseUser?.id]);

  const displayName = useMemo(
    () => getDisplayName({ profile, user: supabaseUser }),
    [profile, supabaseUser],
  );
  const avatarUrl = useMemo(
    () => getAvatarUrl({ profile, user: supabaseUser }),
    [profile, supabaseUser],
  );
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const joinedDate = useMemo(
    () => formatJoinedDate(profile?.created_at, supabaseUser?.created_at),
    [profile?.created_at, supabaseUser?.created_at],
  );

  const stats = useMemo(
    () => [
      { value: active.length, label: "Saved" },
      {
        value: active.filter((v) => v.reminderEnabled).length,
        label: "Reminders",
      },
      {
        value: active.filter((v) => v.revisitCount > 0).length,
        label: "Revisited",
      },
    ],
    [active],
  );
  const allStatsZero = stats.every((stat) => stat.value === 0);
  const platformStats = useMemo(
    () => [
      {
        label: "YouTube",
        icon: <Youtube size={16} color="#FF0000" />,
        count: active.filter((v) => v.platform === "YouTube").length,
      },
      {
        label: "TikTok",
        icon: <TikTokIcon size={15} color={BLACK} />,
        count: active.filter((v) => v.platform === "TikTok").length,
      },
      {
        label: "Instagram",
        icon: <Instagram size={16} color="#E4405F" />,
        count: active.filter((v) => v.platform === "Instagram").length,
      },
    ],
    [active],
  );
  const canEditAvatarUrl = Boolean(avatarUrl);

  if (!fontsLoaded) return null;

  const handleSignOut = () => {
    Alert.alert("Sign out of Recall?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutOfRecall();
          } catch (_error) {
            Alert.alert(
              "Sign out didn't finish",
              "Please try again in a moment.",
            );
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async (nextDisplayName, nextAvatarUrl) => {
    if (!supabaseUser?.id) return;

    setIsSavingProfile(true);
    try {
      const updated = await updateRecallProfile({
        userId: supabaseUser.id,
        displayName: nextDisplayName,
        avatarUrl: canEditAvatarUrl ? nextAvatarUrl : avatarUrl,
      });
      setProfile(updated);
      setIsEditOpen(false);
    } catch (error) {
      Alert.alert(
        "Couldn't update profile",
        getFriendlySupabaseError(error, "Please try again in a moment."),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetToOnboarding = () => {
    Alert.alert(
      "Return to onboarding?",
      "This dev shortcut will sign you out and reopen the onboarding flow.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Return to onboarding",
          style: "destructive",
          onPress: async () => {
            try {
              await resetRecallOnboardingState(supabaseUser?.id);
              await signOutOfRecall();
              router.replace("/");
            } catch (_error) {
              Alert.alert(
                "Couldn't reset onboarding",
                "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: WHITE,
            paddingTop: insets.top + 20,
            paddingBottom: 28,
            paddingHorizontal: 24,
            shadowColor: BLACK,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <Pressable onPress={() => setIsEditOpen(true)}>
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: BLACK,
                  overflow: "hidden",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: "Inter_700Bold",
                      color: WHITE,
                    }}
                  >
                    {initials}
                  </Text>
                )}
              </View>
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: WHITE,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#ECEAE4",
                }}
              >
                {avatarUrl ? (
                  <Pencil size={12} color={BLACK} />
                ) : (
                  <Camera size={12} color={BLACK} />
                )}
              </View>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -0.6,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                Saving videos since {joinedDate}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {stats.map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: allStatsZero ? "#F6F6F4" : GREY_LIGHT,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: "Inter_700Bold",
                    color: allStatsZero ? "#3C3C43" : BLACK,
                    letterSpacing: -0.5,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                    textAlign: "center",
                  }}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {hasSavedVideos ? (
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 20,
              marginHorizontal: 20,
              marginBottom: 16,
              paddingHorizontal: 18,
              paddingVertical: 18,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: BLACK,
                marginBottom: 14,
                letterSpacing: -0.2,
              }}
            >
              Your Platforms
            </Text>
            {platformStats.map((platform) => {
              const pct = active.length > 0 ? platform.count / active.length : 0;

              return (
                <View key={platform.label} style={{ marginBottom: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {platform.icon}
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_500Medium",
                          color: BLACK,
                        }}
                      >
                        {platform.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_600SemiBold",
                        color: GREY_TEXT,
                      }}
                    >
                      {platform.count}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 4,
                      backgroundColor: GREY_LIGHT,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.round(pct * 100)}%`,
                        backgroundColor: BLACK,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <SectionLabel>Account</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon={<UserCircle2 size={16} color={BLACK} />}
            label="Edit Profile"
            subtitle="Update your name and avatar"
            onPress={() => setIsEditOpen(true)}
          />
          <Divider />
          <SettingsRow
            icon={<Mail size={16} color={BLACK} />}
            label="Email"
            subtitle={supabaseUser?.email ?? "No email connected"}
            showChevron={false}
          />
          <Divider />
          <SettingsRow
            icon={<LogOut size={16} color="#FF3B30" />}
            label="Sign Out"
            onPress={handleSignOut}
            danger
            showChevron={false}
          />
        </SettingsGroup>

        <SectionLabel>Settings</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon={<Bell size={16} color={BLACK} />}
            label="Notifications"
            subtitle="Manage your reminders"
            onPress={() => router.push("/notifications-settings")}
          />
          <Divider />
          <SettingsRow
            icon={<Archive size={16} color={BLACK} />}
            label="Archive"
            subtitle="Videos you've removed"
            onPress={() => router.push("/archive")}
          />
          <Divider />
          <SettingsRow
            icon={<Sparkles size={16} color={BLACK} />}
            label="Rediscovery"
            subtitle="How Recall brings saves back"
            onPress={() =>
              showPaywall(
                PAYWALL_TRIGGERS.ADVANCED_RESURFACING,
                "profile-resurfacing",
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon={<Shield size={16} color={BLACK} />}
            label="Privacy"
          />
          <Divider />
          <SettingsRow
            icon={<HelpCircle size={16} color={BLACK} />}
            label="Help & Feedback"
          />
        </SettingsGroup>

        <View style={{ alignItems: "center", marginTop: 8, gap: 4 }}>
          {__DEV__ ? (
            <Pressable
              onPress={handleResetToOnboarding}
              style={({ pressed }) => ({
                width: "100%",
                marginBottom: 16,
                borderRadius: 16,
                backgroundColor: pressed ? "#F0F0F0" : WHITE,
                borderWidth: 1,
                borderColor: "#E5E5EA",
                paddingHorizontal: 16,
                paddingVertical: 14,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                }}
              >
                Dev: Return to onboarding
              </Text>
            </Pressable>
          ) : null}
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: GREY_MID,
            }}
          >
            Recall · v1.0.0
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_MID,
            }}
          >
            Don't lose the things that inspired you online.
          </Text>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveProfile}
        initialName={profile?.display_name ?? displayName}
        initialAvatarUrl={avatarUrl ?? ""}
        canEditAvatarUrl={canEditAvatarUrl}
        isSaving={isSavingProfile}
      />
    </View>
  );
}
