# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8001
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build locally
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
- **Quiz system** — objective and subjective quizzes, AI-generated from text/PDF, OMR scanning
- **Social feed** — posts, comments, likes, following (Twitter-like)
- **AI tools** — mascot chat companion, performance analysis, subjective grading
- **Study tools** — Pomodoro timer, materials library, goals/reminders, streaks
- **Gamification** — ACE Coins currency, streaks, achievements
- **Malaysian-specific** — schools/universities reference table covering all states

Deployed to Vercel. Backend is entirely Supabase (Postgres + Auth + Storage + Edge Functions).

## Architecture

### Stack
- **React 18** + TypeScript + Vite (SWC)
- **Tailwind CSS** + shadcn/ui (Radix UI primitives)
- **Supabase** — database, auth, storage, real-time, edge functions
- **React Router v6** — client-side routing
- **React Query** — data fetching/caching (used selectively)
- **Sonner** — toast notifications

### Routing & Auth
- `src/App.tsx` defines all routes with React Router
- `OnboardingGuard` redirects new users (no `username` set) to `/onboarding`
- `AuthProvider` (`src/contexts/AuthContext.tsx`) is the root context — exposes `user`, `profile`, `isAdmin`, `aceCoins`
- Admin access gated via `profile.is_admin` flag

### Context Providers
| Context | Purpose |
|---|---|
| `AuthProvider` | Auth state, profile, ACE coins |
| `MascotProvider` | AI mascot mood/chat state |
| `ChatNotificationsContext` | Unread DM counts |
| `NotificationsContext` | All notifications (follow, like, comment, quiz, streak, goal) |
| `PomodoroProvider` | Timer state, persisted to localStorage |

### Supabase Usage
- Direct client calls via `supabase.from()` throughout pages/components — no abstraction layer except `src/lib/quiz-client.ts` for quiz operations
- RLS policies protect all tables
- Real-time subscriptions used in Chat and Notifications
- Storage buckets: `profile-images` (public), `user-uploads` (private), `quiz-images`
- Edge Functions: `text-quiz-parser`, `pdf-quiz-generator`, `quiz-performance-analyzer`, `subjective-quiz-grader`, `mascot-chat`

### Key Database Tables
- **profiles** — extends auth.users; has `username`, `avatar_url`, `is_admin`, `ace_coins`
- **student_schools** — user education history; links to `schools` reference table; supports multiple entries per user
- **schools** — Malaysian school/university reference (10k+ rows); unique on `(name, type, level, state)`
- **posts / post_images / post_likes / post_comments** — social feed
- **chat_messages / chat_unread_counts** — direct messaging
- **decks / questions / answers** — quiz content hierarchy
- **quiz_results / quiz_performance_results** — quiz history and AI analysis
- **follows / notifications / streaks / user_goals** — social + gamification

### Design System
All pages use a consistent "sticker" aesthetic defined inline in each file:
- **Colors**: Cyan `#3BD6F5`, Blue `#2F7CFF`, Indigo `#2E2BE5`, Ink `#0F172A`
- **Cards**: `border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] rounded-[20px]`
- **Buttons**: thick borders, neomorphic shadows, `translateY(-1px)` on hover
- **Font**: `font-['Baloo_2']` for display/headings

These patterns are repeated directly in JSX via Tailwind — there's no shared design token file. When adding UI, match the existing sticker style in the surrounding code.

### Migrations
Supabase migrations live in `supabase/migrations/`. Always create new migration files rather than editing applied ones. Use `IF NOT EXISTS` / `DO $$ BEGIN ... END $$` guards for idempotent migrations. Push with:
```bash
supabase db push           # apply new migrations
supabase db push --include-all  # include out-of-order local migrations
supabase migration repair --status applied <version>  # mark migration as applied without running
```

### Legacy Integration
`/openmultiplechoice` folder contains a Laravel API (OpenMC) used for public quiz content. The Supabase Edge Function `openmc-quizzes` proxies requests to it. `VITE_OPENMC_ASSET_BASE_URL` env var controls asset URLs.
