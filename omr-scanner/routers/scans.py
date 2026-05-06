import asyncio
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import UPLOAD_DIR
from database import SessionLocal, get_db
from models.models import AnswerKey, Exam, JobStatus, OmrResult, ScanJob, Score, Student
from schemas.schemas import OverrideIn
from socket_manager import sio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["scan"])

_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


# ---------------------------------------------------------------------------
# Background processing (no Celery / Redis required)
# ---------------------------------------------------------------------------

async def _process_scan(job_id: str, image_path: str, exam_id: str) -> None:
    """
    Run the full OMR pipeline in an async background task.
    CPU-heavy work (OpenCV / Tesseract) runs in a thread-pool executor so it
    doesn't block the event loop.
    """
    db = SessionLocal()
    try:
        # 1. Mark processing
        job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
        if job is None:
            return
        job.status = JobStatus.processing
        db.commit()

        # 2. Load answer keys
        answer_keys = db.query(AnswerKey).filter(AnswerKey.exam_id == exam_id).all()
        if not answer_keys:
            raise ValueError(f"No answer key found for exam {exam_id}")

        # 3. Run pipeline in thread pool (CPU-bound)
        from processing.pipeline import run_pipeline
        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_pipeline, image_path, answer_keys)

        # 4. Resolve student
        if result["student_code"]:
            student = (
                db.query(Student)
                .filter(Student.student_code == result["student_code"])
                .first()
            )
            if student:
                job.student_id = student.id

        # 5. Persist OMR results
        flagged_count = 0
        for q in result["grade_result"]["questions"]:
            omr = OmrResult(
                scan_job_id     = job_id,
                question_number = q["question_number"],
                detected_answer = q["detected_answer"],
                is_correct      = q["is_correct"],
                confidence      = q["confidence"],
                is_flagged      = q["flagged"],
            )
            db.add(omr)
            if q["flagged"]:
                flagged_count += 1

        # 6. Persist score
        gr = result["grade_result"]
        db.add(Score(
            scan_job_id  = job_id,
            raw_score    = gr["raw_score"],
            max_score    = gr["max_score"],
            percentage   = gr["percentage"],
            is_finalized = False,
        ))

        # 7. Mark done
        job.status             = JobStatus.done
        job.overall_confidence = result["overall_confidence"]
        db.commit()

        # 8. Notify frontend
        await sio.emit("scan_complete", {
            "job_id":        job_id,
            "status":        "done",
            "score":         gr["raw_score"],
            "max_score":     gr["max_score"],
            "percentage":    gr["percentage"],
            "flagged_count": flagged_count,
        })

    except Exception as exc:
        logger.exception("OMR scan job %s failed: %s", job_id, exc)
        try:
            job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
            if job:
                job.status = JobStatus.failed
                db.commit()
        except Exception:
            db.rollback()
        await sio.emit("scan_failed", {"job_id": job_id, "error": "Scan failed. Please try again."})
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", status_code=202)
async def upload_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile    = File(...),
    exam_id: str        = Form(...),
    db: Session         = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail=f"Exam not found: {exam_id}")

    job_id    = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{job_id}{ext}"

    with open(save_path, "wb") as fh:
        shutil.copyfileobj(file.file, fh)

    job = ScanJob(
        id        = job_id,
        exam_id   = exam_id,
        image_url = str(save_path),
        status    = JobStatus.pending,
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(_process_scan, job_id, str(save_path), exam_id)

    return {"job_id": job_id, "status": "pending"}


@router.get("/{job_id}")
def get_scan(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scan job not found")

    omr_rows = sorted(
        [
            {
                "id":              r.id,
                "question_number": r.question_number,
                "detected_answer": r.detected_answer,
                "is_correct":      r.is_correct,
                "confidence":      r.confidence,
                "is_flagged":      r.is_flagged,
                "is_overridden":   r.is_overridden,
                "override_answer": r.override_answer,
            }
            for r in job.omr_results
        ],
        key=lambda x: x["question_number"],
    )

    score_data = None
    if job.score:
        sc = job.score
        score_data = {
            "raw_score":    sc.raw_score,
            "max_score":    sc.max_score,
            "percentage":   sc.percentage,
            "is_finalized": sc.is_finalized,
        }

    return {
        "job_id":             job.id,
        "exam_id":            job.exam_id,
        "student_id":         job.student_id,
        "status":             job.status.value,
        "overall_confidence": job.overall_confidence,
        "is_fallback":        bool(job.is_fallback),
        "error_message":      job.error_message,
        "scanned_at":         job.scanned_at.isoformat() if job.scanned_at else None,
        "omr_results":        omr_rows,
        "score":              score_data,
    }


@router.patch("/{job_id}/results/{result_id}")
def override_result(
    job_id:    str,
    result_id: str,
    body:      OverrideIn,
    db:        Session = Depends(get_db),
):
    result = (
        db.query(OmrResult)
        .filter(OmrResult.id == result_id, OmrResult.scan_job_id == job_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.is_overridden   = True
    result.override_answer = body.override_answer

    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    ak  = (
        db.query(AnswerKey)
        .filter(
            AnswerKey.exam_id         == job.exam_id,
            AnswerKey.question_number == result.question_number,
        )
        .first()
    )
    if ak:
        result.is_correct = body.override_answer == ak.correct_answer

    db.commit()

    # Recalculate score
    all_results = db.query(OmrResult).filter(OmrResult.scan_job_id == job_id).all()
    answer_keys = db.query(AnswerKey).filter(AnswerKey.exam_id == job.exam_id).all()
    key_map     = {k.question_number: k for k in answer_keys}

    raw = total = 0.0
    for r in all_results:
        ak_row = key_map.get(r.question_number)
        if not ak_row:
            continue
        total += ak_row.points
        effective = r.override_answer if r.is_overridden else r.detected_answer
        if effective == ak_row.correct_answer:
            raw += ak_row.points

    score = db.query(Score).filter(Score.scan_job_id == job_id).first()
    if score:
        score.raw_score  = raw
        score.max_score  = total
        score.percentage = round((raw / total * 100) if total > 0 else 0.0, 2)
        db.commit()

    return {
        "message":    "Override applied",
        "is_correct": result.is_correct,
        "new_score":  score.raw_score if score else None,
        "percentage": score.percentage if score else None,
    }
