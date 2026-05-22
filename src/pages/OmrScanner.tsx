import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, Camera, CheckCircle2, ChevronLeft,
  Eye, Loader2, RefreshCw, ScanLine, Upload, X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

const OMR_API = import.meta.env.VITE_OMR_API ?? "http://localhost:8080";

// ── Types ──────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  total_questions: number;
  exam_date: string;
}

interface OmrResultItem {
  id: string;
  question_number: number;
  detected_answer: string | null;
  is_correct: boolean;
  confidence: number;
  is_flagged: boolean;
  is_overridden: boolean;
  override_answer: string | null;
}

interface ScanJob {
  job_id: string;
  status: "pending" | "processing" | "done" | "failed";
  score?: { raw_score: number; max_score: number; percentage: number };
  omr_results?: OmrResultItem[];
  overall_confidence?: number;
  is_fallback?: boolean;
  error_message?: string | null;
}

interface ReviewRow {
  job_id: string;
  student_code: string | null;
  status: string;
  raw_score: number | null;
  max_score: number | null;
  percentage: number | null;
  flagged_count: number;
  scanned_at: string | null;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OmrScanner() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // ── API state ────────────────────────────────────────────────────────────
  const [apiOnline, setApiOnline]   = useState<boolean | null>(null);
  const [exams, setExams]           = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");

