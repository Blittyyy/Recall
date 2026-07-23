/**
 * Recall resurfacing helpers.
 * Pure functions only: no store writes, no navigation, no backend calls.
 */
import { CATEGORY_META } from "../store/useRecallStore";

const DAY_MS = 86_400_000;
const MIN_REVISIT_DAYS = 14;
const RECENT_OPEN_DAYS = 7;
const DISMISS_DAYS = 14;
export const HOME_WORTH_REVISITING_LIMIT = 5;
export const HOME_WORTH_REVISITING_HOURS = 24;
const HOME_WORTH_REVISITING_COOLDOWN_DAYS = 7;
const HOME_WORTH_REVISITING_MS = HOME_WORTH_REVISITING_HOURS * 3_600_000;

const PROMPTS = [
  "Still interested?",
  "Worth another look?",
  "You saved this for later",
  "Still want to revisit this?",
];

export function daysAgoFromISO(isoString) {
  if (!isoString) return Infinity;
  const saved = new Date(isoString);
  if (Number.isNaN(saved.getTime())) return Infinity;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const savedDay = new Date(saved);
  savedDay.setHours(0, 0, 0, 0);

  return Math.floor((today.getTime() - savedDay.getTime()) / DAY_MS);
}

export function weeksAgoFromISO(isoString) {
  return Math.floor(daysAgoFromISO(isoString) / 7);
}

export function getResurfacingPrompt(savedAt) {
  const weeks = weeksAgoFromISO(savedAt);
  return PROMPTS[weeks % PROMPTS.length];
}

export function getSavedTimeLabel(savedAt) {
  const days = daysAgoFromISO(savedAt);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const w = Math.round(days / 7);
  if (w < 5) return `${w}w ago`;
  const m = Math.round(days / 30);
  return `${m} month${m !== 1 ? "s" : ""} ago`;
}

