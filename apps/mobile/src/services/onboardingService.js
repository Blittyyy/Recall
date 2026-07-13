import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_ONBOARDING_KEY = "recall-onboarding-complete:guest";
const HAS_AUTHENTICATED_KEY = "recall-has-authenticated";
const WHATS_NEXT_SIGNUP_INTENT_KEY = "recall-whats-next-signup-intent";

function getOnboardingKey(userId) {
  return `recall-onboarding-complete:${userId}`;
}

function getWhatsNextCompleteKey(userId) {
  return `recall-whats-next-complete:${userId}`;
}

function getWhatsNextPendingKey(userId) {
  return `recall-whats-next-pending:${userId}`;
}

export async function getRecallGuestOnboardingComplete() {
  const value = await AsyncStorage.getItem(GUEST_ONBOARDING_KEY);
  return value === "true";
}

export async function setRecallGuestOnboardingComplete() {
  await AsyncStorage.setItem(GUEST_ONBOARDING_KEY, "true");
}

export async function getRecallHasAuthenticated() {
  const value = await AsyncStorage.getItem(HAS_AUTHENTICATED_KEY);
  return value === "true";
}

export async function setRecallHasAuthenticated() {
  await AsyncStorage.setItem(HAS_AUTHENTICATED_KEY, "true");
}

export async function getRecallOnboardingComplete(userId) {
  if (!userId) {
    return false;
  }

  const value = await AsyncStorage.getItem(getOnboardingKey(userId));
  return value === "true";
}

export async function setRecallOnboardingComplete(userId) {
  if (!userId) {
    return;
  }

  await AsyncStorage.setItem(getOnboardingKey(userId), "true");
}

export async function getRecallWhatsNextComplete(userId) {
  if (!userId) {
    return false;
  }

  const value = await AsyncStorage.getItem(getWhatsNextCompleteKey(userId));
  return value === "true";
}

export async function setRecallWhatsNextComplete(userId) {
  if (!userId) {
    return;
  }

  await AsyncStorage.multiSet([
    [getWhatsNextCompleteKey(userId), "true"],
    [getWhatsNextPendingKey(userId), "false"],
  ]);
}

export async function getRecallWhatsNextPending(userId) {
  if (!userId) {
    return false;
  }

  const value = await AsyncStorage.getItem(getWhatsNextPendingKey(userId));
  return value === "true";
}

export async function setRecallWhatsNextPending(userId) {
  if (!userId) {
    return;
  }

  const alreadyComplete = await getRecallWhatsNextComplete(userId);
  if (alreadyComplete) {
    return;
  }

  await AsyncStorage.setItem(getWhatsNextPendingKey(userId), "true");
}

export async function markRecallWhatsNextSignupIntent() {
  await AsyncStorage.setItem(WHATS_NEXT_SIGNUP_INTENT_KEY, "true");
}

export async function clearRecallWhatsNextSignupIntent() {
  await AsyncStorage.removeItem(WHATS_NEXT_SIGNUP_INTENT_KEY);
}

export async function consumeRecallWhatsNextSignupIntent() {
  const value = await AsyncStorage.getItem(WHATS_NEXT_SIGNUP_INTENT_KEY);
  if (value !== "true") {
    return false;
  }

  await AsyncStorage.removeItem(WHATS_NEXT_SIGNUP_INTENT_KEY);
  return true;
}

export async function shouldShowRecallWhatsNext(user) {
  const userId = typeof user === "string" ? user : user?.id;
  if (!userId) {
    return false;
  }

  const complete = await getRecallWhatsNextComplete(userId);
  if (complete) {
    await AsyncStorage.removeItem(WHATS_NEXT_SIGNUP_INTENT_KEY);
    return false;
  }

  const pending = await getRecallWhatsNextPending(userId);
  if (pending) {
    return true;
  }

  const signupIntent = await consumeRecallWhatsNextSignupIntent();
  if (signupIntent) {
    await setRecallWhatsNextPending(userId);
    return true;
  }

  const createdAt =
    typeof user === "object" && user?.created_at
      ? new Date(user.created_at).getTime()
      : 0;
  const isRecentSignup =
    createdAt > 0 && Date.now() - createdAt < 15 * 60 * 1000;

  if (isRecentSignup) {
    await setRecallWhatsNextPending(userId);
    return true;
  }

  return false;
}

export async function resetRecallOnboardingState(userId) {
  const keys = [GUEST_ONBOARDING_KEY, HAS_AUTHENTICATED_KEY, WHATS_NEXT_SIGNUP_INTENT_KEY];

  if (userId) {
    keys.push(
      getOnboardingKey(userId),
      getWhatsNextCompleteKey(userId),
      getWhatsNextPendingKey(userId),
    );
  }

  await AsyncStorage.multiRemove(keys);
}
