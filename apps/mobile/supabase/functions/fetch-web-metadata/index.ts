// Setup: supabase functions serve fetch-web-metadata
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { parse, type HTMLElement } from "npm:node-html-parser@6.1.13";

const FUNCTION_NAME = "fetch-web-metadata";
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 256_000;
const AMAZON_MAX_RESPONSE_BYTES = 768_000;
// Temporary Amazon image-source diagnostics. Keep false in production after verify.
const AMAZON_IMAGE_DIAGNOSTICS = false;
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const FIELD_LIMITS = {
  title: 300,
  siteName: 120,
  description: 500,
  url: 2048,
  hostname: 253,
} as const;

// Browser-like UA: Amazon (and some other sites) serve empty/blocked pages to
// custom bots, which leaves only a generic brand thumbnail.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type MetadataResponse = {
  title: string;
  siteName: string;
  description: string | null;
  thumbnailUrl: string | null;
  finalUrl: string;
  hostname: string;
};

type CacheEntry = {
  expiresAt: number;
  value: MetadataResponse;
};

type RateEntry = {
  resetAt: number;
  count: number;
};

const metadataCache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, RateEntry>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(null, 204);
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed.", 405);
  }

  try {
    const userId = await requireAuthenticatedUser(req);
    if (!allowRequest(userId)) {
      return jsonError("Too many requests. Try again shortly.", 429);
    }

    const body = await req.json().catch(() => null);
    const inputUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!inputUrl) {
      return jsonError("A valid url is required.", 400);
    }

    const normalized = normalizeInputUrl(inputUrl);
    if (!normalized) {
      return jsonError("A valid url is required.", 400);
    }

    const cacheKey = normalized;
    const cached = metadataCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return corsResponse(cached.value, 200);
    }

    const metadata = await fetchAndParseMetadata(normalized);
    metadataCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: metadata,
    });
    pruneMaps();

    return corsResponse(metadata, 200);
  } catch (error) {
    const status = typeof error?.status === "number" ? error.status : 422;
    console.error(`[${FUNCTION_NAME}]`, error?.message ?? error);
    return jsonError("Unable to fetch webpage metadata.", status);
  }
});

async function requireAuthenticatedUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error("Server misconfigured"), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return data.user.id;
}

function allowRequest(userId: string): boolean {
  const now = Date.now();
  const existing = rateLimits.get(userId);
  if (!existing || existing.resetAt <= now) {
    rateLimits.set(userId, { resetAt: now + RATE_LIMIT_WINDOW_MS, count: 1 });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return false;
  }

  existing.count += 1;
  return true;
}

async function fetchAndParseMetadata(startUrl: string): Promise<MetadataResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const amazonAsin = extractAmazonAsin(startUrl);
  // Desktop product pages include #landingImage / colorImages; mobile often does not.
  const fetchUrl = toAmazonDesktopProductUrl(startUrl) || startUrl;

  try {
    const { html, finalUrl } = await fetchHtmlFollowingRedirects(
      fetchUrl,
      controller.signal,
      {
        userAgent: USER_AGENT,
      },
    );
    const canonicalUrl =
      (amazonAsin && looksLikeAmazonProductUrl(startUrl) ? startUrl : null) ||
      finalUrl;
    return extractMetadata(html, canonicalUrl, { rawHtml: html });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      const fallback = buildAmazonAsinFallbackMetadata(startUrl, "amazon_timeout");
      if (fallback) return fallback;
      throw Object.assign(new Error("Timed out"), { status: 504 });
    }
    const fallback = buildAmazonAsinFallbackMetadata(startUrl, "amazon_fetch_error");
    if (fallback) return fallback;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchHtmlFollowingRedirects(
  startUrl: string,
  signal: AbortSignal,
  options?: { userAgent?: string },
): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = startUrl;
  const userAgent = options?.userAgent || USER_AGENT;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafePublicUrl(currentUrl);

    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "User-Agent": userAgent,
        "Accept-Language": "en-US,en;q=0.8",
      },
    });

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      await cancelBody(response);
      if (!location?.trim()) {
        throw Object.assign(new Error("Redirect missing location"), {
          status: 422,
        });
      }

      let nextUrl: string;
      try {
        nextUrl = new URL(location.trim(), currentUrl).toString();
      } catch {
        throw Object.assign(new Error("Invalid redirect"), { status: 422 });
      }

      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) {
      await cancelBody(response);
      throw Object.assign(new Error(`Upstream status ${response.status}`), {
        status: 422,
      });
    }

    const contentType = (response.headers.get("content-type") || "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    if (
      contentType &&
      contentType !== "text/html" &&
      contentType !== "application/xhtml+xml"
    ) {
      await cancelBody(response);
      throw Object.assign(new Error("Unsupported content type"), {
        status: 422,
      });
    }

    const html = await readHtmlBudget(response, {
      maxBytes: isAmazonHost(safeHostname(currentUrl))
        ? AMAZON_MAX_RESPONSE_BYTES
        : MAX_RESPONSE_BYTES,
      stopWhen: isAmazonHost(safeHostname(currentUrl))
        ? hasAmazonProductImageMarker
        : undefined,
    });
    return { html, finalUrl: currentUrl };
  }

  throw Object.assign(new Error("Too many redirects"), { status: 422 });
}