  // ── Camera / file ────────────────────────────────────────────────────────
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const overlayRef      = useRef<HTMLCanvasElement>(null);
  const rafRef          = useRef<number | null>(null);
  const cornerStableRef    = useRef<number | null>(null);
  const offscreenRef       = useRef<HTMLCanvasElement | null>(null);  // reused across frames
  const userClosedCameraRef = useRef(false);  // true when user explicitly taps X
  const [cameraOpen,       setCameraOpen]       = useState(false);
  const [cameraError,      setCameraError]      = useState<string | null>(null);
  const [file,             setFile]             = useState<File | null>(null);
  const [preview,          setPreview]          = useState<string | null>(null);
  const [cornersDetected,  setCornersDetected]  = useState(false);
  const [captureProgress,  setCaptureProgress]  = useState(0);
  const [pendingBlob,      setPendingBlob]      = useState<Blob | null>(null);
  const [pendingPreview,   setPendingPreview]   = useState<string | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);

  // ── Scan / jobs ──────────────────────────────────────────────────────────
  const [jobs,       setJobs]       = useState<Map<string, ScanJob>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [scanMsg,    setScanMsg]    = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  // ── Admin: tab & setup ───────────────────────────────────────────────────
  const [adminTab,      setAdminTab]      = useState<"setup" | "scan" | "review">("setup");
  const [examTitle,     setExamTitle]     = useState("");
  const [examQuestions, setExamQuestions] = useState("20");
  const [examDate,      setExamDate]      = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [savingKey,     setSavingKey]     = useState(false);
  const [setupMsg,      setSetupMsg]      = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [answerKeyMsg,  setAnswerKeyMsg]  = useState<{ text: string; type: "error" | "success" } | null>(null);

  // ── Admin: review ────────────────────────────────────────────────────────
  const [reviewRows,    setReviewRows]    = useState<ReviewRow[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [expandedData,  setExpandedData]  = useState<ScanJob | null>(null);

  // ── Debug panel ───────────────────────────────────────────────────────────
  const [debugJobId,  setDebugJobId]  = useState<string | null>(null);
  const [debugData,   setDebugData]   = useState<Record<string, unknown> | null>(null);
  const [debugLoading,setDebugLoading]= useState(false);

  // ── Initialise ───────────────────────────────────────────────────────────
  const checkApi = async () => {
    try {
      const res = await fetch(`${OMR_API}/api/exams`, { signal: AbortSignal.timeout(5000) });
      setExams(await res.json());
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };

  useEffect(() => { checkApi(); }, []);

  // Auto-select exam when only one exists
  useEffect(() => {
    if (exams.length === 1 && !selectedExamId) setSelectedExamId(exams[0].id);
  }, [exams]); // eslint-disable-line

  // Auto-open camera for non-admins once API status is known
  useEffect(() => {
    if (isAdmin === false && apiOnline === true) {
      // Check permission state first — avoid auto-prompting when already denied
      navigator.permissions?.query({ name: "camera" as PermissionName })
        .then(perm => {
          if (perm.state !== "denied") openCamera();
          else setCameraError("Camera permission is blocked. Enable it in your browser's site settings, then refresh.");
        })
        .catch(() => openCamera()); // permissions API not supported — try anyway
    }
  }, [isAdmin, apiOnline]); // eslint-disable-line

  // ── Camera ───────────────────────────────────────────────────────────────
  // Module-level constants (defined outside component avoids re-creation on render)
  const DARK_THR   = 70;
  const DARK_RATIO = 0.03;
  const STABLE_MS  = 2000;  // 2s hold — reduces false-positive auto-captures

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
      // Show confirmation overlay — stream stays alive for retake
      setPendingBlob(blob);
      setPendingPreview(URL.createObjectURL(blob));
      setCornersDetected(false);
      setCaptureProgress(0);
    }, "image/jpeg", 0.92);
  }, []);

  // 2) detection loop — depends on triggerCapture (already defined above)
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

      // ── object-contain letterbox: compute visible video rect in display space ──
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
        // Return display-normalised coords so drawing code can use p.x*dw, p.y*dh directly
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

      // ── Guide frame (A4 ratio centred in content area) ────────────────────
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
        [GX,      GY,      1,  1],
        [GX + GW, GY,     -1,  1],
        [GX,      GY + GH, 1, -1],
        [GX + GW, GY + GH,-1, -1],
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
  }, [triggerCapture]); // eslint-disable-line

  // 3) open — depends on startCornerDetection (already defined above)
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

  // 4) close — no deps on other useCallbacks
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

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(f.type === "application/pdf" ? null : URL.createObjectURL(f));
  };

  const clearFile = () => { setFile(null); setPreview(null); };

  // ── Job polling ───────────────────────────────────────────────────────────
  const pollIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  useEffect(() => {
    return () => { pollIntervalsRef.current.forEach(clearInterval); };
  }, []);

  const pollJob = (jobId: string) => {
    let n = 0;
    const MAX_POLLS = 150; // 150 × 2s = 5 min — covers cold-start + slow free-tier CPU
    const id = setInterval(async () => {
      n++;
      try {
        const res  = await fetch(`${OMR_API}/api/scan/${jobId}`);
        const data: ScanJob = await res.json();
        setJobs(prev => new Map(prev).set(jobId, data));
        if (data.status === "done" || data.status === "failed" || n >= MAX_POLLS) {
          clearInterval(id);
          pollIntervalsRef.current.delete(id);
        }
      } catch {
        if (n >= MAX_POLLS) { clearInterval(id); pollIntervalsRef.current.delete(id); }
      }
    }, 2000);
    pollIntervalsRef.current.add(id);
  };

  // ── Submit scan ───────────────────────────────────────────────────────────
  const submitScan = async () => {
    if (!selectedExamId) { setScanMsg({ text: "Select an exam first.", type: "error" }); return; }
    if (!file)           { setScanMsg({ text: "No file selected.",      type: "error" }); return; }
    if (file.size > 10 * 1024 * 1024) { setScanMsg({ text: "File is too large (max 10 MB). Try a lower-resolution photo.", type: "error" }); return; }
    setSubmitting(true);
    setScanMsg({ text: "Uploading…", type: "info" });
    const fd = new FormData();
    fd.append("file", file, file.name || "scan.jpg");
    fd.append("exam_id", selectedExamId);
    try {
      const res = await fetch(`${OMR_API}/api/scan`, { method: "POST", body: fd });
      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try { const e = await res.json(); detail = e.detail ?? detail; } catch { /* non-JSON body */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setJobs(prev => new Map(prev).set(data.job_id, { job_id: data.job_id, status: "pending" }));
      setScanMsg({ text: "Submitted! Processing…", type: "success" });
      clearFile();
      pollJob(data.job_id);
      // Re-open camera for non-admins (only if they didn't intentionally close it)
      if (!isAdmin && !userClosedCameraRef.current) setTimeout(openCamera, 1200);
      userClosedCameraRef.current = false;
    } catch (e: any) {
      setScanMsg({ text: e.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin: create exam ────────────────────────────────────────────────────
  const createExam = async () => {
    if (!examTitle.trim()) { setSetupMsg({ text: "Enter a title.",     type: "error" }); return; }
    if (!examDate)         { setSetupMsg({ text: "Pick an exam date.", type: "error" }); return; }
    setSaving(true); setSetupMsg(null);
    try {
      const res  = await fetch(`${OMR_API}/api/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:           examTitle.trim(),
          total_questions: parseInt(examQuestions) || 20,
          exam_date:       examDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail ?? data));
      setSetupMsg({ text: `Exam "${data.title}" created.`, type: "success" });
      setExamTitle(""); setExamDate(""); setExamQuestions("20");
      const list = await fetch(`${OMR_API}/api/exams`);
      setExams(await list.json());
    } catch (e: any) {
      setSetupMsg({ text: e.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Admin: save answer key ────────────────────────────────────────────────
  const saveAnswerKey = async () => {
    if (!selectedExamId) { setAnswerKeyMsg({ text: "Select an exam.", type: "error" }); return; }
    const items: { question_number: number; correct_answer: string; points: number }[] = [];
    for (const line of answerKeyText.split("\n")) {
      const parts = line.trim().split(/[,\t]/);
      if (parts.length < 2) continue;
      const q   = parseInt(parts[0]);
      const a   = parts[1].trim().toUpperCase();
      const pts = parts[2] ? parseFloat(parts[2]) : 1.0;
      if (!isNaN(q) && /^[A-E]$/.test(a)) items.push({ question_number: q, correct_answer: a, points: pts });
    }
    if (items.length === 0) { setAnswerKeyMsg({ text: "No valid rows. Format: 1,A", type: "error" }); return; }
    setSavingKey(true); setAnswerKeyMsg(null);
    try {
      const res  = await fetch(`${OMR_API}/api/exams/${selectedExamId}/answer-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail ?? data));
      setAnswerKeyMsg({ text: `${data.count} answers saved.`, type: "success" });
      setAnswerKeyText("");
    } catch (e: any) {
      setAnswerKeyMsg({ text: e.message, type: "error" });
    } finally {
      setSavingKey(false);
    }
  };

  // ── Admin: review ─────────────────────────────────────────────────────────
  const loadReview = async () => {
    if (!selectedExamId) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`${OMR_API}/api/exams/${selectedExamId}/results`);
      setReviewRows(await res.json());
    } catch { /* ignore */ }
    setReviewLoading(false);
  };

  const toggleExpand = async (jobId: string) => {
    if (expandedJobId === jobId) { setExpandedJobId(null); setExpandedData(null); return; }
    setExpandedJobId(jobId);
    try {
      const res = await fetch(`${OMR_API}/api/scan/${jobId}`);
      setExpandedData(await res.json());
    } catch { /* ignore */ }
  };

  const overrideAnswer = async (jobId: string, resultId: string, answer: string) => {
    await fetch(`${OMR_API}/api/scan/${jobId}/results/${resultId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override_answer: answer }),
    });
    const res = await fetch(`${OMR_API}/api/scan/${jobId}`);
    setExpandedData(await res.json());
    loadReview();
  };

  const runDebug = async (jobId: string) => {
    if (debugJobId === jobId) { setDebugJobId(null); setDebugData(null); return; }
    setDebugJobId(jobId); setDebugData(null); setDebugLoading(true);
    try {
      const res = await fetch(`${OMR_API}/api/scan/${jobId}/debug`);
      setDebugData(await res.json());
    } catch (e: any) {
      setDebugData({ error: e.message });
    } finally {
      setDebugLoading(false);
    }
  };

  // ── Shared: status badge ──────────────────────────────────────────────────
  const statusBadge = (s: string) => {
    const v: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
      pending: "secondary", processing: "outline", done: "default", failed: "destructive",
    };
    return <Badge variant={v[s] ?? "secondary"}>{s}</Badge>;
  };

  // ── Shared: API offline banner ────────────────────────────────────────────
  const offlineBanner = !apiOnline && (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <span>
          OMR API is not reachable at <code>{OMR_API}</code>.
          {!import.meta.env.VITE_OMR_API && (
            <>
              {" "}Run it locally with:
              <code className="block text-xs mt-1">npm run omr-api</code>
              or deploy it and set <code className="text-xs">VITE_OMR_API</code> in your environment.
            </>
          )}
        </span>
        <button
          onClick={checkApi}
          className="self-start text-xs underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
        >
          Retry connection
        </button>
      </AlertDescription>
    </Alert>
  );

  // ── Shared: scan interface JSX ────────────────────────────────────────────
  const scanInterface = (
    <div className="space-y-4">
      {/* Exam selector */}
      <div className="space-y-1.5">
        <Label>Exam</Label>
        <Select value={selectedExamId} onValueChange={setSelectedExamId}>
          <SelectTrigger>
            <SelectValue placeholder={exams.length ? "Select an exam" : "No exams yet — create one in Setup"} />
          </SelectTrigger>
          <SelectContent>
            {exams.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.title} ({e.exam_date})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Camera / upload buttons */}
      {!cameraOpen && !file && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={openCamera} disabled={!apiOnline}>
              <Camera className="w-4 h-4 mr-2" /> Use Camera
            </Button>
            <label className="flex-1 cursor-pointer">
              <div className="flex items-center justify-center gap-2 border rounded-md px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4" /> Upload File
              </div>
              <input
                type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])}
              />
            </label>
          </div>
          <button
            className="w-full text-xs text-muted-foreground underline underline-offset-2 hover:opacity-80 transition-opacity"
            onClick={() => nativeCameraRef.current?.click()}
          >
            Use phone camera app instead
          </button>
          <input
            ref={nativeCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {cameraError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p>{cameraError}</p>
            <p className="text-xs mt-1 opacity-80">
              To fix: click the camera/lock icon in your browser's address bar → allow camera → refresh.
            </p>
            <Button
              size="sm" variant="outline" className="mt-2 h-7 text-xs"
              onClick={() => { setCameraError(null); openCamera(); }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Full-screen camera */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3
                          bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <span className={`text-sm font-semibold transition-colors ${
              cornersDetected ? "text-green-400" : "text-white/80"
            }`}>
              {cornersDetected ? "✓ Paper detected — hold still" : "Align all 4 corners in frame"}
            </span>
            <Button variant="ghost" size="icon"
              className="text-white hover:bg-white/20 rounded-full pointer-events-auto"
              onClick={() => closeCamera(true)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Video + corner overlay canvas */}
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black" />
            <canvas ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none" />
          </div>

          {/* Confirmation overlay — shown after auto/manual capture */}
          {pendingPreview && (
            <div className="absolute inset-0 z-20 flex flex-col bg-black">
              <img src={pendingPreview} alt="Captured" className="flex-1 w-full object-contain" />
              <div className="flex gap-3 p-4 pb-8 bg-black/80">
                <Button variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/10"
                  onClick={() => {
                    setPendingBlob(null);
                    setPendingPreview(null);
                    startCornerDetection();
                  }}>
                  Retake
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setFile(new File([pendingBlob!], "capture.jpg", { type: "image/jpeg" }));
                    setPreview(pendingPreview!);
                    setPendingBlob(null);
                    setPendingPreview(null);
                    streamRef.current?.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                    setCameraOpen(false);
                  }}>
                  Use this photo
                </Button>
              </div>
            </div>
          )}

          {/* Bottom bar — shutter button with progress ring */}
          {!pendingPreview && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center pb-10 pt-4
                            bg-gradient-to-t from-black/70 to-transparent">
              <button onClick={triggerCapture} aria-label="Capture photo"
                className="relative w-20 h-20 rounded-full bg-white shadow-xl active:scale-95 transition-transform">
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
          <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl border" />
          <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-7 w-7" onClick={clearFile}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
      {file && !preview && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <ScanLine className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearFile}><X className="w-3.5 h-3.5" /></Button>
        </div>
      )}

      {/* Submit */}
      {file && (
        <Button className="w-full bg-gradient-primary shadow-glow" onClick={submitScan} disabled={submitting || !apiOnline}>
          {submitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
            : <><ScanLine className="w-4 h-4 mr-2" /> Submit Scan</>}
        </Button>
      )}

      {scanMsg && (
        <Alert variant={scanMsg.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{scanMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Recent jobs */}
      {jobs.size > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Scans</p>
          {Array.from(jobs.values()).reverse().map(job => (
            <Card key={job.job_id} className={
              job.is_fallback ? "border-red-400/60" :
              job.omr_results?.some(r => r.is_flagged) ? "border-amber-400/40" : ""
            }>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {statusBadge(job.status)}
                  {job.is_fallback && (
                    <Badge variant="destructive" className="text-[10px]">pipeline error</Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">{job.job_id.slice(0, 8)}…</span>
                  {(job.status === "pending" || job.status === "processing") && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
                  )}
                  {job.status === "done" && job.score && (
                    <span className="ml-auto font-bold text-primary text-sm">
                      {job.score.raw_score}/{job.score.max_score} ({job.score.percentage.toFixed(1)}%)
                    </span>
                  )}
                  {job.status === "failed" && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                        onClick={() => { clearFile(); openCamera(); }}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    </div>
                  )}
                  {job.status === "done" && (job.omr_results?.filter(r => r.is_flagged) ?? []).length > 0 && (
                    <span className="text-xs text-amber-600">
                      ⚠️ {job.omr_results!.filter(r => r.is_flagged).length} flagged
                    </span>
                  )}
                  {isAdmin && (job.status === "done" || job.status === "failed") && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2 ml-auto"
                      onClick={() => runDebug(job.job_id)}>
                      <Eye className="w-3 h-3 mr-1" />
                      {debugJobId === job.job_id ? "Hide" : "Debug"}
                    </Button>
                  )}
                </div>

                {/* Error message */}
                {job.error_message && (
                  <p className="text-xs text-destructive font-mono break-all">{job.error_message}</p>
                )}

                {/* Debug panel */}
                {debugJobId === job.job_id && (
                  <div className="mt-2 p-3 bg-muted/60 rounded-lg space-y-2 text-xs font-mono">
                    {debugLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {debugData && (() => {
                      const diag = (debugData.diagnostic ?? {}) as Record<string, unknown>;
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">stage reached</span>
                            <span className={diag.exception ? "text-destructive" : "text-green-600"}>
                              {String(diag.stage ?? "?")}
                            </span>
                            <span className="text-muted-foreground">CropOnMarkers</span>
                            <span className={diag.crop_ok ? "text-green-600" : "text-amber-500"}>
                              {diag.crop_ok ? "✓ success" : diag.crop_fallback ? "✗ failed → contour fallback" : "✗ failed"}
                            </span>
                            <span className="text-muted-foreground">image shape in</span>
                            <span>{JSON.stringify(diag.image_shape ?? null)}</span>
                            <span className="text-muted-foreground">processed shape</span>
                            <span>{JSON.stringify(diag.processed_shape ?? null)}</span>
                          </div>
                          {diag.exception && (
                            <p className="text-destructive break-all">Error: {String(diag.exception)}</p>
                          )}
                          {diag.raw_omr_response && (
                            <details>
                              <summary className="cursor-pointer text-muted-foreground">raw OMR response</summary>
                              <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all">
                                {JSON.stringify(diag.raw_omr_response, null, 2)}
                              </pre>
                            </details>
                          )}
                          {diag.processed_b64 && (
                            <details>
                              <summary className="cursor-pointer text-muted-foreground">processed image (warped 794×1123)</summary>
                              <img
                                src={`data:image/jpeg;base64,${diag.processed_b64}`}
                                alt="Processed OMR image"
                                className="mt-2 w-full rounded border"
                              />
                            </details>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (apiOnline === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Shared header ─────────────────────────────────────────────────────────
  const pageHeader = (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/quiz")}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div className="flex items-center gap-2">
        <ScanLine className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">OMR Scanner</h1>
      </div>
      {isAdmin && <Badge variant="secondary" className="ml-auto">Admin</Badge>}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // NON-ADMIN VIEW — scan only, camera auto-opens
  // ════════════════════════════════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-24 bg-transparent">
        <div className="container mx-auto px-4 max-w-lg pt-8">
          {pageHeader}
          {offlineBanner}
          <Card>
            <CardHeader><CardTitle>Scan Answer Sheet</CardTitle></CardHeader>
            <CardContent>{scanInterface}</CardContent>
          </Card>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ADMIN VIEW — setup / scan / review tabs
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-24 bg-transparent">
      <div className="container mx-auto px-4 max-w-3xl pt-8">
        {pageHeader}
        {offlineBanner}

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {(["setup", "scan", "review"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setAdminTab(t); if (t === "review") loadReview(); }}
              className={`px-5 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
                ${adminTab === t
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Setup tab ── */}
        {adminTab === "setup" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create exam */}
            <Card>
              <CardHeader><CardTitle className="text-base">Create Exam</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    placeholder="e.g. Biology Midterm"
                    onKeyDown={e => e.key === "Enter" && createExam()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Questions</Label>
                  <Input
                    type="number" value={examQuestions} min={1} max={200}
                    onChange={e => setExamQuestions(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Exam Date</Label>
                  <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
                </div>
                <Button
                  className="w-full bg-gradient-primary"
                  onClick={createExam}
                  disabled={saving || !apiOnline}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                    : "Create Exam"}
                </Button>
                {setupMsg && (
                  <Alert variant={setupMsg.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{setupMsg.text}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Answer key */}
            <Card>
              <CardHeader><CardTitle className="text-base">Answer Key</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Exam</Label>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger>
                      <SelectValue placeholder={exams.length ? "Select exam" : "Create an exam first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Answers — one per line: <code className="text-xs">1,A</code> or <code className="text-xs">1,A,2.0</code>
                  </Label>
                  <Textarea
                    value={answerKeyText}
                    onChange={e => setAnswerKeyText(e.target.value)}
                    placeholder={"1,A\n2,C\n3,B\n4,D\n5,E"}
                    className="font-mono text-sm min-h-[150px]"
                  />
                </div>
                <Button
                  className="w-full" variant="outline"
                  onClick={saveAnswerKey}
                  disabled={savingKey || !apiOnline}
                >
                  {savingKey
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                    : "Save Answer Key"}
                </Button>
                {answerKeyMsg && (
                  <Alert variant={answerKeyMsg.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{answerKeyMsg.text}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Scan tab ── */}
        {adminTab === "scan" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Scan Answer Sheet</CardTitle></CardHeader>
            <CardContent>{scanInterface}</CardContent>
          </Card>
        )}

        {/* ── Review tab ── */}
        {adminTab === "review" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-base">Results</CardTitle>
                <div className="flex items-center gap-2 ml-auto">
                  <Select value={selectedExamId} onValueChange={v => { setSelectedExamId(v); }}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={loadReview} disabled={!selectedExamId}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reviewLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : reviewRows.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  {selectedExamId ? "No scans yet for this exam." : "Select an exam above."}
                </p>
              ) : (
                <div className="space-y-2">
                  {reviewRows.map(row => (
                    <div key={row.job_id}>
                      {/* Summary row */}
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                          hover:bg-muted/50 transition-colors select-none
                          ${row.flagged_count > 0
                            ? "border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10"
                            : ""}`}
                        onClick={() => toggleExpand(row.job_id)}
                      >
                        <span className="text-sm font-semibold w-24 truncate font-mono">
                          {row.student_code || "—"}
                        </span>
                        {statusBadge(row.status)}
                        {row.raw_score != null && (
                          <span className="text-sm font-bold text-primary ml-auto">
                            {row.raw_score}/{row.max_score}
                          </span>
                        )}
                        {row.percentage != null && (
                          <span className="text-sm">{row.percentage.toFixed(1)}%</span>
                        )}
                        {row.flagged_count > 0 && (
                          <span className="text-xs text-amber-600">⚠️ {row.flagged_count}</span>
                        )}
                        <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>

                      {/* Expanded per-question view */}
                      {expandedJobId === row.job_id && expandedData && (
                        <div className="mx-3 mb-2 p-3 border border-t-0 rounded-b-lg border-border/60 bg-muted/20">
                          <p className="text-xs text-muted-foreground mb-3">
                            Overall confidence:{" "}
                            {expandedData.overall_confidence != null
                              ? `${Math.round(expandedData.overall_confidence * 100)}%`
                              : "—"}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                            {(expandedData.omr_results ?? []).map(r => {
                              const shown = r.is_overridden ? r.override_answer : r.detected_answer;
                              return (
                                <div
                                  key={r.id}
                                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs
                                    ${r.is_flagged
                                      ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20"
                                      : "border-border"}`}
                                >
                                  <span className="font-bold w-7 shrink-0 text-muted-foreground">
                                    Q{r.question_number}
                                  </span>
                                  <span className="font-mono font-semibold">{shown ?? "?"}</span>
                                  {r.is_correct
                                    ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                    : <X className="w-3 h-3 text-red-500 shrink-0" />}
                                  {(!r.is_correct || r.is_flagged) && (
                                    <select
                                      className="ml-auto text-[10px] border rounded px-0.5 bg-background cursor-pointer"
                                      defaultValue=""
                                      onChange={e => e.target.value && overrideAnswer(row.job_id, r.id, e.target.value)}
                                    >
                                      <option value="" disabled>fix</option>
                                      {["A","B","C","D","E"].map(a => (
                                        <option key={a} value={a}>{a}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
