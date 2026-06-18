# OMR Scanner web app — container image.
# Builds the FastAPI front end (web/) on top of the OMRChecker engine (src/).
FROM python:3.11-slim

# System libs OpenCV needs even in headless mode.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    MPLBACKEND=Agg

WORKDIR /app

# Engine + web dependencies. opencv-python-headless avoids GUI system deps;
# the server never opens windows (show_image_level is forced to 0).
RUN pip install --no-cache-dir \
        opencv-python-headless \
        numpy \
        pandas \
        matplotlib \
        rich \
        dotmap \
        deepmerge \
        jsonschema \
        screeninfo \
        fastapi \
        "uvicorn[standard]" \
        python-multipart \
        pymupdf

COPY src ./src
COPY web ./web

EXPOSE 8000

# Honour the platform-provided $PORT (e.g. Railway), defaulting to 8000 locally.
CMD ["sh", "-c", "uvicorn web.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
