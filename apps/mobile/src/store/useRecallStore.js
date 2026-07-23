import { create } from "zustand";
import {
  ensureRecallProfile,
  getFriendlySupabaseError,
  hasSupabaseEnv,
} from "../services/supabaseClient";
import {
  archiveSavedVideo,
  createSavedVideo,
  deleteSavedVideo,
  fetchSavedVideos,
  updateSavedVideo,
} from "../services/videoService";
import {
  createCollection as createCollectionRecord,
  deleteCollection as deleteCollectionRecord,
  fetchCollections,
  removeVideoFromCollection as removeVideoFromCollectionRecord,
  replaceVideoCollections,
  updateCollection as updateCollectionRecord,
} from "../services/collectionService";
import {
  deleteReminder as deleteReminderRecord,
  fetchReminders,
  upsertReminder,
} from "../services/reminderService";
import {
  cancelFollowUpReminderNotificationsForVideo,
  clearOnceReminderCompleted,
  clearReminderFollowUpDelayForVideo,
  cancelReminderNotificationsForVideo,
  getNotificationPermissionStatus,
  getOnceReminderCompletedMap,
  getOnceReminderScheduleMap,
  getReminderFollowUpPreferences,
  markOnceReminderCompleted,
  resyncReminderNotifications,
  setReminderFollowUpDelayForVideo,
  syncOnceReminderCompletionState,
  syncReminderNotificationForVideo,
} from "../services/recallNotifications";
import {
  toAnalyticsPlatform,
  toReminderType,
  trackEvent,
} from "../services/analytics";
import {
  clearWorthRevisitingHomeEntry,
  loadWorthRevisitingHomeMeta,
  markWorthRevisitingHomeExpired,
  setWorthRevisitingHomeShown,
} from "../services/worthRevisitingHomeStorage";
import {
  loadDevWorthRevisitingOverrides,
  setDevWorthRevisitingOverride,
} from "../services/worthRevisitingDevStorage";
import { usePaywallStore } from "./usePaywallStore";
import {
  getFreemiumUsage,
  PAYWALL_TRIGGERS,
  shouldShowPaywall,
} from "../utils/freemium";
import { normalizeVideoUrlForSave } from "../utils/urlHelpers";

export const CATEGORY_META = {
  fitness: {
    emoji: "💪",
    label: "Fitness",
    thumbnail:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=700&auto=format&fit=crop",
  },
  wellness: {
    emoji: "🌿",
    label: "Wellness",
    thumbnail:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=700&auto=format&fit=crop",
  },
  cooking: {
    emoji: "🍳",
    label: "Cooking",
    thumbnail:
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=700&auto=format&fit=crop",
  },
  travel: {
    emoji: "✈️",
    label: "Travel",
    thumbnail:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=700&auto=format&fit=crop",
  },
  productivity: {
    emoji: "⚡",
    label: "Focus",
    thumbnail:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=700&auto=format&fit=crop",
  },
  learn: {
    emoji: "📚",
    label: "Learning",
    thumbnail:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=700&auto=format&fit=crop",
  },
  style: {
    emoji: "👗",
    label: "Style",
    thumbnail:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=700&auto=format&fit=crop",
  },
  other: {
    emoji: "✨",
    label: "Other",
    thumbnail:
      "https://images.unsplash.com/photo-1607962837359-5e7e89f86776?q=80&w=700&auto=format&fit=crop",
  },
};

const EMPTY_AUTH_CONTEXT = {
  user: null,
  userId: null,
  accessToken: null,
};

const REMINDER_FIELDS = [
  "hasReminder",
  "reminderEnabled",
  "reminderTime",
  "reminderFrequency",
  "reminderDays",
  "reminderTimezone",
  "reminderFollowUpDelayMinutes",
];

const nowIso = () => new Date().toISOString();
const plusDaysIso = (days) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const withDefaults = (video) => ({
  collections: video.collections ?? [],
  dismissedFromResurfacingUntil: video.dismissedFromResurfacingUntil ?? null,
  shownInWorthRevisitingAt: video.shownInWorthRevisitingAt ?? null,
  worthRevisitingHomeExpiredAt: video.worthRevisitingHomeExpiredAt ?? null,
  devWorthRevisitingOverride: video.devWorthRevisitingOverride ?? false,
  hasReminder: video.hasReminder ?? false,
  reminderEnabled: video.reminderEnabled ?? false,
  reminderTime: video.reminderTime ?? null,
  reminderFrequency: video.reminderFrequency ?? null,
  reminderDays: video.reminderDays ?? [],
  reminderId: video.reminderId ?? null,
  reminderTimezone: video.reminderTimezone ?? null,
  reminderFollowUpDelayMinutes: video.reminderFollowUpDelayMinutes ?? null,
  onceReminderCompletedAt: video.onceReminderCompletedAt ?? null,
  onceReminderScheduledFireAt: video.onceReminderScheduledFireAt ?? null,
  revisitCount: video.revisitCount ?? 0,
  archived: video.archived ?? false,
  availabilityStatus: video.availabilityStatus ?? null,
  creator: video.creator ?? "Unknown creator",
  title: video.title ?? "Saved Video",
  thumbnailUrl:
    video.thumbnailUrl ??
    CATEGORY_META[video.category ?? "other"]?.thumbnail ??
    CATEGORY_META.other.thumbnail,
  category: video.category ?? "other",
  ...video,
});

