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
  ChevronRight,
  Clock3,
  Eye,
  LogOut,
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
import { useSupabaseSessionStore } from "../../store/useSupabaseSessionStore";
import {
  getFriendlySupabaseError,
  getRecallProfile,
  isUsableRecallDisplayName,
  signOutOfRecall,
  updateRecallProfile,
} from "../../services/supabaseClient";
import { resetAnalyticsUser } from "../../services/analytics";
import { RECALL_COLORS } from "../../constants/recallTheme";
import { RecallSavedContentIcon } from "../../components/RecallSavedContentIcon";
import { RecallActionIcon } from "../../components/RecallActionIcon";
import { RecallProfileIcon } from "../../components/RecallProfileIcon";
import { RecallReminderIcon } from "../../components/RecallReminderIcon";

const BG = RECALL_COLORS.background;
const WHITE = RECALL_COLORS.surfaceStrong;
const BLACK = RECALL_COLORS.text;
const GREY_TEXT = RECALL_COLORS.secondaryText;
const GREY_LIGHT = RECALL_COLORS.subtle;
const GREY_MID = RECALL_COLORS.mid;
const BORDER = RECALL_COLORS.border;
const ACCENT = RECALL_COLORS.accent;
const SERIF = "Georgia";

function TikTokMark({ size = 13, color = "#000" }) {
  return (
    <Text
      style={{ fontSize: size, fontWeight: "900", color, lineHeight: size + 2 }}
    >
      ♪
    </Text>
  );
}

function getDisplayName({ profile, user }) {
  const email = user?.email ?? null;
  return (
    (isUsableRecallDisplayName(profile?.display_name, email)
      ? profile.display_name.trim()
      : "") ||
    (isUsableRecallDisplayName(user?.user_metadata?.display_name, email)
      ? user.user_metadata.display_name.trim()
      : "") ||
    (isUsableRecallDisplayName(user?.user_metadata?.name, email)
      ? user.user_metadata.name.trim()
      : "") ||
    "there"
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
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        color: BLACK,
        letterSpacing: -0.25,
        marginHorizontal: 22,
        marginBottom: 12,
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
        minHeight: 62,
        paddingVertical: 10,
        paddingHorizontal: 18,
        backgroundColor: isPressable && pressed ? "#FBF7F2" : WHITE,
        gap: icon ? 15 : 0,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: danger ? "#FAEFEA" : GREY_LIGHT,
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_500Medium",
            color: danger ? "#A15445" : BLACK,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 11,
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
      style={{
        height: 1,
        backgroundColor: "rgba(236,228,219,0.62)",
        marginLeft: indent,
        marginRight: 18,
      }}
    />
  );
}

