import os

from PIL import Image

from extract_icon_utils import make_transparent

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "icons", "actions", "edit.png")
CANVAS = 112
FILL_RATIO = 0.82

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
        "c__Users_Bryan_Blitman_AppData_Roaming_Cursor_User_workspaceStorage_03a9c35b6cddd1f90daddd8fbf5c542c_images_Untitled_design__11_-84fdb687-1c65-4626-b95b-6613453d3a0a.png",
    ),
    os.path.join(ROOT, "assets", "images", "recall-edit-pencil-source.png"),
]


def resolve_source_path():
    for candidate in SOURCE_CANDIDATES:
        if os.path.isfile(candidate):
            return candidate
    raise FileNotFoundError(
        "Pencil source image not found. Save the artwork to "
        "assets/images/recall-edit-pencil-source.png or restore the Cursor asset.",
    )


def build_edit_icon(source_path=None, out_path=OUT):
    source_path = source_path or resolve_source_path()
    img = Image.open(source_path).convert("RGBA")
    make_transparent(img, threshold=35)

    bbox = img.getbbox()
    if not bbox:
        raise ValueError("Pencil source image has no visible content.")

    pencil = img.crop(bbox)
    max_side = max(pencil.size)
    target = int(CANVAS * FILL_RATIO)
    scale = target / max_side
    scaled_w = max(1, int(round(pencil.width * scale)))
    scaled_h = max(1, int(round(pencil.height * scale)))
    pencil = pencil.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

    square = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset_x = (CANVAS - scaled_w) // 2 - 1
    offset_y = (CANVAS - scaled_h) // 2 + 3
    square.paste(pencil, (offset_x, offset_y), pencil)
    square.save(out_path)
    print(out_path, square.size, "pencil", pencil.size)


if __name__ == "__main__":
    build_edit_icon()