function createAuthContext({ user, accessToken }) {
  return {
    user: user ?? null,
    userId: user?.id ?? null,
    accessToken: accessToken ?? null,
  };
}

function buildCollectionVideoMap(collectionRows) {
  return collectionRows.reduce((acc, collection) => {
    for (const videoId of collection.videoIds ?? []) {
      if (!acc[videoId]) {
        acc[videoId] = [];
      }
      acc[videoId].push(collection.id);
    }
    return acc;
  }, {});
}

function normalizeCollections(collectionRows) {
  return collectionRows.map((collection) => ({
    id: collection.id,
    name: collection.name,
    emoji: collection.icon ?? "📌",
    coverType: collection.cover_type ?? "icon",
    coverImageUrl: collection.cover_image_url ?? null,
    createdAt: collection.created_at,
    videoIds: collection.video_ids ?? [],
  }));
}

function normalizeRecallData(savedVideoRows, collectionRows, reminderRows) {
  const collections = normalizeCollections(collectionRows);
  const collectionVideoMap = buildCollectionVideoMap(collections);
  const remindersByVideoId = new Map(
    reminderRows.map((reminder) => [reminder.video_id, reminder]),
  );

  const videos = savedVideoRows
    .map((row) => {
      const reminder = remindersByVideoId.get(row.id);
      const categoryMeta = CATEGORY_META[row.category ?? "other"] ?? CATEGORY_META.other;
      return withDefaults({
        id: row.id,
        title: row.title ?? "Saved Video",
        creator: row.creator ?? "Unknown creator",
        platform: row.platform ?? "Unknown",
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url ?? categoryMeta.thumbnail,
        category: row.category ?? "other",
        collections: collectionVideoMap[row.id] ?? [],
        savedAt: row.saved_at,
        lastOpenedAt: row.last_opened_at,
        dismissedFromResurfacingUntil:
          row.dismissed_from_resurfacing_until ?? null,
        availabilityStatus: row.availability_status ?? null,
        shownInWorthRevisitingAt: null,
        hasReminder: !!reminder,
        reminderId: reminder?.id ?? null,
        reminderEnabled: reminder?.enabled ?? false,
        reminderTime: reminder?.display_time ?? null,
        reminderFrequency: reminder?.frequency ?? null,
        reminderDays: reminder?.days_of_week ?? [],
        reminderTimezone: reminder?.timezone ?? null,
        revisitCount: row.revisit_count ?? 0,
        archived: !!row.archived,
      });
    })
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  return { videos, collections };
}

async function hydrateDevWorthRevisitingOverrides(videos) {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return videos;
  }

  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }

  const overrides = await loadDevWorthRevisitingOverrides();

  return videos.map((video) =>
    withDefaults({
      ...video,
      devWorthRevisitingOverride: !!overrides[video.id],
    }),
  );
}

async function hydrateWorthRevisitingHomePreferences(videos) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }

  const meta = await loadWorthRevisitingHomeMeta();

  return videos.map((video) => {
    const entry = meta[video.id];
    if (!entry) {
      return video;
    }

    return withDefaults({
      ...video,
      shownInWorthRevisitingAt: entry.shownAt ?? null,
      worthRevisitingHomeExpiredAt: entry.expiredAt ?? null,
    });
  });
}

async function hydrateReminderLocalPreferences(videos) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return [];
  }

  const videoIds = videos.map((video) => video.id);
  const [followUpPreferences, onceCompletedMap, onceScheduleMap] =
    await Promise.all([
      getReminderFollowUpPreferences(videoIds),
      getOnceReminderCompletedMap(),
      getOnceReminderScheduleMap(),
    ]);

  const hydrated = await Promise.all(
    videos.map(async (video) => {
      const onceReminderCompletedAt =
        onceCompletedMap[video.id] ??
        (video.reminderFrequency === "Once"
          ? await syncOnceReminderCompletionState(video)
          : null) ??
        video.onceReminderCompletedAt ??
        null;

      return withDefaults({
        ...video,
        reminderFollowUpDelayMinutes:
          followUpPreferences[video.id] ??
          video.reminderFollowUpDelayMinutes ??
          null,
        onceReminderCompletedAt,
        onceReminderScheduledFireAt:
          onceScheduleMap[video.id] ?? video.onceReminderScheduledFireAt ?? null,
      });
    }),
  );

  return hydrated;
}

