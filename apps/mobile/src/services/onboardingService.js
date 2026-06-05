import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_ONBOARDING_KEY = "recall-onboarding-complete:guest";
const HAS_AUTHENTICATED_KEY = "recall-has-authenticated";

function getOnboardingKey(userId) {
  return `recall-onboarding-complete:${userId}`;
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

export async function resetRecallOnboardingState(userId) {
  const keys = [GUEST_ONBOARDING_KEY, HAS_AUTHENTICATED_KEY];

  if (userId) {
    keys.push(getOnboardingKey(userId));
  }

  await AsyncStorage.multiRemove(keys);
}
