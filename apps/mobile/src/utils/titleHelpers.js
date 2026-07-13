const HASHTAG_PATTERN = /#[^\s#]+/g;
const MENTION_PATTERN = /@[A-Za-z0-9._]+/g;
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripSocialTokens(text) {
  return normalizeSpaces(
    text
      .replace(HASHTAG_PATTERN, "")
      .replace(MENTION_PATTERN, "")
      .replace(URL_PATTERN, ""),
  );
}

function stripPlatformSuffix(text) {
  return text
    .replace(/\s+•\s+Instagram.*$/i, "")
    .replace(/\s+on Instagram:?.*$/i, "")
    .trim();
}

/**
 * Social platforms often return the full caption as the title, with hashtags,
 * mentions, and links mixed in. This returns the readable caption for display.
 */
export function getDisplayTitle(title, fallback = "Saved Video") {
  if (!title?.trim()) {
    return fallback;
  }

  const trimmed = stripPlatformSuffix(title.trim());
  if (!trimmed) {
    return fallback;
  }

  const beforeSocialRun = trimmed.split(/\s+(?=[#@])/)[0]?.trim();
  if (beforeSocialRun && beforeSocialRun.length >= 3) {
    const cleaned = stripSocialTokens(beforeSocialRun);
    if (cleaned.length >= 3) {
      return cleaned;
    }
    return beforeSocialRun;
  }

  const cleaned = stripSocialTokens(trimmed);
  if (cleaned.length >= 3) {
    return cleaned;
  }

  return trimmed || fallback;
}
