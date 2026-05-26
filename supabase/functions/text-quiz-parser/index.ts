// Supabase Edge Function: OCR text / raw text → Quiz parser via Gemini API
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

interface GeneratedAnswer {
  text: string;
  is_correct: boolean;
}

interface GeneratedQuestion {
  text: string;
  answers: GeneratedAnswer[];
  explanation?: string;
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== "string" || !body.text.trim()) {
      return jsonError(400, "Request body must contain a non-empty 'text' field");
    }

    // Strip control characters that can break JSON serialization of OCR output
    const rawText: string = body.text
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .trim();

    if (rawText.length > 200_000) {
      return jsonError(400, "Text is too long (max 200,000 characters)");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(rawText) }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorBody);
      return jsonError(502, `Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!responseText) return jsonError(422, "Gemini returned an empty response.");

    const questions = parseQuestionsFromResponse(responseText);

    if (!questions || questions.length === 0) {
      return jsonError(422, "No questions could be extracted. Make sure the PDF contains numbered MCQ questions.");
    }

    return jsonOk({ questions });

  } catch (err) {
    console.error("text-quiz-parser error:", err);
    return jsonError(500, err instanceof Error ? err.message : "Unexpected error");
  }
});

function buildPrompt(rawText: string): string {
  return `You are an expert exam question extractor for Malaysian education materials (SPM, STPM, university level).

The text below was extracted via OCR (Optical Character Recognition) from a scanned exam paper. It may contain:
- OCR artifacts: misread characters (0 vs O, 1 vs I, rn vs m, etc.)
- Broken or merged words due to scanning quality
- Inconsistent spacing and line breaks
- Page markers like [Page 1], [Page 2] etc.

YOUR TASK:
Extract EVERY multiple-choice question from the text. Do NOT limit the count — if there are 40 questions, return all 40.

HOW TO IDENTIFY QUESTIONS:
- Questions are numbered: 1, 2, 3 ... or 1. 2. 3. or Q1, Q2, Soalan 1, etc.
- Answer options are labeled: A B C D, a b c d, (A)(B)(C)(D), A. B. C. D.
- Questions may be in Malay (Bahasa Melayu) or English — preserve original language exactly

CORRECT ANSWERS:
- If the source marks a correct answer (asterisk *, bold, underline, "Answer: B", "Jawapan: C") → set is_correct: true for that option
- If NO correct answer is marked in the source → set is_correct: false for ALL options (admin will mark them manually)
- NEVER guess or invent which answer is correct

OCR CLEANUP RULES:
- Fix obvious OCR errors in question and answer text (e.g. "Apakah" not "Apakah" with garbled chars)
- Reconstruct merged words where obvious
- Do NOT change subject matter, numbers, names, or technical terms

Return ONLY a valid JSON array — no markdown fences, no explanation, no extra text.

Each item must follow this exact shape:
[
  {
    "text": "Full question text here?",
    "answers": [
      {"text": "Option A text", "is_correct": false},
      {"text": "Option B text", "is_correct": false},
      {"text": "Option C text", "is_correct": false},
      {"text": "Option D text", "is_correct": false}
    ],
    "explanation": "Brief explanation if the source provides one, otherwise omit this field"
  }
]

Rules:
- Each question must have 2 to 4 answer choices
- Exactly one is_correct: true per question IF the source marks a correct answer
- Return ALL questions found — do not skip, summarise, or limit
- Return ONLY the JSON array, nothing else

Here is the OCR text to process:

---
${rawText}
---`;
}

function parseQuestionsFromResponse(raw: string): GeneratedQuestion[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON array found in Gemini response");
  }

  const jsonStr = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) throw new Error("Response is not a JSON array");

  interface RawAnswer { text?: unknown; is_correct?: unknown; }
  interface RawQuestion { text?: unknown; answers?: RawAnswer[]; explanation?: unknown; }

  return (parsed as RawQuestion[])
    .filter((q) => q.text && Array.isArray(q.answers) && (q.answers as RawAnswer[]).length >= 2)
    .map((q): GeneratedQuestion => ({
      text: String(q.text).trim(),
      answers: (q.answers as RawAnswer[]).slice(0, 4).map((a) => ({
        text: String(a.text ?? "").trim(),
        is_correct: Boolean(a.is_correct),
      })),
      explanation: q.explanation ? String(q.explanation).trim() : undefined,
    }));
}

function jsonOk<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
