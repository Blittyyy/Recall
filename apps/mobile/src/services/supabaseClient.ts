import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const startupConfigError =
  !supabaseUrl || !supabaseKey
    ? "Missing EXPO_PUBLIC_SUPABASE_URL and a Supabase publishable or anon key."
    : null;

export function isApplePrivateRelayEmail(email?: string | null) {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase().endsWith("@privaterelay.appleid.com")
  );
}

export function getEmailLocalPart(email?: string | null) {
  if (typeof email !== "string") {
    return "";
  }

  return email.split("@")[0]?.trim() || "";
}

export function isLikelyEmailAddress(value?: string | null) {
  return typeof value === "string" && value.includes("@");
}

export function isEmailDerivedDisplayName(
  value?: string | null,
  email?: string | null,
) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (isLikelyEmailAddress(trimmed)) {
    return true;
  }

  const localPart = getEmailLocalPart(email).toLowerCase();
  return Boolean(localPart) && trimmed.toLowerCase() === localPart;
}

export function isUsableRecallDisplayName(
  value?: string | null,
  email?: string | null,
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !isEmailDerivedDisplayName(value, email)
  );
}

function assertSupabaseEnvConfigured() {
  if (startupConfigError) {
    throw new Error(startupConfigError);
  }
}

function resolveDisplayName(user: any) {
  const email = user?.email ?? null;
  return (
    (isUsableRecallDisplayName(user?.user_metadata?.display_name, email)
      ? user.user_metadata.display_name
      : null) ??
    (isUsableRecallDisplayName(user?.user_metadata?.name, email)
      ? user.user_metadata.name
      : null) ??
    (isUsableRecallDisplayName(user?.display_name, email)
      ? user.display_name
      : null) ??
    (isUsableRecallDisplayName(user?.displayName, email)
      ? user.displayName
      : null) ??
    (isUsableRecallDisplayName(user?.name, email) ? user.name : null) ??
    null
  );
}

function resolveAvatarUrl(user: any) {
  return (
    user?.user_metadata?.avatar_url ??
    user?.avatar_url ??
    user?.avatarUrl ??
    user?.picture ??
    user?.image ??
    null
  );
}

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseStartupError() {
  return startupConfigError;
}

export const supabase = createClient(
  (supabaseUrl as string) || "https://placeholder.invalid",
  (supabaseKey as string) || "public-anon-key-placeholder",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: "recall-supabase-auth",
    },
  },
);

export function getSupabaseClient(_accessToken?: string | null) {
  return supabase;
}

export async function getCurrentSupabaseSession() {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function listenToSupabaseAuth(
  callback: (
    session: any | null,
    event?: string,
  ) => void | Promise<void>,
) {
  assertSupabaseEnvConfigured();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event);
  });
}

export async function signInToRecall({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithAppleToRecall({
  identityToken,
  accessToken,
  nonce,
  displayName,
}: {
  identityToken: string;
  accessToken?: string;
  nonce?: string;
  displayName?: string | null;
}) {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    access_token: accessToken,
    nonce,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureRecallProfile({ user: data.user });

    if (displayName?.trim()) {
      await updateRecallProfile({
        userId: data.user.id,
        displayName: displayName.trim(),
      });
    }
  }

  return data;
}

export async function signUpToRecall({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.user && data.session) {
    await ensureRecallProfile({ user: data.user });
  }

  return data;
}

export function getRecallPasswordResetRedirectUrl() {
  // Always use the native app scheme. Linking.createURL() can return
  // http://localhost / exp:// during Metro, which opens a black Safari page.
  return "recall://reset-password";
}

export async function requestRecallPasswordReset({
  email,
}: {
  email: string;
}) {
  assertSupabaseEnvConfigured();
  const redirectTo = getRecallPasswordResetRedirectUrl();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createSessionFromAuthUrl(url: string) {
  assertSupabaseEnvConfigured();
  if (!url || typeof url !== "string") {
    return null;
  }

  // Supabase may return tokens in the hash; normalize for parsing.
  const normalized = url.replace(/#/g, "?");
  const parsed = Linking.parse(normalized);
  const params = (parsed.queryParams ?? {}) as Record<
    string,
    string | string[] | undefined
  >;

  const readParam = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  };

  const errorDescription =
    readParam("error_description") || readParam("error");
  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = readParam("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return {
      session: data.session,
      isRecovery: readParam("type") === "recovery",
    };
  }

  const accessToken = readParam("access_token");
  const refreshToken = readParam("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    isRecovery: readParam("type") === "recovery",
  };
}

export async function updateRecallPassword({
  password,
}: {
  password: string;
}) {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signOutOfRecall() {
  assertSupabaseEnvConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Permanently deletes the signed-in auth user via the delete-user edge function.
 * Database rows cascade from auth.users → profiles → library tables.
 */
export async function deleteRecallAccount() {
  assertSupabaseEnvConfigured();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!session?.access_token || !session.user?.id) {
    throw new Error("Sign in to delete your Recall account.");
  }

  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: {},
  });

  if (error) {
    throw error;
  }

  const payload = data && typeof data === "object" ? data : null;
  if (
    payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    throw new Error((payload as { error: string }).error);
  }

  // Session is invalid after auth user deletion; clear local auth state.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore — account is already gone server-side.
  }
}

