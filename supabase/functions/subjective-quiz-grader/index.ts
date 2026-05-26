// Supabase Edge Function: Grade subjective quiz answers using Gemini API
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const body = await req.json();
    const items: { question: string; userAnswer: string; modelAnswers: string[]; maxMarks: number }[] =
      Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) return jsonError(400, "No items to grade");

    // Build a single batch prompt so we make one Gemini call
    const itemsText = items.map((item, i) => `
--- Question ${i + 1} ---
Question: ${item.question}
Model Answer(s): ${item.modelAnswers.join(" / ")}
Student's Answer: ${item.userAnswer || "(no answer)"}
Maximum Marks: ${item.maxMarks}
`).join("\n");

    const prompt = `You are an examiner grading student answers for an SPM-style exam.

For each question below, compare the student's answer against the model answer(s) and award marks.
Be fair: award full marks if the key points are covered (even if worded differently), partial marks if some points are covered, and 0 if the answer is irrelevant or blank.

${itemsText}

Respond ONLY with a valid JSON array (no markdown, no extra text) with one object per question in the same order:
[
  {
    "marksEarned": <number, 0 to maxMarks>,
    "isCorrect": <true if marksEarned >= maxMarks * 0.7>,
    "feedback": "<1-2 sentences of specific feedback>"
  },
  ...
]`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return jsonError(502, `Gemini API error: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let results: { marksEarned: number; isCorrect: boolean; feedback: string }[];
    try {
      results = JSON.parse(cleaned);
    } catch {
      // Fallback: mark all as 0 with a note
      results = items.map(() => ({
        marksEarned: 0,
        isCorrect: false,
        feedback: "Could not parse AI grading response.",
      }));
    }

    // Clamp marks to valid range
    results = results.map((r, i) => ({
      marksEarned: Math.min(Math.max(Math.round(r.marksEarned ?? 0), 0), items[i]?.maxMarks ?? 1),
      isCorrect: r.isCorrect ?? false,
      feedback: r.feedback ?? "",
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return jsonError(500, err instanceof Error ? err.message : "Internal server error");
  }
});
