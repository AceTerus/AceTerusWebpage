"""
In-memory service layer that wraps the existing OMRChecker engine (src/) so a single
uploaded image or PDF can be graded against an answer key without the folder/CSV machinery
of the CLI (main.py / src/entry.py).

Public surface:
    load_layout()                      -> initialise/reload the fixed template + config
    get_questions()                    -> ordered question labels for the answer-key form
    get_answer_key()                   -> current evaluation.json contents (or None)
    save_answer_key(payload)           -> validate + persist evaluation.json, rebuild config
    has_answer_key()                   -> bool
    grade(file_bytes, filename)        -> result dict (score, per_question, annotated image)
"""
import base64
import json
import os
import sys
import tempfile
import threading
from copy import deepcopy
from pathlib import Path

import cv2
import fitz  # PyMuPDF
import numpy as np

# Make the engine importable regardless of the process CWD.
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from jsonschema import validate as jsonschema_validate  # noqa: E402

from src.defaults import CONFIG_DEFAULTS  # noqa: E402
from src.evaluation import EvaluationConfig, evaluate_concatenated_response  # noqa: E402
from src.schemas.evaluation_schema import EVALUATION_SCHEMA  # noqa: E402
from src.template import Template  # noqa: E402
from src.utils.parsing import (  # noqa: E402
    get_concatenated_response,
    open_config_with_defaults,
)

LAYOUT_DIR = Path(__file__).resolve().parent / "layout"
TEMPLATE_PATH = LAYOUT_DIR / "template.json"
EVALUATION_PATH = LAYOUT_DIR / "evaluation.json"
CONFIG_PATH = LAYOUT_DIR / "config.json"
MARKER_PATH = LAYOUT_DIR / "omr_marker.jpg"

# Canonical sheet (design px) and the four corner-marker CENTERS on the sheet.
# The AceTerus sheet markers are 56px wide, inset 28px -> centers 56px from each edge.
# Bubbles are then laid out in this same 794x1123 design space (template origins match).
CANON_W, CANON_H = 794, 1123
MARKER_DST = np.array(
    [[56, 56], [738, 56], [738, 1067], [56, 1067]], dtype="float32"  # TL, TR, BR, BL
)
_marker_template = None

# The engine objects hold mutable per-run state (saved-image buffers, the evaluation
# explanation table), so concurrent requests must be serialised.
_LOCK = threading.Lock()

_state = {
    "template": None,
    "tuning_config": None,
    "evaluation_config": None,
}


class LayoutError(Exception):
    """Raised when the fixed template/config cannot be loaded."""


class ScanError(Exception):
    """Raised when an uploaded sheet cannot be read (bad photo, wrong file, etc.)."""


# ---- Marker-based perspective correction -----------------------------------------
# A clean digital PDF is already a flat, full-frame sheet, but a phone photo has tilt,
# rotation, and background. We locate the four corner bullseye markers and warp the
# image so it maps onto the canonical 794x1123 grid the template expects. If the four
# markers aren't confidently found, we leave the image unchanged (a well-framed flat
# scan/PDF still reads correctly via the engine's own resize).

def _get_marker_template():
    global _marker_template
    if _marker_template is None and MARKER_PATH.exists():
        _marker_template = cv2.imread(str(MARKER_PATH), cv2.IMREAD_GRAYSCALE)
    return _marker_template