async function readHtmlBudget(
  response: Response,
  options?: {
    maxBytes?: number;
    stopWhen?: (html: string) => boolean;
  },
): Promise<string> {
  if (!response.body) {
    return "";
  }

  const maxBytes = options?.maxBytes ?? MAX_RESPONSE_BYTES;
  const stopWhen = options?.stopWhen;
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    received += value.byteLength;
    html += decoder.decode(value, { stream: true });

    // Read past </head> so body titles (#firstHeading, #productTitle, h1) are
    // available, but still enforce the hard response-size budget.
    const pastHead = html.includes("</head>");
    const canStopEarly =
      pastHead && typeof stopWhen === "function" && stopWhen(html);
    if (received >= maxBytes || canStopEarly) {
      try {
        await reader.cancel();
      } catch {
        // ignore cancel errors
      }
      break;
    }
  }

  html += decoder.decode();
  if (html.length > maxBytes) {
    return html.slice(0, maxBytes);
  }
  return html;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function hasAmazonProductImageMarker(html: string): boolean {
  // Prefer stopping once high-confidence product-image embeds are present.
  // data-a-dynamic-image alone is not enough (often only tiny thumbs).
  return (
    html.includes("data-old-hires=") ||
    /colorImages['"]?\s*:/.test(html) ||
    html.includes("ImageBlockATF") ||
    (html.includes("landingImageUrl") && html.includes("/images/I/"))
  );
}

type TitleCandidate = {
  value: string;
  source: string;
  baseScore: number;
};

const GENERIC_TITLES = [
  "amazon",
  "amazon.com",
  "wikipedia",
  "wikipedia, the free encyclopedia",
  "youtube",
  "instagram",
  "tiktok",
  "reddit",
  "facebook",
  "home",
  "welcome",
  "official site",
  "official website",
  "sign in",
  "log in",
  "login",
  "menu",
  "search",
  "cookie",
  "cookies",
  "privacy",
  "terms",
] as const;

const GENERIC_PATH_SEGMENTS = new Set([
  "index",
  "home",
  "product",
  "products",
  "article",
  "articles",
  "page",
  "pages",
  "item",
  "items",
  "view",
  "detail",
  "details",
  "dp",
  "gp",
  "wiki",
  "www",
]);

const TITLE_SOURCE_SCORES: Record<string, number> = {
  "wikipedia.firstHeading": 100,
  "amazon.productTitle": 96,
  "jsonld.Product.name": 94,
  "jsonld.Article.headline": 92,
  "jsonld.NewsArticle.headline": 92,
  "jsonld.BlogPosting.headline": 92,
  "jsonld.WebPage.name": 80,
  "jsonld.item.name": 88,
  "visible.mainH1": 86,
  "visible.h1": 78,
  "meta.og:title": 70,
  "meta.twitter:title": 66,
  "meta.name.title": 62,
  "meta.name.headline": 64,
  "html.title": 50,
  "url.slug": 42,
  "fallback.hostname": 8,
  "fallback.amazonProduct": 20,
};

function extractMetadata(
  html: string,
  pageUrl: string,
  options?: { rawHtml?: string },
): MetadataResponse {
  const root = parse(html, {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: {
      script: true,
      noscript: true,
      style: true,
      pre: true,
    },
  });

  const hostname = getReadableHostname(pageUrl) || "webpage";
  const wiki = isWikipediaHost(hostname);
  const amazon = isAmazonHost(hostname);
  const ogSiteName = decodeEntities(readMeta(root, "property", "og:site_name"));
  const siteName = clamp(
    decodeEntities(
      (wiki ? "Wikipedia" : null) ||
        (amazon ? "Amazon" : null) ||
        ogSiteName ||
        hostname,
    ) || hostname,
    FIELD_LIMITS.siteName,
  );

  const jsonLd = collectJsonLdNodes(root);
  const candidates: TitleCandidate[] = [];

  if (wiki) {
    pushCandidate(
      candidates,
      cleanWikipediaTitle(readElementText(root.querySelector("#firstHeading"))),
      "wikipedia.firstHeading",
    );
    pushCandidate(
      candidates,
      cleanWikipediaTitle(readBestVisibleH1(root, { preferMain: true })),
      "visible.mainH1",
    );
  }

  if (amazon) {
    pushCandidate(
      candidates,
      cleanAmazonTitle(readElementText(root.querySelector("#productTitle"))),
      "amazon.productTitle",
    );
  }

  for (const node of jsonLd) {
    collectJsonLdTitleCandidates(node, candidates);
  }

  pushCandidate(
    candidates,
    cleanTitleByHost(
      decodeEntities(readMeta(root, "property", "og:title")),
      { wiki, amazon },
    ),
    "meta.og:title",
  );
  pushCandidate(
    candidates,
    cleanTitleByHost(
      decodeEntities(readMeta(root, "name", "twitter:title")),
      { wiki, amazon },
    ),
    "meta.twitter:title",
  );
  pushCandidate(
    candidates,
    cleanTitleByHost(
      decodeEntities(readMeta(root, "name", "title")),
      { wiki, amazon },
    ),
    "meta.name.title",
  );
  pushCandidate(
    candidates,
    cleanTitleByHost(
      decodeEntities(readMeta(root, "name", "headline")),
      { wiki, amazon },
    ),
    "meta.name.headline",
  );

  if (!wiki && !amazon) {
    pushCandidate(
      candidates,
      normalizeTitleText(readBestVisibleH1(root, { preferMain: true })),
      "visible.mainH1",
    );
    pushCandidate(
      candidates,
      normalizeTitleText(readBestVisibleH1(root, { preferMain: false })),
      "visible.h1",
    );
  }

  pushCandidate(
    candidates,
    cleanTitleByHost(
      decodeEntities(root.querySelector("title")?.text || null),
      { wiki, amazon },
    ),
    "html.title",
  );
  pushCandidate(
    candidates,
    titleFromUrlSlug(pageUrl, { wiki, amazon }),
    "url.slug",
  );

  if (amazon && looksLikeAmazonProductUrl(pageUrl)) {
    pushCandidate(candidates, "Amazon Product", "fallback.amazonProduct");
  }
  pushCandidate(candidates, hostname, "fallback.hostname");

  const title = clamp(
    selectBestTitle(candidates, {
      hostname,
      siteName,
      wiki,
      amazon,
    }) || hostname,
    FIELD_LIMITS.title,
  );

  const description = clampNullable(
    decodeEntities(
      readMeta(root, "property", "og:description") ||
        readMeta(root, "name", "twitter:description") ||
        readMeta(root, "name", "description"),
    ),
    FIELD_LIMITS.description,
  );

  const thumbnailCandidate = selectThumbnailUrl(root, pageUrl, jsonLd, {
    amazon,
    rawHtml: options?.rawHtml ?? html,
  });

  const canonical =
    resolvePublicHttpUrl(readLinkHref(root, "canonical"), pageUrl) ||
    resolvePublicHttpUrl(readMeta(root, "property", "og:url"), pageUrl) ||
    (isPublicHttpUrlString(pageUrl) ? pageUrl : null);

  if (!canonical) {
    throw Object.assign(new Error("No safe final URL"), { status: 422 });
  }

  return {
    title: title || hostname,
    siteName: siteName || hostname,
    description,
    thumbnailUrl: thumbnailCandidate
      ? clamp(thumbnailCandidate, FIELD_LIMITS.url)
      : null,
    finalUrl: clamp(canonical, FIELD_LIMITS.url),
    hostname: clamp(getReadableHostname(canonical) || hostname, FIELD_LIMITS.hostname),
  };
}

function pushCandidate(
  candidates: TitleCandidate[],
  value: string | null | undefined,
  source: string,
): void {
  const normalized = normalizeTitleText(value);
  if (!normalized) return;
  candidates.push({
    value: normalized,
    source,
    baseScore: TITLE_SOURCE_SCORES[source] ?? 30,
  });
}

function selectBestTitle(
  candidates: TitleCandidate[],
  context: {
    hostname: string;
    siteName: string;
    wiki: boolean;
    amazon: boolean;
  },
): string | null {
  let best: { value: string; score: number } | null = null;

  for (const candidate of candidates) {
    const cleaned = cleanTitleByHost(candidate.value, {
      wiki: context.wiki,
      amazon: context.amazon,
    });
    if (!cleaned) continue;

    const score = scoreTitleCandidate(cleaned, candidate, context);
    if (score == null) continue;

    if (!best || score > best.score) {
      best = { value: cleaned, score };
    }
  }

  return best?.value ?? null;
}

function scoreTitleCandidate(
  value: string,
  candidate: TitleCandidate,
  context: {
    hostname: string;
    siteName: string;
    wiki: boolean;
    amazon: boolean;
  },
): number | null {
  if (!isUsefulTitle(value, context)) {
    return null;
  }

  let score = candidate.baseScore;

  if (isGenericTitle(value, context)) {
    score -= 120;
  }

  // Prefer longer, contentful titles over short brand labels.
  if (value.length >= 24) score += 8;
  else if (value.length >= 12) score += 4;
  else if (value.length <= 4) score -= 20;

  // Structured / page-specific sources beat generic Open Graph brand titles.
  if (
    candidate.source.startsWith("wikipedia.") ||
    candidate.source.startsWith("amazon.") ||
    candidate.source.startsWith("jsonld.") ||
    candidate.source.startsWith("visible.")
  ) {
    score += 6;
  }

  if (score < 0) return null;
  return score;
}

function isUsefulTitle(
  value: string,
  context: { hostname: string; siteName: string },
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length < 3) return false;
  if (/^[\W_]+$/u.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^[a-f0-9]{8,}$/i.test(trimmed)) return false;
  if (isGenericTitle(trimmed, context)) return false;
  return true;
}

