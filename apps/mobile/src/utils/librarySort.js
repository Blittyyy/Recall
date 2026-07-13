import { getDisplayTitle } from "./titleHelpers";
import { isActiveReminderSchedule } from "./resurfacing";

export const LIBRARY_SORT_NEWEST_SAVED = "newest_saved";

export const LIBRARY_SORT_OPTIONS = [
  { id: LIBRARY_SORT_NEWEST_SAVED, label: "Newest saved" },
  { id: "oldest_saved", label: "Oldest saved" },
  { id: "recently_opened", label: "Recently opened" },
  { id: "most_revisited", label: "Most revisited" },
  { id: "reminder_time", label: "Reminder time" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "platform", label: "Platform" },
];

let sessionLibrarySort = LIBRARY_SORT_NEWEST_SAVED;

export function getSessionLibrarySort() {
  return sessionLibrarySort;
}

export function setSessionLibrarySort(sortId) {
  sessionLibrarySort = sortId;
}

function safeTimestamp(iso) {
  if (!iso) {
    return null;
  }

  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
}

function parseReminderMinutes(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  if (period === "PM" && hour < 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

function compareNewestSaved(a, b) {
  const aTime = safeTimestamp(a.savedAt) ?? 0;
  const bTime = safeTimestamp(b.savedAt) ?? 0;
  return bTime - aTime;
}

function compareOldestSaved(a, b) {
  const aTime = safeTimestamp(a.savedAt) ?? Number.MAX_SAFE_INTEGER;
  const bTime = safeTimestamp(b.savedAt) ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function compareRecentlyOpened(a, b) {
  const aTime = safeTimestamp(a.lastOpenedAt);
  const bTime = safeTimestamp(b.lastOpenedAt);

  if (aTime === null && bTime === null) {
    return compareNewestSaved(a, b);
  }
  if (aTime === null) {
    return 1;
  }
  if (bTime === null) {
    return -1;
  }

  return bTime - aTime;
}

function compareMostRevisited(a, b) {
  const aCount = a.revisitCount ?? 0;
  const bCount = b.revisitCount ?? 0;

  if (bCount !== aCount) {
    return bCount - aCount;
  }

  return compareNewestSaved(a, b);
}

function hasActiveReminder(video) {
  return !!(video?.reminderEnabled && isActiveReminderSchedule(video));
}

function compareReminderTime(a, b) {
  const aHasReminder = hasActiveReminder(a);
  const bHasReminder = hasActiveReminder(b);

  if (aHasReminder && !bHasReminder) {
    return -1;
  }
  if (!aHasReminder && bHasReminder) {
    return 1;
  }
  if (!aHasReminder && !bHasReminder) {
    return compareNewestSaved(a, b);
  }

  const aMinutes = parseReminderMinutes(a.reminderTime) ?? Number.MAX_SAFE_INTEGER;
  const bMinutes = parseReminderMinutes(b.reminderTime) ?? Number.MAX_SAFE_INTEGER;

  if (aMinutes !== bMinutes) {
    return aMinutes - bMinutes;
  }

  return compareNewestSaved(a, b);
}

function compareAlphabetical(a, b) {
  const aTitle = getDisplayTitle(a.title ?? "", "").toLowerCase();
  const bTitle = getDisplayTitle(b.title ?? "", "").toLowerCase();
  return aTitle.localeCompare(bTitle);
}

function platformRank(platform) {
  const key = String(platform ?? "")
    .trim()
    .toLowerCase();

  if (key.includes("youtube")) {
    return 0;
  }
  if (key.includes("tiktok")) {
    return 1;
  }
  if (key.includes("instagram")) {
    return 2;
  }

  return 99;
}

function comparePlatform(a, b) {
  const aRank = platformRank(a.platform);
  const bRank = platformRank(b.platform);

  if (aRank !== bRank) {
    return aRank - bRank;
  }

  return compareAlphabetical(a, b);
}

const COMPARATORS = {
  [LIBRARY_SORT_NEWEST_SAVED]: compareNewestSaved,
  oldest_saved: compareOldestSaved,
  recently_opened: compareRecentlyOpened,
  most_revisited: compareMostRevisited,
  reminder_time: compareReminderTime,
  alphabetical: compareAlphabetical,
  platform: comparePlatform,
};

export function sortLibraryVideos(videos, sortId = sessionLibrarySort) {
  const compare = COMPARATORS[sortId] ?? compareNewestSaved;
  return [...videos].sort(compare);
}
