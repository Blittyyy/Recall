export function getOpenActionLabel(item) {
  if (isProductContent(item)) {
    return "View Product";
  }

  const platform = `${item?.platform ?? ""}`.trim().toLowerCase();
  if (platform === "web" || platform === "amazon") {
    return "Open Page";
  }

  return "Open Video";
}

function isProductContent(item) {
  const contentType = `${item?.contentType ?? item?.content_type ?? ""}`
    .trim()
    .toLowerCase();
  if (contentType === "product") {
    return true;
  }

  const ogType = `${item?.ogType ?? item?.og_type ?? ""}`.trim().toLowerCase();
  return ogType === "product";
}