function isGenericTitle(
  value: string,
  context: { hostname: string; siteName: string },
): boolean {
  const normalized = normalizeForCompare(value);
  if (!normalized) return true;

  for (const generic of GENERIC_TITLES) {
    if (normalized === generic) return true;
  }

  const host = normalizeForCompare(context.hostname);
  const hostNoTld = host.replace(/\.[a-z]{2,}$/i, "");
  const site = normalizeForCompare(context.siteName);
  const registrable = getRegistrableLabel(context.hostname);

  if (
    normalized === host ||
    normalized === hostNoTld ||
    normalized === site ||
    (registrable && normalized === registrable)
  ) {
    return true;
  }

  // Exact brand-only patterns like "Amazon.com: Amazon.com"
  if (/^(amazon(?:\.com)?)(?:\s*[:|\-–—]\s*\1)?$/i.test(value.trim())) {
    return true;
  }

  return false;
}

function cleanTitleByHost(
  value: string | null | undefined,
  flags: { wiki: boolean; amazon: boolean },
): string | null {
  if (flags.wiki) return cleanWikipediaTitle(value);
  if (flags.amazon) return cleanAmazonTitle(value);
  return normalizeTitleText(value);
}

function cleanWikipediaTitle(value: string | null | undefined): string | null {
  let next = normalizeTitleText(value);
  if (!next) return null;
  next = next
    .replace(/\s*[-–—]\s*Wikipedia\s*$/i, "")
    .replace(/\s*\|\s*Wikipedia\s*$/i, "")
    .trim();
  return normalizeTitleText(next);
}

function cleanAmazonTitle(value: string | null | undefined): string | null {
  let next = normalizeTitleText(value);
  if (!next) return null;
  next = next
    .replace(/^Amazon\.com\s*:\s*/i, "")
    .replace(/^Amazon\.[a-z.]+\s*:\s*/i, "")
    .replace(/\s*:\s*Amazon\.com\s*$/i, "")
    .replace(/\s*:\s*Amazon\.[a-z.]+\s*$/i, "")
    .replace(/\s*[-–—|]\s*Amazon\.com\s*$/i, "")
    .replace(/\s*[-–—|]\s*Amazon\.[a-z.]+\s*$/i, "")
    .replace(/\s+on Amazon\.com\s*$/i, "")
    .trim();
  return normalizeTitleText(next);
}

function normalizeTitleText(value: string | null | undefined): string | null {
  const decoded = decodeEntities(value);
  if (!decoded) return null;
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > FIELD_LIMITS.title
    ? collapsed.slice(0, FIELD_LIMITS.title).trim()
    : collapsed;
}

function normalizeForCompare(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRegistrableLabel(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  // amazon.co.uk → amazon; en.wikipedia.org → wikipedia
  if (parts.length >= 3 && parts[parts.length - 2].length <= 3) {
    return parts[parts.length - 3] || null;
  }
  return parts[parts.length - 2] || null;
}

function isWikipediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "wikipedia.org" || host.endsWith(".wikipedia.org");
}

function isAmazonHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "amzn.to" || host === "a.co" || host.endsWith(".amzn.to")) {
    return true;
  }
  return /(^|\.)amazon\.[a-z.]+$/i.test(host);
}

function looksLikeAmazonProductUrl(pageUrl: string): boolean {
  try {
    const path = new URL(pageUrl).pathname.toLowerCase();
    return (
      path.includes("/dp/") ||
      path.includes("/gp/product/") ||
      /\/gp\/aw\/d\//.test(path)
    );
  } catch {
    return false;
  }
}

function extractAmazonAsin(pageUrl: string): string | null {
  try {
    const path = new URL(pageUrl).pathname;
    const patterns = [
      /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
      /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
      /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i,
      /\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
    ];
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match?.[1]) return match[1].toUpperCase();
    }
  } catch {
    return null;
  }
  return null;
}

