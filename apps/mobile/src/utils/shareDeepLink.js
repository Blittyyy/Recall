import * as Linking from "expo-linking";

function normalizeShareRouteKey(path, hostname) {
  const routeKey = (path || hostname || "").replace(/^\//, "").toLowerCase();
  return routeKey;
}

function isShareImportRoute(routeKey) {
  return (
    routeKey === "save" ||
    routeKey === "add" ||
    routeKey === "(tabs)/add" ||
    routeKey.endsWith("/add")
  );
}

export function normalizeShareUrlParam(value) {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!raw) {
    return null;
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function shareUrlsMatch(left, right) {
  const normalizedLeft = normalizeShareUrlParam(left);
  const normalizedRight = normalizeShareUrlParam(right);
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
}

export function extractShareUrlFromLink(link) {
  if (!link?.trim()) {
    return null;
  }

  try {
    const { path, hostname, queryParams } = Linking.parse(link);
    const urlParam = queryParams?.url;
    const sharedUrl = (Array.isArray(urlParam) ? urlParam[0] : urlParam)?.trim();

    if (!sharedUrl) {
      return null;
    }

    const routeKey = normalizeShareRouteKey(path, hostname);
    if (!isShareImportRoute(routeKey)) {
      return null;
    }

    return sharedUrl;
  } catch {
    return null;
  }
}
