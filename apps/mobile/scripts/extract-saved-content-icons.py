import os

from PIL import Image

from extract_icon_utils import extract_icon, load_sheet

# saved.png and last-opened.png are built via build-video-detail-info-icons.py

sheet_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "assets",
    "images",
    "recall-icon-sheet.png",
)
out_dir = os.path.join(
    os.path.dirname(__file__),
    "..",
    "assets",
    "icons",
    "saved-content",
)
os.makedirs(out_dir, exist_ok=True)

icons = {
    "collections": (0, 0),
    "bookmark": (0, 1),
    "bookmark-check": (0, 2),
    "archive": (0, 3),
    "folder": (2, 0),
    "folder-plus": (2, 1),
    "saved-for-later": (0, 1),
}

sheet = load_sheet(sheet_path)

for name, (row, col) in icons.items():
    square = extract_icon(sheet, row, col)
    square.save(os.path.join(out_dir, f"{name}.png"))
    print(name, square.size)

bookmark = extract_icon(sheet, 0, 1)
banner_w, banner_h = 568, 304
banner = Image.new("RGBA", (banner_w, banner_h), (0, 0, 0, 0))
scale = min(banner_h * 0.85 / bookmark.height, banner_w * 0.35 / bookmark.width)
new_size = (int(bookmark.width * scale), int(bookmark.height * scale))
bookmark_scaled = bookmark.resize(new_size, Image.Resampling.LANCZOS)
banner.paste(
    bookmark_scaled,
    (12, (banner_h - new_size[1]) // 2),
    bookmark_scaled,
)
banner.save(os.path.join(out_dir, "saved-for-later-banner.png"))
print("saved-for-later-banner", banner.size)