function toAmazonDesktopProductUrl(pageUrl: string): string | null {
  try {
    const parsed = new URL(pageUrl);
    if (!isAmazonHost(parsed.hostname)) return null;
    const asin = extractAmazonAsin(pageUrl);
    if (!asin) return null;
    return `https://${parsed.hostname}/dp/${asin}`;
  } catch {
    return null;
  }
}

function buildAmazonAsinFallbackMetadata(
  pageUrl: string,
  reason = "amazon_blocked",
): MetadataResponse | null {
  try {
    const parsed = new URL(pageUrl);
    if (!isAmazonHost(parsed.hostname)) return null;
    const asin = extractAmazonAsin(pageUrl);
    if (!asin) return null;
    const hostname = parsed.hostname.replace(/^www\./i, "") || "amazon.com";
    logAmazonImageDiagnostic("fallback_null_image", { reason, host: hostname });
    return {
      title: titleFromUrlSlug(pageUrl, { wiki: false, amazon: true }) ||
        "Amazon Product",
      siteName: "Amazon",
      description: null,
      thumbnailUrl: null,
      finalUrl: pageUrl,
      hostname,
    };
  } catch {
    return null;
  }
}

function normalizeAmazonImageUrl(raw: string): string {
  let value = decodeEntities(raw.trim()) || raw.trim();
  value = value
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
  if (value.startsWith("//")) {
    value = `https:${value}`;
  }
  return value;
}

function collectJsonLdNodes(root: HTMLElement): unknown[] {
  const nodes: unknown[] = [];
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const raw = script.text?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        nodes.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        nodes.push(parsed);
        const graph = (parsed as { "@graph"?: unknown })["@graph"];
        if (Array.isArray(graph)) nodes.push(...graph);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return nodes;
}

function collectJsonLdTitleCandidates(
  node: unknown,
  candidates: TitleCandidate[],
): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const typeRaw = record["@type"];
  const types = Array.isArray(typeRaw)
    ? typeRaw.map((entry) => String(entry))
    : typeRaw
    ? [String(typeRaw)]
    : [];
  const typeSet = new Set(types.map((entry) => entry.toLowerCase()));

  if (typeSet.has("product")) {
    pushCandidate(candidates, readJsonLdString(record.name), "jsonld.Product.name");
  }
  if (typeSet.has("article")) {
    pushCandidate(
      candidates,
      readJsonLdString(record.headline) || readJsonLdString(record.name),
      "jsonld.Article.headline",
    );
  }
  if (typeSet.has("newsarticle")) {
    pushCandidate(
      candidates,
      readJsonLdString(record.headline) || readJsonLdString(record.name),
      "jsonld.NewsArticle.headline",
    );
  }
  if (typeSet.has("blogposting")) {
    pushCandidate(
      candidates,
      readJsonLdString(record.headline) || readJsonLdString(record.name),
      "jsonld.BlogPosting.headline",
    );
  }
  if (typeSet.has("webpage") || typeSet.has("web page")) {
    pushCandidate(candidates, readJsonLdString(record.name), "jsonld.WebPage.name");
  }

  const item = record.item;
  if (item && typeof item === "object") {
    pushCandidate(
      candidates,
      readJsonLdString((item as Record<string, unknown>).name),
      "jsonld.item.name",
    );
  }

  // Some pages nest products under mainEntity.
  const mainEntity = record.mainEntity;
  if (mainEntity) {
    collectJsonLdTitleCandidates(mainEntity, candidates);
  }
}

function readJsonLdString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = readJsonLdString(entry);
      if (nested) return nested;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return readJsonLdString(record.name) || readJsonLdString(record["@value"]);
  }
  return null;
}

function readJsonLdImage(
  nodes: unknown[],
  pageUrl: string,
): string | null {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    const imageUrl = firstImageUrl(record.image, pageUrl);
    if (imageUrl) return imageUrl;

    const mainEntity = record.mainEntity;
    if (mainEntity && typeof mainEntity === "object") {
      const nested = firstImageUrl(
        (mainEntity as Record<string, unknown>).image,
        pageUrl,
      );
      if (nested) return nested;
    }
  }
  return null;
}

function readJsonLdProductImage(
  nodes: unknown[],
  pageUrl: string,
): string | null {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    const typeRaw = record["@type"];
    const types = Array.isArray(typeRaw)
      ? typeRaw.map((entry) => String(entry).toLowerCase())
      : typeRaw
      ? [String(typeRaw).toLowerCase()]
      : [];

    const isProduct = types.some(
      (type) => type === "product" || type.endsWith("/product"),
    );

    if (isProduct) {
      const images = collectImageUrls(record.image, pageUrl);
      for (const imageUrl of images) {
        const accepted = acceptAmazonProductImage(imageUrl);
        if (accepted) return accepted;
      }
    }

    const mainEntity = record.mainEntity;
    if (mainEntity) {
      const nested = readJsonLdProductImage(
        Array.isArray(mainEntity) ? mainEntity : [mainEntity],
        pageUrl,
      );
      if (nested) return nested;
    }
  }
  return null;
}

function collectImageUrls(value: unknown, pageUrl: string): string[] {
  const urls: string[] = [];

  const visit = (entry: unknown) => {
    if (!entry) return;
    if (typeof entry === "string") {
      const resolved = resolvePublicHttpUrl(entry, pageUrl);
      if (resolved) urls.push(resolved);
      return;
    }
    if (Array.isArray(entry)) {
      for (const item of entry) visit(item);
      return;
    }
    if (typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      visit(record.url);
      visit(record.contentUrl);
      visit(record["@id"]);
    }
  };

  visit(value);
  return urls;
}

function firstImageUrl(value: unknown, pageUrl: string): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return resolvePublicHttpUrl(value, pageUrl);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstImageUrl(entry, pageUrl);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      firstImageUrl(record.url, pageUrl) ||
      firstImageUrl(record.contentUrl, pageUrl) ||
      firstImageUrl(record["@id"], pageUrl)
    );
  }
  return null;
}

function readElementText(node: HTMLElement | null): string | null {
  if (!node) return null;
  const text = node.text?.replace(/\s+/g, " ").trim();
  return text || null;
}

