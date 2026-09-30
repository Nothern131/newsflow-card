# 裁出 Hub 要求的 812×1552 artboard 截图
# 依赖：pip install pillow
# 用法：python tools/crop_screenshot.py <全页截图.png> <输出名，如 01-today-brief>
# 输出：screenshots/<输出名>.png（放进 appcard/screenshots/）
import sys
from pathlib import Path

from PIL import Image

W, H = 812, 1552  # 官方 artboard 尺寸


def main():
    if len(sys.argv) != 3:
        print("用法：python tools/crop_screenshot.py <全页截图.png> <输出名>")
        sys.exit(1)
    src = Path(sys.argv[1])
    out_name = sys.argv[2]
    out_dir = Path(__file__).parent.parent / "appcard" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src)
    if img.width < W or img.height < H:
        # 不够大就放大到覆盖 artboard（等比），再居中裁切
        scale = max(W / img.width, H / img.height)
        img = img.resize((int(img.width * scale), int(img.height * scale)))
    left = (img.width - W) // 2
    top = 0
    art = img.crop((left, top, left + W, top + H))
    out = out_dir / f"{out_name}.png"
    art.save(out)
    print(f"OK {out} ({W}x{H})")


if __name__ == "__main__":
    main()
