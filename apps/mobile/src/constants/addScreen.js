import { RECALL_COLORS } from "./recallTheme";

export const WHITE = RECALL_COLORS.surface;
export const BLACK = RECALL_COLORS.text;
export const BG = RECALL_COLORS.background;
export const GREY_TEXT = RECALL_COLORS.secondaryText;
export const GREY_LIGHT = RECALL_COLORS.subtle;
export const GREY_MID = RECALL_COLORS.mid;
export const GREEN = "#34C759";
export const RED = "#FF3B30";

export const CATEGORIES = [
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "wellness", label: "Wellness", emoji: "🌿" },
  { id: "cooking", label: "Cooking", emoji: "🍳" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "productivity", label: "Focus", emoji: "⚡" },
  { id: "learn", label: "Learning", emoji: "📚" },
  { id: "style", label: "Style", emoji: "👗" },
  { id: "other", label: "Other", emoji: "✨" },
];

export const REMINDER_TIMES = [
  "06:00 AM",
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "12:00 PM",
  "05:00 PM",
  "07:00 PM",
  "09:00 PM",
];

export const REMINDER_FREQUENCIES = [
  "Daily",
  "Weekdays",
  "Weekly",
  "3x/week",
  "Custom",
];

export const REMINDER_DAY_OPTIONS = [
  { id: 1, label: "M" },
  { id: 2, label: "T" },
  { id: 3, label: "W" },
  { id: 4, label: "T" },
  { id: 5, label: "F" },
  { id: 6, label: "S" },
  { id: 0, label: "S" },
];

export const SAVE_COLLECTIONS = [
  { id: "c1", name: "Recipes to Try", emoji: "🍳" },
  { id: "c2", name: "Gym Warmups", emoji: "💪" },
  { id: "c3", name: "Morning Routine", emoji: "🌅" },
  { id: "c4", name: "Iceland Trip", emoji: "🧊" },
  { id: "c5", name: "Date Night Ideas", emoji: "🕯️" },
  { id: "c6", name: "Watch Later", emoji: "📌" },
];

export const MOCK_PREVIEW = {
  tiktok: {
    platform: "TikTok",
    thumbnail:
      "https://images.unsplash.com/photo-1607962837359-5e7e89f86776?q=80&w=600&auto=format&fit=crop",
    title: "Saved TikTok Video",
    creator: "Unknown creator",
    duration: null,
  },
  instagram: {
    platform: "Instagram",
    thumbnail:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop",
    title: "Saved Instagram Reel",
    creator: "Unknown creator",
    duration: null,
  },
  youtube: {
    platform: "YouTube",
    thumbnail:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop",
    title: "Saved YouTube Video",
    creator: "Unknown creator",
    duration: null,
  },
};

export const COLLECTION_EMOJIS = [
  "📌",
  "🍳",
  "💪",
  "🌅",
  "✈️",
  "🧊",
  "🕯️",
  "📚",
  "🎯",
  "🌿",
  "⚡",
  "🎬",
  "🏠",
  "🎵",
  "💡",
];