function patchVideo(videos, id, updater) {
  return videos.map((video) =>
    video.id === id ? withDefaults(updater(withDefaults(video))) : video,
  );
}

function syncCollectionMembership(collections, videoId, collectionIds) {
  return collections.map((collection) => ({
    ...collection,
    videoIds: collectionIds.includes(collection.id)
      ? Array.from(new Set([...(collection.videoIds ?? []), videoId]))
      : (collection.videoIds ?? []).filter((id) => id !== videoId),
  }));
}

function removeVideoMembership(collections, videoId, collectionId) {
  return collections.map((collection) =>
    collection.id === collectionId
      ? {
          ...collection,
          videoIds: (collection.videoIds ?? []).filter((id) => id !== videoId),
        }
      : collection,
  );
}

function removeCollectionFromVideos(videos, collectionId) {
  return videos.map((video) =>
    withDefaults({
      ...video,
      collections: (video.collections ?? []).filter((id) => id !== collectionId),
    }),
  );
}

function removeVideoFromCollections(collections, videoId) {
  return collections.map((collection) => ({
    ...collection,
    videoIds: (collection.videoIds ?? []).filter((id) => id !== videoId),
  }));
}

function hasReminderUpdates(updates) {
  return REMINDER_FIELDS.some((field) => Object.hasOwn(updates, field));
}

function applyReminderPatch(video, updates) {
  const next = {
    ...video,
    ...updates,
  };

  if (Object.hasOwn(updates, "reminderEnabled")) {
    next.hasReminder =
      updates.hasReminder ?? video.hasReminder ?? updates.reminderEnabled;
  }

  if (next.hasReminder === false) {
    next.reminderEnabled = false;
    next.reminderTime = null;
    next.reminderFrequency = null;
    next.reminderDays = [];
  } else {
    next.reminderDays = next.reminderDays ?? [];
  }

  return withDefaults(next);
}

async function prepareOnceReminderForSync(video) {
  if (
    video?.reminderFrequency !== "Once" ||
    !video?.hasReminder ||
    !video?.reminderEnabled
  ) {
    return video;
  }

  await clearOnceReminderCompleted(video.id);

  return withDefaults({
    ...video,
    onceReminderCompletedAt: null,
    onceReminderScheduledFireAt: null,
  });
}

function buildMutationError(error, fallback) {
  return getFriendlySupabaseError(error, fallback);
}

async function trackReminderCreatedSuccess(video) {
  try {
    const permissionStatus = await getNotificationPermissionStatus();
    trackEvent("reminder_created", {
      reminder_type: toReminderType(video?.reminderFrequency),
      notifications_enabled: permissionStatus === "granted",
      save_platform: toAnalyticsPlatform(video?.platform),
    });
  } catch {
    // Analytics must never block reminder success.
  }
}

function getPaywallState() {
  return usePaywallStore.getState();
}

