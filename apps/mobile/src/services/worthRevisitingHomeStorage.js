import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@recall/worth_revisiting_home";

export async function loadWorthRevisitingHomeMeta() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function persistWorthRevisitingHomeMeta(meta) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export async function setWorthRevisitingHomeShown(videoId, shownAt) {
  const meta = await loadWorthRevisitingHomeMeta();
  meta[videoId] = {
    ...(meta[videoId] ?? {}),
    shownAt,
    expiredAt: null,
  };
  await persistWorthRevisitingHomeMeta(meta);
}

export async function clearWorthRevisitingHomeEntry(videoId) {
  const meta = await loadWorthRevisitingHomeMeta();
  delete meta[videoId];
  await persistWorthRevisitingHomeMeta(meta);
}

export async function markWorthRevisitingHomeExpired(videoId, expiredAt) {
  const meta = await loadWorthRevisitingHomeMeta();
  meta[videoId] = {
    shownAt: null,
    expiredAt: expiredAt ?? new Date().toISOString(),
  };
  await persistWorthRevisitingHomeMeta(meta);
}