function SettingsGroup({ children }) {
  return (
    <View
      style={{
        borderRadius: 26,
        marginHorizontal: 20,
        marginBottom: 22,
        shadowColor: "#8D7A68",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
        elevation: 2,
      }}
    >
      <View
        style={{
          backgroundColor: WHITE,
          borderRadius: 26,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
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
              shadowColor: "#8D7A68",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.07,
              shadowRadius: 18,
              elevation: 2,
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

function RefinedProfileContent({
  insets,
  displayName,
  avatarUrl,
  initials,
  email,
  stats,
  onEditProfile,
  onNotifications,
  onArchive,
  onAppearance,
  onPrivacy,
  onHelpSupport,
  onSignOut,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 22,
          paddingBottom: Math.max(insets.bottom + 72, 94),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingHorizontal: 22,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 38,
                lineHeight: 44,
                fontFamily: SERIF,
                color: BLACK,
                letterSpacing: -1,
              }}
            >
              Profile
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 15,
                lineHeight: 21,
                fontFamily: "Inter_400Regular",
                color: GREY_TEXT,
              }}
            >
              Your space. Your saved moments.
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 28,
            marginHorizontal: 20,
            marginBottom: 24,
            paddingHorizontal: 22,
            paddingTop: 19,
            paddingBottom: 16,
            shadowColor: "#8D7A68",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.07,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 17,
            }}
          >
            <Pressable onPress={onEditProfile}>
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: BG,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
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
                      fontSize: 25,
                      fontFamily: SERIF,
                      color: ACCENT,
                    }}
                  >
                    {initials}
                  </Text>
                )}
              </View>
            </Pressable>

            <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 18,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                  letterSpacing: -0.35,
                }}
              >
                {displayName}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                }}
              >
                {email ?? "Your Recall account"}
              </Text>
            </View>

            <Pressable
              onPress={onEditProfile}
              style={({ pressed }) => ({
                borderRadius: 18,
                backgroundColor: pressed ? "#EEE5DA" : "#F6F0E9",
                paddingHorizontal: 12,
                paddingVertical: 9,
                marginLeft: 6,
              })}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  color: "#6E5136",
                }}
              >
                Edit Profile
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "rgba(236,228,219,0.75)",
              marginBottom: 12,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "stretch",
              paddingHorizontal: 4,
            }}
          >
            {stats.map((stat, index) => (
              <View key={stat.label} style={{ flex: 1, flexDirection: "row" }}>
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingHorizontal: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 23,
                      lineHeight: 27,
                      fontFamily: SERIF,
                      color: BLACK,
                      letterSpacing: -0.5,
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      marginTop: 1,
                      fontSize: 11,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
                {index < stats.length - 1 ? (
                  <View
                    style={{
                      width: 1,
                      backgroundColor: "rgba(236,228,219,0.72)",
                      marginVertical: 8,
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <SectionLabel>Your settings</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            label="Notifications"
            subtitle="Reminder permissions and follow-ups"
            onPress={onNotifications}
          />
          <Divider indent={18} />
          <SettingsRow
            label="Archive"
            subtitle="Review videos kept out of your Library"
            onPress={onArchive}
          />
          <Divider indent={18} />
          <SettingsRow
            label="Appearance"
            subtitle="Theme, motion, and text preferences"
            onPress={onAppearance}
          />
          <Divider indent={18} />
          <SettingsRow
            label="Privacy"
            subtitle="Control your account and saved data"
            onPress={onPrivacy}
          />
          <Divider indent={18} />
          <SettingsRow
            label="Help & Support"
            subtitle="FAQs, feedback, and contact"
            onPress={onHelpSupport}
          />
          <Divider indent={18} />
          <SettingsRow
            label="Sign Out"
            subtitle="Sign out of your Recall account"
            onPress={onSignOut}
            danger
            showChevron={false}
          />
        </SettingsGroup>

        <View
          style={{
            alignItems: "center",
            marginHorizontal: 20,
            marginTop: 2,
            gap: 5,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_MID,
            }}
          >
            Recall · v1.0.0
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_400Regular",
              color: GREY_MID,
              textAlign: "center",
            }}
          >
            Don&apos;t lose the things that inspired you online.
          </Text>
        </View>
      </ScrollView>
    </View>
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
            resetAnalyticsUser();
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

  return (
    <>
      <RefinedProfileContent
        insets={insets}
        displayName={displayName}
        avatarUrl={avatarUrl}
        initials={initials}
        email={supabaseUser?.email}
        stats={stats}
        onEditProfile={() => setIsEditOpen(true)}
        onNotifications={() => router.push("/notifications-settings")}
        onArchive={() => router.push("/archive")}
        onAppearance={() => router.push("/appearance")}
        onPrivacy={() => router.push("/privacy")}
        onHelpSupport={() => router.push("/help-support")}
        onSignOut={handleSignOut}
      />
      <EditProfileModal
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveProfile}
        initialName={profile?.display_name ?? displayName}
        initialAvatarUrl={avatarUrl ?? ""}
        canEditAvatarUrl={canEditAvatarUrl}
        isSaving={isSavingProfile}
      />
    </>
  );

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
                  backgroundColor: BG,
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
                      color: ACCENT,
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
                  <RecallActionIcon name="edit" size={14} />
                ) : (
                  <RecallActionIcon name="camera" size={12} />
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
            icon={<RecallProfileIcon name="user" size={16} />}
            label="Edit Profile"
            subtitle="Update your name and avatar"
            onPress={() => setIsEditOpen(true)}
          />
          <Divider />
          <SettingsRow
            icon={<RecallProfileIcon name="contact" size={16} />}
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
            icon={<RecallReminderIcon name="bell" size={16} />}
            label="Notifications"
            subtitle="Manage your reminders"
            onPress={() => router.push("/notifications-settings")}
          />
          <Divider />
          <SettingsRow
            icon={<RecallSavedContentIcon name="archive" size={16} />}
            label="Archive"
            subtitle="Videos you've removed"
            onPress={() => router.push("/archive")}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon={<RecallProfileIcon name="shield" size={16} />}
            label="Privacy"
          />
          <Divider />
          <SettingsRow
            icon={<RecallProfileIcon name="help" size={16} />}
            label="Help & Feedback"
          />
        </SettingsGroup>

        <View style={{ alignItems: "center", marginTop: 8, gap: 4 }}>
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