function readBestVisibleH1(
  root: HTMLElement,
  options: { preferMain: boolean },
): string | null {
  const selectors = options.preferMain
    ? ["main h1", "article h1", '[role="main"] h1', "#content h1", "#main h1"]
    : ["h1"];

  for (const selector of selectors) {
    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
      if (isIgnoredHeading(node)) continue;
      const text = normalizeTitleText(readElementText(node));
      if (!text) continue;
      if (text.length > 180) continue;
      return text;
    }
  }
  return null;
}

function isIgnoredHeading(node: HTMLElement): boolean {
  let current: HTMLElement | null = node;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    const id = (current.id || "").toLowerCase();
    const className = `${current.getAttribute("class") || ""}`.toLowerCase();
    const tag = (current.tagName || "").toLowerCase();
    const role = `${current.getAttribute("role") || ""}`.toLowerCase();
    const haystack = `${id} ${className} ${role}`;

    if (
      tag === "nav" ||
      tag === "header" ||
      tag === "footer" ||
      role === "navigation" ||
      role === "banner" ||
      /(?:^|[\s_-])(nav|menu|header|footer|cookie|consent|login|signin|signup|modal|dialog|banner)(?:$|[\s_-])/i
        .test(haystack)
    ) {
      return true;
    }

    current = current.parentNode as HTMLElement | null;
  }
  return false;
}

function titleFromUrlSlug(
  pageUrl: string,
  flags: { wiki: boolean; amazon: boolean },
): string | null {
  try {
    const parsed = new URL(pageUrl);
    const segments = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    if (flags.wiki) {
      const wikiIndex = segments.findIndex((part) =>
        part.toLowerCase() === "wiki"
      );
      if (wikiIndex >= 0 && segments[wikiIndex + 1]) {
        return cleanWikipediaTitle(decodeSlugSegment(segments[wikiIndex + 1]));
      }
    }

    if (flags.amazon) {
      const dpIndex = segments.findIndex((part) =>
        part.toLowerCase() === "dp" || part.toLowerCase() === "product"
      );
      if (dpIndex > 0) {
        return cleanAmazonTitle(decodeSlugSegment(segments[dpIndex - 1]));
      }
      // /gp/product/ASIN
      const gpIndex = segments.findIndex((part) => part.toLowerCase() === "gp");
      if (
        gpIndex >= 0 &&
        segments[gpIndex + 1]?.toLowerCase() === "product" &&
        gpIndex > 0
      ) {
        // Prefer descriptive segment before /gp when present.
        const before = segments[gpIndex - 1];
        if (before && !GENERIC_PATH_SEGMENTS.has(before.toLowerCase())) {
          return cleanAmazonTitle(decodeSlugSegment(before));
        }
      }
    }

    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const raw = segments[i];
      const lower = raw.toLowerCase();
      if (GENERIC_PATH_SEGMENTS.has(lower)) continue;
      if (/^\d+$/.test(raw)) continue;
      if (/^[a-z0-9]{10,}$/i.test(raw) && !/[-_]/.test(raw)) continue;
      if (/\.(html?|php|aspx?|jsp)$/i.test(raw)) {
        const withoutExt = raw.replace(/\.(html?|php|aspx?|jsp)$/i, "");
        const decoded = decodeSlugSegment(withoutExt);
        if (decoded) return decoded;
        continue;
      }
      const decoded = decodeSlugSegment(raw);
      if (decoded) return decoded;
    }
  } catch {
    return null;
  }
  return null;
}

function decodeSlugSegment(segment: string): string | null {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment.replace(/\+/g, " "));
  } catch {
    decoded = segment;
  }
  decoded = decoded.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!decoded) return null;
  if (/^\d+$/.test(decoded)) return null;
  if (/^[a-f0-9]{10,}$/i.test(decoded)) return null;
  if (GENERIC_PATH_SEGMENTS.has(decoded.toLowerCase())) return null;

  // Title-case mostly-lowercase slugs; preserve mixed/camel-ish casing.
  if (decoded === decoded.toLowerCase() || decoded === decoded.toUpperCase()) {
    decoded = decoded
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word ? word.charAt(0).toUpperCase() + word.slice(1) : word
      )
      .join(" ");
  }
  return normalizeTitleText(decoded);
}

function selectThumbnailUrl(
  root: HTMLElement,
  pageUrl: string,
  jsonLd: unknown[],
  flags: { amazon: boolean; rawHtml?: string },
): string | null {
  const ogImage = readMeta(root, "property", "og:image");
  const twitterImage =
    readMeta(root, "name", "twitter:image") ||
    readMeta(root, "name", "twitter:image:src");

  if (flags.amazon) {
    return selectAmazonProductThumbnailUrl(
      root,
      pageUrl,
      jsonLd,
      { ogImage, twitterImage },
      flags.rawHtml || "",
    );
  }

  const faviconHref =
    readLinkHref(root, "apple-touch-icon") ||
    readLinkHref(root, "icon") ||
    readLinkHref(root, "shortcut icon") ||
    "/favicon.ico";

  return (
    readJsonLdImage(jsonLd, pageUrl) ||
    resolvePublicHttpUrl(ogImage, pageUrl) ||
    resolvePublicHttpUrl(twitterImage, pageUrl) ||
    resolvePublicHttpUrl(faviconHref, pageUrl)
  );
}

/**
 * Amazon product-image priority (first valid wins):
 * 1. JSON-LD Product.image
 * 2. #landingImage data-old-hires
 * 3. highest-resolution URL from #landingImage data-a-dynamic-image
 * 4. Amazon embedded colorImages.initial
 * 5. Amazon ImageBlockATF / imageBlock data
 * 6. #imgTagWrapperId img data-old-hires
 * 7. #imgTagWrapperId img data-a-dynamic-image
 * 8. #imgTagWrapperId img src
 * 9. valid product-specific og:image
 * 10. valid product-specific twitter:image
 * 11. landingImageUrl embed (mobile/SSR variants)
 */
