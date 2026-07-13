import os

from extract_icon_utils import extract_icon, load_sheet

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
    "profile-settings",
)
os.makedirs(out_dir, exist_ok=True)

icons = {
    "crown": (0, 5),
    "user": (0, 7),
    "contact": (1, 6),
    "shield": (2, 3),
    "shield-check": (2, 4),
    "help": (2, 5),
    "settings": (3, 2),
}

sheet = load_sheet(sheet_path)

for name, (row, col) in icons.items():
    square = extract_icon(sheet, row, col)
    square.save(os.path.join(out_dir, f"{name}.png"))
    print(name, square.size)
