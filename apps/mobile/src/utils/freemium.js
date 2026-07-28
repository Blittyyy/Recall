import { isActiveReminderSchedule } from "./resurfacing";

export const PLAN_TIERS = {
  FREE: "free",
  PRO: "pro",
};

export const FREE_TIER_LIMITS = {
  savedVideos: 25,
  activeReminders: 3,
  collections: 3,
};

export const PAYWALL_TRIGGERS = {
  SAVE_VIDEO: "save-video",
  CREATE_REMINDER: "create-reminder",
  CREATE_COLLECTION: "create-collection",
  ADVANCED_RESURFACING: "advanced-resurfacing",
};

/**
 * Free v1.0 launch: paywalls and Pro prompts are fully off.
 * Set to true (and wire purchases) when Recall Pro ships.
 */
export function arePaywallsEnabled() {
  return false;
}

/**
 * Freemium save/reminder/collection limits.
 *
 * Only meaningful when paywalls are enabled. For free v1.0 this stays off
 * even if EXPO_PUBLIC_ENFORCE_FREEMIUM_LIMITS is set.
 */
export function areFreemiumLimitsEnforced() {
  return (
    arePaywallsEnabled() &&
    process.env.EXPO_PUBLIC_ENFORCE_FREEMIUM_LIMITS === "true"
  );
}

function isLimitPaywallTrigger(trigger) {
  return (
    trigger === PAYWALL_TRIGGERS.SAVE_VIDEO ||
    trigger === PAYWALL_TRIGGERS.CREATE_REMINDER ||
    trigger === PAYWALL_TRIGGERS.CREATE_COLLECTION
  );
}

function isProTier(tier) {
  return tier === PLAN_TIERS.PRO;
}

export function getFreemiumUsage({ videos = [], collections = [] } = {}) {
  const activeVideos = videos.filter((video) => !video.archived);
  const activeReminders = activeVideos.filter(
    (video) => video.reminderEnabled && isActiveReminderSchedule(video),
  );

  return {
    savedVideosCount: activeVideos.length,
    activeRemindersCount: activeReminders.length,
    collectionsCount: collections.length,
  };
}

export function canSaveVideo({
  tier = PLAN_TIERS.FREE,
  savedVideosCount = 0,
} = {}) {
  if (!areFreemiumLimitsEnforced()) {
    return true;
  }

  return isProTier(tier) || savedVideosCount < FREE_TIER_LIMITS.savedVideos;
}

export function canCreateReminder({
  tier = PLAN_TIERS.FREE,
  activeRemindersCount = 0,
} = {}) {
  if (!areFreemiumLimitsEnforced()) {
    return true;
  }

  return (
    isProTier(tier) ||
    activeRemindersCount < FREE_TIER_LIMITS.activeReminders
  );
}

export function canCreateCollection({
  tier = PLAN_TIERS.FREE,
  collectionsCount = 0,
} = {}) {
  if (!areFreemiumLimitsEnforced()) {
    return true;
  }

  return isProTier(tier) || collectionsCount < FREE_TIER_LIMITS.collections;
}

export function shouldShowPaywall({
  trigger,
  tier = PLAN_TIERS.FREE,
  savedVideosCount = 0,
  activeRemindersCount = 0,
  collectionsCount = 0,
} = {}) {
  if (!arePaywallsEnabled()) {
    return false;
  }

  if (isProTier(tier)) {
    return false;
  }

  // When paywalls are on but limits are soft: never block saves/reminders/collections.
  if (!areFreemiumLimitsEnforced() && isLimitPaywallTrigger(trigger)) {
    return false;
  }

  if (trigger === PAYWALL_TRIGGERS.SAVE_VIDEO) {
    return !canSaveVideo({ tier, savedVideosCount });
  }

  if (trigger === PAYWALL_TRIGGERS.CREATE_REMINDER) {
    return !canCreateReminder({ tier, activeRemindersCount });
  }

  if (trigger === PAYWALL_TRIGGERS.CREATE_COLLECTION) {
    return !canCreateCollection({ tier, collectionsCount });
  }

  if (trigger === PAYWALL_TRIGGERS.ADVANCED_RESURFACING) {
    return true;
  }

  return false;
}
