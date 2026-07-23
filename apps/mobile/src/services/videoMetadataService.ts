import {
  getGeneratedTitle,
  getReadableHostname,
  getSafeThumbnailUrl,
  isPublicHttpUrl,
  normalizeUrl,
  normalizeVideoUrlForSave,
} from "../utils/urlHelpers";
import { getDisplayTitle } from "../utils/titleHelpers";
import { supabase } from "./supabaseClient";

const OEMBED_ENDPOINTS: Record<string, (url: string) => string | null> = {
  youtube: (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) =>
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  instagram: (url) =>
    `https://www.instagram.com/oembed/?omitscript=true&url=${encodeURIComponent(url)}`,
};

const INSTAGRAM_RESERVED_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "explore",
  "accounts",
  "direct",
  "about",
  "legal",
  "privacy",
  "developer",
  "web",
  "static",
]);

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readMetaContent(html: string, key: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return null;
}

function formatInstagramCreator(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Unknown creator";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function parseInstagramUsername(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z0-9._]+$/.test(trimmed)) {
    return null;
  }

  if (INSTAGRAM_RESERVED_PATHS.has(trimmed.toLowerCase())) {
    return null;
  }

  return trimmed;
}

function extractInstagramUsernameFromUrl(url: string | null | undefined) {
  if (!url?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.toLowerCase().includes("instagram.com")) {
      return null;
    }

    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    return parseInstagramUsername(segment);
  } catch {
    return null;
  }
}

function parseInstagramCreatorFromTitle(title: string | null) {
  if (!title?.trim()) {
    return null;
  }

  const trimmed = title.trim();
  const withHandle = trimmed.match(
    /^(.+?)\s*\(@([A-Za-z0-9._]+)\)\s+on Instagram/i,
  );
  if (withHandle?.[2]) {
    return formatInstagramCreator(withHandle[2]);
  }

  const usernameOnly = trimmed.match(/^@?([A-Za-z0-9._]+)\s+on Instagram/i);
  if (usernameOnly?.[1]) {
    return formatInstagramCreator(usernameOnly[1]);
  }

  return null;
}

function parseInstagramCreatorFromDescription(description: string | null) {
  if (!description?.trim()) {
    return null;
  }

  const trimmed = description.trim();
  const fromMatch = trimmed.match(/\bfrom\s+@?([A-Za-z0-9._]+)/i);
  if (fromMatch?.[1]) {
    return formatInstagramCreator(fromMatch[1]);
  }

  const dashMatch = trimmed.match(/-\s*@?([A-Za-z0-9._]+)\s+on\s+/i);
  if (dashMatch?.[1]) {
    return formatInstagramCreator(dashMatch[1]);
  }

  return null;
}

function parseInstagramCreatorFromEmbedHtml(html: string | null) {
  if (!html?.trim()) {
    return null;
  }

  const matches = html.matchAll(/instagram\.com\/([A-Za-z0-9._]+)/gi);
  for (const match of matches) {
    const username = parseInstagramUsername(match[1]);
    if (username) {
      return formatInstagramCreator(username);
    }
  }

  return null;
}

