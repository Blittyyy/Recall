const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function needsProtectedThumbnailLoad(thumbnailUrl, platform) {
  if (!thumbnailUrl?.trim()) {
    return false;
  }

  const normalizedPlatform = (platform ?? "").toLowerCase();
  return (
    normalizedPlatform.includes("tiktok") ||
    normalizedPlatform.includes("instagram") ||
    /(?:tiktokcdn|tiktokv\.com|cdninstagram|fbcdn|instagram\.com)/i.test(
      thumbnailUrl,
    )
  );
}

export function getThumbnailRequestHeaders(thumbnailUrl, platform) {
  if (!thumbnailUrl?.trim()) {
    return undefined;
  }

  const normalizedPlatform = (platform ?? "").toLowerCase();
  const isTikTok =
    normalizedPlatform.includes("tiktok") ||
    /(?:tiktokcdn|tiktokv\.com|tiktok\.com)/i.test(thumbnailUrl);
  const isInstagram =
    normalizedPlatform.includes("instagram") ||
    /(?:cdninstagram|fbcdn|instagram\.com)/i.test(thumbnailUrl);

  if (isTikTok) {
    return {
      Referer: "https://www.tiktok.com/",
      "User-Agent": MOBILE_USER_AGENT,
    };
  }

  if (isInstagram) {
    return {
      Referer: "https://www.instagram.com/",
      "User-Agent": MOBILE_USER_AGENT,
    };
  }

  return undefined;
}

export function getThumbnailFallbackUrls(thumbnailUrl, platform) {
  if (!thumbnailUrl?.trim()) {
    return [];
  }

  const normalizedPlatform = (platform ?? "").toLowerCase();
  const isYouTubeThumbnail =
    normalizedPlatform.includes("youtube") ||
    /(?:i\.ytimg\.com|img\.youtube\.com)/i.test(thumbnailUrl);

  if (!isYouTubeThumbnail) {
    return [thumbnailUrl];
  }

  const baseUrl = thumbnailUrl.replace(
    /\/[^/?]+\.(?:jpg|webp)(?=($|\?))/i,
    "/THUMBNAIL.jpg",
  );

  return [
    baseUrl.replace("THUMBNAIL.jpg", "maxresdefault.jpg"),
    baseUrl.replace("THUMBNAIL.jpg", "hq720.jpg"),
    thumbnailUrl,
    baseUrl.replace("THUMBNAIL.jpg", "mqdefault.jpg"),
    baseUrl.replace("THUMBNAIL.jpg", "hqdefault.jpg"),
  ].filter((url, index, urls) => urls.indexOf(url) === index);
}

export function createThumbnailImageSource(thumbnailUrl, platform) {
  if (!thumbnailUrl?.trim()) {
    return null;
  }

  const headers = getThumbnailRequestHeaders(thumbnailUrl, platform);
  return headers ? { uri: thumbnailUrl, headers } : { uri: thumbnailUrl };
}
