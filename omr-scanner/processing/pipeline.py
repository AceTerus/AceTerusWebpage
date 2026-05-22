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

_template_cache = None  # loaded once, reused for every scan


def _get_template():
    """Return a cached Template instance (loaded once at first scan)."""
    global _template_cache
    if _template_cache is None:
        _template_cache = _load_template()
    return _template_cache


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _patch_screeninfo_for_headless() -> None:
    """
    OMRChecker imports screeninfo at module load time to query screen dimensions
    for its display utilities. On headless servers (Render, CI) there is no
    display, so get_monitors() raises ScreenInfoError. Inject a fake 1920×1080
    monitor so those utilities initialise without error. This does NOT affect
    any OMR detection logic — screeninfo is only used for GUI display sizing.
    """
    try:
        import screeninfo
        try:
            screeninfo.get_monitors()   # succeeds on a real display → nothing to do
        except Exception:
            class _HeadlessMonitor:     # noqa: N801
                x = y = 0
                width, height = 1920, 1080
                width_mm = height_mm = 0
                name = "headless"
            screeninfo.get_monitors = lambda: [_HeadlessMonitor()]
            logger.info("[OMR] screeninfo patched for headless server")
    except ImportError:
        pass   # screeninfo not installed → nothing to patch


def _setup_omrchecker() -> None:
    """Prepend OMRChecker to sys.path so its src.* modules resolve correctly."""
    omr_dir = str(_OMRCHECKER_DIR)
    if omr_dir not in sys.path:
        sys.path.insert(0, omr_dir)
    _patch_screeninfo_for_headless()


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


def _contour_perspective_fallback(gray: np.ndarray, page_dims: tuple) -> np.ndarray:
    """
    When CropOnMarkers cannot find the markers, try to locate the paper via
    contour detection and apply a perspective warp before resizing.
    Falls back to a plain resize if no quadrilateral contour is found.
    """
    blurred   = cv2.GaussianBlur(gray, (5, 5), 0)
    clahe_fb  = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced  = clahe_fb.apply(blurred)
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cnts, _   = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts      = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    for c in cnts:
        peri  = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            _setup_omrchecker()
            from src.utils.image import ImageUtils
            warped = ImageUtils.four_point_transform(gray, approx.reshape(4, 2))
            return cv2.resize(warped, page_dims, interpolation=cv2.INTER_AREA)
    logger.warning("[OMR] Contour fallback found no quadrilateral — using plain resize")
    return cv2.resize(gray, page_dims, interpolation=cv2.INTER_AREA)


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
        # ── Step 1: Load OMRChecker template (cached after first scan) ────────
        template = _get_template()
        _setup_omrchecker()
        from src.utils.parsing import get_concatenated_response

        # ── Step 2: Load image as grayscale ndarray ───────────────────────────
        gray = _load_image_as_gray(image_path)
        logger.info("[OMR] Loaded %s  shape=%s", Path(image_path).name, gray.shape)

        # CLAHE: normalise uneven phone-camera lighting before any detection
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray  = clahe.apply(gray)

        # ── Step 3: Preprocess ────────────────────────────────────────────────
        #
        # apply_preprocessors (src/core.py) force-resizes to
        # (processing_width, processing_height) before running CropOnMarkers.
        # The default values are 666×820 (portrait), but phone photos are
        # landscape (e.g. 1920×1080). A hard stretch to 666×820 turns the
        # square corner markers into 49px×107px rectangles — template matching
        # against the square marker template then fails reliably.
        #
        # Fix: pre-resize proportionally to processing_width so aspect ratio is
        # preserved, then temporarily set processing_height to match so that
        # apply_preprocessors' internal resize is a no-op.
        #
        cfg_dims = template.image_instance_ops.tuning_config.dimensions
        proc_w   = cfg_dims.processing_width
        gh, gw   = gray.shape[:2]
        proc_h   = int(gh * proc_w / gw)          # proportional height
        gray     = cv2.resize(gray, (proc_w, proc_h))

        orig_proc_h             = cfg_dims.processing_height
        cfg_dims.processing_height = proc_h        # no-op re-resize inside apply_preprocessors
        processed = template.image_instance_ops.apply_preprocessors(
            image_path, gray, template
        )
        cfg_dims.processing_height = orig_proc_h   # restore for next scan

        if processed is None:
            # CropOnMarkers could not find the corner markers in the image.
            # Common causes: marker cropped out of frame, extreme perspective,
            # very poor lighting, or sheet printed without markers.
            #
            # Recovery: try contour-based perspective correction first; if that
            # also fails, fall back to a plain resize (last resort).
            logger.warning(
                "[OMR] CropOnMarkers failed for '%s' — trying contour fallback",
                Path(image_path).name,
            )
            page_w, page_h = template.page_dimensions
            processed = _contour_perspective_fallback(gray, (page_w, page_h))

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
        result = _undetected_result(answer_keys)
        result["_error"] = f"{type(exc).__name__}: {exc}"
        return result


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic runner  (called only by /scan/{job_id}/debug — never in prod flow)
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline_debug(image_path: str, answer_keys: list) -> Dict[str, Any]:
    """
    Step-by-step pipeline run that returns rich diagnostic info.
    CPU-heavy; only call from the admin debug endpoint.
    """
    import base64

    diag: Dict[str, Any] = {
        "image_shape":      None,
        "clahe_ok":         False,
        "crop_ok":          False,
        "crop_fallback":    False,
        "processed_shape":  None,
        "processed_b64":    None,
        "raw_omr_response": None,
        "multi_marked":     None,
        "exception":        None,
        "stage":            "init",
    }
    try:
        template = _get_template()
        _setup_omrchecker()
        from src.utils.parsing import get_concatenated_response

        diag["stage"] = "load_image"
        gray = _load_image_as_gray(image_path)
        diag["image_shape"] = list(gray.shape)

        diag["stage"] = "clahe"
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray  = clahe.apply(gray)
        diag["clahe_ok"] = True

        diag["stage"] = "apply_preprocessors"
        cfg_dims = template.image_instance_ops.tuning_config.dimensions
        proc_w   = cfg_dims.processing_width
        gh, gw   = gray.shape[:2]
        proc_h   = int(gh * proc_w / gw)
        gray     = cv2.resize(gray, (proc_w, proc_h))
        orig_proc_h             = cfg_dims.processing_height
        cfg_dims.processing_height = proc_h
        processed = template.image_instance_ops.apply_preprocessors(
            image_path, gray, template
        )
        cfg_dims.processing_height = orig_proc_h
        if processed is not None:
            diag["crop_ok"] = True
        else:
            diag["stage"] = "contour_fallback"
            page_w, page_h = template.page_dimensions
            processed = _contour_perspective_fallback(gray, (page_w, page_h))
            diag["crop_fallback"] = True

        diag["processed_shape"] = list(processed.shape)
        ok, buf = cv2.imencode(".jpg", processed, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ok:
            diag["processed_b64"] = base64.b64encode(buf.tobytes()).decode()

        diag["stage"] = "read_omr_response"
        response_dict, _, multi_marked, _ = (
            template.image_instance_ops.read_omr_response(
                template,
                image    = processed,
                name     = Path(image_path).name,
                save_dir = None,
            )
        )
        omr_response = get_concatenated_response(response_dict, template)
        diag["raw_omr_response"] = omr_response
        diag["multi_marked"]     = multi_marked
        diag["stage"] = "done"

    except Exception as exc:
        diag["exception"] = f"{type(exc).__name__}: {exc}"
        logger.warning("[OMR-DEBUG] exception at stage '%s': %s", diag["stage"], exc)

    return diag
