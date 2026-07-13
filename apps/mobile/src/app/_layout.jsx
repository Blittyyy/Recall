import { useAuth } from "../utils/auth/useAuth";
import { useRecallStore } from "../store/useRecallStore";
import { useSupabaseSessionStore } from "../store/useSupabaseSessionStore";
import {
  ensureRecallProfile,
  getCurrentSupabaseSession,
  getRecallProfile,
  isApplePrivateRelayEmail,
  isUsableRecallDisplayName,
  listenToSupabaseAuth,
  updateRecallProfile,
} from "../services/supabaseClient";
import { RecallAuthScreen } from "../components/RecallAuthScreen";
import { RecallOnboardingScreen } from "../components/RecallOnboardingScreen";
import { RecallWhatsNextScreen } from "../components/RecallWhatsNextScreen";
import { RecallPaywallModal } from "../components/RecallPaywallModal";
import { AppViewportFrame } from "../components/AppViewportFrame";
import {
  getRecallGuestOnboardingComplete,
  getRecallHasAuthenticated,
  getRecallOnboardingComplete,
  setRecallGuestOnboardingComplete,
  setRecallHasAuthenticated,
  setRecallOnboardingComplete,
  setRecallWhatsNextComplete,
  shouldShowRecallWhatsNext,
} from "../services/onboardingService";
import {
  cancelAllReminderNotifications,
  cancelFollowUpReminderNotificationsForVideo,
  getNotificationVideoIdFromResponse,
  initializeRecallNotifications,
  isOnceReminderNotificationResponse,
} from "../services/recallNotifications";
import { getSupabaseStartupError } from "../services/supabaseClient";
import {
  clearPendingShareUrl,
  getPendingShareUrl,
  setPendingShareUrl,
} from "../services/pendingShareService";
import {
  extractShareUrlFromLink,
  normalizeShareUrlParam,
  shareUrlsMatch,
} from "../utils/shareDeepLink";
import * as Notifications from "expo-notifications";
import { Stack, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppearanceStore } from "../store/useAppearanceStore";
SplashScreen.preventAutoHideAsync();

