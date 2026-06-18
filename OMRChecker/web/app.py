"""
FastAPI app exposing the OMRChecker engine as an OMR-scanning + grading web tool.

Run from the repo root:
    uvicorn web.app:app --host 0.0.0.0 --port 8000 --reload

Then open http://localhost:8000 (or http://<your-LAN-ip>:8000 from a phone).
"""
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from jsonschema.exceptions import ValidationError

from web import omr_service

STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="OMR Scanner", version="1.0.0")

# CORS: the AceTerus frontend (Vercel / local dev) calls this API cross-origin.
# OMR_ALLOWED_ORIGINS is a comma-separated allowlist; defaults cover local dev.
_default_origins = "http://localhost:8001,http://localhost:5173,http://localhost:3000"
_allowed_origins = [
    o.strip()
    for o in os.environ.get("OMR_ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    # Load the fixed layout once; fail loudly if the template is missing/broken.
    omr_service.load_layout()


# ---- API models -----------------------------------------------------------------

class MarkingScheme(BaseModel):
    correct: str = "1"
    incorrect: str = "0"
    unmarked: str = "0"


class AnswerKeyPayload(BaseModel):
    answers_in_order: list  # list of answer strings (or lists for multi-correct)
    marking: MarkingScheme = MarkingScheme()


# ---- API endpoints --------------------------------------------------------------

@app.get("/api/questions")
def api_questions():
    return {"questions": omr_service.get_questions()}


@app.get("/api/answer-key")
def api_get_answer_key():
    key = omr_service.get_answer_key()
    return {"answer_key": key, "has_key": omr_service.has_answer_key()}


@app.post("/api/answer-key")
def api_save_answer_key(payload: AnswerKeyPayload):
    questions = omr_service.get_questions()
    if len(payload.answers_in_order) != len(questions):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Expected {len(questions)} answers (one per question), "
                f"got {len(payload.answers_in_order)}."
            ),
        )
    evaluation_json = omr_service.build_answer_key_payload(
        payload.answers_in_order, payload.marking.model_dump(), questions
    )
    try:
        saved = omr_service.save_answer_key(evaluation_json)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid answer key: {e.message}")
    except Exception as e:  # answer-key parsing errors from the engine
        raise HTTPException(status_code=400, detail=str(e))
    return {"saved": True, "answer_key": saved}


@app.post("/api/scan")
async def api_scan(file: UploadFile = File(...)):
    if not omr_service.has_answer_key():
        raise HTTPException(
            status_code=400,
            detail="No answer key set. Save an answer key before scanning.",
        )
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    try:
        result = omr_service.grade(data, file.filename)
    except omr_service.ScanError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")
    return JSONResponse(result)


# ---- Frontend (mounted last so /api/* wins) -------------------------------------

@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
