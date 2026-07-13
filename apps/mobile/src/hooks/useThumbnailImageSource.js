import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { fetchFreshThumbnailUrl } from "../services/videoMetadataService";
import { detectPlatform } from "../utils/urlHelpers";
import {
  createThumbnailImageSource,
  getThumbnailFallbackUrls,
  needsProtectedThumbnailLoad,
} from "../utils/thumbnailImageSource";
import {
  shouldMarkVideoUnavailable,
  VIDEO_AVAILABILITY,
} from "../utils/videoAvailability";
import { useRecallStore } from "../store/useRecallStore";

const THUMBNAIL_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}recall-thumbnails/`;

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCachePath(thumbnailUrl) {
  return `${THUMBNAIL_CACHE_DIR}${hashString(thumbnailUrl)}.jpg`;
}

async function ensureThumbnailCacheDir() {
  if (!FileSystem.cacheDirectory) {
    return false;
  }

  const info = await FileSystem.getInfoAsync(THUMBNAIL_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(THUMBNAIL_CACHE_DIR, {
      intermediates: true,
    });
  }

  return true;
}

async function invalidateThumbnailCache(thumbnailUrl) {
  if (!thumbnailUrl?.trim()) {
    return;
  }

  await FileSystem.deleteAsync(getCachePath(thumbnailUrl), {
    idempotent: true,
  }).catch(() => null);
}

async function downloadThumbnailToCache(thumbnailUrl, platform, { force = false } = {}) {
  if (!(await ensureThumbnailCacheDir())) {
    return null;
  }

  const cachePath = getCachePath(thumbnailUrl);
  const cachedInfo = await FileSystem.getInfoAsync(cachePath);

  if (cachedInfo.exists && !force) {
    return cachePath;
  }

  if (cachedInfo.exists && force) {
    await invalidateThumbnailCache(thumbnailUrl);
  }

  const headers = createThumbnailImageSource(thumbnailUrl, platform)?.headers;
  const result = await FileSystem.downloadAsync(
    thumbnailUrl,
    cachePath,
    headers ? { headers } : undefined,
  );

  if (result.status >= 200 && result.status < 300) {
    return result.uri;
  }

  await invalidateThumbnailCache(thumbnailUrl);
  return null;
}

async function resolveProtectedThumbnail({
  thumbnailUrl,
  videoUrl,
  platform,
  forceRefresh = false,
}) {
  let cachedUri = await downloadThumbnailToCache(thumbnailUrl, platform, {
    force: forceRefresh,
  });
  if (cachedUri) {
    return { cachedUri, nextUrl: thumbnailUrl, error: null };
  }

  if (!videoUrl?.trim() || !platform) {
    return { cachedUri: null, nextUrl: thumbnailUrl, error: null };
  }

  try {
    const freshUrl = await fetchFreshThumbnailUrl({
      inputUrl: videoUrl,
      platform,
    });

    if (!freshUrl?.trim()) {
      return {
        cachedUri: null,
        nextUrl: thumbnailUrl,
        error: new Error("Metadata refresh returned no thumbnail."),
      };
    }

    cachedUri = await downloadThumbnailToCache(freshUrl, platform, {
      force: true,
    });

    return {
      cachedUri,
      nextUrl: freshUrl,
      error: null,
    };
  } catch (error) {
    return {
      cachedUri: null,
      nextUrl: thumbnailUrl,
      error,
    };
  }
}

export function useThumbnailImageSource({
  thumbnailUrl,
  videoUrl,
  platform,
  videoId,
}) {
  const [activeUrl, setActiveUrl] = useState(thumbnailUrl ?? null);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [source, setSource] = useState(null);
  const refreshAttemptedRef = useRef(false);
  const resolvedPlatform = useMemo(() => {
    const normalized = (platform ?? "").toLowerCase();
    if (normalized.includes("tiktok")) {
      return "tiktok";
    }
    if (normalized.includes("instagram")) {
      return "instagram";
    }
    if (normalized.includes("youtube")) {
      return "youtube";
    }
    return detectPlatform(videoUrl ?? thumbnailUrl ?? "") ?? normalized;
  }, [platform, thumbnailUrl, videoUrl]);

  const fallbackUrls = useMemo(
    () => getThumbnailFallbackUrls(activeUrl, resolvedPlatform),
    [activeUrl, resolvedPlatform],
  );

  const currentUrl = fallbackUrls[fallbackIndex] ?? activeUrl;

  const persistThumbnailUrl = useCallback(
    (nextUrl) => {
      if (!videoId || !nextUrl?.trim()) {
        return;
      }

      useRecallStore
        .getState()
        .updateVideo(videoId, { thumbnailUrl: nextUrl })
        .catch(() => null);
    },
    [videoId],
  );

  const syncAvailabilityStatus = useCallback(
    ({ cachedUri, freshUrl, error, allowMarkUnavailable = false }) => {
      if (!videoId) {
        return;
      }

      const video = useRecallStore.getState().videos.find((item) => item.id === videoId);

      if (cachedUri || freshUrl) {
        if (video?.availabilityStatus === VIDEO_AVAILABILITY.UNAVAILABLE) {
          useRecallStore
            .getState()
            .updateVideo(videoId, { availabilityStatus: null })
            .catch(() => null);
        }
        return;
      }

      if (!allowMarkUnavailable) {
        return;
      }

      if (
        shouldMarkVideoUnavailable({
          platform: resolvedPlatform,
          videoUrl,
          cachedUri,
          freshUrl,
          error,
        }) &&
        video?.availabilityStatus !== VIDEO_AVAILABILITY.UNAVAILABLE
      ) {
        useRecallStore
          .getState()
          .updateVideo(videoId, {
            availabilityStatus: VIDEO_AVAILABILITY.UNAVAILABLE,
          })
          .catch(() => null);
      }
    },
    [resolvedPlatform, videoId, videoUrl],
  );

  useEffect(() => {
    setActiveUrl(thumbnailUrl ?? null);
    setFallbackIndex(0);
    refreshAttemptedRef.current = false;
  }, [thumbnailUrl, resolvedPlatform]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!currentUrl?.trim()) {
        if (!cancelled) {
          setSource(null);
        }
        return;
      }

      if (needsProtectedThumbnailLoad(currentUrl, resolvedPlatform)) {
        try {
          const { cachedUri, nextUrl, error } = await resolveProtectedThumbnail({
            thumbnailUrl: currentUrl,
            videoUrl,
            platform: resolvedPlatform,
            forceRefresh: false,
          });

          if (!cancelled) {
            if (cachedUri || nextUrl !== activeUrl) {
              syncAvailabilityStatus({ cachedUri, freshUrl: nextUrl, error });
            }

            if (nextUrl !== activeUrl) {
              persistThumbnailUrl(nextUrl);
              setActiveUrl(nextUrl);
            }

            setSource(
              cachedUri
                ? { uri: cachedUri }
                : createThumbnailImageSource(nextUrl, resolvedPlatform),
            );
          }
        } catch {
          if (!cancelled) {
            setSource(createThumbnailImageSource(currentUrl, resolvedPlatform));
          }
        }
        return;
      }

      if (!cancelled) {
        setSource(createThumbnailImageSource(currentUrl, resolvedPlatform));
      }
    })().catch(() => {
      if (!cancelled) {
        setSource(createThumbnailImageSource(currentUrl, resolvedPlatform));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeUrl,
    currentUrl,
    persistThumbnailUrl,
    resolvedPlatform,
    syncAvailabilityStatus,
    videoUrl,
  ]);

  const handleError = useCallback(async () => {
    if (fallbackIndex < fallbackUrls.length - 1) {
      setFallbackIndex((current) => current + 1);
      return;
    }

    if (currentUrl) {
      await invalidateThumbnailCache(currentUrl);
    }

    if (!refreshAttemptedRef.current && videoUrl?.trim() && resolvedPlatform) {
      refreshAttemptedRef.current = true;

      try {
        const { cachedUri, nextUrl, error } = await resolveProtectedThumbnail({
          thumbnailUrl: currentUrl ?? activeUrl ?? thumbnailUrl,
          videoUrl,
          platform: resolvedPlatform,
          forceRefresh: true,
        });

        if (cachedUri) {
          syncAvailabilityStatus({ cachedUri, freshUrl: nextUrl, error });
          if (nextUrl && nextUrl !== activeUrl) {
            persistThumbnailUrl(nextUrl);
            setActiveUrl(nextUrl);
          }
          setFallbackIndex(0);
          setSource({ uri: cachedUri });
          return;
        }

        if (nextUrl && nextUrl !== activeUrl) {
          persistThumbnailUrl(nextUrl);
          setFallbackIndex(0);
          setActiveUrl(nextUrl);
          return;
        }

        syncAvailabilityStatus({
          cachedUri,
          freshUrl: nextUrl,
          error,
          allowMarkUnavailable: true,
        });
      } catch (error) {
        syncAvailabilityStatus({
          cachedUri: null,
          freshUrl: null,
          error,
          allowMarkUnavailable: true,
        });
      }
    } else if (refreshAttemptedRef.current) {
      syncAvailabilityStatus({
        cachedUri: null,
        freshUrl: null,
        error: null,
        allowMarkUnavailable: true,
      });
    }

    if (currentUrl && needsProtectedThumbnailLoad(currentUrl, resolvedPlatform)) {
      setSource(createThumbnailImageSource(currentUrl, resolvedPlatform));
    }
  }, [
    activeUrl,
    currentUrl,
    fallbackIndex,
    fallbackUrls.length,
    persistThumbnailUrl,
    resolvedPlatform,
    syncAvailabilityStatus,
    thumbnailUrl,
    videoUrl,
  ]);

  return {
    source,
    onError: () => {
      handleError().catch(() => null);
    },
  };
}
