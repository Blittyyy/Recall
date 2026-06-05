import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

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

export function isLikelyEmailAddress(value?: string | null) {
  return typeof value === "string" && value.includes("@");
}

export function isUsableRecallDisplayName(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0 && !isLikelyEmailAddress(value);
}

function assertSupabaseEnvConfigured() {
  if (startupConfigError) {
    throw new Error(startupConfigError);
  }
}

function resolveDisplayName(user: any) {
  return (
    (isUsableRecallDisplayName(user?.user_metadata?.display_name)
      ? user.user_metadata.display_name
      : null) ??
    (isUsableRecallDisplayName(user?.user_metadata?.name)
      ? user.user_metadata.name
      : null) ??
    (isUsableRecallDisplayName(user?.display_name) ? user.display_name : null) ??
    (isUsableRecallDisplayName(user?.displayName) ? user.displayName : null) ??
    (isUsableRecallDisplayName(user?.name) ? user.name : null) ??
    (isApplePrivateRelayEmail(user?.email) ? null : user?.email) ??
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
  callback: (session: any | null) => void | Promise<void>,
) {
  assertSupabaseEnvConfigured();
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
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

export async function requestRecallPasswordReset({
  email,
}: {
  email: string;
}) {
  assertSupabaseEnvConfigured();
  const redirectTo = process.env.EXPO_PUBLIC_APP_URL;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined,
  });

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

export async function ensureRecallProfile({
  user,
}: {
  user?: any;
}) {
  assertSupabaseEnvConfigured();
  if (!user?.id) {
    throw new Error("Missing authenticated user for Recall sync.");
  }

  const payload = {
    id: user.id,
    display_name: resolveDisplayName(user),
    avatar_url: resolveAvatarUrl(user),
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
