import AsyncStorage from "@react-native-async-storage/async-storage";

const PASSWORD_RECOVERY_PENDING_KEY = "recall-password-recovery-pending";

let pending = false;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener(pending);
    } catch (_error) {
      // Ignore listener failures.
    }
  });
}

export function getPasswordRecoveryPending() {
  return pending;
}

export function subscribePasswordRecoveryPending(listener) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydratePasswordRecoveryPending() {
  const value = await AsyncStorage.getItem(PASSWORD_RECOVERY_PENDING_KEY);
  pending = value === "true";
  emit();
  return pending;
}

export async function setPasswordRecoveryPending(nextPending) {
  pending = Boolean(nextPending);
  if (pending) {
    await AsyncStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, "true");
  } else {
    await AsyncStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
  }
  emit();
}
