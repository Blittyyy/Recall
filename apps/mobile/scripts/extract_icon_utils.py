from collections import deque

from PIL import Image

COLS = 8
ROWS = 4
MAX_BLEED = 48
ICON_PADDING = 8
ATTACH_GAP = 28
NEIGHBOR_GAP = 18
MIN_FRAGMENT_RATIO = 0.025
MIN_SIGNIFICANT_RATIO = 0.08
EDGE_BLEED_RATIO = 0.12
EDGE_BLEED_CENTROID = 0.22


def make_transparent(img, threshold=30):
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            red, green, blue, alpha = pixels[x, y]
            if red <= threshold and green <= threshold and blue <= threshold:
                pixels[x, y] = (red, green, blue, 0)
    return img


def _is_opaque(pixel, alpha_threshold=40):
    return pixel[3] > alpha_threshold


def _find_components(img):
    width, height = img.size
    pixels = img.load()
    visited = [[False] * width for _ in range(height)]
    components = []

    for start_y in range(height):
        for start_x in range(width):
            if visited[start_y][start_x] or not _is_opaque(pixels[start_x, start_y]):
                continue

            queue = deque([(start_x, start_y)])
            visited[start_y][start_x] = True
            min_x = max_x = start_x
            min_y = max_y = start_y
            area = 0
            sum_x = 0

            while queue:
                x, y = queue.popleft()
                area += 1
                sum_x += x
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and not visited[ny][nx]
                        and _is_opaque(pixels[nx, ny])
                    ):
                        visited[ny][nx] = True
                        queue.append((nx, ny))

            components.append(
                {
                    "area": area,
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "centroid_x": sum_x / area,
                }
            )

    return components


def _remove_neighbor_bleed(components, width):
    if len(components) <= 1:
        return components

    largest_area = max(component["area"] for component in components)
    min_area = largest_area * MIN_FRAGMENT_RATIO
    significant = [
        component
        for component in components
        if component["area"] >= largest_area * MIN_SIGNIFICANT_RATIO
        and component["centroid_x"] > width * 0.32
    ]

    if not significant:
        significant = [max(components, key=lambda component: component["area"])]

    main_left = min(component["bbox"][0] for component in significant)
    main_right = max(component["bbox"][2] for component in significant)
    kept = []

    for component in components:
        if component["area"] < min_area:
            continue

        left, _, right, _ = component["bbox"]
        centroid_ratio = component["centroid_x"] / width
        area_ratio = component["area"] / largest_area

        if right <= main_left - NEIGHBOR_GAP or left >= main_right + NEIGHBOR_GAP:
            continue

        if area_ratio < EDGE_BLEED_RATIO and (
            centroid_ratio < EDGE_BLEED_CENTROID or centroid_ratio > 1 - EDGE_BLEED_CENTROID
        ):
            continue

        kept.append(component)

    return kept or components


def _include_attached_fragments(components, kept, attach_gap=ATTACH_GAP):
    if not kept:
        return kept

    expanded = list(kept)
    min_x = min(component["bbox"][0] for component in kept)
    min_y = min(component["bbox"][1] for component in kept)
    max_x = max(component["bbox"][2] for component in kept)
    max_y = max(component["bbox"][3] for component in kept)

    changed = True
    while changed:
        changed = False
        for component in components:
            if component in expanded:
                continue

            left, top, right, bottom = component["bbox"]
            if (
                right >= min_x - attach_gap
                and left <= max_x + attach_gap
                and bottom >= min_y - attach_gap
                and top <= max_y + attach_gap
            ):
                expanded.append(component)
                min_x = min(min_x, left)
                min_y = min(min_y, top)
                max_x = max(max_x, right)
                max_y = max(max_y, bottom)
                changed = True

    return expanded


def _pick_primary_components(components, cell_left, cell_right):
    if not components:
        return []

    in_cell = [
        component
        for component in components
        if cell_left <= component["centroid_x"] <= cell_right
    ]
    if in_cell:
        return [max(in_cell, key=lambda component: component["area"])]

    return [max(components, key=lambda component: component["area"])]


def _crop_with_padding(img, components, padding=ICON_PADDING):
    min_x = min(component["bbox"][0] for component in components)
    min_y = min(component["bbox"][1] for component in components)
    max_x = max(component["bbox"][2] for component in components)
    max_y = max(component["bbox"][3] for component in components)

    min_x = max(0, min_x - padding)
    min_y = max(0, min_y - padding)
    max_x = min(img.width, max_x + padding)
    max_y = min(img.height, max_y + padding)
    return img.crop((min_x, min_y, max_x, max_y))


def crop_icon_content(img):
    components = _find_components(img)
    if not components:
        return img

    width, _ = img.size
    kept = _remove_neighbor_bleed(components, width)
    kept = _include_attached_fragments(components, kept)

    min_x = min(component["bbox"][0] for component in kept)
    min_y = min(component["bbox"][1] for component in kept)
    max_x = max(component["bbox"][2] for component in kept)
    max_y = max(component["bbox"][3] for component in kept)
    return img.crop((min_x, min_y, max_x, max_y))


def extract_icon(sheet, row, col):
    width, height = sheet.size
    cell_w, cell_h = width // COLS, height // ROWS
    upper = row * cell_h
    lower = upper + cell_h

    bleed_left = MAX_BLEED if col > 0 else 0
    bleed_right = MAX_BLEED if col < COLS - 1 else 0
    left = max(0, col * cell_w - bleed_left)
    right = min(width, (col + 1) * cell_w + bleed_right)

    crop = sheet.crop((left, upper, right, lower))
    crop = make_transparent(crop)
    components = _find_components(crop)
    if not components:
        return crop

    cell_left = col * cell_w - left
    cell_right = cell_left + cell_w
    primary = _pick_primary_components(components, cell_left, cell_right)
    kept = _include_attached_fragments(components, primary)
    crop = _crop_with_padding(crop, kept)

    max_side = max(crop.size)
    square = Image.new("RGBA", (max_side, max_side), (0, 0, 0, 0))
    offset_x = (max_side - crop.width) // 2
    offset_y = (max_side - crop.height) // 2
    square.paste(crop, (offset_x, offset_y), crop)
    return square


def load_sheet(sheet_path):
    return Image.open(sheet_path).convert("RGBA")
