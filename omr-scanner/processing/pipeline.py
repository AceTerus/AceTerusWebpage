"""
OMR Pipeline — single-image processing using OMRChecker natively.

Architecture (mirrors OMRChecker src/entry.py → process_files):

  ┌─────────────┐
  │  Image file │  JPG / PNG / PDF
  └──────┬──────┘
         │ _load_image_as_gray()
         ▼
  ┌─────────────────────────────┐
  │  Grayscale ndarray          │  OpenCV IMREAD_GRAYSCALE
  └──────────────┬──────────────┘
         │ template.image_instance_ops.apply_preprocessors()
         │   └─ 1. resize to processing_width × processing_height
         │   └─ 2. CropPage  → warp + crop to page_dimensions
         ▼
  ┌─────────────────────────────┐
  │  Warped / aligned image     │  794 × 1123 px
  └──────────────┬──────────────┘
         │ template.image_instance_ops.read_omr_response()
         ▼
  ┌─────────────────────────────┐
  │  response_dict              │  {q1: 'B', q2: '', q3: 'C', …}
  └──────────────┬──────────────┘
         │ get_concatenated_response()
         ▼
  ┌─────────────────────────────┐
  │  omr_response               │  field labels → answer letters
  └──────────────┬──────────────┘
         │ grade()  +  extract_student_id()
         ▼
  ┌─────────────────────────────┐
  │  Final result dict          │
  └─────────────────────────────┘
"""

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import cv2
import matplotlib
matplotlib.use("Agg")   # must be set before any matplotlib import downstream
import numpy as np

from processing.grader import grade

logger = logging.getLogger(__name__)

_OMR_TEMPLATE_PATH = Path(__file__).parent.parent / "omr_template.json"
_OMRCHECKER_DIR    = Path(__file__).parent.parent / "OMRChecker"

_PDF_DPI = 200   # higher DPI → sharper bubble edges for detection


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _setup_omrchecker() -> None:
    """Prepend OMRChecker to sys.path so its src.* modules resolve correctly."""
    omr_dir = str(_OMRCHECKER_DIR)
    if omr_dir not in sys.path:
        sys.path.insert(0, omr_dir)


def _load_template():
    """
    Instantiate OMRChecker's Template object from omr_template.json.
    Template loads the field blocks, preprocessors, and output columns.
    """
    _setup_omrchecker()
    from src.template import Template
    from src.defaults.config import CONFIG_DEFAULTS
    return Template(_OMR_TEMPLATE_PATH, CONFIG_DEFAULTS)


def _load_image_as_gray(image_path: str) -> np.ndarray:
    """
    Load any supported file into a grayscale ndarray.

    PDF  → rendered at _PDF_DPI via pymupdf (first page only), returned as gray
    JPG/PNG → read directly with OpenCV in grayscale mode

    OMRChecker always works on grayscale images internally, so we match that
    convention here rather than loading BGR and converting.
    """
    path = Path(image_path)
    ext  = path.suffix.lower()

    if ext == ".pdf":
        try:
            import fitz          # pymupdf
        except ImportError:
            raise RuntimeError("pymupdf is required for PDF support: pip install pymupdf")

        doc = fitz.open(str(path))
        if doc.page_count == 0:
            raise ValueError(f"PDF has no pages: {image_path}")

        scale = _PDF_DPI / 72
        mat   = fitz.Matrix(scale, scale)
        pix   = doc[0].get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)

    # JPG / PNG — OpenCV native grayscale (identical to OMRChecker's own imread call)
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    return img


