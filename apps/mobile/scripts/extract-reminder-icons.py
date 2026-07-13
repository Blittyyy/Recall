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
    "reminders",
)
os.makedirs(out_dir, exist_ok=True)

icons = {
    "today": (3, 0),
    "tomorrow": (3, 1),
    "this-week": (3, 2),
    "later": (3, 3),
    "rediscovery": (3, 4),
    "worth-revisiting": (1, 4),
    "sparkles": (3, 5),
    "bell": (0, 6),
}

sheet = load_sheet(sheet_path)

for name, (row, col) in icons.items():
    square = extract_icon(sheet, row, col)
    square.save(os.path.join(out_dir, f"{name}.png"))
    print(name, square.size)
