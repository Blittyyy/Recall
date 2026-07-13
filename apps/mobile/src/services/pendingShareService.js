import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_SHARE_URL_KEY = "recall-pending-share-url";

export async function getPendingShareUrl() {
  const value = await AsyncStorage.getItem(PENDING_SHARE_URL_KEY);
  return value?.trim() || null;
}

export async function setPendingShareUrl(url) {
  const trimmed = url?.trim();
  if (!trimmed) {
    await clearPendingShareUrl();
    return;
  }

  await AsyncStorage.setItem(PENDING_SHARE_URL_KEY, trimmed);
}

export async function clearPendingShareUrl() {
  await AsyncStorage.removeItem(PENDING_SHARE_URL_KEY);
}
