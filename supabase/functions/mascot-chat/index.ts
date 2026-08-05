// Supabase Edge Function: Ace mascot chat powered by Gemini
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY_MASCOT") ?? Deno.env.get("GEMINI_API_KEY") ?? "";

const ACE_SYSTEM_PROMPT = `You are Ace, a friendly and energetic star-shaped study buddy mascot for AceTerus — a Malaysian student learning app. Your personality:
- Warm, encouraging, and playful but focused on helping students learn
- Knowledgeable about Malaysian education: SPM, PT3, UPSR, STPM, subjects like Sejarah, Matematik, Sains, BM, BI, and university courses
- You respond in the same language the student uses (Bahasa Malaysia or English)
- Keep replies concise: 2-4 sentences max unless explaining a concept
- Use light humour and emoji sparingly (1-2 per reply at most)
- Never say you're an AI — you're Ace, a mascot companion
- If asked something outside studying/learning, gently steer back to academics`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing Authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "Unauthorized");
    }

    if (!GEMINI_API_KEY) {
      return jsonError(500, "GEMINI_API_KEY is not configured");
    }

    // Fire-and-forget engagement log — count only, no message content stored.
    supabase.from("mascot_messages").insert({ user_id: user.id }).then(({ error }) => {
      if (error) console.error("mascot_messages insert failed:", error.message);
    });

    const body = await req.json();
    const message: string = body?.message ?? "";
    const history: { role: "user" | "model"; text: string }[] =
      Array.isArray(body?.history) ? body.history : [];

    if (!message.trim()) {
      return jsonError(400, "Missing message");
    }

    // Build Gemini contents array: system prompt + history + new message
    const contents = [
      { role: "user", parts: [{ text: ACE_SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Got it! I'm Ace, ready to help you study. 🌟" }] },
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return jsonError(502, "AI service temporarily unavailable. Please try again.");
    }

    const geminiData = await geminiRes.json();
    const reply: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!reply) {
      return jsonError(422, "Gemini returned empty response");
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mascot-chat error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