def _undetected_result(answer_keys: list) -> Dict[str, Any]:
    """
    Returned when the pipeline fails entirely (bad image, corrupt file, etc.).
    All answers are null so the UI shows '?' instead of wrong letters.
    """
    detected = {
        i: {"answer": None, "confidence": 0.0, "flagged": True, "fill_ratios": {}}
        for i in range(1, len(answer_keys) + 1)
    }
    return {
        "student_code":       None,
        "detected":           detected,
        "grade_result":       grade(detected, answer_keys),
        "overall_confidence": 0.0,
        "is_fallback":        True,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point  (called by scans.py background task)
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(image_path: str, answer_keys: list) -> Dict[str, Any]:
    """
    Process a single OMR answer sheet image and return graded results.

    Parameters
    ----------
    image_path  : absolute path to the uploaded JPG / PNG / PDF
    answer_keys : list of AnswerKey ORM objects for the selected exam

    Returns
    -------
    dict with keys: student_code, detected, grade_result,
                    overall_confidence, is_fallback
    """
    try:
        # ── Step 1: Load OMRChecker template ─────────────────────────────────
        template = _load_template()
        _setup_omrchecker()
        from src.utils.parsing import get_concatenated_response

        # ── Step 2: Load image as grayscale ndarray ───────────────────────────
        gray = _load_image_as_gray(image_path)
        logger.info("[OMR] Loaded %s  shape=%s", Path(image_path).name, gray.shape)

        # ── Step 3: Preprocess ────────────────────────────────────────────────
        #
        # apply_preprocessors does TWO things (see OMRChecker src/core.py):
        #   a) Resize image to CONFIG_DEFAULTS.dimensions.processing_width/height
        #   b) Run each pre_processor in template.pre_processors sequentially
        #      → CropPage: detects the 4 corner fiducials, warps + crops the
        #        image so the page exactly fills the frame at page_dimensions
        #
        # Returns None if a pre_processor (e.g. CropPage) cannot find markers.
        #
        processed = template.image_instance_ops.apply_preprocessors(
            image_path, gray, template
        )

        if processed is None:
            # CropPage could not locate the page boundary.
            # Common causes:
            #   - PDF uploaded directly (no background border visible)
            #   - Photo taken too close / corner fiducials cropped off
            #   - Poor lighting washing out the black corner squares
            #
            # Recovery: skip CropPage and resize directly to the template's
            # declared page_dimensions.  Bubble coordinates in omr_template.json
            # are relative to these dimensions, so detection can still succeed
            # if the sheet is mostly straight.
            page_w, page_h = template.page_dimensions
            processed = cv2.resize(gray, (page_w, page_h), interpolation=cv2.INTER_AREA)
            logger.warning(
                "[OMR] CropPage failed for '%s' — fallback resize to %dx%d",
                Path(image_path).name, page_w, page_h,
            )

        # ── Step 4: Bubble detection (OMRChecker native) ─────────────────────
        #
        # read_omr_response scans every field block defined in the template,
        # measures the fill ratio of each bubble circle, and returns:
        #   response_dict  — raw per-field-label responses
        #   final_marked   — annotated image (not used here)
        #   multi_marked   — count of questions where >1 bubble was filled
        #
        response_dict, _final_marked, multi_marked, _ = (
            template.image_instance_ops.read_omr_response(
                template,
                image    = processed,
                name     = Path(image_path).name,
                save_dir = None,
            )
        )

        # ── Step 5: Concatenate field responses ───────────────────────────────
        #
        # get_concatenated_response merges multi-column labels (e.g. roll number
        # built from individual digit columns) and returns a flat dict:
        #   {"q1": "B", "q2": "C", "q3": "", …}
        # Empty string "" means the student left that question blank.
        #
        omr_response = get_concatenated_response(response_dict, template)
        logger.info("[OMR] Raw response: %s", omr_response)

        # ── Step 6: Build normalised detected dict ────────────────────────────
        detected: Dict[int, Dict[str, Any]] = {}
        for i, label in enumerate(template.output_columns, start=1):
            raw_answer = omr_response.get(label) or None   # "" → None
            detected[i] = {
                "answer":      raw_answer,
                "confidence":  1.0 if raw_answer else 0.0,
                "flagged":     raw_answer is None,
                "fill_ratios": {},
            }

        # Multi-marked questions are downgraded: confidence 0.6, flagged for review
        if multi_marked:
            logger.warning(
                "[OMR] %d multi-marked question(s) detected in '%s'",
                multi_marked, Path(image_path).name,
            )
            for q in detected.values():
                if q["answer"] and not q["flagged"]:
                    q["confidence"] = 0.6
                    q["flagged"]    = True

        # ── Step 7: Grade against answer key ─────────────────────────────────
        grade_result = grade(detected, answer_keys)

        student_code: Optional[str] = None

        answered     = [d for d in detected.values() if d["answer"]]
        overall_conf = (
            round(sum(d["confidence"] for d in answered) / len(answered), 4)
            if answered else 0.0
        )

        return {
            "student_code":       student_code,
            "detected":           detected,
            "grade_result":       grade_result,
            "overall_confidence": overall_conf,
            "is_fallback":        False,
        }

    except Exception as exc:
        logger.warning("[OMR] pipeline error — all answers marked not detected: %s", exc)
        return _undetected_result(answer_keys)
