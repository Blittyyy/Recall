/**
 * Returns "tiktok" | "instagram" | "youtube" | null.
 *
 * Hostname parsing keeps platform detection from matching unrelated domains
 * such as notyoutube.com while still supporting copied URLs without https://.
 */
export function detectPlatform(input) {
  const parsed = parseInputUrl(input);
  const hostname = parsed?.hostname?.toLowerCase().replace(/^www\./, "");
  if (!hostname) return null;

  if (
    isHostOrSubdomain(hostname, "tiktok.com") ||
    isHostOrSubdomain(hostname, "vm.tiktok.com") ||
    isHostOrSubdomain(hostname, "vt.tiktok.com")
  ) {
    return "tiktok";
  }
  if (
    isHostOrSubdomain(hostname, "instagram.com") ||
    isHostOrSubdomain(hostname, "instagr.am")
  ) {
    const path = parsed?.pathname?.toLowerCase() ?? "";
    return path.startsWith("/reel/") || path.startsWith("/p/")
      ? "instagram"
      : null;
  }
  if (
    isHostOrSubdomain(hostname, "youtube.com") ||
    isHostOrSubdomain(hostname, "youtu.be")
  ) {
    return "youtube";
  }
  return null;
}

export function isLikelyUrl(input) {
  return !!getHostname(input);
}

export function normalizeUrl(input) {
  return parseInputUrl(input)?.toString() ?? null;
}

export function normalizeVideoUrlForSave(input) {
  const parsed = parseInputUrl(input);
  if (!parsed) {
    return normalizeUrl(input);
  }

  const platform = detectPlatform(input);
  if (platform === "youtube") {
    const videoId = getYouTubeVideoId(input);
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  if (platform === "instagram") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const kind = segments[0];
    const contentId = segments[1];

    if ((kind === "reel" || kind === "p") && contentId) {
      return `https://www.instagram.com/${kind}/${contentId}/`;
    }
  }

  if (platform === "tiktok") {
    const cleanPath = parsed.pathname
      .split("/")
      .filter(Boolean)
      .join("/");

    if (cleanPath) {
      return `https://www.tiktok.com/${cleanPath}`;
    }
  }

  parsed.hash = "";
  parsed.search = filterSearchParams(parsed.searchParams).toString();
  return parsed.toString();
}

export function getGeneratedTitle(platform) {
  const titles = {
    tiktok: "Saved TikTok Video",
    instagram: "Saved Instagram Reel",
    youtube: "Saved YouTube Video",
  };

  return titles[platform] ?? "Saved Video";
}

export function getSafeThumbnailUrl(input, platform, fallbackThumbnail) {
  if (platform !== "youtube") {
    return fallbackThumbnail;
  }

  const videoId = getYouTubeVideoId(input);
  if (!videoId) {
    return fallbackThumbnail;
  }

  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function getHostname(input) {
  return parseInputUrl(input)?.hostname?.toLowerCase().replace(/^www\./, "") ?? null;
}

function parseInputUrl(input) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 6) return null;

  try {
    const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function isHostOrSubdomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getYouTubeVideoId(input) {
  const parsed = parseInputUrl(input);
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtu.be") {
    return parsed.pathname.replace(/^\/+/, "").split("/")[0] || null;
  }

  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }
    if (
      parsed.pathname.startsWith("/shorts/") ||
      parsed.pathname.startsWith("/embed/")
    ) {
      return parsed.pathname.split("/")[2] || null;
    }
  }

  return null;
}

function filterSearchParams(searchParams) {
  const filtered = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith("utm_") ||
      normalizedKey === "si" ||
      normalizedKey === "feature" ||
      normalizedKey === "list" ||
      normalizedKey === "index"
    ) {
      continue;
    }
    filtered.append(key, value);
  }

  return filtered;
}
