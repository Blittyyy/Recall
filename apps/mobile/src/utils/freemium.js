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

function isProTier(tier) {
  return tier === PLAN_TIERS.PRO;
}

export function getFreemiumUsage({ videos = [], collections = [] } = {}) {
  const activeVideos = videos.filter((video) => !video.archived);
  const activeReminders = activeVideos.filter((video) => video.reminderEnabled);

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
  return isProTier(tier) || savedVideosCount < FREE_TIER_LIMITS.savedVideos;
}

export function canCreateReminder({
  tier = PLAN_TIERS.FREE,
  activeRemindersCount = 0,
} = {}) {
  return (
    isProTier(tier) ||
    activeRemindersCount < FREE_TIER_LIMITS.activeReminders
  );
}

export function canCreateCollection({
  tier = PLAN_TIERS.FREE,
  collectionsCount = 0,
} = {}) {
  return isProTier(tier) || collectionsCount < FREE_TIER_LIMITS.collections;
}

export function shouldShowPaywall({
  trigger,
  tier = PLAN_TIERS.FREE,
  savedVideosCount = 0,
  activeRemindersCount = 0,
  collectionsCount = 0,
} = {}) {
  if (isProTier(tier)) {
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
