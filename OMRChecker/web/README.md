# OMR Scanner — Web App

A browser-based front end for the OMRChecker engine. Take a **phone-camera photo** or
upload a **PDF/PNG/JPG** of a *filled* OMR sheet, and the app reads the marked bubbles and
**grades them against an answer key** you manage in the UI.

It wraps the existing engine in [`src/`](../src) — no change to the computer-vision logic.

## How it works

```
Browser (phone camera / drag-drop PDF·PNG)
   → FastAPI (web/app.py)
   → omr_service.grade()  ── in-process, no folders/CSV ──→  src/ engine
        read_omr_response → get_concatenated_response → evaluate_concatenated_response
   ← JSON: score, per-question verdicts, annotated image (base64)
```

- The **fixed sheet layout** lives in [`web/layout/template.json`](layout/template.json).
  Replace it with your own OMRChecker template to use your sheet (see below).
- The **answer key** is stored in `web/layout/evaluation.json`, created/edited from the
  app's *Answer Key* tab (OMRChecker `source_type: "custom"` format).
- PDFs are rasterized to an image with **PyMuPDF** (no system dependencies).

## Run locally

From the **repository root** (so the `src` package is importable):

```bash
# 1. install dependencies (engine deps + web deps)
python -m pip install -r web/requirements-web.txt
#    (the engine also needs: opencv-python, numpy, pandas, rich, jsonschema, dotmap, ...)

# 2. start the server
python -m uvicorn web.app:app --host 0.0.0.0 --port 8000
```

Open <http://localhost:8000>. To use a **phone on the same Wi-Fi**, open
`http://<your-computer-LAN-IP>:8000` on the phone.

> **Camera note:** the "📷 Take photo" button uses the phone's native camera and works over
> plain HTTP on a LAN. A live in-page camera preview (`getUserMedia`) requires a secure
> context (HTTPS or `localhost`); when deployed behind HTTPS it works automatically.

## Using your own OMR sheet

1. Calibrate an OMRChecker `template.json` for your sheet (see the project
   [User Guide](https://github.com/Udayraj123/OMRChecker/wiki/User-Guide); the
   `--setLayout` mode of `main.py` helps position the bubble grid).
2. Drop it in `web/layout/template.json` (keep an optional `config.json` there too).
3. Restart the server, open the *Answer Key* tab, fill in the correct option per question,
   set the marking scheme, and **Save**.
4. Scan sheets from the *Scan & Grade* tab.

## Endpoints

| Method | Path               | Purpose                                            |
|--------|--------------------|----------------------------------------------------|
| GET    | `/`                | Single-page app                                    |
| GET    | `/api/questions`   | Ordered question labels (drives the key form)      |
| GET    | `/api/answer-key`  | Current answer key + `has_key`                     |
| POST   | `/api/answer-key`  | Validate + save the answer key                     |
| POST   | `/api/scan`        | Multipart image/PDF → graded result JSON           |

## Tests

```bash
python -m pytest web/test_omr_service.py
```

Grades the bundled `samples/sample4` image through the service and asserts the score —
a parity check that the wrapper matches the engine.

## Deploy (optional)

A [`Dockerfile`](../Dockerfile) is included. On a platform like Railway it builds and runs
`uvicorn web.app:app` on `$PORT`; HTTPS is provided by the platform (which also enables the
live camera preview). Note: the answer key is stored on the container filesystem — attach a
persistent volume if you need it to survive redeploys.
