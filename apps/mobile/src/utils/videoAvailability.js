export const VIDEO_AVAILABILITY = {
  UNAVAILABLE: "unavailable",
};

export function isSupportedVideoPlatform(platform) {
  const normalized = (platform ?? "").toLowerCase();
  return (
    normalized.includes("youtube") ||
    normalized.includes("tiktok") ||
    normalized.includes("instagram")
  );
}

export function isVideoUnavailable(videoOrStatus) {
  if (typeof videoOrStatus === "string") {
    return videoOrStatus === VIDEO_AVAILABILITY.UNAVAILABLE;
  }

  return videoOrStatus?.availabilityStatus === VIDEO_AVAILABILITY.UNAVAILABLE;
}

export function shouldTreatMetadataErrorAsUnavailable(error) {
  const message = `${error?.message ?? error}`.toLowerCase();
  if (!message) {
    return false;
  }

  if (
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("failed to fetch")
  ) {
    return false;
  }

  return (
    message.includes("metadata request failed") ||
    message.includes("metadata refresh returned no thumbnail") ||
    message.includes("no thumbnail") ||
    message.includes("status 403") ||
    message.includes("status 404") ||
    message.includes("status 410") ||
    message.includes("payload was empty")
  );
}

export function shouldMarkVideoUnavailable({
  platform,
  videoUrl,
  cachedUri,
  freshUrl,
  error,
}) {
  if (!videoUrl?.trim() || !isSupportedVideoPlatform(platform)) {
    return false;
  }

  if (cachedUri || freshUrl) {
    return false;
  }

  if (error) {
    return shouldTreatMetadataErrorAsUnavailable(error);
  }

  return true;
}
