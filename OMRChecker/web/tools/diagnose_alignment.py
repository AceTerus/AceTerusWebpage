"""
Diagnostic harness for OMR bubble alignment/detection.

Renders (or loads) a sheet image, optionally fills bubbles at the AceTerus config
coordinates, runs it through the engine, and dumps per-bubble mean intensities and the
detected response so we can see exactly why specific questions misread.

Usage:
    python web/tools/diagnose_alignment.py <sheet_png> [--fill B]
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from web import omr_service as s  # noqa: E402
from src.utils.image import ImageUtils  # noqa: E402

# AceTerus config coordinates (centers, 794x1123 design space)
OPTIONS = ["A", "B", "C", "D"]
COLUMNS = [
    {"qr": (1, 10), "sx": 153, "gx": 45, "sy": 190, "gy": 68},
    {"qr": (11, 20), "sx": 505, "gx": 45, "sy": 190, "gy": 68},
]


def bubble_center(q, opt_idx):
    for col in COLUMNS:
        a, b = col["qr"]
        if a <= q <= b:
            x = col["sx"] + opt_idx * col["gx"]
            y = col["sy"] + (q - a) * col["gy"]
            return x, y
    raise ValueError(q)


def fill_sheet(img, answer_letter):
    opt = OPTIONS.index(answer_letter)
    for q in range(1, 21):
        x, y = bubble_center(q, opt)
        cv2.circle(img, (x, y), 11, 0, -1)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet_png")
    ap.add_argument("--fill", default=None, help="Fill this option (A/B/C/D) for all 20")
    args = ap.parse_args()

    template = s.load_layout()
    ops = template.image_instance_ops

    img = cv2.imread(args.sheet_png, cv2.IMREAD_GRAYSCALE)
    print(f"loaded {args.sheet_png} shape={img.shape}")
    if args.fill:
        img = fill_sheet(img, args.fill)

    # Run the real engine pipeline
    ops.reset_all_save_img()
    ops.append_save_img(1, img)
    pre = ops.apply_preprocessors(args.sheet_png, img.copy(), template)
    if pre is None:
        print("PREPROCESSOR returned None (crop/markers failed)")
        return
    resp, final_marked, multi, _ = ops.read_omr_response(
        template, image=pre, name="diag", save_dir=None
    )
    print("RESPONSE:", {f"q{i}": resp.get(f"q{i}") for i in range(1, 21)})

    # Replicate the engine's sampling to dump per-bubble means for q1,q2,q3,q11
    page = ImageUtils.resize_util(pre, template.page_dimensions[0], template.page_dimensions[1])
    if page.max() > page.min():
        page = ImageUtils.normalize_util(page)
    print("\nPer-bubble mean intensity (lower = darker = marked):")
    for fb in template.field_blocks:
        bw, bh = fb.bubble_dimensions
        for bubbles in fb.traverse_bubbles:
            label = bubbles[0].field_label
            if label not in ("q1", "q2", "q3", "q11", "q12"):
                continue
            vals = []
            for pt in bubbles:
                x, y = pt.x + fb.shift, pt.y
                vals.append(round(cv2.mean(page[y : y + bh, x : x + bw])[0], 1))
            print(f"  {label:>4}: " + "  ".join(f"{o}={v}" for o, v in zip(OPTIONS, vals)))

    cv2.imwrite("diag_overlay.png", ops.draw_template_layout(page, template, shifted=True, border=2))
    print("\nwrote diag_overlay.png")


if __name__ == "__main__":
    main()
