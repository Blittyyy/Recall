/**
 * Recall resurfacing helpers.
 * Pure functions only: no store writes, no navigation, no backend calls.
 */
import { CATEGORY_META } from "../store/useRecallStore";

const DAY_MS = 86_400_000;
const MIN_REVISIT_DAYS = 14;
const RECENT_OPEN_DAYS = 7;
const DISMISS_DAYS = 14;

const PROMPTS = [
  "Still interested?",
  "Worth another look?",
  "You saved this for later",
  "Still want to revisit this?",
];

export function daysAgoFromISO(isoString) {
  if (!isoString) return Infinity;
  const time = new Date(isoString).getTime();
  if (Number.isNaN(time)) return Infinity;
  return Math.floor((Date.now() - time) / DAY_MS);
}

export function weeksAgoFromISO(isoString) {
  return Math.round(daysAgoFromISO(isoString) / 7);
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
  const weeks = weeksAgoFromISO(savedAt);
  if (weeks < 1) return "a few days ago";
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const m = Math.round(weeks / 4);
  return `${m} month${m !== 1 ? "s" : ""} ago`;
}

export function getWorthRevisitingVideos(videos, limit = 4) {
  const categoryCounts = getCategoryCounts(videos);

  return videos
    .filter((video) => isWorthRevisiting(video))
    .map((video) => ({
      video,
      score: getResurfacingScore(video, categoryCounts),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ video }) => video);
}

export function getRecentlySavedVideos(videos, withinDays = 7) {
  return videos
    .filter((video) => !video.archived && daysAgoFromISO(video.savedAt) <= withinDays)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

export function getScheduledReminderVideos(videos) {
  return videos
    .filter((video) => !video.archived && video.hasReminder)
    .sort((a, b) => {
      if (a.reminderEnabled !== b.reminderEnabled) {
        return a.reminderEnabled ? -1 : 1;
      }
      return String(a.reminderTime ?? "").localeCompare(String(b.reminderTime ?? ""));
    });
}

export function getFromYourSavesVideos(videos, limit = 12) {
  const worthIds = new Set(getWorthRevisitingVideos(videos, 6).map((v) => v.id));
  const reminderIds = new Set(
    getScheduledReminderVideos(videos)
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
  const frequency = video.reminderFrequency;
  const day = now.getDay();
  if (!frequency || frequency === "Daily") return true;
  if (frequency === "Weekdays") return day >= 1 && day <= 5;
  if (frequency === "Weekly") {
    return daysAgoFromISO(video.lastOpenedAt ?? video.savedAt) >= 7;
  }
  if (frequency === "Custom") {
    return (video.reminderDays ?? []).includes(day);
  }
  return day === 1 || day === 3 || day === 5;
}

export function getDismissedUntilDate() {
  return new Date(Date.now() + DISMISS_DAYS * DAY_MS).toISOString();
}

function isWorthRevisiting(video) {
  if (video.archived) return false;
  if (daysAgoFromISO(video.savedAt) < MIN_REVISIT_DAYS) return false;
  if (video.lastOpenedAt && daysAgoFromISO(video.lastOpenedAt) < RECENT_OPEN_DAYS) {
    return false;
  }
  if (isDismissed(video)) return false;
  return true;
}

function isDismissed(video) {
  if (!video.dismissedFromResurfacingUntil) return false;
  return new Date(video.dismissedFromResurfacingUntil).getTime() > Date.now();
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
}) {
  const meta = getCategoryMeta(category);
  const PLATFORM_DISPLAY = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
  };
  const displayPlatform = PLATFORM_DISPLAY[platform] ?? platform;

  const PLATFORM_TITLE = {
    tiktok: "Saved TikTok Video",
    instagram: "Saved Instagram Reel",
    youtube: "Saved YouTube Video",
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
    hasReminder: reminderEnabled,
    reminderEnabled,
    reminderTime: reminderEnabled ? reminderTime : null,
    reminderFrequency: reminderEnabled ? reminderFrequency : null,
    reminderDays: reminderEnabled ? reminderDays : [],
    revisitCount: 0,
    archived: false,
  };
}
