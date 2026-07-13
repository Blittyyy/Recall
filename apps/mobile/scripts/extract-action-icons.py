import os

from extract_icon_utils import extract_icon, load_sheet

# edit.png is built separately from recall-edit-pencil-source.png via build-edit-icon.py

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
    "actions",
)
os.makedirs(out_dir, exist_ok=True)

icons = {
    "play": (1, 0),
    "search": (1, 1),
    "tag": (1, 2),
    "share": (1, 3),
    "share-alt": (1, 4),
    "email": (1, 6),
    "document": (1, 7),
    "camera": (3, 6),
}

sheet = load_sheet(sheet_path)

for name, (row, col) in icons.items():
    square = extract_icon(sheet, row, col)
    square.save(os.path.join(out_dir, f"{name}.png"))
    print(name, square.size)
