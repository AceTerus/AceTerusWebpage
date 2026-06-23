// Supabase Edge Function: PDF → Quiz generator via Gemini API
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";


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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing Authorization header", corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "Unauthorized", corsHeaders);
    }

    if (!GEMINI_API_KEY) {
      return jsonError(500, "GEMINI_API_KEY is not configured", corsHeaders);
    }

    // Parse multipart form data
    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const numQuestionsRaw = formData.get("numQuestions");
    const numQuestions = numQuestionsRaw ? Math.min(Number(numQuestionsRaw) || 10, 40) : 10;

    if (!pdfFile) {
      return jsonError(400, "No PDF file provided (field name: 'pdf')", corsHeaders);
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.endsWith(".pdf")) {
      return jsonError(400, "Uploaded file must be a PDF", corsHeaders);
    }

    // Convert PDF to base64 (chunked to avoid call stack overflow on large files)
    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Pdf = uint8ArrayToBase64(uint8Array);

    // Call Gemini API with the PDF
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64Pdf,
                  },
                },
                {
                  text: buildPrompt(numQuestions),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorBody);
      return jsonError(502, "AI quiz generation temporarily unavailable. Please try again.", corsHeaders);
    }

    const geminiData = await geminiResponse.json();
    const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      return jsonError(422, "Gemini returned an empty response.", corsHeaders);
    }

    // Extract JSON array from Gemini's response
    const questions = parseQuestionsFromResponse(rawText);

    if (!questions || questions.length === 0) {
      return jsonError(422, "Could not extract questions from this PDF. Try a different file.", corsHeaders);
    }

    return jsonOk({ questions }, corsHeaders);

  } catch (err) {
    console.error("pdf-quiz-generator error:", err);
    return jsonError(500, err instanceof Error ? err.message : "Unexpected error", corsHeaders);
  }
});

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function buildPrompt(numQuestions: number): string {
  return `You are an expert exam question analyzer. Carefully read this exam paper PDF (which may be in Malay or English) and generate exactly ${numQuestions} multiple-choice questions based on its content.

If the PDF already contains multiple-choice questions, extract them directly (preserving the original text and options as closely as possible, in the same language).

If the PDF contains essay-style or short-answer content, create well-formed multiple-choice questions that test the key concepts. Keep questions in the same language as the PDF.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences, just the raw JSON array.

Each question must follow this exact structure:
[
  {
    "text": "The question text here?",
    "answers": [
      {"text": "Option A text", "is_correct": false},
      {"text": "Option B text", "is_correct": true},
      {"text": "Option C text", "is_correct": false},
      {"text": "Option D text", "is_correct": false}
    ],
    "explanation": "Brief explanation of why the correct answer is right"
  }
]

Rules:
- Each question must have exactly 4 answer choices
- Exactly one answer per question must have "is_correct": true
- Questions must be directly based on the PDF content
- Explanations should be concise (1-2 sentences)
- Return ONLY the JSON array, nothing else`;
}

function parseQuestionsFromResponse(raw: string): GeneratedQuestion[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON array found in response");
  }

  const jsonStr = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not a JSON array");
  }

  return parsed
    .filter((q: Record<string, unknown>) => q && typeof q === 'object' && q.text && Array.isArray(q.answers) && q.answers.length >= 2)
    .map((q: Record<string, unknown>): GeneratedQuestion => ({
      text: String(q.text),
      answers: (q.answers as Record<string, unknown>[]).slice(0, 4).map((a: Record<string, unknown>) => ({
        text: String(a.text ?? ""),
        is_correct: Boolean(a.is_correct),
      })),
      explanation: q.explanation ? String(q.explanation) : undefined,
    }));
}

function jsonOk<T>(data: T, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
