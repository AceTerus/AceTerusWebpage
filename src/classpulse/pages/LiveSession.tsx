import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, MicOff, Square, Clock, Users, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const C = { blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A", green: "#22C55E" };
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";

interface Session {
  id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  status: "pending" | "active" | "completed";
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function generateReport(
  session: Session,
  transcript: string,
  sessionSeconds: number,
  teacherActiveSeconds: number,
): { coverage_score: number; teacher_talk_ratio: number; student_participation_count: number; concepts_covered: string[]; concepts_missed: string[]; ai_coaching_note: string } {
  const lowerTranscript = transcript.toLowerCase();
  const covered = session.key_concepts.filter((c) =>
    lowerTranscript.includes(c.toLowerCase())
  );
  const missed = session.key_concepts.filter(
    (c) => !lowerTranscript.includes(c.toLowerCase())
  );

  const coverage_score = session.key_concepts.length > 0
    ? Math.round((covered.length / session.key_concepts.length) * 100)
    : 50;

  const teacher_talk_ratio = sessionSeconds > 0
    ? Math.min(Math.round((teacherActiveSeconds / sessionSeconds) * 100), 95)
    : 70;

  const student_participation_count = Math.max(
    1,
    Math.floor((sessionSeconds - teacherActiveSeconds) / 15)
  );

  let ai_coaching_note = "";
  if (coverage_score >= 80) {
    ai_coaching_note = `Excellent session! You covered ${covered.length} out of ${session.key_concepts.length} key concepts. Students had good exposure to the lesson objective. Consider encouraging more student discussion to lower your talk ratio.`;
  } else if (coverage_score >= 50) {
    ai_coaching_note = `Good effort — you covered the majority of the lesson objective. The concepts ${missed.slice(0, 2).join(", ")} were not detected in today's transcript. Consider revisiting these next class.`;
  } else {
    ai_coaching_note = `Several key concepts from your lesson objective were not covered today. Focus on ${missed.slice(0, 3).join(", ")} in your next session. Breaking the objective into smaller segments may help ensure full coverage.`;
  }

  return { coverage_score, teacher_talk_ratio, student_participation_count, concepts_covered: covered, concepts_missed: missed, ai_coaching_note };
}

function generateStudentSummary(
  session: Session,
  covered: string[],
  missed: string[],
  transcript: string,
) {
  const coveredNotes = covered.length > 0
    ? covered.map((c) => `Your teacher explained ${c} during today's class.`).concat(
        [`The main lesson was about: ${session.objective_text}`]
      ).slice(0, 5)
    : [`Today's class covered: ${session.objective_text}`];

  const key_terms = covered.map((c) => ({
    term: c,
    definition: `${c} is one of the key concepts from today's lesson on ${session.subject}.`,
  }));

  const gap_notes = missed.map((concept) => ({
    concept,
    explanation: `${concept} is an important concept related to ${session.objective_text}. This topic may not have been fully covered in today's class, so it's worth reviewing on your own.`,
    example: `Look up ${concept} in your ${session.subject} textbook for examples and practice questions.`,
  }));

  return { covered_notes: coveredNotes.join("\n"), key_terms, gap_notes };
}

export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [teacherActiveSeconds, setTeacherActiveSeconds] = useState(0);
  const [endingSession, setEndingSession] = useState(false);
  const [endingMessage, setEndingMessage] = useState("Generating Report…");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("class_sessions")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setSession(data as Session);
        setLoading(false);
      });
  }, [id]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-MY";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) setTranscript((prev) => prev + final);
      setInterimText(interim);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (isListening) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  };

  const startSession = async () => {
    if (!session || !user) return;
    await supabase
      .from("class_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", session.id);

    setSessionStarted(true);
    setSession((s) => s ? { ...s, status: "active" } : s);

    timerRef.current = setInterval(() => setSessionSeconds((n) => n + 1), 1000);
    startListening();
  };

  useEffect(() => {
    if (isListening) {
      activeTimerRef.current = setInterval(() => setTeacherActiveSeconds((n) => n + 1), 1000);
    } else {
      if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    }
    return () => { if (activeTimerRef.current) clearInterval(activeTimerRef.current); };
  }, [isListening]);

  const endSession = async () => {
    if (!session || !user) return;
    setEndingSession(true);
    stopListening();
    if (timerRef.current) clearInterval(timerRef.current);

    const finalTranscript = transcriptRef.current;

    // Mark session completed and save transcript
    await supabase
      .from("class_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString(), transcript_text: finalTranscript })
      .eq("id", session.id);

    // Try Gemini AI via Edge Function, fall back to local heuristic
    let report: ReturnType<typeof generateReport>;
    let summaryData: { covered_notes: string; key_terms: unknown[]; gap_notes: unknown[] };

    try {
      setEndingMessage("AI is analysing your session…");
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("classpulse-report", {
        body: {
          subject: session.subject,
          class_name: session.class_name,
          objective_text: session.objective_text,
          key_concepts: session.key_concepts,
          transcript_text: finalTranscript,
          session_seconds: sessionSeconds,
          teacher_active_seconds: teacherActiveSeconds,
        },
      });

      if (res.error) throw res.error;

      const { teacher_report, student_summary } = res.data as {
        teacher_report: {
          coverage_score: number;
          teacher_talk_ratio: number;
          student_participation_count: number;
          concepts_covered: string[];
          concepts_missed: string[];
          ai_coaching_note: string;
        };
        student_summary: {
          covered_notes: string[];
          key_terms: { term: string; definition: string }[];
          gap_notes: { concept: string; explanation: string; example: string }[];
        };
      };

      report = teacher_report;
      summaryData = {
        covered_notes: Array.isArray(student_summary.covered_notes)
          ? student_summary.covered_notes.join("\n")
          : student_summary.covered_notes,
        key_terms: student_summary.key_terms,
        gap_notes: student_summary.gap_notes,
      };
      toast.success("AI report generated!");
    } catch (aiErr) {
      console.warn("AI report failed, using local analysis:", aiErr);
      setEndingMessage("Generating Report…");
      report = generateReport(session, finalTranscript, sessionSeconds, teacherActiveSeconds);
      const localSummary = generateStudentSummary(session, report.concepts_covered, report.concepts_missed, finalTranscript);
      summaryData = localSummary;
      toast.info("Session saved. AI analysis unavailable — used local summary.");
    }

    // Save teacher report
    setEndingMessage("Saving report…");
    const { error: reportError } = await supabase
      .from("conclusion_reports")
      .insert({ session_id: session.id, ...report });

    if (reportError) {
      toast.error("Failed to save report. Please try again.");
      setEndingSession(false);
      return;
    }

    // Save student summary
    await supabase.from("student_session_summaries").insert({
      session_id: session.id,
      class_name: session.class_name,
      subject: session.subject,
      date: new Date().toISOString().split("T")[0],
      covered_notes: summaryData.covered_notes,
      key_terms: summaryData.key_terms,
      gap_notes: summaryData.gap_notes,
    });

    // Push flagged concepts for missed topics
    if (report.concepts_missed.length > 0) {
      await supabase.from("flagged_concepts").insert(
        report.concepts_missed.map((concept) => ({
          session_id: session.id,
          class_name: session.class_name,
          concept_name: concept,
          pushed_to_students_at: new Date().toISOString(),
          resolved: false,
        }))
      );
    }

    navigate(`/report/${session.id}`);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const teacherRatio = sessionSeconds > 0
    ? Math.min(Math.round((teacherActiveSeconds / sessionSeconds) * 100), 95)
    : 0;
  const studentRatio = 100 - teacherRatio;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="font-['Nunito'] text-[#0F172A]/60">Session not found.</p>
      </div>
    );
  }

  const detectedConcepts = new Set(
    session.key_concepts.filter((c) =>
      (transcript + " " + interimText).toLowerCase().includes(c.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-16 space-y-6">

        {/* Session header */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold font-['Nunito'] text-[#2F7CFF] bg-[#DDF3FF] border border-[#2F7CFF]/20 rounded-full px-2.5 py-0.5">
                  {session.subject}
                </span>
                <span className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/50 border border-[#0F172A]/15 rounded-full px-2.5 py-0.5">
                  {session.class_name}
                </span>
                {session.status === "active" && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-['Nunito'] text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg text-[#0F172A]`}>{session.objective_text}</p>
            </div>
            <div className="text-right">
              <p className={`${DISPLAY} font-extrabold text-4xl text-[#0F172A] tabular-nums`}>
                {formatTime(sessionSeconds)}
              </p>
              <p className="font-['Nunito'] text-[11px] font-semibold text-[#0F172A]/40">Session time</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Talk ratio */}
            <div className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A]`}>Talk Ratio</p>
                <Users className="w-4 h-4 text-[#0F172A]/40" />
              </div>
              <div className="flex rounded-full overflow-hidden h-5 border-[2px] border-[#0F172A] mb-2">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${teacherRatio}%`, background: C.blue }}
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${studentRatio}%`, background: "#22C55E" }}
                />
              </div>
              <div className="flex justify-between text-[12px] font-bold font-['Nunito']">
                <span style={{ color: C.blue }}>Teacher {teacherRatio}%</span>
                <span style={{ color: "#22C55E" }}>Student ~{studentRatio}%</span>
              </div>
            </div>

            {/* Mic control */}
            <div className={`${CARD} p-5 flex flex-col items-center gap-4`}>
              {!speechSupported && (
                <div className="flex items-center gap-2 text-[13px] font-semibold font-['Nunito'] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 w-full">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Speech recognition requires Chrome. Transcription unavailable.
                </div>
              )}

              {!sessionStarted ? (
                <button
                  onClick={startSession}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl border-[2.5px] border-[#0F172A] bg-[#22C55E] text-white font-bold font-['Nunito'] text-[16px] shadow-[4px_4px_0_0_#0F172A] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#0F172A] transition-all"
                >
                  <Mic className="w-5 h-5" /> Start Class
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border-[2.5px] border-[#0F172A] font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all text-white ${
                      isListening ? "bg-amber-500 hover:shadow-[4px_4px_0_0_#0F172A]" : "bg-[#2F7CFF]"
                    }`}
                  >
                    {isListening ? <><MicOff className="w-4 h-4" /> Pause Mic</> : <><Mic className="w-4 h-4" /> Resume Mic</>}
                  </button>
                  {isListening && (
                    <div className="flex items-center gap-2 text-[12px] font-semibold font-['Nunito'] text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Listening…
                    </div>
                  )}
                  <button
                    onClick={endSession}
                    disabled={endingSession}
                    className="flex items-center gap-2 w-full justify-center px-5 py-3 rounded-xl border-[2.5px] border-red-400 bg-red-500 text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#7f1d1d] hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  >
                    {endingSession
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {endingMessage}</>
                      : <><Square className="w-4 h-4" /> End Class</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right column — concept chips */}
          <div className={`${CARD} p-5`}>
            <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A] mb-3`}>
              Concept Tracker
            </p>
            {session.key_concepts.length === 0 ? (
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40">No concepts set for this session.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {session.key_concepts.map((c) => {
                  const detected = detectedConcepts.has(c);
                  return (
                    <div
                      key={c}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] text-[12px] font-bold font-['Nunito'] transition-all ${
                        detected
                          ? "border-green-400 bg-green-50 text-green-700 shadow-[2px_2px_0_0_#16a34a30]"
                          : "border-[#0F172A]/20 bg-[#0F172A]/5 text-[#0F172A]/40"
                      }`}
                    >
                      {detected && <CheckCircle2 className="w-3 h-3" />}
                      {c}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="font-['Nunito'] text-[11px] font-semibold text-[#0F172A]/40 mt-3">
              {detectedConcepts.size} / {session.key_concepts.length} detected
            </p>
          </div>
        </div>

        {/* Transcript */}
        <div className={`${CARD} p-5`}>
          <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A] mb-3`}>Live Transcript</p>
          <div className="min-h-[140px] max-h-64 overflow-y-auto font-['Nunito'] text-[13px] text-[#0F172A]/80 leading-relaxed">
            {transcript || interimText ? (
              <>
                <span>{transcript}</span>
                {interimText && <span className="text-[#0F172A]/30 italic">{interimText}</span>}
              </>
            ) : (
              <span className="text-[#0F172A]/30 italic">
                {sessionStarted ? "Start speaking — transcript will appear here…" : "Start the class to begin transcription."}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