def _match_marker_in_roi(roi, marker, min_score=0.45):
    """Multi-scale match the bullseye in an ROI; return (cx, cy, score) of its center."""
    rh, rw = roi.shape[:2]
    roi_n = cv2.normalize(cv2.GaussianBlur(roi, (3, 3), 0), None, 0, 255, cv2.NORM_MINMAX)
    best = None
    lo = max(12, int(0.06 * max(rh, rw)))
    hi = int(0.30 * max(rh, rw))
    if hi <= lo:
        return None
    for mh in range(lo, hi, max(3, (hi - lo) // 16)):
        if mh >= rh or mh >= rw:
            break
        tmpl = cv2.normalize(cv2.resize(marker, (mh, mh)), None, 0, 255, cv2.NORM_MINMAX)
        res = cv2.matchTemplate(roi_n, tmpl, cv2.TM_CCOEFF_NORMED)
        _, mx, _, mloc = cv2.minMaxLoc(res)
        if best is None or mx > best[2]:
            best = (mloc[0] + mh / 2, mloc[1] + mh / 2, mx)
    if best is None or best[2] < min_score:
        return None
    return best


def _detect_marker_centers(gray):
    """Return the 4 bullseye centers (TL,TR,BR,BL) at full-res, or None if not all found."""
    marker = _get_marker_template()
    if marker is None:
        return None
    # Detect on a capped-resolution copy for speed/consistency, then scale back.
    H, W = gray.shape[:2]
    scale = min(1.0, 1500.0 / max(H, W))
    small = cv2.resize(gray, (int(W * scale), int(H * scale))) if scale < 1.0 else gray
    sh, sw = small.shape[:2]
    fw, fh = int(0.55 * sw), int(0.55 * sh)
    rois = {"TL": (0, 0), "TR": (sw - fw, 0), "BR": (sw - fw, sh - fh), "BL": (0, sh - fh)}
    centers = []
    for key in ("TL", "TR", "BR", "BL"):
        ox, oy = rois[key]
        m = _match_marker_in_roi(small[oy : oy + fh, ox : ox + fw], marker)
        if m is None:
            return None
        centers.append([(ox + m[0]) / scale, (oy + m[1]) / scale])
    return np.array(centers, dtype="float32")


def _perspective_correct(gray):
    """Warp to the canonical 794x1123 grid via the 4 markers; pass through if not found."""
    centers = _detect_marker_centers(gray)
    if centers is None:
        return gray, False
    matrix = cv2.getPerspectiveTransform(centers, MARKER_DST)
    warped = cv2.warpPerspective(gray, matrix, (CANON_W, CANON_H), borderValue=255)
    return warped, True


def load_layout():
    """Load the fixed template + tuning config once, and the answer key if present."""
    if not TEMPLATE_PATH.exists():
        raise LayoutError(f"No template.json found at {TEMPLATE_PATH}")

    if CONFIG_PATH.exists():
        tuning_config = open_config_with_defaults(CONFIG_PATH)
    else:
        tuning_config = deepcopy(CONFIG_DEFAULTS)

    # Never pop up GUI windows from a server process.
    tuning_config.outputs.show_image_level = 0
    tuning_config.outputs.save_image_level = 0

    template = Template(TEMPLATE_PATH, tuning_config)

    _state["template"] = template
    _state["tuning_config"] = tuning_config
    _state["evaluation_config"] = None
    _reload_evaluation_config()
    return template


def _require_template():
    if _state["template"] is None:
        load_layout()
    return _state["template"]


def _reload_evaluation_config():
    """(Re)build the cached EvaluationConfig from evaluation.json, if it exists."""
    template = _state["template"]
    tuning_config = _state["tuning_config"]
    if template is None:
        return None
    if not EVALUATION_PATH.exists():
        _state["evaluation_config"] = None
        return None

    evaluation_config = EvaluationConfig(
        LAYOUT_DIR, EVALUATION_PATH, template, tuning_config
    )
    # Force the per-question explanation table so we can surface verdicts in the UI,
    # regardless of what the saved JSON requested.
    evaluation_config.should_explain_scoring = True
    _state["evaluation_config"] = evaluation_config
    return evaluation_config


def get_questions():
    """Ordered question labels (e.g. ['q1', ... 'q11']) for building the key form."""
    template = _require_template()
    # output_columns is the ordered, expanded list of all fields in the template.
    return list(template.output_columns)


def has_answer_key():
    return _state.get("evaluation_config") is not None


def get_answer_key():
    """Return the raw evaluation.json contents, or None if no key is set yet."""
    if not EVALUATION_PATH.exists():
        return None
    import json

    with open(EVALUATION_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_answer_key(payload):
    """Validate an evaluation.json payload, persist it, and rebuild the cached config."""
    import json

    # Schema-validate before writing so a bad key never lands on disk.
    jsonschema_validate(instance=payload, schema=EVALUATION_SCHEMA)

    LAYOUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(EVALUATION_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    with _LOCK:
        _reload_evaluation_config()
    return payload


def build_answer_key_payload(answers_in_order, marking, questions_in_order=None):
    """
    Helper used by the API to turn UI form fields into a valid evaluation.json dict.

    answers_in_order: list of answer strings (e.g. ["A", "B", ...]) aligned to questions.
    marking: dict {"correct": str, "incorrect": str, "unmarked": str}
    questions_in_order: optional explicit list; defaults to the template's questions.
    """
    if questions_in_order is None:
        questions_in_order = get_questions()
    return {
        "source_type": "custom",
        "options": {
            "questions_in_order": list(questions_in_order),
            "answers_in_order": list(answers_in_order),
            "should_explain_scoring": True,
        },
        "marking_schemes": {
            "DEFAULT": {
                "correct": str(marking.get("correct", "1")),
                "incorrect": str(marking.get("incorrect", "0")),
                "unmarked": str(marking.get("unmarked", "0")),
            }
        },
    }


def _bytes_to_grayscale(file_bytes, filename):
    """Decode an upload (image or PDF) into a single grayscale numpy image."""
    name = (filename or "").lower()
    head = file_bytes[:5]
    is_pdf = name.endswith(".pdf") or head[:4] == b"%PDF"

    if is_pdf:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise ScanError(f"Could not open PDF: {e}")
        if doc.page_count == 0:
            raise ScanError("PDF has no pages.")
        page = doc[0]
        pix = page.get_pixmap(dpi=200)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n
        )
        if pix.n == 1:
            gray = img[:, :, 0]
        elif pix.n == 4:
            gray = cv2.cvtColor(img, cv2.COLOR_RGBA2GRAY)
        else:
            gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_RGB2GRAY)
        return np.ascontiguousarray(gray)

    arr = np.frombuffer(file_bytes, np.uint8)
    gray = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if gray is None:
        raise ScanError("Could not decode the uploaded file as an image.")
    return gray


def _max_delta_for_matcher(matcher):
    """Best achievable score for a single question (for computing max_score)."""
    if matcher.answer_type == "multiple-correct-weighted":
        correct_vals = [
            v for k, v in matcher.marking.items() if k.startswith("correct-")
        ]
        return max(correct_vals) if correct_vals else matcher.marking["correct"]
    return matcher.marking["correct"]


def _compute_max_score(evaluation_config):
    total = 0.0
    for q in evaluation_config.questions_in_order:
        matcher = evaluation_config.question_to_answer_matcher[q]
        total += float(_max_delta_for_matcher(matcher))
    return total


def _explanation_rows(evaluation_config):
    """Read the per-question rows the engine recorded in its explanation table."""
    table = evaluation_config.explanation_table
    if table is None:
        return []
    cols = {col.header: list(col._cells) for col in table.columns}
    questions = cols.get("Question", [])
    rows = []
    for i in range(len(questions)):
        rows.append(
            {
                "question": cols.get("Question", [None] * len(questions))[i],
                "marked": cols.get("Marked", [""] * len(questions))[i],
                "answer": cols.get("Answer(s)", [""] * len(questions))[i],
                "verdict": cols.get("Verdict", [""] * len(questions))[i],
                "delta": cols.get("Delta", [""] * len(questions))[i],
            }
        )
    return rows


def _encode_annotated(final_marked):
    ok, buf = cv2.imencode(".jpg", final_marked, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii")


def _grade_with_config(file_bytes, filename, evaluation_config):
    """
    Run the full read+grade pipeline against an already-built EvaluationConfig.

    MUST be called while holding _LOCK (the engine objects carry mutable per-run
    state). Returns the standard result dict (see grade()).
    """
    template = _require_template()
    ops = template.image_instance_ops

    in_omr = _bytes_to_grayscale(file_bytes, filename)

    # Perspective-correct via the corner markers (no-op fallback if not found).
    in_omr, _markers_found = _perspective_correct(in_omr)

    ops.reset_all_save_img()
    ops.append_save_img(1, in_omr)

    in_omr = ops.apply_preprocessors(filename or "upload", in_omr, template)
    if in_omr is None:
        raise ScanError(
            "Could not detect the OMR sheet in this image. Retake the photo with "
            "the whole sheet flat, well-lit and in frame."
        )

    response_dict, final_marked, multi_marked, _ = ops.read_omr_response(
        template, image=in_omr, name=str(filename or "upload"), save_dir=None
    )
    omr_response = get_concatenated_response(response_dict, template)

    score = evaluate_concatenated_response(
        omr_response, evaluation_config, Path(str(filename or "upload")), None
    )

    per_question = _explanation_rows(evaluation_config)
    max_score = _compute_max_score(evaluation_config)
    annotated = _encode_annotated(final_marked)

    return {
        "score": round(float(score), 2),
        "max_score": round(float(max_score), 2),
        "multi_marked": bool(multi_marked),
        "per_question": per_question,
        "responses": omr_response,
        "annotated_image": annotated,
    }


def grade(file_bytes, filename):
    """
    Grade a single uploaded sheet against the current (stored) answer key.

    Returns a dict:
      {
        "score": float, "max_score": float, "multi_marked": bool,
        "per_question": [{question, marked, answer, verdict, delta}, ...],
        "responses": {question: marked_answer, ...},
        "annotated_image": "data:image/jpeg;base64,..." | None
      }
    """
    with _LOCK:
        evaluation_config = _state["evaluation_config"]
        if evaluation_config is None:
            raise ScanError(
                "No answer key set yet. Add an answer key before scanning a sheet."
            )
        return _grade_with_config(file_bytes, filename, evaluation_config)


def grade_with_key(file_bytes, filename, answers_in_order, marking):
    """
    Grade a single uploaded sheet against an answer key supplied per-request
    (e.g. the selected exam's key from the app), without touching the stored key.

    answers_in_order grades the first N questions of the fixed sheet layout
    (N = len(answers_in_order)); any remaining bubbles are ignored. Returns the
    same dict shape as grade().
    """
    n = len(answers_in_order)
    if n == 0:
        raise ScanError("Answer key is empty.")

    with _LOCK:
        template = _require_template()
        tuning_config = _state["tuning_config"]
        all_questions = list(template.output_columns)
        if n > len(all_questions):
            raise ScanError(
                f"Answer key has {n} answers but the sheet supports only "
                f"{len(all_questions)} questions."
            )
        questions = all_questions[:n]

        payload = build_answer_key_payload(answers_in_order, marking or {}, questions)
        jsonschema_validate(instance=payload, schema=EVALUATION_SCHEMA)

        # EvaluationConfig reads its key from a file path; write a throwaway one.
        tmp = tempfile.NamedTemporaryFile(
            "w", suffix=".json", delete=False, encoding="utf-8"
        )
        try:
            json.dump(payload, tmp)
            tmp.flush()
            tmp.close()
            evaluation_config = EvaluationConfig(
                LAYOUT_DIR, Path(tmp.name), template, tuning_config
            )
            evaluation_config.should_explain_scoring = True
            return _grade_with_config(file_bytes, filename, evaluation_config)
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
