"""
One-shot compression for the three skybox JPGs so they fit under
Cloudflare Pages' 25 MiB per-file limit.

Strategy:
  - Try quality 85 at original resolution.
  - If output > target, try quality 80, 75, 70.
  - If still over, downsize to 8192 wide (8K), repeat quality sweep.
  - If still over, downsize to 6144 wide, repeat.

Rewrites public/textures/skybox_*.jpg in place. Reports each file's
original size, final size, final quality, and final dimensions.
"""

import os
import sys
from PIL import Image

# Cloudflare Pages caps single files at 25 MiB. Aim for 23 MiB so
# we have a buffer against jpeg-encoder variability between runs.
TARGET_MAX_BYTES = 23 * 1024 * 1024

FILES = [
    "public/textures/skybox_industrial.jpg",
    "public/textures/skybox_showroom.jpg",
    "public/textures/skybox_site.jpg",
]

QUALITY_SWEEP = [85, 80, 75, 70, 65]
WIDTH_SWEEP = [None, 8192, 6144, 4096]  # None = keep original


def compress(path: str) -> None:
    if not os.path.exists(path):
        print(f"  [skip] {path} — file missing")
        return

    original_bytes = os.path.getsize(path)
    img = Image.open(path)
    original_w, original_h = img.size
    if img.mode != "RGB":
        img = img.convert("RGB")

    print(f"\n{path}")
    print(f"  original: {original_w}x{original_h} ({original_bytes/1024/1024:.1f} MiB)")

    for target_w in WIDTH_SWEEP:
        if target_w is None:
            scaled = img
            scaled_w, scaled_h = original_w, original_h
        else:
            if target_w >= original_w:
                continue  # don't upscale
            scaled_h = int(original_h * (target_w / original_w))
            # Force 2:1 aspect for equirectangular safety
            if scaled_h * 2 != target_w:
                scaled_h = target_w // 2
            scaled = img.resize((target_w, scaled_h), Image.LANCZOS)
            scaled_w = target_w

        for quality in QUALITY_SWEEP:
            tmp_path = path + ".tmp"
            scaled.save(
                tmp_path,
                "JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
            )
            size = os.path.getsize(tmp_path)
            if size <= TARGET_MAX_BYTES:
                os.replace(tmp_path, path)
                print(
                    f"  encoded:  {scaled_w}x{scaled_h} q={quality}  "
                    f"-> {size/1024/1024:.1f} MiB OK"
                )
                return
            else:
                os.remove(tmp_path)

    print(f"  ERROR: could not get {path} under {TARGET_MAX_BYTES/1024/1024:.0f} MiB")
    sys.exit(1)


def main() -> None:
    for f in FILES:
        compress(f)
    print("\nDone — all three skyboxes are now Cloudflare-Pages-compatible.")


if __name__ == "__main__":
    main()