function cleanInstagramTitle(value: string | null, platform: string) {
  if (!value) {
    return getGeneratedTitle(platform);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return getGeneratedTitle(platform);
  }

  const captionMatch = trimmed.match(
    /^(?:.+?\(@[A-Za-z0-9._]+\)|@?[A-Za-z0-9._]+)\s+on Instagram:\s*["']?(.*?)["']?\s*$/i,
  );
  if (captionMatch?.[1]?.trim()) {
    return captionMatch[1].trim();
  }

  const withoutSuffix = trimmed.replace(/\s+•\s+Instagram.*$/i, "").trim();
  return withoutSuffix || getGeneratedTitle(platform);
}

function parseInstagramDisplayNameFromTitle(title: string | null) {
  if (!title?.trim()) {
    return null;
  }

  const withHandle = title.trim().match(/^(.+?)\s*\(@[A-Za-z0-9._]+\)\s+on Instagram/i);
  if (withHandle?.[1]?.trim()) {
    return withHandle[1].trim();
  }

  return null;
}

function normalizeInstagramHandle(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const username = parseInstagramUsername(withoutAt);
  if (!username) {
    return null;
  }

  return formatInstagramCreator(username);
}

function deriveInstagramCreator({
  authorName,
  authorUrl,
  embedHtml,
  title,
  description,
  author,
}: {
  authorName?: string | null;
  authorUrl?: string | null;
  embedHtml?: string | null;
  title?: string | null;
  description?: string | null;
  author?: string | null;
}) {
  const handle =
    normalizeInstagramHandle(extractInstagramUsernameFromUrl(authorUrl)) ||
    parseInstagramCreatorFromEmbedHtml(embedHtml ?? null) ||
    parseInstagramCreatorFromTitle(title ?? null) ||
    parseInstagramCreatorFromDescription(description ?? null) ||
    normalizeInstagramHandle(authorName) ||
    normalizeInstagramHandle(author);

  if (handle) {
    return handle;
  }

  const displayName =
    authorName?.trim() ||
    parseInstagramDisplayNameFromTitle(title ?? null) ||
    author?.trim();

  if (displayName) {
    return displayName;
  }

  return "Unknown creator";
}

const TIKTOK_FETCH_HEADERS = {
  Accept: "application/json,text/html,application/xhtml+xml",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Referer: "https://www.tiktok.com/",
};

function getTikTokUrlCandidates(inputUrl: string) {
  const trimmed = inputUrl.trim();
  const normalized = normalizeUrl(trimmed) ?? trimmed;
  const saved = normalizeVideoUrlForSave(trimmed) ?? normalized;

  return [...new Set([trimmed, normalized, saved].filter(Boolean))];
}

async function fetchTikTokOembedPayload(
  url: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const endpoint = OEMBED_ENDPOINTS.tiktok(url);
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: TIKTOK_FETCH_HEADERS,
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTikTokHtmlFields({
  normalizedUrl,
  signal,
}: {
  normalizedUrl: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(normalizedUrl, {
    method: "GET",
    headers: {
      ...TIKTOK_FETCH_HEADERS,
      Accept: "text/html,application/xhtml+xml",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `TikTok metadata request failed with status ${response.status}.`,
    );
  }

  const html = await response.text();

  return {
    ogTitle: readMetaContent(html, "og:title"),
    ogImage: readMetaContent(html, "og:image"),
    ogDescription: readMetaContent(html, "og:description"),
  };
}

async function fetchTikTokMetadata({
  inputUrl,
  signal,
}: {
  inputUrl: string;
  signal?: AbortSignal;
}) {
  const candidates = getTikTokUrlCandidates(inputUrl);
  let payload: Record<string, unknown> | null = null;
  let htmlFields: Awaited<ReturnType<typeof fetchTikTokHtmlFields>> | null =
    null;
  let resolvedVideoUrl = candidates[0] ?? inputUrl.trim();

  for (const candidate of candidates) {
    const nextPayload = await fetchTikTokOembedPayload(candidate, signal);
    if (nextPayload) {
      payload = nextPayload;
      resolvedVideoUrl = candidate;
      break;
    }
  }

  for (const candidate of candidates) {
    try {
      htmlFields = await fetchTikTokHtmlFields({
        normalizedUrl: candidate,
        signal,
      });
      if (htmlFields?.ogImage || htmlFields?.ogTitle) {
        resolvedVideoUrl = candidate;
        break;
      }
    } catch {
      // Try the next candidate URL shape.
    }
  }

  if (!payload && !htmlFields) {
    throw new Error("TikTok metadata request failed.");
  }

  const rawTitle =
    (typeof payload?.title === "string" ? payload.title.trim() : "") ||
    htmlFields?.ogTitle?.trim() ||
    "";
  const title = rawTitle
    ? getDisplayTitle(rawTitle, getGeneratedTitle("tiktok"))
    : getGeneratedTitle("tiktok");
  const creator =
    (typeof payload?.author_name === "string"
      ? payload.author_name.trim()
      : "") ||
    htmlFields?.ogDescription?.trim() ||
    "Unknown creator";
  const thumbnailUrl =
    (typeof payload?.thumbnail_url === "string"
      ? payload.thumbnail_url.trim()
      : "") ||
    htmlFields?.ogImage?.trim() ||
    getSafeThumbnailUrl(resolvedVideoUrl, "tiktok", null);

  return {
    title,
    creator,
    thumbnailUrl,
    videoUrl: normalizeVideoUrlForSave(resolvedVideoUrl) ?? resolvedVideoUrl,
  };
}

async function fetchInstagramHtmlFields({
  normalizedUrl,
  signal,
}: {
  normalizedUrl: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(normalizedUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Instagram metadata request failed with status ${response.status}.`,
    );
  }

  const html = await response.text();
  const ogTitle = readMetaContent(html, "og:title");
  const ogDescription = readMetaContent(html, "og:description");
  const ogImage = readMetaContent(html, "og:image");
  const author = readMetaContent(html, "author");

  return {
    ogTitle,
    ogDescription,
    ogImage,
    author,
  };
}

async function fetchInstagramMetadata({
  normalizedUrl,
  signal,
}: {
  normalizedUrl: string;
  signal?: AbortSignal;
}) {
  const endpoint = OEMBED_ENDPOINTS.instagram(normalizedUrl);
  let oembedPayload: Record<string, unknown> | null = null;

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal,
      });

      if (response.ok) {
        oembedPayload = await response.json();
      }
    } catch {
      // Fall back to HTML metadata below.
    }
  }

  let htmlFields: Awaited<ReturnType<typeof fetchInstagramHtmlFields>> | null =
    null;
  try {
    htmlFields = await fetchInstagramHtmlFields({
      normalizedUrl,
      signal,
    });
  } catch {
    // oEmbed may still provide enough metadata.
  }

  if (!oembedPayload && !htmlFields) {
    throw new Error("Instagram metadata request failed.");
  }

  const oembedTitle =
    typeof oembedPayload?.title === "string" ? oembedPayload.title.trim() : "";
  const oembedHtml =
    typeof oembedPayload?.html === "string" ? oembedPayload.html : null;
  const oembedAuthorName =
    typeof oembedPayload?.author_name === "string"
      ? oembedPayload.author_name
      : null;
  const oembedAuthorUrl =
    typeof oembedPayload?.author_url === "string"
      ? oembedPayload.author_url
      : null;
  const oembedThumbnailUrl =
    typeof oembedPayload?.thumbnail_url === "string"
      ? oembedPayload.thumbnail_url
      : null;

  const title = getDisplayTitle(
    oembedTitle ||
      cleanInstagramTitle(htmlFields?.ogTitle ?? null, "instagram"),
    getGeneratedTitle("instagram"),
  );
  const creator = deriveInstagramCreator({
    authorName: oembedAuthorName,
    authorUrl: oembedAuthorUrl,
    embedHtml: oembedHtml,
    title: htmlFields?.ogTitle ?? oembedTitle ?? null,
    description: htmlFields?.ogDescription ?? null,
    author: htmlFields?.author ?? null,
  });
  const thumbnailUrl =
    oembedThumbnailUrl?.trim() ||
    htmlFields?.ogImage?.trim() ||
    getSafeThumbnailUrl(normalizedUrl, "instagram", null);

  return {
    title,
    creator,
    thumbnailUrl,
    videoUrl: normalizedUrl,
  };
}

async function fetchWebMetadata({
  inputUrl,
  signal,
}: {
  inputUrl: string;
  signal?: AbortSignal;
}) {
  const normalizedUrl = normalizeUrl(inputUrl) ?? inputUrl.trim();
  if (!isPublicHttpUrl(normalizedUrl)) {
    throw new Error("Webpage URL is not allowed.");
  }

  const { data, error } = await supabase.functions.invoke("fetch-web-metadata", {
    body: { url: normalizedUrl },
    signal,
  });

  if (signal?.aborted) {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    throw abortError;
  }

  if (error) {
    if (
      (error as { name?: string })?.name === "AbortError" ||
      `${error?.message ?? ""}`.toLowerCase().includes("abort")
    ) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }
    throw new Error("Webpage metadata request failed.");
  }

  const payload = data && typeof data === "object" ? data : null;
  if (!payload || typeof (payload as { error?: string }).error === "string") {
    throw new Error("Webpage metadata request failed.");
  }

  const record = payload as {
    title?: unknown;
    siteName?: unknown;
    description?: unknown;
    thumbnailUrl?: unknown;
    finalUrl?: unknown;
    hostname?: unknown;
  };

  const finalUrlRaw =
    typeof record.finalUrl === "string" ? record.finalUrl.trim() : "";
  const safeFinalUrl =
    (finalUrlRaw && isPublicHttpUrl(finalUrlRaw) ? finalUrlRaw : null) ||
    normalizedUrl;
  const videoUrl = normalizeVideoUrlForSave(safeFinalUrl) ?? safeFinalUrl;

  const hostname =
    (typeof record.hostname === "string" && record.hostname.trim()) ||
    getReadableHostname(videoUrl) ||
    getReadableHostname(normalizedUrl) ||
    "Webpage";

  const remoteTitle =
    typeof record.title === "string" ? record.title.trim() : "";
  const title = getDisplayTitle(
    remoteTitle || hostname,
    getGeneratedTitle("web", normalizedUrl),
  );

  const siteName =
    (typeof record.siteName === "string" && record.siteName.trim()) ||
    hostname;

  const thumbnailRaw =
    typeof record.thumbnailUrl === "string" ? record.thumbnailUrl.trim() : "";
  const thumbnailUrl =
    thumbnailRaw && isPublicHttpUrl(thumbnailRaw) ? thumbnailRaw : null;

  const description =
    typeof record.description === "string" ? record.description.trim() : null;

  return {
    title,
    creator: siteName,
    thumbnailUrl,
    videoUrl,
    description: description || null,
    siteName,
    hostname,
    originalUrl: normalizedUrl,
    finalUrl: safeFinalUrl,
  };
}

export async function fetchVideoMetadata({
  inputUrl,
  platform,
  signal,
}: {
  inputUrl: string;
  platform: string;
  signal?: AbortSignal;
}) {
  const normalizedUrl = normalizeUrl(inputUrl) ?? inputUrl.trim();

  if (platform === "instagram") {
    return fetchInstagramMetadata({
      normalizedUrl,
      signal,
    });
  }

  if (platform === "tiktok") {
    return fetchTikTokMetadata({
      inputUrl: normalizedUrl,
      signal,
    });
  }

  if (platform === "web" || platform === "amazon") {
    return fetchWebMetadata({
      inputUrl: normalizedUrl,
      signal,
    });
  }

  const resolveEndpoint = OEMBED_ENDPOINTS[platform];
  const endpoint = resolveEndpoint?.(normalizedUrl);

  if (!endpoint) {
    throw new Error(`Metadata fetch is not supported for ${platform}.`);
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const rawTitle = payload?.title?.trim();
  const title = rawTitle
    ? getDisplayTitle(rawTitle, getGeneratedTitle(platform))
    : getGeneratedTitle(platform);
  const creator =
    payload?.author_name?.trim() ||
    payload?.author?.trim() ||
    "Unknown creator";
  const thumbnailUrl =
    payload?.thumbnail_url?.trim() ||
    getSafeThumbnailUrl(normalizedUrl, platform, null);

  if (!title && !creator && !thumbnailUrl) {
    throw new Error("Metadata payload was empty.");
  }

  return {
    title,
    creator,
    thumbnailUrl,
    videoUrl: normalizedUrl,
  };
}

export async function fetchFreshThumbnailUrl({
  inputUrl,
  platform,
  signal,
}: {
  inputUrl: string;
  platform: string;
  signal?: AbortSignal;
}) {
  if (platform === "tiktok") {
    const metadata = await fetchTikTokMetadata({
      inputUrl,
      signal,
    });
    return metadata.thumbnailUrl?.trim() || null;
  }

  const metadata = await fetchVideoMetadata({
    inputUrl,
    platform,
    signal,
  });

  return metadata.thumbnailUrl?.trim() || null;
}
