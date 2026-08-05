# Analytics — Phase 2 Reference

**Status:** BLOCKED — pending qualified lawyer / DPO engagement.
**Decision made:** 2026-08-05 by lingcw0306@gmail.com. Option (b) — pause Phase 2 until legal counsel is engaged.
**Prerequisite:** Phase 1 (backend-derived analytics) shipped and stable.

---

## What Phase 2 is

Phase 2 adds **client-side behavioral tracking** on top of the Phase 1 backend-derived dashboard. It captures *how users move through the product* — page views, clicks, feature funnels, session duration — rather than just *what happened in the database*.

Phase 1 answers: "How many quizzes were completed yesterday?"
Phase 2 answers: "Where in the quiz builder do users drop off, and does that correlate with signup source?"

---

## Why it's blocked

Two legal risks that require qualified sign-off:

1. **PDPA (Malaysia)** — collecting per-user behavioral event streams with session IDs is regulated. Requires disclosure, purpose limitation, and typically consent.
2. **Minor users** — a large share of AceTerus users are under 18 (secondary school students). Most jurisdictions treat behavioral profiling of minors more strictly: parental consent, no ad-style profiling, stricter retention limits.

I am not a lawyer. Phase 2 introduces:
- A consent banner (soft-consent model — anonymous session_start allowed pre-consent)
- Persistent session cookies
- An `analytics_events` fire-hose table containing per-user event rows
- Browser-side tracking library calls throughout the app

All of the above should be reviewed by qualified counsel before shipping.

---

## What Phase 2 unlocks (features currently blocked)

| Capability | What it tells you |
|---|---|
| **Page view tracking** | Which pages users visit, in what order, from where |
| **Feature funnel analysis** | e.g., "Started quiz builder → uploaded PDF → generated questions → published" — where users drop off at each step |
| **Time-on-page / session duration** | How long users engage with each surface |
| **Click/interaction tracking** | Feature discovery — which buttons/CTAs get pressed, which get ignored |
| **UTM / referrer attribution** | Which traffic sources bring users who actually activate |
| **Search query logging** | What students search for in materials / quiz library |
| **Onboarding drop-off analysis** | Which onboarding step loses users |
| **Cohort funnels** | "Signup → first quiz → 2nd quiz → retained W2" — full multi-step conversion analysis |
| **A/B test exposure logging** | Per-user experiment assignment tracking, needed to measure test results |
| **Mascot chat topic analytics** | *What topics* students ask about (not just message counts) — high-risk, only with explicit consent |

**Borderline (probably OK, confirm with counsel):**
- Anonymous pageview counters (no user ID attached)
- Client-side error/crash tracking (operational necessity)

**Never OK regardless of legal review:**
- Cross-device fingerprinting
- Selling or sharing user-level data with third parties
- Analyzing minors' chat message content for anything beyond safety moderation

---

## Proposed technical architecture

### New database objects

- **`analytics_events`** — fire-hose table:
  - `id uuid`
  - `occurred_at timestamptz`
  - `user_id uuid null` (null pre-consent / pre-signup)
  - `session_id text` (anonymous cookie ID)
  - `event_name text` (e.g., `page_view`, `quiz_builder_step`, `mascot_message_sent`)
  - `properties jsonb` (event-specific payload — capped size, no PII in free-text)
  - `page_path text`
  - `referrer text`
  - `utm_source / utm_medium / utm_campaign text`
  - `env text` (`production` / `preview` / `development` — from `VERCEL_ENV`)
  - `user_agent text` (parsed to browser/OS; raw not stored long-term)

- **Retention:** 180 days for raw `analytics_events` (locked in 2026-08-05). Daily rollups extracted before deletion, kept 3 years.
- **RLS:** insert-only for authenticated users on their own `user_id`; select restricted to `is_admin`.

### Ingest path

- **`/ingest` edge function** (`supabase/functions/ingest/`) — accepts batched events from the browser, validates schema, strips disallowed fields, stamps `env` from `VERCEL_ENV`, inserts to `analytics_events`.
- Batching + retry on the client to survive flaky connections.
- Rate limiting via `api_rate_limits` table (already exists).