export async function ensureRecallProfile({
  user,
}: {
  user?: any;
}) {
  assertSupabaseEnvConfigured();
  if (!user?.id) {
    throw new Error("Missing authenticated user for Recall sync.");
  }

  const email = user?.email ?? null;
  const existing = await getRecallProfile(user.id).catch(() => null);
  const resolvedName = resolveDisplayName(user);
  const displayName = isUsableRecallDisplayName(resolvedName, email)
    ? resolvedName.trim()
    : isUsableRecallDisplayName(existing?.display_name, email)
      ? existing.display_name.trim()
      : null;

  const payload = {
    id: user.id,
    display_name: displayName,
    avatar_url: resolveAvatarUrl(user) || existing?.avatar_url || null,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

export async function getRecallProfile(userId: string) {
  assertSupabaseEnvConfigured();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateRecallProfile({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  assertSupabaseEnvConfigured();
  const payload = {
    id: userId,
    display_name: displayName?.trim() || null,
    avatar_url: avatarUrl?.trim() || null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, display_name, avatar_url, created_at")
    .single();

  if (error) {
    throw error;
  }

  await supabase.auth.updateUser({
    data: {
      display_name: payload.display_name,
      full_name: payload.display_name,
      avatar_url: payload.avatar_url,
    },
  });

  return data;
}

export function getFriendlySupabaseError(error: any, fallback: string) {
  const message = error?.message ?? error?.error_description ?? "";

  if (!hasSupabaseEnv()) {
    return "Add your Supabase URL and anon key to continue.";
  }

  if (
    message.includes("Invalid login credentials") ||
    message.includes("invalid_credentials")
  ) {
    return "That email and password did not match.";
  }

  if (
    message.includes("Email not confirmed") ||
    message.includes("email_not_confirmed")
  ) {
    return "Check your email to confirm your account, then sign in.";
  }

  if (
    message.includes("User already registered") ||
    message.includes("already been registered")
  ) {
    return "That email already has a Recall account. Try signing in instead.";
  }

  if (
    message.includes("Password should be at least") ||
    message.includes("weak_password")
  ) {
    return "Choose a password with at least 6 characters.";
  }

  if (
    message.includes("For security purposes") ||
    message.includes("only request this after") ||
    message.includes("rate limit")
  ) {
    return "Please wait a moment before requesting another reset email.";
  }

  if (
    message.includes("redirect_to") ||
    message.includes("Redirect URL")
  ) {
    return "Password reset is misconfigured. Add Recall’s deep link to Supabase redirect URLs.";
  }

  if (
    message.includes("JWT") ||
    message.includes("token") ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Recall needs a valid signed-in session before it can sync with Supabase.";
  }

  if (message.includes("profiles")) {
    return "Recall could not finish setting up your profile in Supabase.";
  }

  return fallback;
}