export function getSavedWeeksLabel(savedAt) {
  const days = daysAgoFromISO(savedAt);
  if (!Number.isFinite(days) || days === Infinity) return "recently";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function getWorthRevisitingVideos(videos, limit = HOME_WORTH_REVISITING_LIMIT) {
  return getAllWorthRevisitingVideos(videos).slice(0, limit);
}

export function getAllWorthRevisitingVideos(videos) {
  const categoryCounts = getCategoryCounts(videos);

  return videos
    .filter((video) => isWorthRevisiting(video))
    .map((video) => ({
      video,
      score: getResurfacingScore(video, categoryCounts),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ video }) => video);
}

export function getWorthRevisitingCount(videos) {
  return getAllWorthRevisitingVideos(videos).length;
}

export function hasExpiredHomeWorthRevisitingDisplay(
  video,
  nowMs = Date.now(),
) {
  if (!video.shownInWorthRevisitingAt) return false;
  const shownAt = new Date(video.shownInWorthRevisitingAt).getTime();
  if (Number.isNaN(shownAt)) return false;
  return nowMs - shownAt >= HOME_WORTH_REVISITING_MS;
}

export function getHomeWorthRevisitingVideosNeedingExpiry(videos) {
  return videos.filter((video) => hasExpiredHomeWorthRevisitingDisplay(video));
}

export function getHomeWorthRevisitingVideos(
  videos,
  limit = HOME_WORTH_REVISITING_LIMIT,
) {
  const categoryCounts = getCategoryCounts(videos);
  const eligible = videos.filter((video) => isEligibleForHomeWorthRevisiting(video));

  const inRotation = eligible
    .filter(
      (video) =>
        video.shownInWorthRevisitingAt &&
        !hasExpiredHomeWorthRevisitingDisplay(video),
    )
    .sort(
      (a, b) =>
        new Date(a.shownInWorthRevisitingAt).getTime() -
        new Date(b.shownInWorthRevisitingAt).getTime(),
    );

  const inRotationIds = new Set(inRotation.map((video) => video.id));
  const freshCandidates = eligible
    .filter((video) => !inRotationIds.has(video.id))
    .map((video) => ({
      video,
      score: getResurfacingScore(video, categoryCounts),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ video }) => video);

  return [...inRotation, ...freshCandidates].slice(0, limit);
}

export function getRecentlySavedVideos(videos, withinDays = 7) {
  return videos
    .filter((video) => !video.archived && daysAgoFromISO(video.savedAt) <= withinDays)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

function parseReminderClock(value) {
  if (!value) return { hour: 7, minute: 0 };

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    const [hourString = "7", minuteString = "00"] = text.split(":");
    return {
      hour: Math.min(23, Math.max(0, Number(hourString) || 7)),
      minute: Math.min(59, Math.max(0, Number(minuteString) || 0)),
    };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return { hour, minute };
}

function setClockOnDate(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function getStartOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameCalendarDay(a, b) {
  return getStartOfDay(a).getTime() === getStartOfDay(b).getTime();
}

function getNextDailyOccurrence(hour, minute, now = new Date()) {
  const todayAtTime = setClockOnDate(now, hour, minute);
  if (todayAtTime.getTime() > now.getTime()) {
    return todayAtTime;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setClockOnDate(tomorrow, hour, minute);
}

function getNextWeeklyOccurrence(day, hour, minute, now = new Date()) {
  const currentDay = now.getDay();
  const normalizedTargetDay = Number(day);
  const candidate = new Date(now);
  const daysUntilTarget = (normalizedTargetDay - currentDay + 7) % 7;

  candidate.setDate(candidate.getDate() + daysUntilTarget);
  candidate.setHours(hour, minute, 0, 0);

  if (candidate.getTime() > now.getTime()) {
    return candidate;
  }

  candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

export function isOnceReminderCompleted(video, now = new Date()) {
  if (video?.reminderFrequency !== "Once") return false;
  if (video.onceReminderCompletedAt) return true;
  if (video.onceReminderScheduledFireAt) {
    return (
      new Date(video.onceReminderScheduledFireAt).getTime() <= now.getTime()
    );
  }
  return false;
}

export function isActiveReminderSchedule(video, now = new Date()) {
  if (!video?.hasReminder || video.archived) return false;
  if (isOnceReminderCompleted(video, now)) return false;
  return true;
}

function getRecurringReminderDays(video, now) {
  const frequency = video.reminderFrequency ?? "Daily";
  const selectedDays = Array.isArray(video.reminderDays)
    ? video.reminderDays
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];

  if (frequency === "Weekdays") return [1, 2, 3, 4, 5];
  if (frequency === "3x/week") {
    return selectedDays.length === 3 ? selectedDays : [1, 3, 5];
  }
  if (frequency === "Custom") {
    return selectedDays.length > 0 ? [...new Set(selectedDays)] : [now.getDay()];
  }
  if (frequency === "Weekly") {
    return selectedDays.length > 0 ? [selectedDays[0]] : [now.getDay()];
  }

  return [];
}

export function getNextReminderDate(video, now = new Date()) {
  if (!video?.reminderTime || video.archived) return null;

  const frequency = video.reminderFrequency ?? "Daily";
  const { hour, minute } = parseReminderClock(video.reminderTime);

  if (frequency === "Once") {
    if (isOnceReminderCompleted(video, now)) return null;

    if (video.onceReminderScheduledFireAt) {
      const scheduled = new Date(video.onceReminderScheduledFireAt);
      if (
        !Number.isNaN(scheduled.getTime()) &&
        scheduled.getTime() > now.getTime()
      ) {
        return scheduled;
      }
      return null;
    }

    return getNextDailyOccurrence(hour, minute, now);
  }

  if (frequency === "Daily") {
    return getNextDailyOccurrence(hour, minute, now);
  }

  const scheduledDays = getRecurringReminderDays(video, now);
  if (scheduledDays.length === 0) return null;

  return scheduledDays
    .map((day) => getNextWeeklyOccurrence(day, hour, minute, now))
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

const REMINDER_WEEKDAY_NAMES = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const REMINDER_WEEKDAY_ABBREVS = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function formatDisplayReminderTime(value) {
  const { hour, minute } = parseReminderClock(value);
  const date = new Date(2026, 0, 1, hour, minute);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOnceScheduleLabel(video, now = new Date()) {
  const time = formatDisplayReminderTime(video?.reminderTime);
  const nextDate = getNextReminderDate(video, now);

  if (!nextDate) {
    return `Once • ${time}`;
  }

  const daysAway = Math.round(
    (getStartOfDay(nextDate).getTime() - getStartOfDay(now).getTime()) / DAY_MS,
  );

  if (daysAway <= 0) return `Today • ${time}`;
  if (daysAway === 1) return `Tomorrow • ${time}`;
  if (daysAway <= 7) {
    return `${nextDate.toLocaleDateString([], { weekday: "short" })} • ${time}`;
  }

  return `${nextDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} • ${time}`;
}

export function formatReminderScheduleLabel(video, now = new Date()) {
  const frequency = video?.reminderFrequency ?? "Daily";
  const time = formatDisplayReminderTime(video?.reminderTime);

  if (frequency === "Once") {
    return formatOnceScheduleLabel(video, now);
  }
  if (frequency === "Daily") return `Daily • ${time}`;
  if (frequency === "Weekdays") return `Weekdays • ${time}`;

  const days = getRecurringReminderDays(video, now);

  if (frequency === "Weekly") {
    const dayName = REMINDER_WEEKDAY_NAMES[days[0]] ?? "Day";
    return `${dayName} • ${time}`;
  }

  if (frequency === "3x/week" || frequency === "Custom") {
    const dayPart = days
      .map((day) => REMINDER_WEEKDAY_ABBREVS[day] ?? "Day")
      .join(" • ");
    return `${dayPart} • ${time}`;
  }

  return `${frequency} • ${time}`;
}

export function getScheduledReminderVideos(videos, now = new Date()) {
  return videos
    .filter((video) => !video.archived && video.hasReminder)
    .filter((video) => isActiveReminderSchedule(video, now))
    .sort((a, b) => {
      if (a.reminderEnabled !== b.reminderEnabled) {
        return a.reminderEnabled ? -1 : 1;
      }
      return String(a.reminderTime ?? "").localeCompare(String(b.reminderTime ?? ""));
    });
}

export function getFromYourSavesVideos(videos, limit = 12) {
  const now = new Date();
  const worthIds = new Set(getWorthRevisitingVideos(videos, 6).map((v) => v.id));
  const reminderIds = new Set(
    getScheduledReminderVideos(videos, now)
      .filter((v) => v.reminderEnabled)
      .map((v) => v.id),
  );

  return videos
    .filter((video) => !video.archived)
    .filter((video) => !worthIds.has(video.id))
    .filter((video) => !reminderIds.has(video.id))
    .sort((a, b) => {
      const aOpened = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
      const bOpened = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
      return aOpened - bOpened || new Date(b.savedAt) - new Date(a.savedAt);
    })
    .slice(0, limit);
}

export function getReminderVideos(videos) {
  return getScheduledReminderVideos(videos);
}

export function getCategoryMeta(categoryId) {
  if (CATEGORY_META[categoryId]) {
    return CATEGORY_META[categoryId];
  }

  if (categoryId === "entertainment") {
    return {
      emoji: "🎬",
      label: "Entertainment",
      thumbnail:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=700&auto=format&fit=crop",
    };
  }

  if (typeof categoryId === "string" && categoryId.trim()) {
    return {
      ...CATEGORY_META.other,
      label: toCategoryLabel(categoryId),
    };
  }

  return CATEGORY_META.other;
}

function toCategoryLabel(categoryId) {
  return categoryId
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getPlatformLabel(platform) {
  return platform;
}

export function isReminderDueToday(video, now = new Date()) {
  if (!video.reminderEnabled) return false;
  if (!isActiveReminderSchedule(video, now)) return false;

  const nextDate = getNextReminderDate(video, now);
  if (!nextDate) return false;

  return isSameCalendarDay(nextDate, now);
}

export function getDismissedUntilDate() {
  return new Date(Date.now() + DISMISS_DAYS * DAY_MS).toISOString();
}

function isWorthRevisiting(video) {
  if (video.archived) return false;
  if (video.reminderEnabled && isActiveReminderSchedule(video)) return false;
  const devOverride =
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    !!video.devWorthRevisitingOverride;
  if (!devOverride && daysAgoFromISO(video.savedAt) < MIN_REVISIT_DAYS) {
    return false;
  }
  if (video.lastOpenedAt && daysAgoFromISO(video.lastOpenedAt) < RECENT_OPEN_DAYS) {
    return false;
  }
  if (isDismissed(video)) return false;
  return true;
}

export function isWorthRevisitingEligible(video) {
  return isWorthRevisiting(video);
}

function isDismissed(video) {
  if (!video.dismissedFromResurfacingUntil) return false;
  return new Date(video.dismissedFromResurfacingUntil).getTime() > Date.now();
}

function isHomeWorthRevisitingCooldown(video) {
  if (!video.worthRevisitingHomeExpiredAt) return false;
  return (
    daysAgoFromISO(video.worthRevisitingHomeExpiredAt) <
    HOME_WORTH_REVISITING_COOLDOWN_DAYS
  );
}

function isEligibleForHomeWorthRevisiting(video) {
  if (!isWorthRevisiting(video)) return false;
  if (isHomeWorthRevisitingCooldown(video)) return false;
  if (hasExpiredHomeWorthRevisitingDisplay(video)) return false;
  return true;
}

function getResurfacingScore(video, categoryCounts) {
  const savedDays = daysAgoFromISO(video.savedAt);
  const lastOpenedDays = daysAgoFromISO(video.lastOpenedAt);
  let score = 0;

  if (savedDays > 30 && !video.lastOpenedAt) score += 1000;
  if (savedDays >= 14 && !video.lastOpenedAt) score += 700;
  if (savedDays > 30 && video.lastOpenedAt && lastOpenedDays > RECENT_OPEN_DAYS) {
    score += 520;
  }
  score += Math.min(savedDays, 90) * 3;
  score += (categoryCounts[video.category] ?? 0) > 1 ? 90 : 0;
  score -= video.reminderEnabled ? 180 : 0;
  score -= video.lastOpenedAt ? Math.max(0, 90 - lastOpenedDays * 8) : 0;

  return score;
}

function getCategoryCounts(videos) {
  return videos.reduce((counts, video) => {
    if (!video.archived) {
      counts[video.category] = (counts[video.category] ?? 0) + 1;
    }
    return counts;
  }, {});
}

export function createMockVideo({
  videoUrl,
  platform,
  title,
  creator,
  category,
  collections,
  thumbnailUrl,
  reminderEnabled,
  reminderTime,
  reminderFrequency,
  reminderDays = [],
  reminderFollowUpDelayMinutes = null,
}) {
  const meta = getCategoryMeta(category);
  const PLATFORM_DISPLAY = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    amazon: "Amazon",
    web: "Web",
  };
  const displayPlatform = PLATFORM_DISPLAY[platform] ?? platform;

  const PLATFORM_TITLE = {
    tiktok: "Saved TikTok Video",
    instagram: "Saved Instagram Reel",
    youtube: "Saved YouTube Video",
    amazon: "Amazon Product",
    web: "Saved Webpage",
  };

  return {
    id: `user_${Date.now()}`,
    title: title?.trim() || PLATFORM_TITLE[platform] || "Saved Video",
    creator: creator?.trim() || "Unknown creator",
    platform: displayPlatform,
    videoUrl,
    thumbnailUrl: thumbnailUrl ?? meta.thumbnail,
    category,
    collections: collections ?? [],
    savedAt: new Date().toISOString(),
    lastOpenedAt: null,
    dismissedFromResurfacingUntil: null,
    shownInWorthRevisitingAt: null,
    worthRevisitingHomeExpiredAt: null,
    hasReminder: reminderEnabled,
    reminderEnabled,
    reminderTime: reminderEnabled ? reminderTime : null,
    reminderFrequency: reminderEnabled ? reminderFrequency : null,
    reminderDays: reminderEnabled ? reminderDays : [],
    reminderFollowUpDelayMinutes: reminderEnabled
      ? reminderFollowUpDelayMinutes ?? null
      : null,
    revisitCount: 0,
    archived: false,
  };
}