function selectAmazonProductThumbnailUrl(
  root: HTMLElement,
  pageUrl: string,
  jsonLd: unknown[],
  meta: { ogImage: string | null; twitterImage: string | null },
  rawHtml: string,
): string | null {
  const diag = createAmazonImageDiagnostics(rawHtml, root, jsonLd, meta);

  if (isAmazonBlockedOrIncompletePage(rawHtml, pageUrl)) {
    logAmazonImageDiagnostic("amazon_blocked", diag);
    return null;
  }

  const tryAccept = (
    source: string,
    raw: string | null | undefined,
    dimensions?: { width?: number | null; height?: number | null },
  ): string | null => {
    if (!raw?.trim()) return null;
    const normalized = normalizeAmazonImageUrl(raw);
    const resolved = resolvePublicHttpUrl(normalized, pageUrl);
    const accepted = acceptAmazonProductImage(resolved, dimensions);
    if (accepted) {
      logAmazonImageDiagnostic("selected", {
        ...diag,
        selectedSource: source,
        selectedPath: sanitizeAmazonImagePath(accepted),
      });
      return accepted;
    }
    return null;
  };

  const fromJsonLd = readJsonLdProductImage(jsonLd, pageUrl);
  if (fromJsonLd) {
    logAmazonImageDiagnostic("selected", {
      ...diag,
      selectedSource: "jsonld.Product.image",
      selectedPath: sanitizeAmazonImagePath(fromJsonLd),
    });
    return fromJsonLd;
  }

  const landing = root.querySelector("#landingImage");
  if (landing) {
    const fromOldHires = tryAccept(
      "landingImage.data-old-hires",
      landing.getAttribute("data-old-hires"),
    );
    if (fromOldHires) return fromOldHires;

    const fromDynamic = pickLargestValidDynamicAmazonImage(
      landing.getAttribute("data-a-dynamic-image"),
      pageUrl,
    );
    if (fromDynamic) {
      logAmazonImageDiagnostic("selected", {
        ...diag,
        selectedSource: "landingImage.data-a-dynamic-image",
        selectedPath: sanitizeAmazonImagePath(fromDynamic),
      });
      return fromDynamic;
    }

    const fromSrc = tryAccept("landingImage.src", landing.getAttribute("src"));
    if (fromSrc) return fromSrc;
  }

  const fromColorImages = readAmazonEmbeddedColorImages(rawHtml, pageUrl);
  if (fromColorImages) {
    logAmazonImageDiagnostic("selected", {
      ...diag,
      selectedSource: "colorImages.initial",
      selectedPath: sanitizeAmazonImagePath(fromColorImages),
    });
    return fromColorImages;
  }

  const fromImageBlock = readAmazonEmbeddedImageBlock(rawHtml, pageUrl);
  if (fromImageBlock) {
    logAmazonImageDiagnostic("selected", {
      ...diag,
      selectedSource: "imageBlock",
      selectedPath: sanitizeAmazonImagePath(fromImageBlock),
    });
    return fromImageBlock;
  }

  const wrapperImg =
    root.querySelector("#imgTagWrapperId img") ||
    root.querySelector("#main-image") ||
    root.querySelector("#main-image-container img");

  if (wrapperImg) {
    const fromWrapperHires = tryAccept(
      "imgTagWrapperId.data-old-hires",
      wrapperImg.getAttribute("data-old-hires"),
    );
    if (fromWrapperHires) return fromWrapperHires;

    const fromWrapperDynamic = pickLargestValidDynamicAmazonImage(
      wrapperImg.getAttribute("data-a-dynamic-image"),
      pageUrl,
    );
    if (fromWrapperDynamic) {
      logAmazonImageDiagnostic("selected", {
        ...diag,
        selectedSource: "imgTagWrapperId.data-a-dynamic-image",
        selectedPath: sanitizeAmazonImagePath(fromWrapperDynamic),
      });
      return fromWrapperDynamic;
    }

    const fromWrapperSrc = tryAccept(
      "imgTagWrapperId.src",
      wrapperImg.getAttribute("src"),
    );
    if (fromWrapperSrc) return fromWrapperSrc;
  }

  const fromOg = tryAccept("og:image", meta.ogImage);
  if (fromOg) return fromOg;

  const fromTwitter = tryAccept("twitter:image", meta.twitterImage);
  if (fromTwitter) return fromTwitter;

  const fromLandingImageUrl = tryAccept(
    "landingImageUrl",
    readAmazonLandingImageUrlEmbed(rawHtml),
  );
  if (fromLandingImageUrl) return fromLandingImageUrl;

  logAmazonImageDiagnostic("no_valid_product_image", diag);
  return null;
}

function pickLargestValidDynamicAmazonImage(
  rawAttr: string | null | undefined,
  pageUrl: string,
): string | null {
  if (!rawAttr?.trim()) return null;

  const decoded = normalizeAmazonImageUrl(rawAttr);
  try {
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    let bestUrl: string | null = null;
    let bestArea = -1;

    for (const [key, value] of Object.entries(parsed)) {
      const resolved = resolvePublicHttpUrl(
        normalizeAmazonImageUrl(key),
        pageUrl,
      );
      if (!resolved) continue;

      let width: number | null = null;
      let height: number | null = null;
      let area = 0;
      if (Array.isArray(value) && value.length >= 2) {
        const parsedWidth = Number(value[0]);
        const parsedHeight = Number(value[1]);
        if (Number.isFinite(parsedWidth)) width = parsedWidth;
        if (Number.isFinite(parsedHeight)) height = parsedHeight;
        if (width != null && height != null) area = width * height;
      }

      const accepted = acceptAmazonProductImage(resolved, { width, height });
      if (!accepted) continue;
      if (area >= bestArea) {
        bestArea = area;
        bestUrl = accepted;
      }
    }

    return bestUrl;
  } catch {
    return null;
  }
}

function readAmazonLandingImageUrlEmbed(html: string): string | null {
  if (!html) return null;
  const patterns = [
    /"landingImageUrl"\s*:\s*"(https:[^"]+)"/i,
    /landingImageUrl&quot;:&quot;(https:[^&"]+)/i,
    /"heroImage"\s*:\s*"(https:[^"]+)"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return normalizeAmazonImageUrl(match[1]);
  }
  return null;
}

function readAmazonEmbeddedColorImages(
  html: string,
  pageUrl: string,
): string | null {
  if (!html || !/colorImages/i.test(html)) return null;

  const hiRes = findFirstAcceptedAmazonUrl(
    html,
    /"hiRes"\s*:\s*"(https:[^"]+|https:\\\/\\\/[^"]+)"/gi,
    pageUrl,
  );
  if (hiRes) return hiRes;

  const large = findFirstAcceptedAmazonUrl(
    html,
    /"large"\s*:\s*"(https:[^"]+|https:\\\/\\\/[^"]+)"/gi,
    pageUrl,
  );
  if (large) return large;

  const main = findFirstAcceptedAmazonUrl(
    html,
    /"main"\s*:\s*\{\s*"(https:[^"]+)"/gi,
    pageUrl,
  );
  if (main) return main;

  return null;
}

