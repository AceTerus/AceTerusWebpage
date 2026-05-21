// Supabase Edge Function: ClassPulse AI report generation via Gemini
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface RequestBody {
  subject: string;
  class_name: string;
  objective_text: string;
  key_concepts: string[];
  transcript_text: string;
  session_seconds: number;
  teacher_active_seconds: number;
}

interface TeacherReport {
  coverage_score: number;
  teacher_talk_ratio: number;
  student_participation_count: number;
  concepts_covered: string[];
  concepts_missed: string[];
  ai_coaching_note: string;
}

interface StudentSummary {
  covered_notes: string[];
  key_terms: { term: string; definition: string }[];
  gap_notes: { concept: string; explanation: string; example: string }[];
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

function buildTeacherPrompt(body: RequestBody): string {
  const transcript = body.transcript_text.slice(0, 8000);
  const durationMin = Math.round(body.session_seconds / 60);
  return `You are ClassPulse, an AI classroom analytics engine for Malaysian secondary school teachers.

Subject: ${body.subject}
Class: ${body.class_name}
Lesson Objective: ${body.objective_text}
Key Concepts to Track: ${body.key_concepts.join(", ")}
Total Session Duration: ${durationMin} minutes
Teacher Active Speaking: ${Math.round(body.teacher_active_seconds / 60)} minutes
Session Transcript:
"""
${transcript || "(No transcript recorded)"}
"""

Analyze the transcript against the lesson objective and return a JSON object with exactly these fields:
{
  "coverage_score": <integer 0-100, percentage of lesson objective addressed>,
  "teacher_talk_ratio": <integer 0-100, estimated % of session time teacher was speaking>,
  "student_participation_count": <integer, estimated distinct student contribution turns>,
  "concepts_covered": <array of strings from the key concepts list that were clearly addressed>,
  "concepts_missed": <array of strings from the key concepts list that were NOT addressed>,
  "ai_coaching_note": <string, 2-3 sentences of specific actionable coaching feedback>
}

Rules:
- concepts_covered + concepts_missed must together equal the full key_concepts list
- If transcript is empty, coverage_score should be 0 and all concepts are missed
- ai_coaching_note should be encouraging and specific to what happened in this session
- Return only valid JSON, no markdown, no explanation`;
}

function buildStudentPrompt(body: RequestBody, report: TeacherReport): string {
  const transcript = body.transcript_text.slice(0, 6000);
  return `You are a study notes generator for Malaysian secondary school students.

Subject: ${body.subject}
Lesson Objective: ${body.objective_text}
Concepts covered in class: ${report.concepts_covered.join(", ") || "none"}
Concepts NOT covered in class: ${report.concepts_missed.join(", ") || "none"}
Session Transcript:
"""
${transcript || "(No transcript recorded)"}
"""

Return a JSON object with exactly these fields:
{
  "covered_notes": <array of 3-5 bullet strings summarising what was taught, in simple language a Form 3 student can understand>,
  "key_terms": <array of {"term": string, "definition": string} for important vocabulary mentioned in class>,
  "gap_notes": <array of {"concept": string, "explanation": string, "example": string} for each missed concept>
}

Rules:
- covered_notes: plain language, no jargon, friendly and encouraging tone
- key_terms: only include terms actually mentioned in the transcript (empty array if none)
- gap_notes: one entry per missed concept; explanation is 2-3 sentences for a Malaysian secondary student; example is one concrete relatable real-life example
- If no concepts were covered, covered_notes should explain the lesson objective briefly
- Write in simple encouraging English
- Return only valid JSON, no markdown, no explanation`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing Authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonError(401, "Unauthorized");

    if (!GEMINI_API_KEY) return jsonError(500, "GEMINI_API_KEY is not configured");

    const body: RequestBody = await req.json();

    if (!body.objective_text || !body.subject) {
      return jsonError(400, "Missing required fields: subject, objective_text");
    }

    // Step 1: Generate teacher report
    const teacherJson = await callGemini(buildTeacherPrompt(body));
    const teacherReport: TeacherReport = JSON.parse(teacherJson);

    // Clamp and validate
    teacherReport.coverage_score = Math.max(0, Math.min(100, Math.round(teacherReport.coverage_score ?? 0)));
    teacherReport.teacher_talk_ratio = Math.max(0, Math.min(100, Math.round(teacherReport.teacher_talk_ratio ?? 70)));
    teacherReport.student_participation_count = Math.max(0, Math.round(teacherReport.student_participation_count ?? 0));
    teacherReport.concepts_covered = Array.isArray(teacherReport.concepts_covered) ? teacherReport.concepts_covered : [];
    teacherReport.concepts_missed = Array.isArray(teacherReport.concepts_missed) ? teacherReport.concepts_missed : [];
    teacherReport.ai_coaching_note = teacherReport.ai_coaching_note ?? "";

    // Step 2: Generate student summary
    const studentJson = await callGemini(buildStudentPrompt(body, teacherReport));
    const studentSummary: StudentSummary = JSON.parse(studentJson);

    studentSummary.covered_notes = Array.isArray(studentSummary.covered_notes) ? studentSummary.covered_notes : [];
    studentSummary.key_terms = Array.isArray(studentSummary.key_terms) ? studentSummary.key_terms : [];
    studentSummary.gap_notes = Array.isArray(studentSummary.gap_notes) ? studentSummary.gap_notes : [];

    return new Response(
      JSON.stringify({ teacher_report: teacherReport, student_summary: studentSummary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("classpulse-report error:", err);
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
