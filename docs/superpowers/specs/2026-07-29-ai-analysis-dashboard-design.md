# Enhanced AI Performance Analysis — Design Spec

**Date:** 2026-07-29
**Status:** Approved (design), pending implementation plan
**Area:** Quiz AI performance analysis (`quiz-performance-analyzer` edge function, `QuizAnalysis.tsx`, `Profile.tsx`)

## Goal

Make the post-quiz AI analysis dashboard substantially more detailed, personalised, and actionable:

1. **Richer strengths & weaknesses** — each area named specifically, with a supporting
   detail line, a severity/confidence indicator, and (for weaknesses) a root-cause tag.
   Visually highlighted rather than presented as a flat bullet list.
2. **7-day study plan** — a concrete day-by-day plan targeting the student's weak areas.
   Each day names a focus topic, a small checklist of practice tasks, and an estimated
   time. Actionable text only (no deep links / quiz generation).
3. **"How you learn" feedback** — personalised habit and learning-style observations
   (e.g. "you skip rather than attempt", "your scores swing wildly — inconsistent prep",
   "you tend to quiz late at night"). Grounded in real signals, never fabricated.

## Non-goals (YAGNI)

- No per-question timing capture. No changes to the quiz-taking flow.
- No deep links from study-plan days into decks / quiz generation.
- No new database tables. Reuse the existing `ai_analysis` JSONB column.
- No backfill / regeneration of historical analyses. New shape applies to new analyses
  only; existing rows must keep rendering.

## Current state (baseline)

- **Capture:** On quiz finish, `src/pages/Quiz.tsx` inserts a `quiz_performance_results`
  row with `questions_data` = array of `{ text, is_correct, was_skipped }` (no timing,
  no chosen-answer text), plus `score`, `correct_count`, `wrong_count`, `skipped_count`,
  `total_count`, `category`, `completed_at`.
- **Analyze:** Client calls the `quiz-performance-analyzer` edge function with
  `{ current, history }`. `history` = last 10 rows selecting
  `deck_name, category, score, correct_count, total_count, completed_at`.
- **Model:** `gemini-2.5-flash-lite`, `temperature 0.4`, `maxOutputTokens 8192`. Returns
  JSON: `overall_trend`, `performance_summary`, `weak_areas: string[]`,
  `strong_areas: string[]`, `improvement_tips: string[]`, `comparison_note`.
  SPM Sejarah gets a large embedded syllabus for chapter/subtopic grounding; all other
  subjects are analysed purely from question content. All AI text is Bahasa Malaysia.
- **Store:** Result saved to `quiz_performance_results.ai_analysis` (JSONB).
- **Render:** `src/components/QuizAnalysis.tsx` (full card in the Quiz results "AI" tab)
  and a compact block in `src/pages/Profile.tsx` (reads `ai_analysis.performance_summary`
  and `ai_analysis.weak_areas`).

## Design

### 1. New `ai_analysis` shape (schema_version 2)

```jsonc
{
  "schema_version": 2,
  "overall_trend": "improving | declining | stable | first_attempt",
  "performance_summary": "…",              // BM, 1–2 sentences
  "comparison_note": "…",                   // BM, comparison vs past attempts

  "learner_profile": {                      // NEW
    "study_habits": ["…", "…"],            // 2–4 behavioral bullets (see §2)
    "learning_style_note": "…",            // 1–2 sentences on how they approach quizzes
    "consistency_note": "…"                // volatility / prep-pattern read
  },

  "strong_areas": [                         // objects, not bare strings
    { "topic": "Bab 8: Kesultanan Melaka",
      "detail": "…",                        // BM, why this is a strength / evidence
      "confidence": "high | medium" }
  ],

  "weak_areas": [
    { "topic": "Bab 3: Mesir Purba",
      "detail": "…",                        // BM, what specifically is wrong
      "severity": "high | medium | low",
      "cause": "conceptual | careless | unattempted" }
  ],

  "improvement_tips": ["…", "…", "…"],

  "study_plan": [                           // exactly 7 entries, day 1..7
    { "day": 1,
      "focus": "Bab 8: Kesultanan Melaka",
      "tasks": ["…", "…", "…"],            // 2–4 concrete BM practice tasks
      "est_minutes": 30 }
  ]
}
```

**Backward compatibility rule:** rendering code must treat `strong_areas` / `weak_areas`
entries as *either* a string (legacy) *or* an object (v2). `learner_profile` and
`study_plan` may be absent (legacy) → those sections simply don't render. Detect v2 by
`schema_version === 2` OR by entry type at render time (defensive; don't rely solely on
the version field).

### 2. Honesty guardrail — server-computed behavioral signals

The edge function computes a **factual signals block** from the data it already has and
injects it into the prompt, instructing Gemini to base all `learner_profile` (habit /
style / consistency) claims **only** on these signals — never invent behaviors.

Computed signals:

- **Attempt volume:** number of attempts analysed (`history.length + 1`).
- **Skip vs wrong:** `skipped_count` vs `wrong_count` on the current quiz →
  avoidance (skipping) vs guessing (attempting-and-wrong).
- **Skip rate / wrong rate:** as fractions of `total_count`.
- **Score trend:** current `score` vs the mean of `history` scores; direction and delta.
- **Volatility:** range (max − min) of scores across `history` (+ current) → consistent
  vs erratic preparation. Only meaningful when `history.length >= 2`.
- **Study time-of-day:** hours extracted from `completed_at` of history rows, converted
  to **MYT (UTC+8)**, summarised (e.g. "majority of attempts after 22:00"). Only
  included when there are enough timestamps to be meaningful (`>= 3`).
- **Subject spread:** distinct categories in history (breadth vs single-subject focus).

