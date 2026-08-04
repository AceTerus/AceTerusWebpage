# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server on port 8001
npm run build        # Production build (multi-entry)
npm run build:dev    # Development-mode build
npm run lint         # ESLint
npm run preview      # Preview production build locally
npm run omr-api      # Start OMR Scanner FastAPI backend on port 8080 (uvicorn)
npm run dev:omr      # Alias for omr-api
```

Path alias `@` maps to `./src`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## What is AceTerus

AceTerus is a Malaysian student learning platform. Core features:
- **Quiz system** — objective and subjective quizzes, AI-generated from text/PDF, OMR scanning, OMR exams (admin answer keys + user self-grading)
- **Social feed** — posts, comments, likes, following (Twitter-like)
- **AI tools** — mascot chat companion, performance analysis, subjective grading, ClassPulse session reports
- **Study tools** — Pomodoro timer, materials library, goals/reminders, streaks, AR scanner
- **Gamification** — ACE Coins currency, streaks, achievements, Boss Raids
- **Events platform** — event registration, promoter/organizer flows, reward codes, deals
- **ClassPulse (sub-app)** — teacher/school-facing session monitoring at `classpulse.aceterus.com`
- **Malaysian-specific** — schools/universities reference table covering all states

Deployed to Vercel. Backend is entirely Supabase (Postgres + Auth + Storage + Edge Functions), plus a separate FastAPI service for OMR image processing.

## Architecture

### Stack
- **React 18** + TypeScript + Vite (SWC)
- **Tailwind CSS** + shadcn/ui (Radix UI primitives)
- **Supabase** — database, auth, storage, real-time, edge functions
- **React Router v6** — client-side routing (main SPA only)
- **React Query** (`@tanstack/react-query`) — data fetching/caching (used selectively)
- **Framer Motion** — page/component animation
- **Recharts** — charts (analytics, ClassPulse, performance dashboards)
- **Lottie React** — mascot / celebration animations
- **pdfjs-dist** — client-side PDF rendering for the quiz generator
- **tesseract.js** — client-side OCR
- **Sonner** — toast notifications

### Multi-entry Vite build
`vite.config.ts` builds four HTML entry points, each shipping its own bundle:

| Entry | Path | Purpose |
|---|---|---|
| `index.html` | `/` | Main student SPA (React Router) |
| `events.html` | `/events` | Events platform surface |
| `admin.html` | `/admin` | Admin console |
| `classpulse.html` | `/classpulse` | ClassPulse teacher/school app |

Vendor code is split into `vendor`, `supabase`, `ui`, and `query` chunks via `manualChunks`.

### Routing & Auth (main SPA — `src/App.tsx`)
Top-level routes: `/`, `/feed`, `/quiz`, `/omr-scan`, `/ar-scanner`, `/admin`, `/materials`, `/profile` (+ `/profile/:userId`), `/discover`, `/chat`, `/auth`, `/onboarding`, `*` (NotFound).

- Pages are lazy-loaded via `React.lazy`.
- `OnboardingGuard` redirects new users (`isNewUser` and `ace_onboarding_done` unset) to `/onboarding`.
- `AuthProvider` lives in `src/hooks/useAuth.tsx` — exposes `user`, `profile`, `isAdmin`, `aceCoins`, `isNewUser`.
- Admin access gated via `profile.is_admin` flag.
- `ErrorBoundary` wraps the routes; `PageTransitionBar` provides a top loading bar on navigation.

### Context Providers (`src/context/`)
| Context | Purpose |
|---|---|
| `AuthProvider` (in `hooks/useAuth.tsx`) | Auth state, profile, ACE coins |
| `MascotProvider` | AI mascot mood/chat state |
| `ChatNotificationsProvider` | Unread DM counts |
| `NotificationsProvider` | All notifications (follow, like, comment, quiz, streak, goal) |
| `PomodoroProvider` | Timer state, persisted to localStorage |

### Supabase Usage
- Direct client calls via `supabase.from()` throughout pages/components. Thin API-client wrappers live in `src/lib/`:
  - `quiz-client.ts` — quiz operations
  - `omr-client.ts` — OMR exams / scan results
- RLS policies protect all tables.
- Real-time subscriptions used in Chat and Notifications.
- Storage buckets: `profile-images` (public), `user-uploads` (public — see `20260411000002_make_uploads_bucket_public.sql`).
- Edge Functions (`supabase/functions/`):
  - `text-quiz-parser`, `pdf-quiz-generator` — AI quiz generation
  - `quiz-performance-analyzer`, `subjective-quiz-grader` — AI grading/analysis
  - `mascot-chat` — mascot companion chat
  - `classpulse-report` — ClassPulse session AI report
  - `deepgram-key` — issues Deepgram speech API keys
  - `event-matcher` — events platform matching logic
  - `_shared` — shared utilities

### Key Database Tables
- **Profile / education**: `profiles` (has `username`, `avatar_url`, `is_admin`, `ace_coins`, `profile_cover_url`), `student_schools` (multi-entry education history with year ranges + `is_current`), `schools` (10k+ Malaysian schools/universities; unique on `(name, type, level, state)`)
- **Social feed**: `posts`, `post_images`, `post_likes`, `post_comments`, `follows`
- **Chat**: `chat_messages`, `chat_unread_counts`
- **Quiz**: `decks`, `questions`, `answers`, `quiz_results`, `quiz_performance_results`, `quiz_categories`
- **OMR exams**: `omr_exams`, `omr_scan_results` (see `20260618000000_omr_exams.sql`)
- **Gamification**: `notifications`, `streaks`, `goals`, `boss_raids`, `boss_raid_questions`, `boss_raid_attempts`, `coin_transactions`
- **Events platform**: `events`, `event_registrations`, `event_organizers`, `event_promoters`, `event_form_fields`, `event_registration_responses`, `event_reward_codes`, `event_code_redemptions`, `deals`
- **ClassPulse**: `classpulse_users`, `class_sessions`, `conclusion_reports`, `student_session_summaries`, `flagged_concepts` (see `20260521000000_classpulse_schema.sql` and `20260528000000_add_teaching_effectiveness.sql`)
- **Ops**: `api_rate_limits`

### Design System
All pages use a consistent "sticker" aesthetic defined inline in each file:
- **Colors**: Cyan `#3BD6F5`, Blue `#2F7CFF`, Indigo `#2E2BE5`, Ink `#0F172A`
- **Cards**: `border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] rounded-[20px]`
- **Buttons**: thick borders, neomorphic shadows, `translateY(-1px)` on hover
- **Font**: `font-['Baloo_2']` for display/headings

These patterns are repeated directly in JSX via Tailwind — there's no shared design token file. When adding UI, match the existing sticker style in the surrounding code. The ClassPulse and OMR surfaces follow the same system.

### Migrations
Supabase migrations live in `supabase/migrations/`. Always create new migration files rather than editing applied ones. Use `IF NOT EXISTS` / `DO $$ BEGIN ... END $$` guards for idempotent migrations. Push with:
```bash
supabase db push           # apply new migrations
supabase db push --include-all  # include out-of-order local migrations
supabase migration repair --status applied <version>  # mark migration as applied without running
```

### OMR Scanner backend
`omr-scanner/` is a Python FastAPI service (`main.py`, `uvicorn main:socket_app`) that wraps the vendored `OMRChecker/` package to grade scanned answer sheets. Run locally via `npm run omr-api` (port 8080). Deployed separately (see `render.yaml`, `Dockerfile`). Results are POSTed back to Supabase via `omr-client.ts`.

### Sub-app source folders
- `TeacherDashboard/` — legacy/reference JSX prototypes for the teacher dashboard (informs `classpulse.html` output).
- `Claude Design/` — design source drops.
