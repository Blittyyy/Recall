import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@recall/dev_worth_revisiting_override";

export async function loadDevWorthRevisitingOverrides() {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return {};
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function setDevWorthRevisitingOverride(videoId, enabled = true) {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  const overrides = await loadDevWorthRevisitingOverrides();
  if (enabled) {
    overrides[videoId] = true;
  } else {
    delete overrides[videoId];
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export async function clearDevWorthRevisitingOverride(videoId) {
  await setDevWorthRevisitingOverride(videoId, false);
}