Signals with insufficient data are omitted from the block, and the prompt tells the model
to skip any habit claim it has no signal for (so a first attempt yields a minimal,
honest `learner_profile` rather than fabricated patterns).

Timezone note: `completed_at` is stored UTC; convert by adding 8 hours for MYT before
deriving the hour-of-day. This is a heuristic (assumes Malaysian local time) and is only
used for a soft "you tend to study at X" observation, never a hard claim.

### 3. Prompt changes

Both prompt variants (Sejarah-syllabus and generic) are updated to:

- Include the computed **BEHAVIORAL SIGNALS** block with the "base habit claims only on
  these" instruction.
- Request the new JSON structure (§1) instead of the old one, with all text in Bahasa
  Malaysia and `study_plan` required to contain exactly 7 day-objects ordered day 1→7,
  front-loading the most severe weak areas onto the earliest days and including at least
  one lighter review/consolidation day.
- Keep the Sejarah variant's requirement to name exact `Bab` + subtopik from the syllabus
  in `weak_areas`, `strong_areas`, and `study_plan.focus`.

Model & config: keep `gemini-2.5-flash-lite` (unchanged); keep `temperature 0.4`; keep
`maxOutputTokens 8192` (sufficient for the larger payload).
Keep the existing robust JSON extraction (code-fence stripping + first `{` … last `}`).

The edge function response envelope (`{ analysis }`) and the client's save-to-`ai_analysis`
logic are unchanged — only the shape of `analysis` grows.

### 4. `QuizAnalysis.tsx` redesign

Keep the existing sticker aesthetic (thick ink borders, hard shadows, `Baloo_2` display
font, the `C` color palette). The `PerformanceAnalysis` TypeScript type is extended to the
v2 shape, with `strong_areas` / `weak_areas` typed as `(string | AreaObject)[]` and
`learner_profile` / `study_plan` optional. A small normaliser converts legacy strings to
`{ topic, detail: "" }` so the render path is uniform.

Sections, top to bottom:

1. **Header + trend badge** — unchanged.
2. **Summary + comparison** — unchanged.
3. **"Cara Kamu Belajar" (How You Learn)** — NEW card, distinct accent (indigo/sun).
   Renders `learner_profile.study_habits` as bullets, plus `learning_style_note` and
   `consistency_note`. Hidden entirely if `learner_profile` absent/empty.
4. **Kekuatan (Strengths)** — green card. Each entry: bold `topic`, a `detail` sub-line
   when present, and a small confidence chip (`high`/`medium`).
5. **Perlu Diperbaiki (Weaknesses)** — each entry: bold `topic`, a `detail`/why sub-line,
   a color-coded **severity badge** (high = red/pop, medium = amber/sun, low = slate),
   and a small `cause` tag. Sorted high→low severity in the component.
6. **Tips to Improve** — kept; restyled to match.
7. **Pelan Belajar 7 Hari (7-Day Study Plan)** — NEW. Vertical day-by-day list; each day
   a mini-card: `Day N` badge, focus-topic tag, task checklist (static checkboxes /
   bullets), and `est_minutes`. Hidden if `study_plan` absent/empty.

Loading and error states are unchanged.

### 5. `Profile.tsx` compact view

- Update the `weak_areas.map(...)` to read `.topic` when the entry is an object, else the
  string (backward compatible).
- Add a one-line teaser when `study_plan` exists: e.g. "Pelan belajar 7-hari tersedia".
- No layout overhaul; this stays a compact summary.

## Data flow (unchanged skeleton, richer payload)

```
Quiz finish (Quiz.tsx)
  → insert quiz_performance_results row (questions_data, counts, category, completed_at)
  → fetch history (last 10 rows, incl. completed_at)
  → invoke quiz-performance-analyzer { current, history }
        → compute behavioral signals (server)
        → build prompt (Sejarah syllabus | generic) + signals + v2 JSON schema request
        → gemini-2.5-flash → parse JSON → { analysis }
  → setAnalysisResult(analysis)  (render in QuizAnalysis.tsx)
  → update ai_analysis = analysis on the latest row
Profile.tsx later reads ai_analysis for history cards (compact, backward-compatible)
```

## Error handling

- Edge function keeps its existing typed error responses (`jsonError`) and JSON-parse
  guards. If Gemini omits `study_plan` or `learner_profile`, the client still renders
  (those sections are optional); no throw.
- Malformed / partial JSON continues to surface as the existing `analysisError` state in
  `QuizAnalysis.tsx`.
- Signals computation is defensive: missing/empty `history`, zero `total_count`, and
  unparseable `completed_at` values are skipped rather than throwing.

## Testing

- **Edge function (manual / local):** invoke with (a) first-attempt payload (empty
  history) → minimal honest `learner_profile`, valid 7-day plan; (b) multi-attempt
  history with volatile scores → volatility + trend habit claims present; (c) a Sejarah
  SPM category → weak/strong/plan reference real `Bab` numbers; (d) a non-Sejarah
  category → content-derived topics. Verify JSON parses and matches the v2 shape.
- **Components:** render `QuizAnalysis` with a v2 fixture (all sections) and a legacy
  fixture (string arrays, no plan/profile) — confirm both render without errors and the
  legacy one omits the new sections. Render `Profile` compact view with both fixtures.
- **Regression:** existing loading/error states still display; `npm run lint` clean.

## Files touched

- `supabase/functions/quiz-performance-analyzer/index.ts` — signals, prompt, model, schema.
- `src/components/QuizAnalysis.tsx` — type extension, normaliser, new sections.
- `src/pages/Profile.tsx` — backward-compatible weak-area read + plan teaser.
- (No migration — `ai_analysis` JSONB already exists.)