function logStartup(stage, details) {
  const payload = details ? { stage, ...details } : { stage };
  globalThis.__RECALL_STARTUP_STAGE__ = payload;
  console.log("[Recall startup]", payload);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function DisplayNamePrompt({ value, onChangeText, onSubmit, isSaving }) {
  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(17,17,17,0.16)",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          padding: 22,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 28,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            lineHeight: 34,
            color: "#111111",
            fontFamily: Platform.OS === "ios" ? "Georgia" : undefined,
            fontWeight: Platform.OS === "ios" ? undefined : "700",
            marginBottom: 8,
            letterSpacing: -0.8,
          }}
        >
          What should Recall call you?
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: "#8E8E93",
            marginBottom: 18,
          }}
        >
          This keeps your profile and home screen feeling personal, even when Apple hides your email.
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Your name"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          style={{
            borderWidth: 1,
            borderColor: "#E8DDD0",
            borderRadius: 18,
            backgroundColor: "#FDFBF8",
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: "#111111",
            marginBottom: 16,
          }}
        />
        <Pressable
          onPress={onSubmit}
          disabled={isSaving || !value.trim()}
          style={({ pressed }) => ({
            backgroundColor:
              isSaving || !value.trim()
                ? "#B7B7B7"
                : pressed
                  ? "#222222"
                  : "#111111",
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 15,
          })}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: "700",
            }}
          >
            {isSaving ? "Saving..." : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const startupConfigError = getSupabaseStartupError();
  const [authMode, setAuthMode] = useState("welcome");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [createEntrySource, setCreateEntrySource] = useState("onboarding");
  const router = useRouter();
  const { initiate, isReady } = useAuth();
  const initializeRecall = useRecallStore((s) => s.initialize);
  const supabaseReady = useSupabaseSessionStore((s) => s.isReady);
  const supabaseUser = useSupabaseSessionStore((s) => s.user);
  const setSupabaseSession = useSupabaseSessionStore((s) => s.setSession);
  const [isAuthGateReady, setIsAuthGateReady] = useState(false);
  const [showWhatsNext, setShowWhatsNext] = useState(false);
  const [displayNamePromptVisible, setDisplayNamePromptVisible] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const appearanceReady = useAppearanceStore((state) => state.isReady);
  const initializeAppearance = useAppearanceStore((state) => state.initialize);
  const appearanceTheme = useAppearanceStore((state) => state.theme);
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);
  const systemColorScheme = useColorScheme();
  const isDarkAppearance =
    appearanceTheme === "Dark" ||
    (appearanceTheme === "System" && systemColorScheme === "dark");
  const pendingShareResumeRef = useRef(null);
  const [pendingShareRetryToken, setPendingShareRetryToken] = useState(0);
  const segments = useSegments();
  const globalSearchParams = useGlobalSearchParams();
  const PENDING_SHARE_RESUME_DEBOUNCE_MS = 2500;
  const PENDING_SHARE_MAX_RESUME_ATTEMPTS = 8;

  useEffect(() => {
    if (startupConfigError || !supabaseReady) {
      return undefined;
    }

    const handleIncomingShareLink = async (link) => {
      const sharedUrl = extractShareUrlFromLink(link);
      if (!sharedUrl) {
        return;
      }

      if (!supabaseUser?.id) {
        await setPendingShareUrl(sharedUrl);
        return;
      }

      await clearPendingShareUrl();
    };

    Linking.getInitialURL()
      .then((link) => handleIncomingShareLink(link))
      .catch(() => null);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingShareLink(url).catch(() => null);
    });

    return () => {
      subscription.remove();
    };
  }, [startupConfigError, supabaseReady, supabaseUser?.id]);

  useEffect(() => {
    if (startupConfigError || !supabaseReady || !supabaseUser?.id) {
      if (!supabaseUser?.id) {
        pendingShareResumeRef.current = null;
      }
      return undefined;
    }

    let active = true;
    let retryTimer;

    const scheduleRetry = (delayMs) => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        if (active) {
          setPendingShareRetryToken((token) => token + 1);
        }
      }, delayMs);
    };

    (async () => {
      const pendingUrl = await getPendingShareUrl();
      if (!active || !pendingUrl) {
        return;
      }

      const resumeState = pendingShareResumeRef.current;
      const routeUrl = normalizeShareUrlParam(globalSearchParams.url);
      const isOnAddScreen = segments.includes("add");

      if (
        resumeState?.status === "confirmed" &&
        shareUrlsMatch(resumeState.url, pendingUrl)
      ) {
        await clearPendingShareUrl().catch(() => null);
        return;
      }

      if (isOnAddScreen && routeUrl && shareUrlsMatch(routeUrl, pendingUrl)) {
        await clearPendingShareUrl();
        pendingShareResumeRef.current = {
          url: pendingUrl,
          status: "confirmed",
          attemptedAt: Date.now(),
          attemptCount: resumeState?.attemptCount ?? 0,
        };
        return;
      }

      const recentlyAttempted =
        resumeState?.url === pendingUrl &&
        resumeState?.status === "navigating" &&
        Date.now() - (resumeState.attemptedAt ?? 0) <
          PENDING_SHARE_RESUME_DEBOUNCE_MS;

      if (recentlyAttempted) {
        scheduleRetry(
          PENDING_SHARE_RESUME_DEBOUNCE_MS -
            (Date.now() - (resumeState.attemptedAt ?? 0)),
        );
        return;
      }

      const nextAttemptCount =
        resumeState?.url === pendingUrl ? (resumeState.attemptCount ?? 0) + 1 : 1;

      if (nextAttemptCount > PENDING_SHARE_MAX_RESUME_ATTEMPTS) {
        return;
      }

      pendingShareResumeRef.current = {
        url: pendingUrl,
        status: "navigating",
        attemptedAt: Date.now(),
        attemptCount: nextAttemptCount,
      };

      try {
        router.replace({
          pathname: "/(tabs)/add",
          params: { url: pendingUrl },
        });
      } catch {
        pendingShareResumeRef.current = {
          url: pendingUrl,
          status: "failed",
          attemptedAt: Date.now(),
          attemptCount: nextAttemptCount,
        };
      }

      scheduleRetry(PENDING_SHARE_RESUME_DEBOUNCE_MS);
    })().catch(() => {
      pendingShareResumeRef.current = null;
    });

    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
  }, [
    globalSearchParams.url,
    pendingShareRetryToken,
    router,
    segments,
    startupConfigError,
    supabaseReady,
    supabaseUser?.id,
  ]);

  useEffect(() => {
    initializeAppearance();
  }, [initializeAppearance]);

  useEffect(() => {
    logStartup("root-layout-mounted", {
      platform: Platform.OS,
      hasStartupConfigError: Boolean(startupConfigError),
    });
    initiate();
  }, [initiate, startupConfigError]);

  useEffect(() => {
    try {
      initializeRecallNotifications();
      logStartup("notifications-initialized");
    } catch (error) {
      console.error("[Recall startup] notifications init failed", error);
    }
  }, []);

  useEffect(() => {
    if (startupConfigError) {
      setSupabaseSession(null);
      return undefined;
    }

    let active = true;

    getCurrentSupabaseSession()
      .then(async (session) => {
        if (!active) return;
        setSupabaseSession(session);
        if (session?.user) {
          await ensureRecallProfile({ user: session.user });
        }
      })
      .catch(() => {
        if (active) {
          setSupabaseSession(null);
        }
      });

    const {
      data: { subscription },
    } = listenToSupabaseAuth(async (session) => {
      setSupabaseSession(session);
      if (session?.user) {
        await ensureRecallProfile({ user: session.user });
      } else {
        await cancelAllReminderNotifications();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setSupabaseSession, startupConfigError]);

  useEffect(() => {
    if (startupConfigError) {
      return;
    }

    if (Platform.OS === "web" || !supabaseUser?.id) {
      return undefined;
    }

    const markOnceReminderDelivered = useRecallStore.getState().markOnceReminderDelivered;

    const maybeCompleteOnceReminder = (response) => {
      if (!isOnceReminderNotificationResponse(response)) {
        return;
      }

      const videoId = getNotificationVideoIdFromResponse(response);
      if (!videoId) return;
      markOnceReminderDelivered(videoId).catch(() => null);
    };

    const openVideoFromResponse = async (response) => {
      maybeCompleteOnceReminder(response);
      const videoId = getNotificationVideoIdFromResponse(response);
      if (!videoId) return;
      await cancelFollowUpReminderNotificationsForVideo(videoId).catch(
        () => null,
      );
      router.push({
        pathname: "/video-detail",
        params: { id: videoId },
      });
      if (Notifications.clearLastNotificationResponseAsync) {
        await Notifications.clearLastNotificationResponseAsync();
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          openVideoFromResponse(response);
        }
      })
      .catch(() => null);

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        openVideoFromResponse(response);
      });

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        maybeCompleteOnceReminder({
          notification,
        });
      },
    );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [router, startupConfigError, supabaseUser?.id]);

  useEffect(() => {
    if (startupConfigError || !supabaseUser?.id) {
      setDisplayNamePromptVisible(false);
      setDisplayNameDraft("");
      return;
    }

    let active = true;

    async function checkDisplayNamePrompt() {
      try {
        const profile = await getRecallProfile(supabaseUser.id);
        if (!active) return;

        const profileName = profile?.display_name ?? null;
        const metadataName =
          supabaseUser?.user_metadata?.display_name ??
          supabaseUser?.user_metadata?.name ??
          null;
        const needsPrompt =
          isApplePrivateRelayEmail(supabaseUser?.email) &&
          !isUsableRecallDisplayName(profileName) &&
          !isUsableRecallDisplayName(metadataName);

        setDisplayNamePromptVisible(needsPrompt);
        setDisplayNameDraft(isUsableRecallDisplayName(profileName) ? profileName.trim() : "");
      } catch (_error) {
        if (!active) return;
        setDisplayNamePromptVisible(false);
        setDisplayNameDraft("");
      }
    }

    checkDisplayNamePrompt();

    return () => {
      active = false;
    };
  }, [startupConfigError, supabaseUser?.email, supabaseUser?.id, supabaseUser?.user_metadata]);

  useEffect(() => {
    if (startupConfigError) {
      return;
    }

    if (!supabaseReady) return;
    initializeRecall({
      user: supabaseUser ?? null,
      accessToken: null,
    });
  }, [initializeRecall, startupConfigError, supabaseReady, supabaseUser]);

  useEffect(() => {
    if (startupConfigError) {
      setIsAuthGateReady(true);
      return;
    }

    let active = true;

    if (!supabaseUser?.id) {
      setShowWhatsNext(false);
      Promise.all([
        getRecallGuestOnboardingComplete().catch(() => false),
        getRecallHasAuthenticated().catch(() => false),
      ]).then(([hasCompletedOnboarding, hasAuthenticated]) => {
        if (!active) return;

        setOnboardingStep(hasCompletedOnboarding ? 3 : 0);
        if (!hasCompletedOnboarding) {
          setAuthMode("welcome");
        } else if (hasAuthenticated) {
          setAuthMode("signIn");
        } else {
          setCreateEntrySource("onboarding");
          setAuthMode("create");
        }
        setIsAuthGateReady(true);
      });

      return () => {
        active = false;
      };
    }

    setAuthMode("signIn");
    setOnboardingStep(3);
    setIsAuthGateReady(false);

    setRecallGuestOnboardingComplete().catch(() => null);
    setRecallHasAuthenticated().catch(() => null);

    Promise.all([
      shouldShowRecallWhatsNext(supabaseUser).catch(() => false),
      getRecallOnboardingComplete(supabaseUser.id).catch(() => false),
    ])
      .then(([needsWhatsNext, onboardingCompleted]) => {
        if (!active) return;

        setShowWhatsNext(needsWhatsNext);
        setIsAuthGateReady(true);

        if (!onboardingCompleted) {
          return setRecallOnboardingComplete(supabaseUser.id).catch(() => null);
        }
      })
      .catch(() => {
        if (!active) return;
        setShowWhatsNext(false);
        setIsAuthGateReady(true);
      });

    return () => {
      active = false;
    };
  }, [startupConfigError, supabaseUser?.id]);

  useEffect(() => {
    if (isReady && supabaseReady && isAuthGateReady && appearanceReady) {
      logStartup("splash-hidden");
      SplashScreen.hideAsync();
    }
  }, [appearanceReady, isAuthGateReady, isReady, supabaseReady]);

  if (startupConfigError) {
    return (
      <ErrorFallbackScreen message={startupConfigError} />
    );
  }

  if (!isReady || !supabaseReady || !isAuthGateReady || !appearanceReady) {
    return null;
  }

  if (!supabaseUser) {
    return (
      <AppViewportFrame>
        {authMode === "welcome" ? (
          <RecallOnboardingScreen
            initialStep={onboardingStep}
            onComplete={async () => {
              await setRecallGuestOnboardingComplete().catch(() => null);
              setOnboardingStep(3);
              setCreateEntrySource("onboarding");
              setAuthMode("create");
            }}
          />
        ) : (
          <RecallAuthScreen
            mode={authMode === "signIn" ? "signIn" : "create"}
            onBack={() => {
              if (createEntrySource === "signIn") {
                setAuthMode("signIn");
                return;
              }

              setOnboardingStep(3);
              setAuthMode("welcome");
            }}
            onSwitchMode={(nextMode) => {
              if (nextMode === "create") {
                setCreateEntrySource(authMode === "signIn" ? "signIn" : "onboarding");
              }
              setAuthMode(nextMode);
            }}
          />
        )}
      </AppViewportFrame>
    );
  }

  if (showWhatsNext) {
    return (
      <AppViewportFrame>
        <RecallWhatsNextScreen
          onContinue={async () => {
            await setRecallWhatsNextComplete(supabaseUser.id).catch(() => null);
            setShowWhatsNext(false);
          }}
        />
      </AppViewportFrame>
    );
  }

  const handleCompleteDisplayName = async () => {
    const nextName = displayNameDraft.trim();
    if (!supabaseUser?.id || !nextName) return;

    setIsSavingDisplayName(true);
    try {
      await updateRecallProfile({
        userId: supabaseUser.id,
        displayName: nextName,
      });
      setDisplayNamePromptVisible(false);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDarkAppearance ? "light" : "dark"} />
        <AppViewportFrame>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduceMotion ? "none" : "default",
            }}
            initialRouteName="index"
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="video-detail"
              options={{
                presentation: "card",
                animation: reduceMotion ? "none" : "slide_from_right",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="routine-detail"
              options={{
                presentation: "card",
                animation: reduceMotion ? "none" : "slide_from_bottom",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notification-opened"
              options={{
                presentation: "modal",
                animation: reduceMotion ? "none" : "slide_from_bottom",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notifications-settings"
              options={{
                presentation: "card",
                animation: reduceMotion ? "none" : "slide_from_right",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="share-import"
              options={{
                presentation: "fullScreenModal",
                animation: reduceMotion ? "none" : "slide_from_bottom",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="worth-revisiting"
              options={{
                presentation: "card",
                animation: reduceMotion ? "none" : "slide_from_right",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="routine-completed"
              options={{
                presentation: "fullScreenModal",
                animation: reduceMotion ? "none" : "slide_from_bottom",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="whats-next"
              options={{
                presentation: "fullScreenModal",
                animation: reduceMotion ? "none" : "slide_from_bottom",
                headerShown: false,
              }}
            />
          </Stack>
          {displayNamePromptVisible ? (
            <DisplayNamePrompt
              value={displayNameDraft}
              onChangeText={setDisplayNameDraft}
              onSubmit={handleCompleteDisplayName}
              isSaving={isSavingDisplayName}
            />
          ) : null}
        </AppViewportFrame>
        <RecallPaywallModal />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

function ErrorFallbackScreen({ message }) {
  return (
    <AppViewportFrame>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            backgroundColor: "#F7F7F5",
          }}
        >
          <View
            style={{
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              padding: 24,
              gap: 12,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#111111",
                lineHeight: 28,
              }}
            >
              Recall couldn't finish starting
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "400",
                color: "#4F4F54",
                lineHeight: 22,
              }}
            >
              {`${message}\n\nIf this is a development build, rebuild after confirming your EXPO_PUBLIC_* values are present in EAS and locally.`}
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </AppViewportFrame>
  );
}