function readAmazonEmbeddedImageBlock(
  html: string,
  pageUrl: string,
): string | null {
  if (!html) return null;
  if (!/ImageBlockATF|imageBlock/i.test(html)) return null;

  const hiRes = findFirstAcceptedAmazonUrl(
    html,
    /"hiRes"\s*:\s*"(https:[^"]+|https:\\\/\\\/[^"]+)"/gi,
    pageUrl,
  );
  if (hiRes) return hiRes;

  const oldHires = findFirstAcceptedAmazonUrl(
    html,
    /data-old-hires=["'](https:[^"']+)["']/gi,
    pageUrl,
  );
  if (oldHires) return oldHires;

  return null;
}

function findFirstAcceptedAmazonUrl(
  html: string,
  pattern: RegExp,
  pageUrl: string,
): string | null {
  const matches = html.matchAll(pattern);
  for (const match of matches) {
    const raw = match[1];
    if (!raw) continue;
    const normalized = normalizeAmazonImageUrl(raw);
    const resolved = resolvePublicHttpUrl(normalized, pageUrl);
    const accepted = acceptAmazonProductImage(resolved);
    if (accepted) return accepted;
  }
  return null;
}

function acceptAmazonProductImage(
  url: string | null | undefined,
  dimensions?: { width?: number | null; height?: number | null },
): string | null {
  if (!url?.trim()) return null;
  if (isRejectedAmazonImage(url, dimensions)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return url;
}

function isRejectedAmazonImage(
  url: string,
  dimensions?: { width?: number | null; height?: number | null },
): boolean {
  const lower = url.toLowerCase();

  const rejectedTokens = [
    "favicon",
    "apple-touch-icon",
    "site-logo",
    "amazon-logo",
    "/logo.",
    "logo-",
    "-logo",
    "sprite",
    "/sprites/",
    "nav-sprite",
    "icon",
    "/nav/",
    "header",
    "gno/",
    "loading",
    "transparent-pixel",
    "pixel.gif",
    "blank",
    "placeholder",
    "play-button",
    "play-button-overlay",
    ".svg",
    ".css",
    ".js",
    "._rc",
    "|",
  ];
  if (rejectedTokens.some((token) => lower.includes(token))) {
    return true;
  }

  if (lower.includes("/images/g/")) return true;
  if (lower.includes("/images/s/")) return true;
  if (lower.includes("/images/sash/")) return true;
  if (lower.includes("al-na-")) return true;

  const onProductCdn =
    /(?:media-amazon\.com|images-amazon\.com|ssl-images-amazon\.com)/i.test(
      lower,
    ) &&
    (lower.includes("/images/i/") || lower.includes("/images/p/"));
  if (!onProductCdn) return true;

  // Do not reject solely for white backgrounds or square framing.
  const width = dimensions?.width ?? null;
  const height = dimensions?.height ?? null;
  const hasWidth = typeof width === "number" && Number.isFinite(width);
  const hasHeight = typeof height === "number" && Number.isFinite(height);

  if (hasWidth && hasHeight) {
    if (Math.max(width!, height!) < 300) return true;
  }

  const sizeToken = lower.match(
    /\._(?:ac_)?(?:sl|sx|sy|ul|ux|uy|us|ss|sr)(\d{2,4})/i,
  );
  if (sizeToken) {
    const tokenSize = Number(sizeToken[1]);
    if (Number.isFinite(tokenSize) && tokenSize < 300) return true;
  }
  if (/_sr\d{1,3},\d{1,3}_/i.test(lower)) {
    const sr = lower.match(/_sr(\d{1,3}),(\d{1,3})_/i);
    if (sr) {
      const a = Number(sr[1]);
      const b = Number(sr[2]);
      if (Math.max(a, b) < 300) return true;
    }
  }

  return false;
}

function isAmazonBlockedOrIncompletePage(html: string, pageUrl: string): boolean {
  const lower = html.toLowerCase();
  const captcha =
    lower.includes("enter the characters you see below") ||
    lower.includes("type the characters you see in this image") ||
    lower.includes("api-services-support@amazon.com") ||
    (lower.includes("robot check") && lower.includes("captcha"));
  const signInWall =
    lower.includes("/ap/signin") &&
    !lower.includes("producttitle") &&
    !lower.includes("landingimage") &&
    !lower.includes("colorimages");

  const hasProductSignals =
    lower.includes("producttitle") ||
    lower.includes("landingimage") ||
    lower.includes("colorimages") ||
    lower.includes("data-old-hires") ||
    lower.includes("landingimageurl") ||
    /\/images\/i\/[a-z0-9]{8,}/i.test(html);

  if (captcha || signInWall) return true;
  if (
    looksLikeAmazonProductUrl(pageUrl) &&
    html.length < 40_000 &&
    !hasProductSignals
  ) {
    return true;
  }
  return false;
}

function sanitizeAmazonImagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function createAmazonImageDiagnostics(
  html: string,
  root: HTMLElement,
  jsonLd: unknown[],
  meta: { ogImage: string | null; twitterImage: string | null },
): Record<string, unknown> {
  const landing = root.querySelector("#landingImage");
  const wrapper = root.querySelector("#imgTagWrapperId img");
  const productImageCount = readJsonLdProductImageCount(jsonLd);
  const dynamicCount = countDynamicAmazonImages(
    landing?.getAttribute("data-a-dynamic-image"),
  );
  const colorHiResCount = (
    html.match(/"hiRes"\s*:\s*"(https:[^"]+|https:\\\/\\\/[^"]+)"/gi) || []
  ).length;

  return {
    sourcesPresent: {
      jsonldProductImage: productImageCount > 0,
      landingOldHires: Boolean(landing?.getAttribute("data-old-hires")),
      landingDynamicImage: dynamicCount > 0,
      landingSrc: Boolean(landing?.getAttribute("src")),
      colorImages: /colorImages/i.test(html),
      imageBlock: /ImageBlockATF|imageBlock/i.test(html),
      wrapperOldHires: Boolean(wrapper?.getAttribute("data-old-hires")),
      wrapperDynamicImage: Boolean(
        wrapper?.getAttribute("data-a-dynamic-image"),
      ),
      wrapperSrc: Boolean(wrapper?.getAttribute("src")),
      ogImage: Boolean(meta.ogImage),
      twitterImage: Boolean(meta.twitterImage),
      landingImageUrl: /landingImageUrl/i.test(html),
    },
    counts: {
      jsonldProductImage: productImageCount,
      landingDynamicImage: dynamicCount,
      hiResEmbeds: colorHiResCount,
    },
  };
}

function readJsonLdProductImageCount(nodes: unknown[]): number {
  let count = 0;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    const typeRaw = record["@type"];
    const types = Array.isArray(typeRaw)
      ? typeRaw.map((entry) => String(entry).toLowerCase())
      : typeRaw
      ? [String(typeRaw).toLowerCase()]
      : [];
    if (!types.some((type) => type === "product" || type.endsWith("/product"))) {
      continue;
    }
    count += collectImageUrls(record.image, "https://www.amazon.com/").length;
  }
  return count;
}

