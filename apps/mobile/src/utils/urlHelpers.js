/**
 * Returns "tiktok" | "instagram" | "youtube" | "amazon" | "web" | null.
 *
 * Hostname parsing keeps platform detection from matching unrelated domains
 * such as notyoutube.com while still supporting copied URLs without https://.
 * Generic public http(s) pages that are not YT/TT/IG/Amazon content become "web".
 */
export function detectPlatform(input) {
  const parsed = parseInputUrl(input);
  if (!parsed || !isPublicHttpUrl(parsed)) {
    return null;
  }

  const hostname = parsed.hostname?.toLowerCase().replace(/^www\./, "");
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
    if (
      path.startsWith("/reel/") ||
      path.startsWith("/reels/") ||
      path.startsWith("/p/")
    ) {
      return "instagram";
    }
    // Profiles, stories, explore, etc. save as generic webpages.
  }

  if (
    isHostOrSubdomain(hostname, "youtube.com") ||
    isHostOrSubdomain(hostname, "youtu.be")
  ) {
    return "youtube";
  }

  if (isAmazonHostname(hostname)) {
    return "amazon";
  }

  return "web";
}

export function isAmazonHostname(hostname) {
  const host = (hostname ?? "").toLowerCase().replace(/^www\./, "");
  if (!host) return false;
  if (host === "amzn.to" || host === "a.co" || host.endsWith(".amzn.to")) {
    return true;
  }
  return /(^|\.)amazon\.[a-z.]+$/i.test(host);
}

/** Normalize stored/display platform values to a canonical key. */
export function resolvePlatformKey(platform, url) {
  const normalized = (platform ?? "").toLowerCase().trim();
  if (
    normalized === "amazon" ||
    (url && detectPlatform(url) === "amazon")
  ) {
    return "amazon";
  }
  if (normalized === "tiktok") return "tiktok";
  if (normalized === "instagram") return "instagram";
  if (normalized === "youtube") return "youtube";
  if (
    normalized === "web" ||
    normalized === "website" ||
    normalized === "webpage"
  ) {
    return "web";
  }
  if (url) {
    return detectPlatform(url) ?? normalized;
  }
  return normalized || null;
}

export function getPlatformDisplayName(platform, url) {
  const key = resolvePlatformKey(platform, url);
  const labels = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    amazon: "Amazon",
    web: "Web",
  };
  return labels[key] ?? (typeof platform === "string" && platform.trim()
    ? platform.trim()
    : "Web");
}

export function isLikelyUrl(input) {
  return !!getHostname(input);
}

/**
 * True for public http(s) URLs only — rejects non-http schemes, localhost,
 * loopback, private/link-local IPs, and .local names.
 */
export function isPublicHttpUrl(input) {
  const parsed = typeof input === "string" ? parseInputUrl(input) : input;
  if (!parsed) return false;

  const protocol = parsed.protocol?.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return false;
  }

  return !isBlockedHostname(parsed.hostname);
}

export function normalizeUrl(input) {
  return parseInputUrl(input)?.toString() ?? null;
}

export function getReadableHostname(input) {
  const hostname = getHostname(input);
  if (!hostname) return null;
  return hostname.replace(/^www\./, "");
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

    if ((kind === "reel" || kind === "reels" || kind === "p") && contentId) {
      const normalizedKind = kind === "reels" ? "reel" : kind;
      return `https://www.instagram.com/${normalizedKind}/${contentId}/`;
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

export function getGeneratedTitle(platform, inputUrl) {
  if (platform === "amazon") {
    return "Amazon Product";
  }
  if (platform === "web") {
    return getReadableHostname(inputUrl) || "Saved Webpage";
  }

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

function isBlockedHostname(hostname) {
  if (!hostname) return true;

  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return isPrivateOrLocalIpv4(host);
  }

  if (host.includes(":")) {
    return isPrivateOrLocalIpv6(host);
  }

  return false;
}

function isPrivateOrLocalIpv4(ip) {
  const parts = ip.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;

  // Loopback 127.0.0.0/8
  if (a === 127) return true;
  // Current network 0.0.0.0/8
  if (a === 0) return true;
  // Private 10.0.0.0/8
  if (a === 10) return true;
  // Private 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // Private 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // Link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // Carrier-grade NAT 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Multicast / reserved
  if (a >= 224) return true;

  return false;
}

function isPrivateOrLocalIpv6(ip) {
  const normalized = ip.toLowerCase();

  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  ) {
    return true;
  }

  return false;
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