export const useRecallStore = create((set, get) => ({
  videos: [],
  collections: [],
  isLoaded: false,
  isLoading: false,
  errorMessage: null,
  authContext: EMPTY_AUTH_CONTEXT,

  clearError: () => set({ errorMessage: null }),

  initialize: async ({ user, accessToken } = EMPTY_AUTH_CONTEXT) => {
    const authContext = createAuthContext({ user, accessToken });
    set({
      authContext,
      isLoading: true,
      errorMessage: null,
    });

    if (!hasSupabaseEnv()) {
      set({
        videos: [],
        collections: [],
        isLoading: false,
        isLoaded: true,
        errorMessage:
          "Add your Supabase URL and anon key to sync Recall across devices.",
      });
      return;
    }

    if (!authContext.userId) {
      set({
        videos: [],
        collections: [],
        isLoading: false,
        isLoaded: true,
        errorMessage: "Sign in to sync your Recall library with Supabase.",
      });
      return;
    }

    try {
      await ensureRecallProfile(authContext);
      const [savedVideoRows, collectionRows, reminderRows] = await Promise.all([
        fetchSavedVideos(authContext),
        fetchCollections(authContext),
        fetchReminders(authContext),
      ]);
      const normalized = normalizeRecallData(
        savedVideoRows,
        collectionRows,
        reminderRows,
      );
      const hydratedVideos = await hydrateDevWorthRevisitingOverrides(
        await hydrateWorthRevisitingHomePreferences(
          await hydrateReminderLocalPreferences(normalized.videos),
        ),
      );
      set({
        ...normalized,
        videos: hydratedVideos,
        isLoading: false,
        isLoaded: true,
        errorMessage: null,
      });
      try {
        await resyncReminderNotifications(hydratedVideos, {
          requestPermission: false,
        });
      } catch (error) {
        console.error(
          "[Recall reminders] Non-fatal reminder resync failed during initialize",
          error,
        );
        set((state) => ({
          ...state,
          errorMessage:
            state.errorMessage ??
            "Reminder notifications need a quick refresh, but your Recall library still loaded.",
        }));
      }
    } catch (error) {
      set({
        videos: [],
        collections: [],
        isLoading: false,
        isLoaded: true,
        errorMessage: buildMutationError(
          error,
          "Recall could not load from Supabase right now.",
        ),
      });
    }
  },

  reloadData: async () => {
    await get().initialize(get().authContext);
  },

  setDevWorthRevisitingForTesting: async (id) => {
    if (typeof __DEV__ === "undefined" || !__DEV__) {
      return false;
    }

    const previousVideos = get().videos;
    const target = previousVideos.find((video) => video.id === id);
    if (!target) return false;

    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        devWorthRevisitingOverride: true,
        lastOpenedAt: null,
        archived: false,
        dismissedFromResurfacingUntil: null,
        shownInWorthRevisitingAt: null,
        worthRevisitingHomeExpiredAt: null,
      })),
      errorMessage: null,
    });

    try {
      await setDevWorthRevisitingOverride(id, true);
      await clearWorthRevisitingHomeEntry(id);
      await updateSavedVideo({
        ...get().authContext,
        id,
        updates: {
          lastOpenedAt: null,
          archived: false,
          dismissedFromResurfacingUntil: null,
        },
      });
      return true;
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "Recall could not enable the dev Worth Revisiting override.",
        ),
      });
      return false;
    }
  },

  touchVideoSavedAt: async (id) => {
    const previousVideos = get().videos;
    const target = previousVideos.find((video) => video.id === id);
    if (!target) return;

    const savedAt = nowIso();
    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        savedAt,
        dismissedFromResurfacingUntil: null,
        shownInWorthRevisitingAt: null,
        worthRevisitingHomeExpiredAt: null,
      })),
      errorMessage: null,
    });

    try {
      await updateSavedVideo({
        ...get().authContext,
        id,
        updates: {
          savedAt,
          dismissedFromResurfacingUntil: null,
        },
      });
      await clearWorthRevisitingHomeEntry(id);
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "Recall could not update this save date right now.",
        ),
      });
    }
  },

  addVideo: async (video) => {
    const { authContext } = get();
    if (!authContext.userId) {
      const message = "Sign in before saving videos to Supabase.";
      set({ errorMessage: message });
      return null;
    }

    const normalizedVideoUrl =
      normalizeVideoUrlForSave(video.videoUrl) ?? video.videoUrl?.trim();
    const existingVideo = get().videos.find(
      (savedVideo) =>
        (normalizeVideoUrlForSave(savedVideo.videoUrl) ??
          savedVideo.videoUrl?.trim()) === normalizedVideoUrl,
    );

    if (existingVideo) {
      set({ errorMessage: null });
      await get().touchVideoSavedAt(existingVideo.id);
      const refreshedVideo = get().videos.find(
        (video) => video.id === existingVideo.id,
      );
      return {
        ...(refreshedVideo ?? existingVideo),
        alreadySaved: true,
      };
    }

    const { tier, showPaywall } = getPaywallState();
    const usage = getFreemiumUsage({
      videos: get().videos,
      collections: get().collections,
    });
    if (
      shouldShowPaywall({
        trigger: PAYWALL_TRIGGERS.SAVE_VIDEO,
        tier,
        ...usage,
      })
    ) {
      showPaywall(PAYWALL_TRIGGERS.SAVE_VIDEO, "add-video");
      return {
        blockedByPaywall: true,
        trigger: PAYWALL_TRIGGERS.SAVE_VIDEO,
      };
    }

    if (
      video.reminderEnabled &&
      shouldShowPaywall({
        trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
        tier,
        ...usage,
      })
    ) {
      showPaywall(PAYWALL_TRIGGERS.CREATE_REMINDER, "add-video");
      return {
        blockedByPaywall: true,
        trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
      };
    }

    try {
      set({ errorMessage: null });
      const { row: savedVideoRow, alreadySaved } = await createSavedVideo({
        ...authContext,
        video,
      });
      if (alreadySaved) {
        const hasLocalCopy = get().videos.some(
          (existingVideo) => existingVideo.id === savedVideoRow.id,
        );

        if (!hasLocalCopy) {
          await get().reloadData();
        }

        await get().touchVideoSavedAt(savedVideoRow.id);
        const refreshedVideo = get().videos.find(
          (video) => video.id === savedVideoRow.id,
        );

        return {
          ...(refreshedVideo ?? savedVideoRow),
          alreadySaved: true,
        };
      }

      if ((video.collections ?? []).length > 0) {
        await replaceVideoCollections({
          ...authContext,
          videoId: savedVideoRow.id,
          collectionIds: video.collections ?? [],
        });
      }
      await setReminderFollowUpDelayForVideo(
        savedVideoRow.id,
        video.reminderFollowUpDelayMinutes,
      );
      if (video.hasReminder || video.reminderEnabled) {
        const savedReminder = await upsertReminder({
          ...authContext,
          videoId: savedVideoRow.id,
          reminder: video,
        });
        await syncReminderNotificationForVideo(
          withDefaults({
            ...video,
            id: savedVideoRow.id,
            archived: false,
            reminderId: savedReminder?.id ?? null,
            reminderDays: savedReminder?.days_of_week ?? video.reminderDays ?? [],
            reminderTimezone:
              savedReminder?.timezone ??
              video.reminderTimezone ??
              video.timezone ??
              Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          { requestPermission: false },
        );
        await trackReminderCreatedSuccess({
          ...video,
          id: savedVideoRow.id,
        });
      }
      await get().reloadData();
      return {
        ...savedVideoRow,
        alreadySaved: false,
      };
    } catch (error) {
      set({
        errorMessage: buildMutationError(
          error,
          "This save could not be added to Recall right now.",
        ),
      });
      return null;
    }
  },

  updateVideo: async (id, updates) => {
    const previousVideos = get().videos;
    const currentVideo = previousVideos.find((video) => video.id === id);
    if (!currentVideo) return null;

    const nextReminderVideo = hasReminderUpdates(updates)
      ? applyReminderPatch(currentVideo, updates)
      : null;
    const isActivatingReminder = Boolean(
      nextReminderVideo &&
        !currentVideo.reminderEnabled &&
        nextReminderVideo.reminderEnabled,
    );

    if (hasReminderUpdates(updates)) {
      if (isActivatingReminder) {
        const { tier, showPaywall } = getPaywallState();
        const usage = getFreemiumUsage({
          videos: get().videos,
          collections: get().collections,
        });
        if (
          shouldShowPaywall({
            trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
            tier,
            ...usage,
          })
        ) {
          showPaywall(PAYWALL_TRIGGERS.CREATE_REMINDER, "update-video");
          return {
            blockedByPaywall: true,
            trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
          };
        }
      }
    }

    set({
      videos: patchVideo(previousVideos, id, (video) => {
        if (hasReminderUpdates(updates)) {
          return applyReminderPatch(video, updates);
        }
        return { ...video, ...updates };
      }),
      errorMessage: null,
    });

    try {
      const { authContext } = get();
      await updateSavedVideo({
        ...authContext,
        id,
        updates,
      });
      if (hasReminderUpdates(updates)) {
        let currentVideo = get().videos.find((video) => video.id === id);
        if (!currentVideo) return null;
        currentVideo = await prepareOnceReminderForSync(currentVideo);
        if (
          currentVideo.reminderFrequency === "Once" &&
          currentVideo.hasReminder &&
          currentVideo.reminderEnabled
        ) {
          set({
            videos: patchVideo(get().videos, id, () => currentVideo),
          });
        }
        await setReminderFollowUpDelayForVideo(
          id,
          currentVideo.reminderFollowUpDelayMinutes,
        );
        let reminderRow = null;
        if (currentVideo.hasReminder) {
          reminderRow = await upsertReminder({
            ...authContext,
            videoId: id,
            reminder: currentVideo,
          });
        } else {
          await deleteReminderRecord({
            ...authContext,
            videoId: id,
          });
        }
        await syncReminderNotificationForVideo(
          withDefaults({
            ...currentVideo,
            reminderId: reminderRow?.id ?? currentVideo.reminderId ?? null,
            reminderDays:
              reminderRow?.days_of_week ?? currentVideo.reminderDays ?? [],
            reminderTimezone:
              reminderRow?.timezone ??
              currentVideo.reminderTimezone ??
              Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          {
            requestPermission: false,
          },
        );
        if (isActivatingReminder && currentVideo.hasReminder) {
          await trackReminderCreatedSuccess(currentVideo);
        }
      }
      return {
        blockedByPaywall: false,
      };
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "This update could not be saved to Recall.",
        ),
      });
      return null;
    }
  },

  setVideoCollections: async (videoId, collectionIds) => {
    const previousVideos = get().videos;
    const previousCollections = get().collections;

    set({
      videos: patchVideo(previousVideos, videoId, (video) => ({
        ...video,
        collections: collectionIds,
      })),
      collections: syncCollectionMembership(
        previousCollections,
        videoId,
        collectionIds,
      ),
      errorMessage: null,
    });

    try {
      await replaceVideoCollections({
        ...get().authContext,
        videoId,
        collectionIds,
      });
    } catch (error) {
      set({
        videos: previousVideos,
        collections: previousCollections,
        errorMessage: buildMutationError(
          error,
          "Collection changes could not be saved.",
        ),
      });
    }
  },

  addCollection: async ({
    name,
    emoji = "📌",
    coverType = "icon",
    coverImageUrl = null,
  }) => {
    const { tier, showPaywall } = getPaywallState();
    const usage = getFreemiumUsage({
      videos: get().videos,
      collections: get().collections,
    });
    if (
      shouldShowPaywall({
        trigger: PAYWALL_TRIGGERS.CREATE_COLLECTION,
        tier,
        ...usage,
      })
    ) {
      showPaywall(PAYWALL_TRIGGERS.CREATE_COLLECTION, "create-collection");
      return {
        blockedByPaywall: true,
        trigger: PAYWALL_TRIGGERS.CREATE_COLLECTION,
      };
    }

    try {
      set({ errorMessage: null });
      const collection = await createCollectionRecord({
        ...get().authContext,
        name,
        emoji,
        coverType,
        coverImageUrl,
      });
      const nextCollection = {
        id: collection.id,
        name: collection.name,
        emoji: collection.icon ?? emoji,
        coverType: collection.cover_type ?? coverType,
        coverImageUrl: collection.cover_image_url ?? coverImageUrl,
        createdAt: collection.created_at,
        videoIds: [],
      };
      set((state) => ({
        collections: [...state.collections, nextCollection],
      }));
      return nextCollection;
    } catch (error) {
      set({
        errorMessage: buildMutationError(
          error,
          "This collection could not be created right now.",
        ),
      });
      return null;
    }
  },

  updateCollection: async (id, updates) => {
    const previousCollections = get().collections;
    set({
      collections: previousCollections.map((collection) =>
        collection.id === id ? { ...collection, ...updates } : collection,
      ),
      errorMessage: null,
    });

    try {
      const row = await updateCollectionRecord({
        ...get().authContext,
        id,
        updates,
      });
      set((state) => ({
        collections: state.collections.map((collection) =>
          collection.id === id
            ? {
                ...collection,
                name: row.name,
                emoji: row.icon ?? collection.emoji,
                coverType: row.cover_type ?? collection.coverType ?? "icon",
                coverImageUrl:
                  row.cover_image_url ?? collection.coverImageUrl ?? null,
              }
            : collection,
        ),
      }));
    } catch (error) {
      set({
        collections: previousCollections,
        errorMessage: buildMutationError(
          error,
          "This collection could not be updated.",
        ),
      });
    }
  },

  deleteCollection: async (id) => {
    const previousCollections = get().collections;
    const previousVideos = get().videos;
    set({
      collections: previousCollections.filter((collection) => collection.id !== id),
      videos: removeCollectionFromVideos(previousVideos, id),
      errorMessage: null,
    });

    try {
      await deleteCollectionRecord({
        ...get().authContext,
        id,
      });
    } catch (error) {
      set({
        collections: previousCollections,
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "This collection could not be deleted.",
        ),
      });
    }
  },

  removeVideoFromCollection: async (videoId, collectionId) => {
    const previousVideos = get().videos;
    const previousCollections = get().collections;
    set({
      videos: patchVideo(previousVideos, videoId, (video) => ({
        ...video,
        collections: (video.collections ?? []).filter((id) => id !== collectionId),
      })),
      collections: removeVideoMembership(previousCollections, videoId, collectionId),
      errorMessage: null,
    });

    try {
      await removeVideoFromCollectionRecord({
        ...get().authContext,
        videoId,
        collectionId,
      });
    } catch (error) {
      set({
        videos: previousVideos,
        collections: previousCollections,
        errorMessage: buildMutationError(
          error,
          "This video could not be removed from the collection.",
        ),
      });
    }
  },

  toggleReminder: async (id) => {
    const currentVideo = get().videos.find((video) => video.id === id);
    if (!currentVideo) return;
    return get().updateReminder(id, {
      hasReminder: currentVideo.hasReminder || !currentVideo.reminderEnabled,
      reminderEnabled: !currentVideo.reminderEnabled,
      reminderTime: currentVideo.reminderTime ?? "07:00 AM",
      reminderFrequency: currentVideo.reminderFrequency ?? "Daily",
      reminderDays: currentVideo.reminderDays ?? [],
    });
  },

  updateReminder: async (id, updates) => {
    const currentVideo = get().videos.find((video) => video.id === id);
    if (!currentVideo) return null;

    const nextVideo = applyReminderPatch(currentVideo, updates);
    const isActivatingReminder =
      !currentVideo.reminderEnabled && nextVideo.reminderEnabled;

    if (isActivatingReminder) {
      const { tier, showPaywall } = getPaywallState();
      const usage = getFreemiumUsage({
        videos: get().videos,
        collections: get().collections,
      });
      if (
        shouldShowPaywall({
          trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
          tier,
          ...usage,
        })
      ) {
        showPaywall(PAYWALL_TRIGGERS.CREATE_REMINDER, "update-reminder");
        return {
          blockedByPaywall: true,
          trigger: PAYWALL_TRIGGERS.CREATE_REMINDER,
        };
      }
    }

    const previousVideos = get().videos;
    set({
      videos: patchVideo(previousVideos, id, () => nextVideo),
      errorMessage: null,
    });

    try {
      let savedVideo = get().videos.find((video) => video.id === id);
      if (!savedVideo) return null;
      savedVideo = await prepareOnceReminderForSync(savedVideo);
      if (
        savedVideo.reminderFrequency === "Once" &&
        savedVideo.hasReminder &&
        savedVideo.reminderEnabled
      ) {
        set({
          videos: patchVideo(get().videos, id, () => savedVideo),
        });
      }
      await setReminderFollowUpDelayForVideo(
        id,
        savedVideo.reminderFollowUpDelayMinutes,
      );
      let reminderRow = null;
      if (savedVideo.hasReminder) {
        reminderRow = await upsertReminder({
          ...get().authContext,
          videoId: id,
          reminder: savedVideo,
        });
      } else {
        await deleteReminderRecord({
          ...get().authContext,
          videoId: id,
        });
      }
      await syncReminderNotificationForVideo(
        withDefaults({
          ...savedVideo,
          reminderId: reminderRow?.id ?? savedVideo.reminderId ?? null,
          reminderDays:
            reminderRow?.days_of_week ?? savedVideo.reminderDays ?? [],
          reminderTimezone:
            reminderRow?.timezone ??
            savedVideo.reminderTimezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        {
          requestPermission: false,
        },
      );
      if (isActivatingReminder && savedVideo.hasReminder) {
        await trackReminderCreatedSuccess(savedVideo);
      }
      return {
        blockedByPaywall: false,
      };
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "Reminder changes could not be saved.",
        ),
      });
      return null;
    }
  },

  markOnceReminderDelivered: async (videoId) => {
    if (!videoId) return;

    const target = get().videos.find((video) => video.id === videoId);
    if (!target || target.reminderFrequency !== "Once") {
      return;
    }

    const completedAt = await markOnceReminderCompleted(videoId);
    set({
      videos: patchVideo(get().videos, videoId, (video) => ({
        ...video,
        onceReminderCompletedAt: completedAt,
        onceReminderScheduledFireAt: null,
      })),
    });
  },

  deleteReminder: async (id) => {
    const previousVideos = get().videos;
    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        hasReminder: false,
        reminderEnabled: false,
        reminderTime: null,
        reminderFrequency: null,
        reminderDays: [],
      })),
      errorMessage: null,
    });

    try {
      await cancelReminderNotificationsForVideo(id);
      await cancelFollowUpReminderNotificationsForVideo(id);
      await clearReminderFollowUpDelayForVideo(id);
      await clearOnceReminderCompleted(id);
      await deleteReminderRecord({
        ...get().authContext,
        videoId: id,
      });
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "This reminder could not be deleted.",
        ),
      });
    }
  },

  markOpened: async (id) => {
    const previousVideos = get().videos;
    const target = previousVideos.find((video) => video.id === id);
    if (!target) return;

    const nextRevisitCount = (target.revisitCount ?? 0) + 1;
    const nextLastOpenedAt = nowIso();

    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        revisitCount: nextRevisitCount,
        lastOpenedAt: nextLastOpenedAt,
      })),
      errorMessage: null,
    });

    try {
      await updateSavedVideo({
        ...get().authContext,
        id,
        updates: {
          revisitCount: nextRevisitCount,
          lastOpenedAt: nextLastOpenedAt,
        },
      });
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "Recall could not record that open right now.",
        ),
      });
    }
  },

  archiveVideo: async (id) => {
    const previousVideos = get().videos;
    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        archived: true,
        shownInWorthRevisitingAt: null,
        worthRevisitingHomeExpiredAt: null,
      })),
      errorMessage: null,
    });

    try {
      await cancelReminderNotificationsForVideo(id);
      await cancelFollowUpReminderNotificationsForVideo(id);
      await clearReminderFollowUpDelayForVideo(id);
      await clearWorthRevisitingHomeEntry(id);
      await archiveSavedVideo({
        ...get().authContext,
        id,
      });
      return true;
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "This save could not be archived.",
        ),
      });
      return false;
    }
  },

  restoreArchivedVideo: async (id) => {
    const previousVideos = get().videos;
    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        archived: false,
        dismissedFromResurfacingUntil: null,
        shownInWorthRevisitingAt: null,
        worthRevisitingHomeExpiredAt: null,
      })),
      errorMessage: null,
    });

    try {
      await clearWorthRevisitingHomeEntry(id);
      await updateSavedVideo({
        ...get().authContext,
        id,
        updates: {
          archived: false,
          dismissedFromResurfacingUntil: null,
        },
      });

      const restoredVideo = get().videos.find((video) => video.id === id);
      if (restoredVideo?.reminderEnabled && restoredVideo?.hasReminder) {
        await syncReminderNotificationForVideo(withDefaults(restoredVideo), {
          requestPermission: false,
        });
      }

      return true;
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "This save could not be restored.",
        ),
      });
      return false;
    }
  },

  removeVideo: async (id) => {
    const previousVideos = get().videos;
    const previousCollections = get().collections;
    const authContext = get().authContext;
    set({
      videos: previousVideos.filter((video) => video.id !== id),
      collections: removeVideoFromCollections(previousCollections, id),
      errorMessage: null,
    });

    try {
      await cancelReminderNotificationsForVideo(id);
      await cancelFollowUpReminderNotificationsForVideo(id);
      await clearReminderFollowUpDelayForVideo(id);
      await clearOnceReminderCompleted(id);
      await clearWorthRevisitingHomeEntry(id);
      await deleteReminderRecord({
        ...authContext,
        videoId: id,
      });
      await replaceVideoCollections({
        ...authContext,
        videoId: id,
        collectionIds: [],
      });
      await deleteSavedVideo({
        ...authContext,
        id,
      });
      return true;
    } catch (error) {
      set({
        videos: previousVideos,
        collections: previousCollections,
        errorMessage: buildMutationError(
          error,
          "This save could not be deleted.",
        ),
      });
      return false;
    }
  },

  markShownInWorthRevisitingHome: async (id) => {
    const target = get().videos.find((video) => video.id === id);
    if (!target || target.shownInWorthRevisitingAt) {
      return;
    }

    const shownAt = nowIso();
    const previousVideos = get().videos;

    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        shownInWorthRevisitingAt: shownAt,
        worthRevisitingHomeExpiredAt: null,
      })),
    });

    try {
      await setWorthRevisitingHomeShown(id, shownAt);
    } catch (error) {
      console.error(
        "[Recall worth revisiting] Failed to persist home shown timestamp",
        error,
      );
    }
  },

  clearFromHomeWorthRevisiting: async (id) => {
    const previousVideos = get().videos;

    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        shownInWorthRevisitingAt: null,
      })),
    });

    try {
      await clearWorthRevisitingHomeEntry(id);
    } catch (error) {
      console.error(
        "[Recall worth revisiting] Failed to clear home shown timestamp",
        error,
      );
    }
  },

  expireFromHomeWorthRevisiting: async (id) => {
    const expiredAt = nowIso();
    const previousVideos = get().videos;

    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        shownInWorthRevisitingAt: null,
        worthRevisitingHomeExpiredAt: expiredAt,
      })),
    });

    try {
      await markWorthRevisitingHomeExpired(id, expiredAt);
    } catch (error) {
      console.error(
        "[Recall worth revisiting] Failed to persist home expiry",
        error,
      );
    }
  },

  dismissFromResurfacing: async (id) => {
    const previousVideos = get().videos;
    const dismissedUntil = plusDaysIso(14);
    set({
      videos: patchVideo(previousVideos, id, (video) => ({
        ...video,
        dismissedFromResurfacingUntil: dismissedUntil,
      })),
      errorMessage: null,
    });

    try {
      await updateSavedVideo({
        ...get().authContext,
        id,
        updates: {
          dismissedFromResurfacingUntil: dismissedUntil,
        },
      });
    } catch (error) {
      set({
        videos: previousVideos,
        errorMessage: buildMutationError(
          error,
          "Recall could not snooze this video right now.",
        ),
      });
    }
  },
}));
