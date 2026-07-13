import os

from PIL import Image

from extract_icon_utils import _find_components, make_transparent

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "assets", "icons", "saved-content")
CANVAS = 112
FILL_RATIO = 0.82
CROP_PADDING = 18

SOURCE_CANDIDATES = [
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        ".cursor",
        "projects",
        "c-Users-Bryan-Blitman-Downloads-anything-Copy",
        "assets",
        "c__Users_Bryan_Blitman_AppData_Roaming_Cursor_User_workspaceStorage_03a9c35b6cddd1f90daddd8fbf5c542c_images_Untitled_design__12_-a7609df9-6073-4b30-904d-464e63a5b011.png",
    ),
    os.path.join(
        ROOT, "assets", "images", "recall-video-detail-info-icons-source.png"
    ),
]

ICONS = [
    ("saved", 0),
    ("last-opened", 1),
]


def resolve_source_path():
    for candidate in SOURCE_CANDIDATES:
        if os.path.isfile(candidate):
            return candidate
    raise FileNotFoundError(
        "Video detail info icon source not found. Save the artwork to "
        "assets/images/recall-video-detail-info-icons-source.png.",
    )


def build_square_icon(img, bbox, out_path):
    left = max(0, bbox[0] - CROP_PADDING)
    top = max(0, bbox[1] - CROP_PADDING)
    right = min(img.width, bbox[2] + CROP_PADDING)
    bottom = min(img.height, bbox[3] + CROP_PADDING)
    crop = img.crop((left, top, right, bottom))

    max_side = max(crop.size)
    target = int(CANVAS * FILL_RATIO)
    scale = target / max_side
    scaled_w = max(1, int(round(crop.width * scale)))
    scaled_h = max(1, int(round(crop.height * scale)))
    crop = crop.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

    square = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset_x = (CANVAS - scaled_w) // 2
    offset_y = (CANVAS - scaled_h) // 2
    square.paste(crop, (offset_x, offset_y), crop)
    square.save(out_path)
    print(out_path, square.size, "content", crop.size)


def build_video_detail_info_icons(source_path=None):
    source_path = source_path or resolve_source_path()
    img = Image.open(source_path).convert("RGBA")
    make_transparent(img, threshold=35)

    components = sorted(_find_components(img), key=lambda item: -item["area"])
    primary = [component for component in components if component["area"] > 1000]
    if len(primary) < 2:
        raise ValueError("Expected calendar and clock icons in source image.")

    primary = sorted(primary[:2], key=lambda component: component["centroid_x"])
    os.makedirs(OUT_DIR, exist_ok=True)

    for (name, index), component in zip(ICONS, primary):
        build_square_icon(
            img,
            component["bbox"],
            os.path.join(OUT_DIR, f"{name}.png"),
        )


if __name__ == "__main__":
    build_video_detail_info_icons()
