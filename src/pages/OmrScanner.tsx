import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, Camera, CheckCircle2, ChevronLeft,
  Loader2, RefreshCw, ScanLine, Upload, X, XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// OMR Scanner — wired to the OMRChecker FastAPI service (OMRChecker/web).
// Stateless backend: one global answer key + instant per-scan grading.
//   GET  /api/questions    → ordered question labels
//   GET  /api/answer-key   → { has_key }
//   POST /api/answer-key   → { answers_in_order, marking }
//   POST /api/scan (file)  → { score, max_score, multi_marked, per_question, ... }
// Styled to match the Quiz Arena (Quiz.tsx) "sticker" design system.
// ─────────────────────────────────────────────────────────────────────────────

const OMR_API = import.meta.env.VITE_OMR_API ?? "http://localhost:8080";

/* ── brand colours (shared with Quiz.tsx) ───────────────────────────────────── */
const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", blueSoft: "#C8DEFF",
  indigoSoft: "#D6D4FF", cloud: "#F3FAFF", sun: "#FFD65C", pop: "#FF7A59",
  good: "#22c55e",
};

/* ── shared sticker styles ──────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const STICKER = "border-[3px] border-[#0F172A] rounded-[28px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const STICKER_SM = "border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const BTN = "inline-flex items-center justify-center gap-2.5 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none";
const BTN_SM = "inline-flex items-center justify-center gap-2 font-bold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-4 py-2 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-[5px_6px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none";
const TAG = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs";
const FIELD = "w-full px-4 py-2.5 text-sm font-semibold border-[2.5px] border-[#0F172A] rounded-[14px] shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400";

interface PerQuestion {
  question: string;
  marked: string;
  answer: string;
  verdict: string;
  delta: string;
}

interface ScanResult {
  score: number;
  max_score: number;
  multi_marked: boolean;
  per_question: PerQuestion[];
  responses: Record<string, string>;
  annotated_image: string | null;
}

type Msg = { text: string; type: "error" | "success" | "info" } | null;

export default function OmrScanner() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // ── API state ──────────────────────────────────────────────────────────────
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [hasKey, setHasKey]       = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);

  // ── Camera / file ────────────────────────────────────────────────────────
  const videoRef            = useRef<HTMLVideoElement>(null);
  const canvasRef           = useRef<HTMLCanvasElement>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const overlayRef          = useRef<HTMLCanvasElement>(null);
  const rafRef              = useRef<number | null>(null);
  const cornerStableRef     = useRef<number | null>(null);
  const offscreenRef        = useRef<HTMLCanvasElement | null>(null); // reused across frames
  const userClosedCameraRef = useRef(false);                          // true when user taps X
  const nativeCameraRef     = useRef<HTMLInputElement>(null);
  const [cameraOpen,      setCameraOpen]      = useState(false);
  const [cameraError,     setCameraError]     = useState<string | null>(null);
  const [file,            setFile]            = useState<File | null>(null);
  const [preview,         setPreview]         = useState<string | null>(null);
  const [cornersDetected, setCornersDetected] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [pendingBlob,     setPendingBlob]     = useState<Blob | null>(null);
  const [pendingPreview,  setPendingPreview]  = useState<string | null>(null);

  // ── Scan ───────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<ScanResult | null>(null);
  const [scanMsg, setScanMsg]       = useState<Msg>(null);

  // ── Admin: setup ─────────────────────────────────────────────────────────
  const [adminTab, setAdminTab]         = useState<"setup" | "scan">("setup");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [marking, setMarking]           = useState({ correct: "1", incorrect: "0", unmarked: "0" });
  const [savingKey, setSavingKey]       = useState(false);
  const [answerKeyMsg, setAnswerKeyMsg] = useState<Msg>(null);

  // ── Initialise: probe API, learn whether a key exists, fetch question count ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [keyRes, qRes] = await Promise.all([
          fetch(`${OMR_API}/api/answer-key`, { signal: AbortSignal.timeout(8000) }),
          fetch(`${OMR_API}/api/questions`,  { signal: AbortSignal.timeout(8000) }),
        ]);
        const keyData = await keyRes.json();
        const qData   = await qRes.json();
        if (cancelled) return;
        setHasKey(Boolean(keyData.has_key));
        setQuestions(Array.isArray(qData.questions) ? qData.questions : []);
        setApiOnline(true);
      } catch {
        if (!cancelled) setApiOnline(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Camera ───────────────────────────────────────────────────────────────
  const DARK_THR   = 70;
  const DARK_RATIO = 0.03;
  const STABLE_MS  = 2000; // 2s hold — reduces false-positive auto-captures

  // 1) capture — no deps on other useCallbacks
  const triggerCapture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    cornerStableRef.current = null;
    // Cap at 2000px max dimension to reduce upload size
    const MAX = 2000;
    const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
    canvas.width  = Math.round(video.videoWidth  * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      setPendingBlob(blob);
      setPendingPreview(URL.createObjectURL(blob));
      setCornersDetected(false);
      setCaptureProgress(0);
    }, "image/jpeg", 0.92);
  }, []);

  // 2) detection loop — depends on triggerCapture
  const startCornerDetection = useCallback(() => {
    const loop = () => {
      const vid = videoRef.current;
      const cvs = overlayRef.current;
      if (!vid || !cvs) return;
      if (vid.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }

      if (cvs.width !== cvs.offsetWidth || cvs.height !== cvs.offsetHeight) {
        cvs.width  = cvs.offsetWidth  || window.innerWidth;
        cvs.height = cvs.offsetHeight || window.innerHeight;
      }

      const vw = vid.videoWidth, vh = vid.videoHeight;
      const dw = cvs.width,      dh = cvs.height;

      // object-contain letterbox: compute visible video rect in display space
      const vidAR = vw / vh, dispAR = dw / dh;
      let vidLeft = 0, vidTop = 0, vidRight = dw, vidBottom = dh;
      if (vidAR > dispAR) {
        const scale = dw / vw, rendH = Math.round(vh * scale);
        vidTop = Math.round((dh - rendH) / 2); vidBottom = vidTop + rendH;
      } else {
        const scale = dh / vh, rendW = Math.round(vw * scale);
        vidLeft = Math.round((dw - rendW) / 2); vidRight = vidLeft + rendW;
      }
      const contentW = vidRight - vidLeft, contentH = vidBottom - vidTop;

      // Offscreen canvas samples only the content area (excludes letterbox bars)
      const SW = 320, SH = Math.round(contentH / contentW * SW);
      if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
      const off = offscreenRef.current;
      if (off.width !== SW || off.height !== SH) { off.width = SW; off.height = SH; }
      const offCtx = off.getContext("2d")!;
      offCtx.drawImage(vid, vidLeft, vidTop, contentW, contentH, 0, 0, SW, SH);
      const { data } = offCtx.getImageData(0, 0, SW, SH);

      // Guide frame in offscreen coords — mirrors the visual guide drawn on the overlay
      const gxL = Math.round(SW * 0.07),  gxR = Math.round(SW * 0.93);
      const gyT = Math.round(SH * 0.04);
      const gyB = Math.min(SH - 1, Math.round(gyT + SW * 0.86 * (297 / 210)));
      const bx  = Math.floor(SW * 0.08),  by = Math.floor(SH * 0.08);

      // Detection regions at the 4 guide-frame corners (where markers should appear)
      const regions = [
        { x1: Math.max(0, gxL-bx), y1: Math.max(0, gyT-by), x2: Math.min(SW, gxL+bx), y2: Math.min(SH, gyT+by) },
        { x1: Math.max(0, gxR-bx), y1: Math.max(0, gyT-by), x2: Math.min(SW, gxR+bx), y2: Math.min(SH, gyT+by) },
        { x1: Math.max(0, gxL-bx), y1: Math.max(0, gyB-by), x2: Math.min(SW, gxL+bx), y2: Math.min(SH, gyB+by) },
        { x1: Math.max(0, gxR-bx), y1: Math.max(0, gyB-by), x2: Math.min(SW, gxR+bx), y2: Math.min(SH, gyB+by) },
      ];

      const found = regions.map(r => {
        let sx = 0, sy = 0, n = 0;
        for (let y = r.y1; y < r.y2; y++) for (let x = r.x1; x < r.x2; x++) {
          const i = (y * SW + x) * 4;
          if (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114 < DARK_THR) { sx += x; sy += y; n++; }
        }
        const total = (r.x2 - r.x1) * (r.y2 - r.y1);
        return n / total >= DARK_RATIO ? {
          x: (vidLeft + sx/n/SW * contentW) / dw,
          y: (vidTop  + sy/n/SH * contentH) / dh,
        } : null;
      });

      const allFound = found.every(Boolean);
      const now = Date.now();
      let progress = 0;
      if (allFound) {
        if (!cornerStableRef.current) cornerStableRef.current = now;
        const elapsed = now - cornerStableRef.current;
        progress = Math.min(elapsed / STABLE_MS * 100, 100);
        if (elapsed >= STABLE_MS) { triggerCapture(); return; }
      } else {
        cornerStableRef.current = null;
      }
      setCornersDetected(allFound);
      setCaptureProgress(progress);

      const ctx = cvs.getContext("2d")!;
      ctx.clearRect(0, 0, dw, dh);

      // Guide frame (A4 ratio centred in content area)
      const GX = vidLeft  + contentW * 0.07;
      const GY = vidTop   + contentH * 0.04;
      const GW = contentW * 0.86;
      const GH = GW * (297 / 210);
      const borderCol = allFound ? "#22c55e" : "rgba(255,255,255,0.85)";

      // Dark vignette outside the guide frame (path-with-hole)
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.52)";
      ctx.beginPath();
      ctx.rect(0, 0, dw, dh);
      ctx.rect(GX, GY, GW, GH);
      ctx.fill("evenodd");
      ctx.restore();

      // Guide border + progress glow when all corners detected
      ctx.strokeStyle = borderCol;
      ctx.lineWidth   = allFound ? 3 + progress / 100 * 2 : 2.5;
      ctx.strokeRect(GX, GY, GW, GH);

      // Corner brackets on guide frame
      const B = 22;
      ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.strokeStyle = borderCol;
      for (const [cx2, cy2, sx2, sy2] of [
        [GX,      GY,       1,  1],
        [GX + GW, GY,      -1,  1],
        [GX,      GY + GH,  1, -1],
        [GX + GW, GY + GH, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath();
        ctx.moveTo(cx2 + sx2 * B, cy2);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx2, cy2 + sy2 * B);
        ctx.stroke();
      }

      // Instruction label
      ctx.fillStyle  = "rgba(255,255,255,0.88)";
      ctx.font       = `bold ${Math.round(dw * 0.036)}px system-ui, sans-serif`;
      ctx.textAlign  = "center";
      ctx.fillText("Fit the answer sheet within the frame", dw / 2, Math.max(GY - 10, 16));

      // Detected marker dots (yellow when partial, green when all found)
      const defaultPts = [
        { x: GX / dw,        y: GY / dh },
        { x: (GX + GW) / dw, y: GY / dh },
        { x: GX / dw,        y: (GY + GH) / dh },
        { x: (GX + GW) / dw, y: (GY + GH) / dh },
      ];
      found.forEach((pt, i) => {
        const isR = i === 1 || i === 3, isB = i === 2 || i === 3;
        const p   = pt ?? defaultPts[i];
        const px  = p.x * dw, py = p.y * dh, L = 20;
        ctx.strokeStyle = pt ? (allFound ? "#00ff88" : "#facc15") : "rgba(255,255,255,0.35)";
        ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px + (isR ? L : -L), py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py + (isB ? L : -L));
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [triggerCapture]);

  // 3) open — depends on startCornerDetection
  const openCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:  { ideal: "environment" },
          width:       { ideal: 1920 },
          height:      { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => startCornerDetection();
        }
      }, 50);
    } catch (e: any) {
      const msg = e.name === "NotAllowedError"
        ? "Camera permission denied by browser."
        : e.name === "NotFoundError"
        ? "No camera found on this device."
        : `Camera error: ${e.message}`;
      setCameraError(msg);
    }
  }, [startCornerDetection]);

  // 4) close
  const closeCamera = useCallback((intentional = false) => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    cornerStableRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCornersDetected(false);
    setCaptureProgress(0);
    if (intentional) userClosedCameraRef.current = true;
  }, []);

  // Stop the camera if the component unmounts
  useEffect(() => () => closeCamera(), [closeCamera]);

  // Auto-open camera for non-admins once API + answer key are ready
  useEffect(() => {
    if (isAdmin === false && apiOnline === true && hasKey) {
      navigator.permissions?.query({ name: "camera" as PermissionName })
        .then(perm => {
          if (perm.state !== "denied") openCamera();
          else setCameraError("Camera permission is blocked. Enable it in your browser's site settings, then refresh.");
        })
        .catch(() => openCamera());
    }
  }, [isAdmin, apiOnline, hasKey]); // eslint-disable-line

  const pickFile = (f: File) => {
    setFile(f);
    setResult(null);
    setScanMsg(null);
    setPreview(f.type === "application/pdf" ? null : URL.createObjectURL(f));
  };
  const clearFile = () => { setFile(null); setPreview(null); };

  // ── Submit scan (synchronous grading) ───────────────────────────────────────
  const submitScan = async () => {
    if (!file) { setScanMsg({ text: "No file selected.", type: "error" }); return; }
    if (file.size > 10 * 1024 * 1024) {
      setScanMsg({ text: "File is too large (max 10 MB). Try a lower-resolution photo.", type: "error" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    setScanMsg({ text: "Scanning…", type: "info" });
    const fd = new FormData();
    fd.append("file", file, file.name || "scan.jpg");
    try {
      const res = await fetch(`${OMR_API}/api/scan`, { method: "POST", body: fd });
      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try { const e = await res.json(); detail = e.detail ?? detail; } catch { /* non-JSON */ }
        throw new Error(detail);
      }
      const data: ScanResult = await res.json();
      setResult(data);
      setScanMsg(null);
      clearFile();
    } catch (e: any) {
      setScanMsg({ text: e.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin: save the (single, global) answer key ─────────────────────────────
  const saveAnswerKey = async () => {
    const lines = answerKeyText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setAnswerKeyMsg({ text: "Enter the answer key.", type: "error" }); return; }
    if (!questions.length) { setAnswerKeyMsg({ text: "Couldn't load the question list from the server.", type: "error" }); return; }

    // Accept either "1,A" numbered lines or one bare answer per line in order.
    let answers: string[];
    if (lines.every(l => l.includes(","))) {
      const map = new Map<number, string>();
      for (const line of lines) {
        const [numStr, ans] = line.split(",").map(s => s.trim());
        const num = parseInt(numStr, 10);
        if (!num || !ans) {
          setAnswerKeyMsg({ text: `Bad line: "${line}". Use "1,A" per line.`, type: "error" });
          return;
        }
        map.set(num, ans.toUpperCase());
      }
      answers = questions.map((_, i) => map.get(i + 1) ?? "");
    } else {
      answers = lines.map(l => l.toUpperCase());
    }

    if (answers.length !== questions.length || answers.some(a => !a)) {
      setAnswerKeyMsg({
        text: `Expected ${questions.length} answers (one per question), got ${answers.filter(Boolean).length}.`,
        type: "error",
      });
      return;
    }

    setSavingKey(true);
    setAnswerKeyMsg(null);
    try {
      const res = await fetch(`${OMR_API}/api/answer-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers_in_order: answers, marking }),
      });
      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try { const e = await res.json(); detail = e.detail ?? detail; } catch { /* non-JSON */ }
        throw new Error(detail);
      }
      setHasKey(true);
      setAnswerKeyMsg({ text: "Answer key saved.", type: "success" });
    } catch (e: any) {
      setAnswerKeyMsg({ text: e.message, type: "error" });
    } finally {
      setSavingKey(false);
    }
  };

  // ── Sticker notice helper ────────────────────────────────────────────────────
  const notice = (text: string, color: string, key?: string) => (
    <div
      key={key}
      className="flex items-start gap-2.5 p-3.5 bg-white border-[2.5px] border-l-[6px] border-[#0F172A] rounded-[16px] shadow-[3px_3px_0_0_#0F172A]"
      style={{ borderLeftColor: color }}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <p className="text-sm font-semibold text-slate-700 leading-snug">{text}</p>
    </div>
  );

  const msgColor = (t: NonNullable<Msg>["type"]) =>
    t === "error" ? C.pop : t === "success" ? C.good : C.blue;

  // ── Results panel ──────────────────────────────────────────────────────────
  const resultPanel = result && (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`${DISPLAY} font-extrabold text-4xl leading-none`}>
          {result.score}
          <span className="text-xl text-slate-400 font-bold"> / {result.max_score}</span>
        </div>
        {result.max_score > 0 && (
          <span className={TAG} style={{ background: C.skySoft }}>
            {Math.round((result.score / result.max_score) * 100)}%
          </span>
        )}
        {result.multi_marked && (
          <span className={`${TAG} text-white`} style={{ background: C.pop }}>multiple bubbles</span>
        )}
      </div>

      {result.annotated_image && (
        <img
          src={result.annotated_image}
          alt="Annotated scan"
          className="w-full max-h-80 object-contain rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white"
        />
      )}

      {result.per_question.length > 0 && (
        <div className="overflow-x-auto rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white">
          <table className="w-full text-sm">
            <thead className="text-left" style={{ background: C.skySoft }}>
              <tr className={`${DISPLAY} font-extrabold`}>
                <th className="px-3 py-2.5">Q</th>
                <th className="px-3 py-2.5">Marked</th>
                <th className="px-3 py-2.5">Answer</th>
                <th className="px-3 py-2.5">Verdict</th>
                <th className="px-3 py-2.5 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {result.per_question.map((q, i) => {
                const correct = /correct/i.test(q.verdict);
                return (
                  <tr key={i} className="border-t-[2px] border-[#0F172A]/15">
                    <td className="px-3 py-2 font-mono font-bold">{q.question}</td>
                    <td className="px-3 py-2 font-semibold">{q.marked || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{q.answer}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-bold" style={{ color: correct ? C.good : C.pop }}>
                        {correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {q.verdict}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{q.delta}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button className={`${BTN} w-full bg-white`} onClick={() => setResult(null)}>
        <ScanLine className="w-4 h-4" /> Scan another sheet
      </button>
    </div>
  );

  // ── Scan interface ──────────────────────────────────────────────────────────
  const scanInterface = (
    <div className="space-y-4">
      {apiOnline === false &&
        notice("Can't reach the OMR service. Make sure it's running and VITE_OMR_API is set.", C.pop)}

      {apiOnline === true && !hasKey &&
        notice(
          isAdmin
            ? "No answer key set yet. Add one in the Setup tab before scanning."
            : "No answer key set yet. Ask an admin to set the answer key.",
          C.sun,
        )}

      {result ? resultPanel : (
        <>
          {/* Camera / upload buttons */}
          {!cameraOpen && !file && (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className={`${BTN} flex-1 text-white`}
                  style={{ background: C.indigo }}
                  onClick={openCamera}
                  disabled={!apiOnline || !hasKey}
                >
                  <Camera className="w-4 h-4" /> Use Camera
                </button>
                <label className={`${BTN} flex-1 bg-white ${!apiOnline || !hasKey ? "opacity-40 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4" /> Upload File
                  <input
                    type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                    disabled={!apiOnline || !hasKey}
                    onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])}
                  />
                </label>
              </div>
              <button
                className="w-full text-xs font-bold text-slate-500 underline underline-offset-2 hover:opacity-80 transition-opacity disabled:opacity-40"
                disabled={!apiOnline || !hasKey}
                onClick={() => nativeCameraRef.current?.click()}
              >
                Use phone camera app instead
              </button>
              <input
                ref={nativeCameraRef}
                type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {cameraError && (
            <div className="space-y-2">
              {notice(cameraError, C.pop)}
              <button className={`${BTN_SM} bg-white`} onClick={() => { setCameraError(null); openCamera(); }}>
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          )}

          {/* Full-screen camera */}
          {cameraOpen && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3
                              bg-gradient-to-b from-black/70 to-transparent">
                <span className={`${DISPLAY} text-sm font-extrabold transition-colors ${cornersDetected ? "text-green-400" : "text-white/85"}`}>
                  {cornersDetected ? "✓ Paper detected — hold still" : "Align all 4 corners in frame"}
                </span>
                <button
                  className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                  onClick={() => closeCamera(true)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative flex-1 overflow-hidden">
                <video ref={videoRef} autoPlay playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black" />
                <canvas ref={overlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none" />
              </div>

              {/* Confirmation overlay — after auto/manual capture */}
              {pendingPreview && (
                <div className="absolute inset-0 z-20 flex flex-col bg-black">
                  <img src={pendingPreview} alt="Captured" className="flex-1 w-full object-contain" />
                  <div className="flex gap-3 p-4 pb-8 bg-black/80">
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-white border-[2.5px] border-white/40 rounded-full py-3 hover:bg-white/10 transition-colors"
                      onClick={() => { setPendingBlob(null); setPendingPreview(null); startCornerDetection(); }}
                    >
                      Retake
                    </button>
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 font-extrabold font-['Baloo_2'] text-white rounded-full py-3 transition-transform active:scale-95"
                      style={{ background: C.good }}
                      onClick={() => {
                        setFile(new File([pendingBlob!], "capture.jpg", { type: "image/jpeg" }));
                        setPreview(pendingPreview!);
                        setResult(null);
                        setScanMsg(null);
                        setPendingBlob(null);
                        setPendingPreview(null);
                        streamRef.current?.getTracks().forEach(t => t.stop());
                        streamRef.current = null;
                        setCameraOpen(false);
                      }}
                    >
                      Use this photo
                    </button>
                  </div>
                </div>
              )}

              {/* Shutter button with progress ring */}
              {!pendingPreview && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center pb-10 pt-4
                                bg-gradient-to-t from-black/70 to-transparent">
                  <button onClick={triggerCapture} aria-label="Capture photo"
                    className="relative w-20 h-20 rounded-full bg-white border-[3px] border-[#0F172A] shadow-xl active:scale-95 transition-transform">
                    {captureProgress > 0 && (
                      <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#00ff88" strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${captureProgress / 100 * 213.6} 213.6`} />
                      </svg>
                    )}
                    <Camera className="w-8 h-8 text-gray-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white" />
              <button
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-transform"
                onClick={clearFile}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {file && !preview && (
            <div className={`${STICKER_SM} flex items-center gap-2.5 p-3.5`}>
              <ScanLine className="w-4 h-4 shrink-0" style={{ color: C.indigo }} />
              <span className="text-sm font-semibold flex-1 truncate">{file.name}</span>
              <button className="p-1.5 rounded-full hover:bg-slate-100 transition-colors" onClick={clearFile}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submit */}
          {file && (
            <button className={`${BTN} w-full text-white`} style={{ background: C.blue }} onClick={submitScan} disabled={submitting || !apiOnline || !hasKey}>
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
                : <><ScanLine className="w-4 h-4" /> Submit Scan</>}
            </button>
          )}

          {scanMsg && notice(scanMsg.text, msgColor(scanMsg.type))}
        </>
      )}

      {/* Hidden capture canvas (used by the camera) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  // ── Shared header ───────────────────────────────────────────────────────────
  const pageHeader = (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={() => navigate("/quiz")} className={`${BTN_SM} bg-white`}>
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-[13px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigo }}>
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className={`${DISPLAY} font-extrabold text-2xl leading-none`}>OMR Scanner</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 hidden sm:block">Grade answer sheets instantly</p>
        </div>
      </div>
      {isAdmin && <span className={`${TAG} ml-auto`} style={{ background: C.sun }}>Admin</span>}
    </div>
  );

  // ── Page shell with the Quiz Arena gradient backdrop ─────────────────────────
  const shell = (children: React.ReactNode, maxW: string) => (
    <div
      className="font-['Nunito'] relative text-[#0F172A] min-h-screen pb-24"
      style={{
        backgroundImage: `
          radial-gradient(900px 500px at 90% -5%,  rgba(59,214,245,.40), transparent 60%),
          radial-gradient(700px 400px at -5% 15%,  rgba(47,124,255,.35), transparent 60%),
          radial-gradient(600px 500px at 50% 100%, rgba(46,43,229,.20), transparent 60%)
        `,
        backgroundColor: C.cloud,
      }}
    >
      <div className={`relative z-[2] ${maxW} mx-auto px-4 pt-6 sm:pt-8`}>
        {pageHeader}
        {children}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // NON-ADMIN VIEW — scan card only
  // ════════════════════════════════════════════════════════════════════════
  if (!isAdmin) {
    return shell(
      <div className={`${STICKER} p-5 sm:p-6`}>
        <h2 className={`${DISPLAY} font-extrabold text-lg mb-4`}>Scan Answer Sheet</h2>
        {scanInterface}
      </div>,
      "max-w-lg",
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ADMIN VIEW — setup / scan tabs
  // ════════════════════════════════════════════════════════════════════════
  return shell(
    <>
      {/* Tab bar — sticker pills */}
      <div className="flex gap-2 mb-6">
        {(["setup", "scan"] as const).map(t => {
          const active = adminTab === t;
          return (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className="px-6 py-2.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold font-['Baloo_2'] text-sm capitalize transition-all hover:-translate-y-0.5"
              style={{
                background: active ? C.blue : "white",
                color: active ? "white" : C.ink,
                boxShadow: active ? "3px 3px 0 0 #0F172A" : "2px 2px 0 0 #0F172A",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* ── Setup tab ── */}
      {adminTab === "setup" && (
        <div className={`${STICKER} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <h2 className={`${DISPLAY} font-extrabold text-lg`}>Answer Key</h2>
            {hasKey && <span className={TAG} style={{ background: C.skySoft }}>key set</span>}
            {questions.length > 0 && (
              <span className="text-xs font-bold text-slate-400 ml-auto">{questions.length} questions</span>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">
                Answers — one per line: <code className="text-xs px-1 rounded bg-slate-100">1,A</code> (or one bare letter per line, in order)
              </label>
              <textarea
                value={answerKeyText}
                onChange={e => setAnswerKeyText(e.target.value)}
                placeholder={"1,A\n2,C\n3,B\n4,D"}
                className={`${FIELD} font-mono min-h-[180px] resize-y`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["correct", "incorrect", "unmarked"] as const).map(k => (
                <div key={k} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 capitalize">{k}</label>
                  <input
                    value={marking[k]}
                    onChange={e => setMarking(m => ({ ...m, [k]: e.target.value }))}
                    className={FIELD}
                  />
                </div>
              ))}
            </div>

            <button className={`${BTN} w-full text-white`} style={{ background: C.blue }} onClick={saveAnswerKey} disabled={savingKey || !apiOnline}>
              {savingKey ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Answer Key</>}
            </button>

            {answerKeyMsg && notice(answerKeyMsg.text, msgColor(answerKeyMsg.type))}
            {apiOnline === false &&
              notice("Can't reach the OMR service. Check it's running and VITE_OMR_API is set.", C.pop)}
          </div>
        </div>
      )}

      {/* ── Scan tab ── */}
      {adminTab === "scan" && (
        <div className={`${STICKER} p-5 sm:p-6`}>
          <h2 className={`${DISPLAY} font-extrabold text-lg mb-4`}>Scan Answer Sheet</h2>
          {scanInterface}
        </div>
      )}
    </>,
    "max-w-2xl",
  );
}
