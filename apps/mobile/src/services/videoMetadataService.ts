import {
  getGeneratedTitle,
  getSafeThumbnailUrl,
  normalizeUrl,
} from "../utils/urlHelpers";

const OEMBED_ENDPOINTS: Record<string, (url: string) => string | null> = {
  youtube: (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) =>
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  instagram: (url) =>
    `https://www.instagram.com/oembed/?omitscript=true&url=${encodeURIComponent(url)}`,
};

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

function cleanInstagramTitle(value: string | null, platform: string) {
  if (!value) {
    return getGeneratedTitle(platform);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return getGeneratedTitle(platform);
  }

  const withoutSuffix = trimmed.replace(/\s+•\s+Instagram.*$/i, "").trim();
  return withoutSuffix || getGeneratedTitle(platform);
}

function deriveInstagramCreator({
  author,
  description,
}: {
  author: string | null;
  description: string | null;
}) {
  if (author?.trim()) {
    return author.trim();
  }

  const descriptionMatch = description?.match(/from\s+([A-Za-z0-9._]+)/i);
  if (descriptionMatch?.[1]) {
    return descriptionMatch[1];
  }

  return "Unknown creator";
}

async function fetchInstagramHtmlMetadata({
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
    throw new Error(`Instagram metadata request failed with status ${response.status}.`);
  }

  const html = await response.text();
  const ogTitle = readMetaContent(html, "og:title");
  const ogDescription = readMetaContent(html, "og:description");
  const ogImage = readMetaContent(html, "og:image");
  const author = readMetaContent(html, "author");

  return {
    title: cleanInstagramTitle(ogTitle, "instagram"),
    creator: deriveInstagramCreator({
      author,
      description: ogDescription,
    }),
    thumbnailUrl:
      ogImage?.trim() || getSafeThumbnailUrl(normalizedUrl, "instagram", null),
    videoUrl: normalizedUrl,
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
  const resolveEndpoint = OEMBED_ENDPOINTS[platform];
  const endpoint = resolveEndpoint?.(normalizedUrl);

  if (!endpoint) {
    throw new Error(`Metadata fetch is not supported for ${platform}.`);
  }

  try {
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
    const title = payload?.title?.trim() || getGeneratedTitle(platform);
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
  } catch (error) {
    if (platform === "instagram") {
      return fetchInstagramHtmlMetadata({
        normalizedUrl,
        signal,
      });
    }

    throw error;
  }
}