### Client library

- **`src/lib/analytics.ts`** — thin wrapper:
  - `track(event_name, properties)`
  - `identify(user_id)` — called post-signup
  - `pageView()` — hooked into React Router navigation
  - Reads consent state from a `AnalyticsConsentContext`
  - No-ops on `env === 'development'` unless explicit override

### Consent model (soft consent)

- Anonymous `session_start` and `page_view` events allowed pre-consent (no `user_id`, no PII).
- Explicit consent banner on first visit — "Help us improve AceTerus by allowing product analytics."
- On accept: attach `user_id` to future events, enable behavioral events (funnels, clicks).
- On decline: continue with anonymous-only tracking, no `user_id` ever attached.
- Consent state stored in `profiles.analytics_consent` (`null` / `true` / `false`) + localStorage mirror for anonymous sessions.
- **Under-18 users:** requires additional safeguard — either parental consent flow or blanket exclusion from behavioral tracking. **Legal counsel must decide.**

### Nightly rollup extensions

Phase 1 rollup tables get new columns/tables derived from `analytics_events`:
- `analytics_daily_pageviews(date, page_path, views, unique_visitors)`
- `analytics_daily_funnels(date, funnel_name, step, users_entered, users_completed)`
- `analytics_daily_attribution(date, utm_source, signups, activated_7d)`

### Env separation

**Prerequisite for Phase 2** — currently local dev writes to production Supabase (discovered during Phase 1 audit). Must fix before Phase 2 ships, otherwise dev clicks pollute prod analytics. Options:
- Separate Supabase project for staging/preview
- OR `env` tag filtering on all analytics queries (cheaper, riskier)

---

## Pre-flight checklist (must complete before Phase 2 code)

1. **Engage lawyer / DPO** — qualified for PDPA + minor-user law.
2. **Update Privacy Policy** — disclose new tracking, purpose, retention, third parties (none, if self-hosted on Supabase).
3. **Update Terms of Service** if needed.
4. **Design consent banner UX** — must match sticker design system, must be legally sufficient.
5. **Decide under-18 policy** — exclusion vs. parental consent flow.
6. **Fix env separation** — dev must stop writing to prod DB.
7. **Data retention automation** — pg_cron job to prune `analytics_events` at 180 days.
8. **Deletion request workflow** — users must be able to request full analytics deletion (PDPA data-subject rights).
9. **Admin access audit log** — who queried analytics, when (already needed for `is_admin` gating, but critical for behavioral data).

---

## Order of operations when unblocked

1. Legal review complete → written approval on record.
2. Merge migrations for `analytics_events`, RLS, pg_cron retention, consent columns.
3. Ship `/ingest` edge function + rate limiting.
4. Ship `src/lib/analytics.ts` + consent banner behind feature flag, disabled in prod.
5. Instrument top-priority events only (signup flow, quiz builder, mascot open). Not everything.
6. Enable flag in prod for 5% of users. Monitor ingest volume, error rate, DB write pressure.
7. Ramp to 100%.
8. Extend rollups + admin dashboard to surface funnel/attribution metrics.

---

## Cost & scale notes

- `analytics_events` at ~50 events/user/day × 10k DAU × 180 days = ~90M rows. Well within Postgres range with correct indexing (`(occurred_at)`, `(user_id, occurred_at)`, `(event_name, occurred_at)`), but not free — expect meaningful storage growth.
- Ingest edge function invocations count toward Supabase quota — batching keeps this manageable.
- If volume outgrows Postgres, migration path is to ClickHouse or similar OLAP store, keeping Postgres for consent + rollups only. Not needed for a long time.

---

## What Phase 2 does NOT include (out of scope)

- Third-party analytics vendors (PostHog, Mixpanel, Amplitude, GA4) — deliberately self-hosted to keep minor-user data inside Supabase.
- Session replay / heatmap tools — high privacy risk, not proposed.
- Marketing automation / email triggering off events — separate system.
- Real-time dashboards — nightly rollups are sufficient; live queries are expensive.
