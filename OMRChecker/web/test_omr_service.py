"""
Parity test: grade the bundled sample4 sheet through the web service and assert the
score matches what the OMRChecker engine produces. Run from the repo root:

    python -m pytest web/test_omr_service.py

The test is isolated from web/layout/: it points the service at a temp layout dir seeded
with sample4's template, so it keeps working regardless of the live layout.
"""
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
import pytest

from web import omr_service as s

REPO_ROOT = Path(__file__).resolve().parent.parent
SAMPLE_DIR = REPO_ROOT / "samples" / "sample4"
SAMPLE_IMG = SAMPLE_DIR / "IMG_20201116_143512.jpg"

# Single-answer key aligned to sample4's detected responses.
KEY = ["B", "D", "C", "B", "D", "C", "C", "A", "C", "D", "C"]
MARKING = {"correct": "3", "incorrect": "-1", "unmarked": "0"}


@pytest.fixture()
def sample4_service(tmp_path, monkeypatch):
    """Point omr_service at a temp layout seeded from sample4, then install a known key."""
    layout = tmp_path / "layout"
    layout.mkdir()
    shutil.copy(SAMPLE_DIR / "template.json", layout / "template.json")
    shutil.copy(SAMPLE_DIR / "config.json", layout / "config.json")
    eval_path = layout / "evaluation.json"

    monkeypatch.setattr(s, "LAYOUT_DIR", layout)
    monkeypatch.setattr(s, "TEMPLATE_PATH", layout / "template.json")
    monkeypatch.setattr(s, "CONFIG_PATH", layout / "config.json")
    monkeypatch.setattr(s, "EVALUATION_PATH", eval_path)

    s.load_layout()
    s.save_answer_key(s.build_answer_key_payload(KEY, MARKING))
    return s


def test_questions_match_template(sample4_service):
    assert sample4_service.get_questions() == [f"q{i}" for i in range(1, 12)]


def test_grade_sample4(sample4_service):
    result = sample4_service.grade(SAMPLE_IMG.read_bytes(), SAMPLE_IMG.name)
    # 10 correct (3 each) + q7 marked "BC" -> incorrect (-1) == 29; max 11*3 == 33.
    assert result["score"] == 29.0
    assert result["max_score"] == 33.0
    assert len(result["per_question"]) == 11
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")
    verdicts = {r["question"]: r["verdict"] for r in result["per_question"]}
    assert verdicts["q1"] == "Correct"
    assert verdicts["q7"] == "Incorrect"


def test_grade_pdf_matches_image(sample4_service):
    import fitz

    img = fitz.open(str(SAMPLE_IMG))
    pdf_bytes = img.convert_to_pdf()
    img.close()
    out = fitz.open("pdf", pdf_bytes).tobytes()
    result = sample4_service.grade(out, "sheet.pdf")
    assert result["score"] == 29.0


# ---------------------------------------------------------------------------------
# Camera/perspective regression: a tilted "photo" of the AceTerus sheet must be
# perspective-corrected via the corner markers and graded correctly (incl. q1/q2).
# Uses the live web/layout AceTerus template; backs up/restores its answer key.

ACE_SCALE = 2  # render at 2x so the bullseye markers resolve like a real photo
OPTIONS = ["A", "B", "C", "D"]
ACE_COLS = [((1, 10), 153, 45, 190, 68), ((11, 20), 505, 45, 190, 68)]


def _render_ace_sheet(pattern):
    """Synthesize an AceTerus sheet (real bullseye markers + filled bubbles)."""
    W, H = s.CANON_W * ACE_SCALE, s.CANON_H * ACE_SCALE
    img = np.full((H, W), 255, np.uint8)
    marker = cv2.imread(str(s.MARKER_PATH), cv2.IMREAD_GRAYSCALE)
    msize = 56 * ACE_SCALE
    marker = cv2.resize(marker, (msize, msize))
    for cx, cy in s.MARKER_DST:  # design centers
        x, y = int(cx * ACE_SCALE - msize / 2), int(cy * ACE_SCALE - msize / 2)
        img[y : y + msize, x : x + msize] = marker
    for i, ans in enumerate(pattern):
        q, o = i + 1, OPTIONS.index(ans)
        for (a, b), sx, gx, sy, gy in ACE_COLS:
            if a <= q <= b:
                cx, cy = (sx + o * gx) * ACE_SCALE, (sy + (q - a) * gy) * ACE_SCALE
                cv2.circle(img, (int(cx), int(cy)), int(11 * ACE_SCALE), 0, -1)
    return img


def _simulate_tilt(sheet):
    h, w = sheet.shape
    bg = np.full((h + 600, w + 600), 205, np.uint8)
    bg[300 : 300 + h, 300 : 300 + w] = sheet
    H, W = bg.shape
    src = np.array([[300, 300], [300 + w, 300], [300 + w, 300 + h], [300, 300 + h]], "float32")
    dst = np.array([[400, 360], [W - 240, 300], [W - 330, H - 260], [260, H - 190]], "float32")
    return cv2.warpPerspective(bg, cv2.getPerspectiveTransform(src, dst), (W, H), borderValue=200)


@pytest.fixture()
def ace_service():
    """Use the real AceTerus layout; install an all-B key, restore it afterwards."""
    s.load_layout()
    if len(s.get_questions()) != 20:
        pytest.skip("web/layout is not the 20-question AceTerus template")
    backup = s.get_answer_key()
    s.save_answer_key(s.build_answer_key_payload(["B"] * 20, {"correct": "1", "incorrect": "0", "unmarked": "0"}))
    try:
        yield s
    finally:
        if backup is not None:
            with open(s.EVALUATION_PATH, "w", encoding="utf-8") as f:
                json.dump(backup, f, indent=2)
        s.load_layout()


def _png_bytes(img):
    return cv2.imencode(".png", img)[1].tobytes()


def test_digital_all_questions_detected(ace_service):
    sheet = _render_ace_sheet(["B"] * 20)
    r = ace_service.grade(_png_bytes(sheet), "digital.png")
    assert r["score"] == 20.0 and r["max_score"] == 20.0
    assert r["responses"]["q1"] == "B" and r["responses"]["q2"] == "B"


def test_tilted_photo_perspective_corrected(ace_service):
    photo = _simulate_tilt(_render_ace_sheet(["B"] * 20))
    r = ace_service.grade(_png_bytes(photo), "photo.png")
    assert r["score"] == 20.0, r["responses"]
    assert r["responses"]["q1"] == "B" and r["responses"]["q2"] == "B"