function countDynamicAmazonImages(rawAttr: string | null | undefined): number {
  if (!rawAttr?.trim()) return 0;
  try {
    const parsed = JSON.parse(normalizeAmazonImageUrl(rawAttr)) as Record<
      string,
      unknown
    >;
    return Object.keys(parsed).length;
  } catch {
    return 0;
  }
}

function logAmazonImageDiagnostic(
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!AMAZON_IMAGE_DIAGNOSTICS) return;
  console.log(
    `[${FUNCTION_NAME}] amazon_image_diag`,
    JSON.stringify({ event, ...payload }),
  );
}
function readMeta(
  root: HTMLElement,
  attr: "property" | "name",
  key: string,
): string | null {
  const nodes = root.querySelectorAll("meta");
  for (const node of nodes) {
    const attrValue = node.getAttribute(attr)?.trim().toLowerCase();
    if (attrValue === key.toLowerCase()) {
      const content = node.getAttribute("content")?.trim();
      if (content) return content;
    }
  }
  return null;
}

function readLinkHref(root: HTMLElement, relValue: string): string | null {
  const target = relValue.toLowerCase();
  const links = root.querySelectorAll("link");
  for (const link of links) {
    const rel = link.getAttribute("rel")?.toLowerCase() || "";
    const relTokens = rel.split(/\s+/).filter(Boolean);
    if (rel === target || relTokens.includes(target)) {
      const href = link.getAttribute("href")?.trim();
      if (href) return href;
    }
  }
  return null;
}

async function assertSafePublicUrl(input: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw Object.assign(new Error("Malformed URL"), { status: 400 });
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw Object.assign(new Error("Only http(s) allowed"), { status: 400 });
  }

  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("Credentials not allowed"), { status: 400 });
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || isBlockedHostname(hostname)) {
    throw Object.assign(new Error("Blocked host"), { status: 400 });
  }

  if (isIpLiteral(hostname)) {
    if (isBlockedIp(hostname)) {
      throw Object.assign(new Error("Blocked IP"), { status: 400 });
    }
    return;
  }

  const addresses = await resolveHostAddresses(hostname);
  if (addresses.length === 0) {
    throw Object.assign(new Error("DNS resolution failed"), { status: 422 });
  }

  for (const address of addresses) {
    if (isBlockedIp(address)) {
      throw Object.assign(new Error("Blocked resolved address"), { status: 400 });
    }
  }
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
  const results = new Set<string>();

  try {
    const aRecords = await Deno.resolveDns(hostname, "A");
    for (const record of aRecords) {
      results.add(record);
    }
  } catch {
    // A may be absent for IPv6-only hosts.
  }

  try {
    const aaaaRecords = await Deno.resolveDns(hostname, "AAAA");
    for (const record of aaaaRecords) {
      results.add(record);
    }
  } catch {
    // AAAA may be absent for IPv4-only hosts.
  }

  return [...results];
}

function normalizeInputUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function isPublicHttpUrlString(input: string): boolean {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!host || isBlockedHostname(host)) {
      return false;
    }
    if (isIpLiteral(host) && isBlockedIp(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function resolvePublicHttpUrl(
  href: string | null | undefined,
  baseUrl: string,
): string | null {
  if (!href?.trim()) return null;
  try {
    const resolved = new URL(href.trim(), baseUrl).toString();
    return isPublicHttpUrlString(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function isBlockedHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (isIpLiteral(hostname)) {
    return isBlockedIp(hostname);
  }

  return false;
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isBlockedIp(ip: string): boolean {
  const value = ip.toLowerCase();

  if (value.includes(":")) {
    return isBlockedIpv6(value);
  }

  return isBlockedIpv4(value);
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  if (ip === "::" || ip === "::1") return true;

  // IPv4-mapped IPv6
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped?.[1]) {
    return isBlockedIpv4(mapped[1]);
  }

  const normalized = expandIpv6(ip);
  if (!normalized) return true;

  // fe80::/10 link-local
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }
  // fc00::/7 unique local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  // ff00::/8 multicast
  if (normalized.startsWith("ff")) {
    return true;
  }

  return false;
}

function expandIpv6(ip: string): string | null {
  try {
    const halves = ip.toLowerCase().split("::");
    if (halves.length > 2) return null;

    const head = halves[0] ? halves[0].split(":").filter(Boolean) : [];
    const tail = halves.length === 2 && halves[1]
      ? halves[1].split(":").filter(Boolean)
      : [];
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null;
    const full = [
      ...head,
      ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => "0"),
      ...tail,
    ];
    if (full.length !== 8) return null;
    return full.map((part) => part.padStart(4, "0")).join("");
  } catch {
    return null;
  }
}

function getReadableHostname(input: string): string | null {
  try {
    return new URL(input).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function decodeEntities(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .trim();
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value.trim();
}

function clampNullable(value: string | null, max: number): string | null {
  if (!value) return null;
  const next = clamp(value, max);
  return next || null;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 ||
    status === 308;
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // ignore
  }
}

function pruneMaps(): void {
  const now = Date.now();
  for (const [key, entry] of metadataCache) {
    if (entry.expiresAt <= now) metadataCache.delete(key);
  }
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
}

function corsResponse(body: unknown, status: number): Response {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return corsResponse({ error: message }, status);
}
