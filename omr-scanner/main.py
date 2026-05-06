"""
OMR Scanner — FastAPI + Socket.IO entry point.

Run with:
    uvicorn main:socket_app --reload --port 8080

No Redis or Celery required — processing runs as an async background task
in the same process.  For high-throughput production use, swap the
BackgroundTasks approach for the Celery worker in tasks/omr_task.py.
"""

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import exams, scans, students
from socket_manager import sio

# ---------------------------------------------------------------------------
# DB bootstrap (creates tables if they don't exist, then migrate new columns)
# ---------------------------------------------------------------------------
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"DB init warning: {e}")

# Additive migrations — safe to run every startup
def _run_migrations():
    import logging
    _log = logging.getLogger(__name__)
    with engine.connect() as conn:
        migrations = [
            # Add is_fallback column if missing (added 2026-04-13)
            "ALTER TABLE scan_jobs ADD COLUMN is_fallback BOOLEAN DEFAULT 0",
        ]
        for sql in migrations:
            try:
                conn.execute(__import__('sqlalchemy').text(sql))
                conn.commit()
                _log.info(f"Migration applied: {sql}")
            except Exception:
                pass  # Column already exists — ignore

try:
    _run_migrations()
except Exception as _mig_exc:
    import logging
    logging.getLogger(__name__).warning(f"Migration warning: {_mig_exc}")

# ---------------------------------------------------------------------------
# Socket.IO events
# ---------------------------------------------------------------------------
@sio.event
async def connect(sid, environ):
    pass

@sio.event
async def disconnect(sid):
    pass

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="OMR Scanner", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exams.router,    prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(scans.router,    prefix="/api")

app.mount("/static",  StaticFiles(directory="static"),  name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")


# ---------------------------------------------------------------------------
# Wrap with Socket.IO ASGI middleware (serves /socket.io/socket.io.js too)
# ---------------------------------------------------------------------------
_sio_inner = socketio.ASGIApp(sio, app)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

async def socket_app(scope, receive, send):
    if scope["type"] != "http":
        await _sio_inner(scope, receive, send)
        return

    if scope.get("method") == "OPTIONS":
        await send({"type": "http.response.start", "status": 200, "headers": [
            (k.lower().encode(), v.encode()) for k, v in CORS_HEADERS.items()
        ]})
        await send({"type": "http.response.body", "body": b""})
        return

    async def send_with_cors(message):
        if message["type"] == "http.response.start":
            headers = dict(message.get("headers", []))
            for k, v in CORS_HEADERS.items():
                headers[k.lower().encode()] = v.encode()
            message = {**message, "headers": list(headers.items())}
        await send(message)

    await _sio_inner(scope, receive, send_with_cors)
