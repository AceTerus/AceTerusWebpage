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
  error_message?: string;
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
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // ── Scan / jobs ──────────────────────────────────────────────────────────
  const [jobs,       setJobs]       = useState<Map<string, ScanJob>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [scanMsg,    setScanMsg]    = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  // ── Admin: tab & setup ───────────────────────────────────────────────────
  const [adminTab,      setAdminTab]      = useState<"setup" | "scan" | "review">("setup");
  const [examTitle,     setExamTitle]     = useState("");
  const [examQuestions, setExamQuestions] = useState("40");
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
  const openCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (e: any) {
      const msg = e.name === "NotAllowedError"
        ? "Camera permission denied by browser."
        : e.name === "NotFoundError"
        ? "No camera found on this device."
        : `Camera error: ${e.message}`;
      setCameraError(msg);
    }
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const f = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setFile(f);
      setPreview(URL.createObjectURL(blob));
      closeCamera();
    }, "image/jpeg", 0.95);
  }, [closeCamera]);

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(f.type === "application/pdf" ? null : URL.createObjectURL(f));
  };

  const clearFile = () => { setFile(null); setPreview(null); };

  // ── Job polling ───────────────────────────────────────────────────────────
  const pollJob = (jobId: string) => {
    let n = 0;
    const id = setInterval(async () => {
      n++;
      try {
        const res  = await fetch(`${OMR_API}/api/scan/${jobId}`);
        const data: ScanJob = await res.json();
        setJobs(prev => new Map(prev).set(jobId, data));
        if (data.status === "done" || data.status === "failed" || n >= 60)
          clearInterval(id);
      } catch {
        if (n >= 60) clearInterval(id);
      }
    }, 2000);
  };

  // ── Submit scan ───────────────────────────────────────────────────────────
  const submitScan = async () => {
    if (!selectedExamId) { setScanMsg({ text: "Select an exam first.", type: "error" }); return; }
    if (!file)           { setScanMsg({ text: "No file selected.",      type: "error" }); return; }
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
      // Re-open camera for non-admins so they can scan the next sheet
      if (!isAdmin) setTimeout(openCamera, 1200);
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
          total_questions: parseInt(examQuestions) || 40,
          exam_date:       examDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail ?? data));
      setSetupMsg({ text: `Exam "${data.title}" created.`, type: "success" });
      setExamTitle(""); setExamDate(""); setExamQuestions("40");
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

      {/* Camera view */}
      {cameraOpen && (
        <div className="rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-72 object-cover block" />
          <div className="flex gap-2 p-3 bg-black/60 justify-center">
            <Button onClick={capturePhoto}><Camera className="w-4 h-4 mr-1" /> Capture</Button>
            <Button variant="outline" onClick={closeCamera}><X className="w-4 h-4" /></Button>
          </div>
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
            <Card key={job.job_id} className={job.omr_results?.some(r => r.is_flagged) ? "border-amber-400/40" : ""}>
              <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                {statusBadge(job.status)}
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
                  <span className="ml-auto text-xs text-destructive truncate max-w-[160px]">
                    {job.error_message}
                  </span>
                )}
                {job.status === "done" && (job.omr_results?.filter(r => r.is_flagged) ?? []).length > 0 && (
                  <span className="text-xs text-amber-600">
                    ⚠️ {job.omr_results!.filter(r => r.is_flagged).length} flagged
                  </span>
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
