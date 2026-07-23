import { useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/dev";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react-native";
import { RecallProfileIcon } from "./RecallProfileIcon";
import { RecallSavedContentIcon } from "./RecallSavedContentIcon";
import {
  getFriendlySupabaseError,
  requestRecallPasswordReset,
  signInWithAppleToRecall,
  signInToRecall,
  signUpToRecall,
  updateRecallPassword,
} from "../services/supabaseClient";
import {
  setRecallWhatsNextPending,
  markRecallWhatsNextSignupIntent,
  clearRecallWhatsNextSignupIntent,
} from "../services/onboardingService";
import { trackEvent } from "../services/analytics";

const BG = "#F7F7F5";
const BLACK = "#111111";
const WHITE = "#FFFFFF";
const GREY_TEXT = "#8E8E93";
const GREY_LIGHT = "#F2F2F0";
const RED = "#C62828";
const TAN = "#E6D2BC";
const TAN_BORDER = "#E8DDD0";
const CREATE_ACCOUNT_HERO = require("../../assets/images/create-account-hero.png");
const TEMP_DISABLE_APPLE_AUTH_FOR_DEV_BUILD_DEBUG = false;

function formatDevErrorDetails(error) {
  const parts = [
    error?.code ? `code=${error.code}` : null,
    error?.status ? `status=${error.status}` : null,
    error?.message ? `message=${error.message}` : null,
    error?.error_description ? `description=${error.error_description}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded =
      typeof globalThis.atob === "function"
        ? globalThis.atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const json = decodeURIComponent(
      Array.from(decoded)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function createAppleNonce(length = 32) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  }

  return Array.from({ length }, () => {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }).join("");
}

async function hashAppleNonce(value) {
  const subtle = globalThis.crypto?.subtle;

  if (subtle?.digest) {
    const encoded = new TextEncoder().encode(value);
    const digest = await subtle.digest("SHA-256", encoded);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Apple nonce values here are ASCII-only, so a compact JS SHA-256 fallback
  // keeps the iOS dev client working without another native dependency.
  const rightRotate = (amount, number) => (number >>> amount) | (number << (32 - amount));
  const words = [];
  const asciiBitLength = value.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate += 1) {
    if (!isComposite[candidate]) {
      for (let multiple = candidate * candidate; multiple < 312; multiple += candidate) {
        isComposite[multiple] = true;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * 0x100000000) | 0;
      k[primeCounter] = (Math.pow(candidate, 1 / 3) * 0x100000000) | 0;
      primeCounter += 1;
    }
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    words[index >> 2] |= code << (24 - (index % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let start = 0; start < words.length; start += 16) {
    const working = hash.slice(0, 8);
    const w = [];

    for (let i = 0; i < 64; i += 1) {
      if (i < 16) {
        w[i] = words[start + i] | 0;
      } else {
        const gamma0x = w[i - 15];
        const gamma1x = w[i - 2];
        const gamma0 =
          rightRotate(7, gamma0x) ^
          rightRotate(18, gamma0x) ^
          (gamma0x >>> 3);
        const gamma1 =
          rightRotate(17, gamma1x) ^
          rightRotate(19, gamma1x) ^
          (gamma1x >>> 10);
        w[i] = (((w[i - 16] + gamma0) | 0) + ((w[i - 7] + gamma1) | 0)) | 0;
      }

      const ch = (working[4] & working[5]) ^ (~working[4] & working[6]);
      const maj =
        (working[0] & working[1]) ^
        (working[0] & working[2]) ^
        (working[1] & working[2]);
      const sigma0 =
        rightRotate(2, working[0]) ^
        rightRotate(13, working[0]) ^
        rightRotate(22, working[0]);
      const sigma1 =
        rightRotate(6, working[4]) ^
        rightRotate(11, working[4]) ^
        rightRotate(25, working[4]);
      const temp1 = (((((working[7] + sigma1) | 0) + ch) | 0) + ((k[i] + w[i]) | 0)) | 0;
      const temp2 = (sigma0 + maj) | 0;

      working.unshift((temp1 + temp2) | 0);
      working[4] = (working[4] + temp1) | 0;
      working.pop();
    }

    for (let i = 0; i < 8; i += 1) {
      hash[i] = (hash[i] + working[i]) | 0;
    }
  }

  return hash
    .slice(0, 8)
    .map((part) => (part >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function getAppleAuthenticationModule() {
  try {
    return require("expo-apple-authentication");
  } catch (error) {
    console.warn("[Recall startup] Apple auth module failed to load", error);
    return null;
  }
}

export function RecallAuthScreen({
  mode = "create",
  onBack,
  onSwitchMode,
  onPasswordUpdated,
}) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(Platform.OS === "ios");
  const [appleAuthModule, setAppleAuthModule] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== "ios" || TEMP_DISABLE_APPLE_AUTH_FOR_DEV_BUILD_DEBUG) {
      setIsAppleAvailable(false);
      setAppleAuthModule(null);
      return () => {
        isMounted = false;
      };
    }

    const AppleAuthentication = getAppleAuthenticationModule();
    if (!AppleAuthentication) {
      setIsAppleAvailable(false);
      return () => {
        isMounted = false;
      };
    }

    setAppleAuthModule(AppleAuthentication);

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) {
          setIsAppleAvailable(Boolean(available));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAppleAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!fontsLoaded) return null;

  const isCreateMode = mode === "create";
  const isResetPasswordMode = mode === "resetPassword";
  const usesHeroLayout = true;
  const canSubmit = isResetPasswordMode
    ? password.length >= 6 && password === confirmPassword
    : email.trim().length > 0 && password.length >= 6;
  const canRequestReset = email.trim().length > 0 && !isSubmitting && !isSendingReset;
  const AppleAuthentication = appleAuthModule;

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleSignIn = async () => {
    setIsSubmitting(true);
    resetMessages();

    try {
      await signInToRecall({
        email: email.trim(),
        password,
      });
    } catch (error) {
      setErrorMessage(
        getFriendlySupabaseError(error, "Recall could not sign you in right now."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    resetMessages();

    try {
      await markRecallWhatsNextSignupIntent().catch(() => null);
      const result = await signUpToRecall({
        email: email.trim(),
        password,
      });
      if (result.user?.id) {
        await setRecallWhatsNextPending(result.user.id).catch(() => null);
        trackEvent("signup_completed");
      }
      if (!result.session) {
        setInfoMessage(
          "Account created. If you do not enter Recall right away, check your email for a confirmation link.",
        );
      }
    } catch (error) {
      await clearRecallWhatsNextSignupIntent().catch(() => null);
      setErrorMessage(
        getFriendlySupabaseError(
          error,
          "Recall could not create your account right now.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage("Enter your email first so we know where to send it.");
      setInfoMessage(null);
      return;
    }

    setIsSendingReset(true);
    resetMessages();

    try {
      await requestRecallPasswordReset({ email: email.trim() });
      setInfoMessage(
        "Password reset email sent. Open the link on this iPhone to choose a new password.",
      );
    } catch (error) {
      setErrorMessage(
        getFriendlySupabaseError(
          error,
          "Recall could not send a reset email right now.",
        ),
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      setErrorMessage("Choose a password with at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Those passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      await updateRecallPassword({ password });
      setInfoMessage("Password updated. You're back in Recall.");
      await onPasswordUpdated?.();
    } catch (error) {
      setErrorMessage(
        getFriendlySupabaseError(
          error,
          "Recall could not update your password right now.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSubmitting(true);
    resetMessages();
    let appleDebug = null;

    try {
      if (TEMP_DISABLE_APPLE_AUTH_FOR_DEV_BUILD_DEBUG) {
        throw new Error("Apple Sign In is temporarily disabled while debugging the dev build launch crash.");
      }

      const AppleAuthentication = appleAuthModule ?? getAppleAuthenticationModule();
      if (!AppleAuthentication) {
        throw new Error("Apple authentication module is unavailable.");
      }

      const nonce = createAppleNonce();
      const hashedNonce = await hashAppleNonce(nonce);
      if (!hashedNonce) {
        throw new Error("Secure nonce hashing is unavailable on this device.");
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      const identityPayload = decodeJwtPayload(credential.identityToken);
      appleDebug = {
        nonce,
        hashedNonce,
        tokenNonce: identityPayload?.nonce ?? null,
        hasAuthorizationCode: Boolean(credential.authorizationCode),
      };
      console.log("[Recall Apple Sign In] nonce debug", {
        nonce,
        hashedNonce,
        tokenNonce: identityPayload?.nonce ?? null,
        hasAuthorizationCode: Boolean(credential.authorizationCode),
      });

      const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ")
        .trim();

      const result = await signInWithAppleToRecall({
        identityToken: credential.identityToken,
        accessToken: credential.authorizationCode || undefined,
        nonce,
        displayName: displayName || null,
      });

      if (result?.user?.id) {
        const createdAtMs = result.user.created_at
          ? new Date(result.user.created_at).getTime()
          : 0;
        const isNewAccount =
          createdAtMs > 0 && Date.now() - createdAtMs < 10 * 60 * 1000;

        if (isNewAccount) {
          await markRecallWhatsNextSignupIntent().catch(() => null);
          await setRecallWhatsNextPending(result.user.id).catch(() => null);
          trackEvent("signup_completed");
        }
      }
    } catch (error) {
      console.error("[Recall Apple Sign In]", error);
      if (error?.code === "ERR_REQUEST_CANCELED") {
        setInfoMessage(null);
        setErrorMessage(null);
      } else {
        const friendlyMessage = getFriendlySupabaseError(
          error,
          "Recall could not sign you in with Apple right now.",
        );
        const devDetails = formatDevErrorDetails(error);
        setErrorMessage(
          __DEV__ && (devDetails || appleDebug)
            ? `${friendlyMessage}\n\nDev details: ${[
                devDetails,
                appleDebug?.nonce ? `sent_nonce=${appleDebug.nonce}` : null,
                appleDebug?.hashedNonce ? `sha256_nonce=${appleDebug.hashedNonce}` : null,
                appleDebug?.tokenNonce ? `token_nonce=${appleDebug.tokenNonce}` : null,
                appleDebug?.hasAuthorizationCode === false ? "authorization_code=missing" : null,
              ]
                .filter(Boolean)
                .join(" | ")}`
            : friendlyMessage,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        paddingTop: insets.top + 14,
        paddingBottom: insets.bottom + 18,
        paddingHorizontal: 24,
      }}
    >
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View>
          {usesHeroLayout ? (
            <>
              {isCreateMode ? (
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: pressed ? "#EFE8DE" : "#F2EEE8",
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    marginBottom: 8,
                    shadowColor: "#C9B499",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 18,
                    elevation: 3,
                  })}
                >
                  <ChevronLeft size={17} color={BLACK} />
                </Pressable>
              ) : (
                <View style={{ height: 48 }} />
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: -18,
                  marginBottom: 6,
                }}
              >
                <RecallSavedContentIcon name="bookmark" size={26} />
                <Text
                  style={{
                    fontSize: 28,
                    color: BLACK,
                    fontFamily: "Georgia",
                    letterSpacing: -1,
                  }}
                >
                  Recall
                </Text>
              </View>

              <View
                style={{
                  position: "relative",
                  minHeight: isCreateMode ? 182 : 198,
                  width: "100%",
                  marginBottom: 0,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    maxWidth: isCreateMode ? 230 : 246,
                    paddingTop: isCreateMode ? 14 : 30,
                  }}
                >
                  <Text
                    style={{
                      fontSize: isCreateMode ? 29 : 27,
                      fontFamily: "Georgia",
                      color: BLACK,
                      letterSpacing: -1.5,
                      lineHeight: isCreateMode ? 34 : 32,
                      marginBottom: 4,
                      maxWidth: isCreateMode ? 230 : 246,
                    }}
                  >
                    {isResetPasswordMode
                      ? "Choose a new\npassword"
                      : isCreateMode
                        ? "Create your\nRecall account"
                        : "Welcome back"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: GREY_TEXT,
                      lineHeight: 20,
                      maxWidth: isCreateMode ? 228 : 232,
                      marginTop: isCreateMode ? 0 : 6,
                    }}
                  >
                    {isResetPasswordMode
                      ? "Pick something you’ll remember,\nthen continue into Recall."
                      : isCreateMode
                        ? "Start saving videos you\ndon't want to lose."
                        : "Sign in to keep saving the\nvideos you don’t want to lose."}
                  </Text>
                </View>

                <Image
                  source={CREATE_ACCOUNT_HERO}
                  contentFit="contain"
                  style={{
                    position: "absolute",
                    right: isCreateMode ? -50 : -52,
                    top: isCreateMode ? -10 : 10,
                    width: isCreateMode ? 202 : 206,
                    height: isCreateMode ? 202 : 206,
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 34,
                  fontFamily: "Inter_700Bold",
                  color: BLACK,
                  letterSpacing: -1,
                  lineHeight: 40,
                  marginBottom: 10,
                  maxWidth: 320,
                }}
              >
                Welcome back
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                  lineHeight: 24,
                  marginBottom: 28,
                  maxWidth: 320,
                }}
              >
                Pick up where you left off.
              </Text>
            </>
          )}

          {!isResetPasswordMode ? (
            <Field
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              isCreateMode={usesHeroLayout}
              icon={<RecallProfileIcon name="contact" size={22} />}
            />
          ) : null}
          <Field
            label={isResetPasswordMode ? "New password" : "Password"}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="At least 6 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            isCreateMode={usesHeroLayout}
            icon={<Lock size={22} color="#6D6255" strokeWidth={2} />}
            trailing={
              usesHeroLayout ? (
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  {showPassword ? (
                    <EyeOff size={24} color="#6D6255" strokeWidth={2} />
                  ) : (
                    <Eye size={24} color="#6D6255" strokeWidth={2} />
                  )}
                </Pressable>
              ) : null
            }
          />
          {isResetPasswordMode ? (
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Re-enter password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              isCreateMode={usesHeroLayout}
              icon={<Lock size={22} color="#6D6255" strokeWidth={2} />}
            />
          ) : null}

          {isCreateMode ? (
            <View
              style={{
                marginTop: 2,
                marginBottom: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "rgba(232, 221, 208, 0.8)",
                backgroundColor: "rgba(255, 255, 255, 0.42)",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <RecallProfileIcon name="shield-check" size={24} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: "#4D443C",
                  lineHeight: 17,
                }}
              >
                Your data is private and secure.
              </Text>
            </View>
          ) : null}

          {!isCreateMode && !isResetPasswordMode ? (
            <View
              style={{
                marginTop: 4,
                marginBottom: 2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => setRememberMe((current) => !current)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    borderWidth: 1.5,
                    borderColor: "#D7C2A8",
                    backgroundColor: rememberMe ? "#C0A07E" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  {rememberMe ? <Check size={12} color={WHITE} strokeWidth={3} /> : null}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: "#4D443C",
                  }}
                >
                  Remember me
                </Text>
              </Pressable>

              <Pressable
                onPress={handleForgotPassword}
                disabled={!canRequestReset}
                style={({ pressed }) => ({
                  opacity: !canRequestReset ? 0.55 : pressed ? 0.65 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_500Medium",
                    color: "#9B7950",
                  }}
                >
                  {isSendingReset ? "Sending reset email..." : "Forgot password?"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                fontFamily: "Inter_500Medium",
                color: RED,
                lineHeight: 18,
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          {infoMessage ? (
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                fontFamily: "Inter_500Medium",
                color: GREY_TEXT,
                lineHeight: 18,
              }}
            >
              {infoMessage}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 10, marginTop: isCreateMode ? 2 : 8 }}>
          <Pressable
            onPress={
              isResetPasswordMode
                ? handleUpdatePassword
                : isCreateMode
                  ? handleCreateAccount
                  : handleSignIn
            }
            disabled={!canSubmit || isSubmitting}
            style={({ pressed }) => ({
              borderRadius: 22,
              backgroundColor:
                !canSubmit || isSubmitting
                  ? "#C7C7CC"
                  : pressed
                    ? isCreateMode || isResetPasswordMode
                      ? "#1F1F1F"
                      : "#B59472"
                    : isCreateMode || isResetPasswordMode
                      ? BLACK
                      : "#C0A07E",
              paddingVertical: 17,
              paddingHorizontal: 24,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.14,
              shadowRadius: 28,
              elevation: 5,
            })}
          >
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Inter_600SemiBold",
                color: WHITE,
              }}
            >
              {isSubmitting
                ? isResetPasswordMode
                  ? "Updating Password..."
                  : isCreateMode
                    ? "Creating Account..."
                    : "Signing In..."
                : isResetPasswordMode
                  ? "Update Password"
                  : isCreateMode
                    ? "Create Account"
                    : "Sign In"}
            </Text>
            <View style={{ position: "absolute", right: 24 }}>
              <ArrowRight size={28} color={WHITE} strokeWidth={2.1} />
            </View>
          </Pressable>

          {!isResetPasswordMode && isAppleAvailable && AppleAuthentication ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 6,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(17, 17, 17, 0.08)" }} />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                  }}
                >
                  {isCreateMode ? "or" : "Or continue with"}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(17, 17, 17, 0.08)" }} />
              </View>

              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  isCreateMode
                    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                    : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  isCreateMode
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={22}
                style={{
                  width: "100%",
                  height: 54,
                }}
                onPress={handleAppleSignIn}
              />
            </>
          ) : null}

          {!isCreateMode && !isResetPasswordMode ? (
            <View
              style={{
                marginTop: 4,
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(232, 221, 208, 0.8)",
                backgroundColor: "rgba(255, 255, 255, 0.72)",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <RecallProfileIcon name="shield-check" size={24} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontFamily: "Inter_500Medium",
                    color: "#4D443C",
                    marginBottom: 1,
                  }}
                >
                  Your data is private and secure.
                </Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    fontFamily: "Inter_400Regular",
                    color: GREY_TEXT,
                    lineHeight: 14,
                  }}
                >
                  We’ll never share or sell your information.
                </Text>
              </View>
            </View>
          ) : null}

          {!isResetPasswordMode ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
              <Text
                style={{
                  fontSize: isCreateMode ? 14 : 13,
                  fontFamily: "Inter_400Regular",
                  color: GREY_TEXT,
                }}
              >
              {isCreateMode ? "Already have an account?" : "Don’t have an account?"}
            </Text>
            <Pressable
              onPress={() => {
                resetMessages();
                onSwitchMode?.(isCreateMode ? "signIn" : "create");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: isCreateMode ? 14 : 13,
                  fontFamily: "Inter_600SemiBold",
                  color: BLACK,
                }}
              >
                {isCreateMode ? "Sign in" : "Sign up"}
              </Text>
            </Pressable>
          </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Field({ label, icon, trailing, isCreateMode = false, ...props }) {
  return (
    <View style={{ marginBottom: isCreateMode ? 8 : 14 }}>
      <Text
        style={{
          fontSize: isCreateMode ? 14 : 13,
          fontFamily: isCreateMode ? "Inter_600SemiBold" : "Inter_500Medium",
          color: isCreateMode ? "#4D443C" : GREY_TEXT,
          marginBottom: isCreateMode ? 4 : 7,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: isCreateMode ? "rgba(255, 255, 255, 0.42)" : GREY_LIGHT,
          borderRadius: isCreateMode ? 18 : 16,
          borderWidth: isCreateMode ? 1 : 0,
          borderColor: isCreateMode ? TAN_BORDER : "transparent",
          paddingHorizontal: isCreateMode ? 16 : 14,
          paddingVertical: isCreateMode ? 0 : 0,
          minHeight: isCreateMode ? 58 : 52,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: isCreateMode ? "#D9C6AD" : "transparent",
          shadowOffset: isCreateMode ? { width: 0, height: 14 } : undefined,
          shadowOpacity: isCreateMode ? 0.08 : 0,
          shadowRadius: isCreateMode ? 24 : 0,
          elevation: isCreateMode ? 2 : 0,
        }}
      >
        {icon ? <View style={{ marginRight: 14 }}>{icon}</View> : null}
        <TextInput
          {...props}
          placeholderTextColor="#B0B0B5"
          style={{
            flex: 1,
            fontSize: isCreateMode ? 15 : 15,
            fontFamily: "Inter_400Regular",
            color: BLACK,
            paddingVertical: isCreateMode ? 10 : 14,
          }}
        />
        {trailing ? <View style={{ marginLeft: 12 }}>{trailing}</View> : null}
      </View>
    </View>
  );
}
