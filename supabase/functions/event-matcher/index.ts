// Supabase Edge Function: AI-powered event recommendations via Gemini
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY_MASCOT") ?? "";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing Authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonError(401, "Unauthorized");

    if (!GEMINI_API_KEY) return jsonError(500, "GEMINI_API_KEY not configured");

    // Fetch context data in parallel
    const [schoolsResult, eventsResult, perfResult] = await Promise.all([
      supabase
        .from("student_schools")
        .select("schools(name, type, level, state)")
        .eq("user_id", user.id)
        .order("is_current", { ascending: false })
        .limit(3),
      supabase
        .from("events")
        .select("id, title, description, type, location, start_date")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .limit(50),
      supabase
        .from("quiz_performance_results")
        .select("subject, performance_level")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const schools = (schoolsResult.data ?? []) as any[];
    const events = (eventsResult.data ?? []) as any[];
    const perf = (perfResult.data ?? []) as any[];

    if (!events.length) {
      return jsonOk({ recommended_event_ids: [], reason: "No events available yet." });
    }

    const schoolCtx = schools
      .map((s: any) => s.schools?.name)
      .filter(Boolean)
      .join(", ") || "Not specified";

    const perfCtx = perf
      .map((p: any) => `${p.subject ?? "?"} (${p.performance_level ?? "?"})`)
      .join(", ") || "Not available";

    const eventsCtx = events
      .map((e: any) =>
        `ID:${e.id} | "${e.title}" | type:${e.type} | location:${e.location ?? "Online"}`
      )
      .join("\n");

    const prompt = `You are an AI that recommends student events to Malaysian students.

User context:
- Schools/Universities: ${schoolCtx}
- Recent quiz subjects: ${perfCtx}

Available events (ID | title | type | location):
${eventsCtx}

Return ONLY a valid JSON object (no markdown) with:
- "recommended_event_ids": array of 3–5 event IDs most relevant to this student
- "reason": one concise sentence explaining why (mention their school/subjects if applicable)`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const txt = await geminiRes.text();
      console.error("Gemini error:", txt);
      return jsonError(500, "AI recommendations temporarily unavailable.");
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let result: { recommended_event_ids: string[]; reason: string };
    try {
      const cleaned = rawText.replace(/```json\n?|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { recommended_event_ids: [], reason: "Could not parse AI recommendations." };
    }

    return jsonOk(result);
  } catch (err) {
    return jsonError(500, String(err));
  }
});

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
