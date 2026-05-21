# CLAUDE.md — AceTerus Flutter Mobile App

This is the Flutter mobile app for **AceTerus**, a production AI-powered education platform for Malaysian students. The web app is live at `https://aceterus.com`. This Flutter app shares the **exact same Supabase backend** — no backend changes are needed.

---

## Commands

```bash
flutter pub get          # Install dependencies
flutter run              # Run on connected device/emulator
flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
flutter build apk        # Android release build
flutter build ios        # iOS release build
flutter analyze          # Static analysis
flutter test             # Run tests
```

---

## 1. Supabase Backend

```
URL:      https://lsqkfzuymgkmvnudkktv.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcWtmenV5bWdrbXZudWRra3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDYzODUsImV4cCI6MjA3MTYyMjM4NX0.80RIsG8hhppe-BryKt7e3jGh40lS4FNHWkSaXvtPZmM
```

Initialise once in `main.dart`:
```dart
await Supabase.initialize(
  url: 'https://lsqkfzuymgkmvnudkktv.supabase.co',
  anonKey: '<anon key above>',
);
```

---

## 2. Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Internal row ID |
| user_id | UUID UNIQUE | = auth.uid() — use this for all JOINs |
| username | TEXT | Unique display name |
| avatar_url | TEXT | Public URL from `profile-images` bucket |
| cover_url | TEXT | Cover photo |
| bio | TEXT | |
| followers_count | INTEGER | Denormalised |
| following_count | INTEGER | Denormalised |
| is_admin | BOOLEAN | Admin users can manage quiz content |
| ace_coins | INTEGER | Gamification currency, starts at 1000 |
| streak | INTEGER | Current streak count |
| last_quiz_date | DATE | Used for 3-day inactivity reset |

> **Note:** There is no separate `streaks` table — streak data lives directly on `profiles`.

### `student_schools` (Education history — multi-entry, LinkedIn style)
Each row = one education period. A user can have multiple rows.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | No UNIQUE constraint — multiple rows allowed |
| school_id | UUID FK | FK → schools reference table |
| school_name | TEXT | Text fallback |
| grade | TEXT | e.g. `'Form 5'`, `'Degree Year 2'` |
| curricular | TEXT | Stream or field of study |
| school_type | TEXT | e.g. `'SMK'`, `'Universiti Awam'` |
| school_location | TEXT | City, State |
| class_name | TEXT | Class name or programme/major |
| start_year | SMALLINT | Optional |
| end_year | SMALLINT | Optional. NULL when is_current = true |
| is_current | BOOLEAN | Only one row per user should be true |

### `schools` (Malaysian Reference Table — 10 000+ rows)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| type | TEXT | e.g. `SMK`, `MRSM`, `Universiti Awam` |
| level | TEXT | `primary`, `secondary`, `tertiary` |
| state | TEXT | All 13 states + WP |
| district | TEXT | |
| city | TEXT | |

**Always use server-side search with `.ilike()` — never fetch all rows.**

### `follows`
| Column | Type |
|---|---|
| follower_id | UUID FK |
| followed_id | UUID FK |

### `quiz_categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| description | TEXT | |
| is_published | BOOLEAN | Only published categories shown to students |

### `decks`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| description | TEXT | |
| subject | TEXT | Category/topic label |
| created_by | UUID FK | auth.users |
| quiz_type | TEXT | `'objective'` or `'subjective'` |
| is_published | BOOLEAN | |

### `questions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| deck_id | UUID FK | |
| text | TEXT | Question body |
| explanation | TEXT | Shown after answering |
| image_url | TEXT | Optional |
| order | INTEGER | Sort order |
| marks | INTEGER | For subjective grading (nullable) |

### `answers`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| question_id | UUID FK | |
| text | TEXT | |
| is_correct | BOOLEAN | |
| image_url | TEXT | Optional |

### `quiz_results`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| deck_id | UUID FK | |
| deck_name | TEXT | Snapshot at time of completion |
| category | TEXT | |
| score | NUMERIC | Percentage 0–100 |
| correct_count | INTEGER | |
| wrong_count | INTEGER | |
| skipped_count | INTEGER | |
| total_count | INTEGER | |
| questions_data | JSONB | Full per-question result snapshot |
| completed_at | TIMESTAMPTZ | |

### `quiz_performance_results`
Mirrors `quiz_results` structure; AI analysis appended after edge function call.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| deck_id | UUID FK | |
| deck_name | TEXT | Snapshot |
| category | TEXT | |
| score | NUMERIC(5,2) | |
| correct_count | INTEGER | |
| wrong_count | INTEGER | |
| skipped_count | INTEGER | |
| total_count | INTEGER | |
| questions_data | JSONB | Per-question snapshot |
| ai_analysis | JSONB | Set after `quiz-performance-analyzer` call |
| completed_at | TIMESTAMPTZ | |

### `posts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| content | TEXT | |
| image_url | TEXT | Single image (legacy, prefer `post_images`) |
| tags | TEXT[] | |
| likes_count | INTEGER | Denormalised |
| comments_count | INTEGER | Denormalised |
| created_at | TIMESTAMPTZ | |

### `post_images`
Multiple images per post (carousel).
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| file_url | TEXT |
| position | INTEGER |

### `likes` (post likes)
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| user_id | UUID FK |
| created_at | TIMESTAMPTZ |

### `comments` (post comments)
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| user_id | UUID FK |
| content | TEXT |
| created_at | TIMESTAMPTZ |

### `uploads` (Study Materials)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| title | TEXT | |
| description | TEXT | |
| file_url | TEXT | From `user-uploads` bucket |
| file_type | TEXT | e.g. `pdf`, `image` |
| file_size | INTEGER | |
| download_count | INTEGER | |
| rating | NUMERIC | |
| likes_count | INTEGER | Denormalised |
| comments_count | INTEGER | Denormalised |

### `upload_likes`
| Column | Type |
|---|---|
| id | UUID PK |
| upload_id | UUID FK |
| user_id | UUID FK |
| created_at | TIMESTAMPTZ |

### `upload_comments`
| Column | Type |
|---|---|
| id | UUID PK |
| upload_id | UUID FK |
| user_id | UUID FK |
| content | TEXT |
| created_at | TIMESTAMPTZ |

### `chat_messages`
| Column | Type |
|---|---|
| id | UUID PK |
| sender_id | UUID FK |
| receiver_id | UUID FK |
| content | TEXT |
| created_at | TIMESTAMPTZ |

### `chat_unread_counts`
| Column | Type |
|---|---|
| user_id | UUID FK |
| sender_id | UUID FK |
| unread_count | INTEGER |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | Recipient |
| actor_id | UUID FK | Who triggered it |
| type | TEXT | See enum below |
| post_id | UUID FK | Nullable |
| upload_id | UUID FK | Nullable |
| quiz_category_id | UUID FK | Nullable |
| goal_id | UUID FK | Nullable |
| metadata | JSONB | Extra context |
| read | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

Notification types:
```dart
enum NotificationType {
  follow,
  like,
  comment,
  material_like,
  material_comment,
  quiz_published,
  streak_milestone,
  streak_broken,
  goal_reminder,
}
```

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| text | TEXT | Goal description |
| date | DATE | Calendar date the goal belongs to |
| deadline | TIMESTAMPTZ | Optional hard deadline |
| reminder_at | TIMESTAMPTZ | When to fire reminder |
| reminder_sent | BOOLEAN | Has reminder notification been sent |
| priority | TEXT | `'low'` / `'medium'` / `'high'` |
| completed | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `events`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | TEXT | |
| description | TEXT | |
| type | TEXT | `competition` / `hackathon` / `workshop` / `talk` / `internship` / `deal` |
| organizer_id | UUID FK | → `event_organizers` |
| submitter_user_id | UUID FK | auth.users |
| university_id | UUID | Optional |
| is_sponsored | BOOLEAN | |
| is_featured | BOOLEAN | |
| location | TEXT | |
| start_date | TIMESTAMPTZ | |
| end_date | TIMESTAMPTZ | |
| registration_url | TEXT | |
| image_url | TEXT | |
| ace_coins_reward | INTEGER | |
| status | TEXT | `pending` / `published` / `rejected` |
| website_url | TEXT | |
| socmed_url | TEXT | |
| pdf_url | TEXT | |
| google_form_url | TEXT | |
| created_at | TIMESTAMPTZ | |

### `event_organizers`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| type | TEXT | `university` / `brand` / `company` / `student_body` |
| logo_url | TEXT | |
| verified | BOOLEAN | Admin-verified |
| owner_user_id | UUID FK | auth.users |
| created_at | TIMESTAMPTZ | |

### `event_registrations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_id | UUID FK | |
| user_id | UUID FK | |
| referrer_id | UUID FK | Promoter who referred |
| registered_at | TIMESTAMPTZ | |

### `event_reward_codes`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_id | UUID FK | |
| code | TEXT | Unique redemption code |
| ace_coins_reward | INTEGER | |
| max_redemptions | INTEGER | NULL = unlimited |
| expires_at | TIMESTAMPTZ | |
| created_by | UUID FK | |
| created_at | TIMESTAMPTZ | |

### `event_code_redemptions`
| Column | Type |
|---|---|
| id | UUID PK |
| code_id | UUID FK |
| user_id | UUID FK |
| coins_awarded | INTEGER |
| redeemed_at | TIMESTAMPTZ |

### `deals`
Event-linked deals/reward offerings. Linked to `events`.

### `boss_raids`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| creator_id | UUID FK | |
| title | TEXT | |
| description | TEXT | |
| visibility | TEXT | `'global'` / `'university'` |
| university | TEXT | Optional, for university-scoped raids |
| initial_bounty | INTEGER | Coins creator puts up |
| bounty_pot | INTEGER | Accumulated from failed attempts |
| min_entry_fee | INTEGER | Minimum bet to attempt |
| status | TEXT | `'active'` / `'cleared'` |
| cleared_by | UUID FK | User who won |
| created_at | TIMESTAMPTZ | |

### `boss_raid_questions`
| Column | Type |
|---|---|
| id | UUID PK |
| raid_id | UUID FK |
| question_text | TEXT |
| answers | JSONB |
| position | INTEGER |
| created_at | TIMESTAMPTZ |

### `boss_raid_attempts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| raid_id | UUID FK | |
| challenger_id | UUID FK | |
| bet_amount | INTEGER | |
| score | INTEGER | |
| max_score | INTEGER | |
| status | TEXT | `'playing'` / `'won'` / `'lost'` |
| created_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

### `coin_transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| amount | INTEGER | Positive = earned, negative = spent |
| description | TEXT | Human-readable reason |
| type | TEXT | e.g. `'redemption'` |
| reference_id | UUID | Optional FK to related object |
| created_at | TIMESTAMPTZ | |

### Storage Buckets
| Bucket | Public | Usage |
|---|---|---|
| `profile-images` | ✅ | Avatars, cover photos, event images |
| `quiz-images` | ✅ | Question and answer images |
| `user-uploads` | ❌ | Study material files |

Upload path conventions:
- Avatar: `profile-images/{user_id}/avatar.jpg`
- Cover: `profile-images/{user_id}/cover.jpg`
- Quiz images: `quiz-images/{deck_id}/{question_id}.{ext}`
- Materials: `user-uploads/{user_id}/{filename}`
- Event files: `profile-images/{user_id}/events/{filename}`

---

## 3. Authentication Flow

### Sign Up
1. `supabase.auth.signUp(email, password)`
2. Profile row auto-created with `ace_coins = 1000`
3. Check `profiles.username` — if null → navigate to Onboarding

### Sign In
1. `supabase.auth.signInWithPassword(email, password)`
2. Fetch `profiles` row via `.eq('user_id', uid)`
3. If `username == null` → Onboarding; else → Feed

### Session Persistence
```dart
Supabase.instance.client.auth.onAuthStateChange.listen((data) {
  final session = data.session;
  if (session == null) {
    // → /auth
  } else {
    // check profile.username → null: /onboarding, else: /feed
  }
});
```
`supabase_flutter` persists sessions automatically via secure storage.

### Admin Check
Read `profiles.is_admin` via `.eq('user_id', uid)`. Gate admin screens server-side via RLS — never trust a client-side flag alone.

### Onboarding (3 Steps)
1. **Username** — check uniqueness in `profiles`, update row via `.eq('user_id', uid)`
2. **Avatar** — crop to circle, upload to `profile-images/{uid}/avatar.jpg`
3. **School** — search `schools` table by name (`.ilike()`), insert row into `student_schools`

---

## 4. Edge Functions

All AI features run as Supabase Edge Functions (Deno). Call with the user's JWT — no API keys needed on the client. All functions require the `Authorization: Bearer <jwt>` header (added automatically by `supabase_flutter`).

```dart
final response = await Supabase.instance.client.functions.invoke(
  'function-name',
  body: { ... },
);
```

### `mascot-chat`
AI tutoring chatbot. Persona: "Ace", friendly, Malaysian education focused.

**Request:**
```json
{
  "message": "Apa itu fotosintesis?",
  "history": [
    { "role": "user", "text": "Hello" },
    { "role": "model", "text": "Hi! I'm Ace." }
  ]
}
```
**Response:** `{ "reply": "Fotosintesis ialah..." }`
- Model: `gemini-2.5-flash-lite`, temperature 0.7
- Responds in BM or English matching the user's input language

### `quiz-performance-analyzer`
AI feedback after a quiz attempt.

**Request:**
```json
{
  "current": {
    "score": 72,
    "correct_count": 18,
    "wrong_count": 5,
    "skipped_count": 2,
    "questions_data": [{ "text": "...", "is_correct": true, "was_skipped": false }]
  },
  "history": [ /* prior quiz_results rows for same deck */ ]
}
```
**Response:**
```json
{
  "overall_trend": "improving",
  "performance_summary": "Prestasi anda meningkat...",
  "weak_areas": ["Bab 3 Nasionalisme"],
  "strong_areas": ["Bab 1 Tamadun Awal"],
  "improvement_tips": ["Ulang kaji...", "Cuba latihan...", "Fokus pada..."],
  "comparison_note": "Lebih baik 12% berbanding percubaan lepas"
}
```
All output in Bahasa Malaysia. Temperature 0.4.

### `subjective-quiz-grader`
Grades free-text answers for `quiz_type = 'subjective'` decks.

**Request:**
```json
{
  "questions": [{
    "question": "Terangkan sebab kejatuhan empayar Melaka.",
    "modelAnswer": "Serangan Portugis pada 1511...",
    "studentAnswer": "Portugis menyerang...",
    "maxMarks": 4
  }]
}
```
**Response:** `[{ "marksEarned": 3, "isCorrect": true, "feedback": "Jawapan baik..." }]`
- `isCorrect` = true if `marksEarned / maxMarks >= 0.70`
- Temperature 0.1 (near-deterministic)

### `pdf-quiz-generator`
Generates quiz questions from a PDF file.

**Request:** `multipart/form-data` — `file` field (PDF) + optional `questionCount` (max 40).

**Response:** `{ "questions": [{ "text": "...", "answers": [{ "text": "...", "is_correct": true }] }] }`

### `text-quiz-parser`
Parses unstructured text into quiz questions.

**Request:** `{ "text": "1. What is...\na) ...\nb) ...\nAnswer: a" }`

**Response:** Same shape as `pdf-quiz-generator`.

### `event-matcher`
Matches users to relevant events based on profile/location.

**Request:** `{ "user_id": "..." }`

**Response:** Array of matched event IDs.

---

## 5. Design System

> **Critical:** The Flutter app must match the web app's visual identity exactly.

### Brand Colors
```dart
class AceColors {
  // Primary palette
  static const cyan   = Color(0xFF3BD6F5);
  static const blue   = Color(0xFF2F7CFF);
  static const indigo = Color(0xFF2E2BE5);
  static const ink    = Color(0xFF0F172A); // borders, shadows, primary text

  // Accents
  static const pop    = Color(0xFFFF7A59); // orange-red, streaks, CTA
  static const sun    = Color(0xFFFFD65C); // yellow/gold, coins

  // Soft fills (card tints, pills)
  static const skySoft    = Color(0xFFDDF3FF);
  static const blueSoft   = Color(0xFFC8DEFF);
  static const indigoSoft = Color(0xFFD6D4FF);
  static const mintSoft   = Color(0xFFD1FAE5);
  static const lavender   = Color(0xFFEDE9FE);
  static const peach      = Color(0xFFFFE4D6);
  static const lemon      = Color(0xFFFEF9C3);
  static const rose       = Color(0xFFFFE4E6);
  static const cloud      = Color(0xFFF3FAFF); // page background
}
```

### Typography
- **Display / headings / buttons:** `Baloo 2` (weights 500–800)
- **Body / UI text:** `Nunito` (weights 400–900)

```yaml
# pubspec.yaml
dependencies:
  google_fonts: ^6.x
```
```dart
GoogleFonts.baloo2(fontWeight: FontWeight.w800)
GoogleFonts.nunito(fontWeight: FontWeight.w600)
```

### Design Language — "Neo-Brutalism"

Every card and interactive element uses a thick solid border + hard (no-blur) drop shadow.

**Card:**
```dart
BoxDecoration(
  color: Colors.white,
  borderRadius: BorderRadius.circular(20),
  border: Border.all(color: AceColors.ink, width: 2.5),
  boxShadow: const [
    BoxShadow(color: AceColors.ink, offset: Offset(3, 3), blurRadius: 0),
  ],
)
```

**Pill button (idle → pressed):**
```dart
// Idle: shadow Offset(3,3), translate Y(-1)
// Pressed: shadow Offset(1,1), translate Y(+1)
BoxDecoration(
  color: AceColors.blue,
  borderRadius: BorderRadius.circular(100),
  border: Border.all(color: AceColors.ink, width: 2.5),
  boxShadow: [
    BoxShadow(
      color: AceColors.ink,
      offset: _pressed ? const Offset(1, 1) : const Offset(3, 3),
      blurRadius: 0,
    ),
  ],
)
```

**Badge / pill tag:**
```dart
BoxDecoration(
  color: bgColor,
  borderRadius: BorderRadius.circular(100),
  border: Border.all(color: AceColors.ink, width: 2),
  boxShadow: const [
    BoxShadow(color: AceColors.ink, offset: Offset(1, 1), blurRadius: 0),
  ],
)
```

### Education Level Color Coding
```dart
// primary   → green   (bg: 0xFFF0FDF4, text: 0xFF16a34a)
// secondary → blue    (bg: 0xFFDDF3FF, text: 0xFF2F7CFF)
// preuni    → indigo  (bg: 0xFFD6D4FF, text: 0xFF2E2BE5)
// diploma   → amber   (bg: 0xFFFEF3C7, text: 0xFFd97706)
// degree    → sky     (bg: 0xFFE0F2FE, text: 0xFF0369a1)
// postgrad  → purple  (bg: 0xFFEDE9FE, text: 0xFF6D28D9)
```

### School Type Badge Colors
```dart
// 'SMK'             → (bg: 0xFFDDF3FF, text: 0xFF2F7CFF)
// 'SBP'             → (bg: 0xFFD6D4FF, text: 0xFF2E2BE5)
// 'MRSM'            → (bg: 0xFFFEF3C7, text: 0xFF92400e)
// 'Universiti Awam' → (bg: 0xFFDBEAFE, text: 0xFF1D4ED8)
// 'Universiti Swasta'→(bg: 0xFFEDE9FE, text: 0xFF6D28D9)
// 'Kolej Matrikulasi'→(bg: 0xFFD6D4FF, text: 0xFF2E2BE5)
// 'Sekolah Swasta'   →(bg: 0xFFFFE4E6, text: 0xFFFF7A59)
```

### Mascot
- "Ace" is a star-shaped animated character
- Lottie animations: use `lottie` Flutter package
- Moods: `idle`, `happy`, `urgent`, `celebrating`
- Message queue — auto-dismisses after 6 seconds
- Full chat mode → bottom sheet calling `mascot-chat` edge function

---

## 6. Feature Map

### Screens → Routes
| Screen | Route | Auth Required |
|---|---|---|
| Landing | `/` | No (redirect to /feed if logged in) |
| Sign In / Sign Up | `/auth` | No |
| Onboarding | `/onboarding` | Yes (new users only) |
| Feed | `/feed` | Yes |
| Post Detail | `/post/:id` | Yes |
| Quiz | `/quiz` | Yes |
| Quiz Take | `/quiz/:deckId` | Yes |
| Boss Raid | `/quiz/raid` | Yes |
| Materials | `/materials` | Yes |
| Chat List | `/chat` | Yes |
| Chat Thread | `/chat/:userId` | Yes |
| Profile (own) | `/profile` | Yes |
| Profile (other) | `/profile/:userId` | Yes |
| Discover | `/discover` | Yes |
| Notifications | `/notifications` | Yes |
| Events | `/events` | Yes |
| Event Detail | `/events/:id` | Yes |
| My Events | `/events/mine` | Yes |
| Admin | `/admin` | Yes + `is_admin` |

### Key Features Per Screen

**Quiz System:**
- Flow: Categories → Decks → Active quiz → Submit → AI Analysis
- `objective`: multiple choice (up to 6 options A–F), auto-graded client-side
- `subjective`: free text, graded by `subjective-quiz-grader` edge function
- Questions shuffled client-side before display
- Support for image questions + image answers
- After submit: insert `quiz_results`, call `quiz-performance-analyzer`, cache in `quiz_performance_results`
- Boss Raid mode: gamified quiz with health/damage mechanics, rewards `ace_coins`

**Gamification:**
- `ace_coins` — currency (1000 on signup), tracked in `profiles.ace_coins` + `coin_transactions`
- Daily streaks — tracked in `streaks`, reset after 3 days of inactivity
- Confetti animation on quiz completion (`confetti` package)
- Mascot messages triggered by: quiz done, streak milestone, goal set, goal reminder

**Social Feed:**
- Shows posts from followed users only
- Multi-image carousel (`post_images`)
- Like, comment, follow/unfollow
- Post creation with image attachment

**Profile:**
- Avatar (circle-cropped) + cover photo (banner)
- Stats: posts, followers, following, streak
- Education timeline (LinkedIn-style, sorted primary → secondary → pre-u → diploma → degree → postgrad)
- Quiz history, own posts grid
- Follow / unfollow button (non-self)

**Chat:**
- Visible only between mutual followers
- Real-time via Supabase realtime subscription
- Unread count badges per sender

**Materials:**
- Upload PDF / images to `user-uploads` bucket
- Like and comment on materials
- Download counter

**Events:**
- Browse approved events (`status = 'approved'`)
- RSVP / register (`event_registrations`)
- My events list
- Organiser dashboard (create/manage events, pending admin approval)

**Goals:**
- Daily goal cards with priority (low/medium/high)
- Optional deadline + reminder notification
- Completion toggle

**Pomodoro:**
- Floating persistent widget (25 min work / 5 min break)
- State persisted via `shared_preferences`
- Visible on top of all screens via Flutter `Overlay`

---

## 7. Business Logic

### Quiz Grading (Objective)
```dart
// Client-side
final correct = selectedAnswerIds.where((id) => correctAnswerIds.contains(id)).length;
final score = (correct / total * 100).roundToDouble();
// Insert into quiz_results, then call quiz-performance-analyzer
```

### Education Level Derivation
```dart
String deriveLevelFromGrade(String grade) {
  if (grade.startsWith('Standard')) return 'primary';
  if (RegExp(r'^Form [1-5]$').hasMatch(grade)) return 'secondary';
  if (['Form 6 (Lower)', 'Form 6 (Upper)', 'Foundation', 'Matrikulasi'].contains(grade)) return 'preuni';
  if (grade.startsWith('Diploma')) return 'diploma';
  if (grade.startsWith('Degree')) return 'degree';
  if (["Master's", 'PhD'].contains(grade)) return 'postgrad';
  return '';
}
```

### Grade Options Per Level
```dart
const gradeOptions = {
  'primary':   ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6'],
  'secondary': ['Form 1','Form 2','Form 3','Form 4','Form 5'],
  'preuni':    ['Form 6 (Lower)','Form 6 (Upper)','Foundation','Matrikulasi'],
  'diploma':   ['Diploma Year 1','Diploma Year 2','Diploma Year 3'],
  'degree':    ['Degree Year 1','Degree Year 2','Degree Year 3','Degree Year 4','Degree Year 5'],
  'postgrad':  ["Master's", 'PhD'],
};
```

### School DB Level Filter
```dart
String? schoolDBLevel(String grade) {
  if (grade.startsWith('Standard')) return 'primary';
  if (grade.startsWith('Form') || ['Foundation', 'Matrikulasi'].contains(grade)) return 'secondary';
  return 'tertiary';
}
```

### is_current Constraint
When saving an education entry with `is_current = true`, first clear all others:
```dart
await supabase
  .from('student_schools')
  .update({'is_current': false})
  .eq('user_id', userId);
// Then insert/update the current entry with is_current = true
```

---

## 8. Real-Time Subscriptions

```dart
// Chat messages
supabase
  .from('chat_messages')
  .stream(primaryKey: ['id'])
  .eq('receiver_id', userId)
  .listen((rows) { /* update UI */ });

// Notifications
supabase
  .from('notifications')
  .stream(primaryKey: ['id'])
  .eq('user_id', userId)
  .listen((rows) { /* update badge count */ });
```

Real-time used in: Chat, Notifications, (optional) Feed, Boss Raid.

---

## 9. Recommended Flutter Packages

```yaml
dependencies:
  supabase_flutter: ^2.x
  flutter_riverpod: ^2.x          # State management
  riverpod_annotation: ^2.x
  go_router: ^14.x                 # Navigation
  google_fonts: ^6.x               # Baloo 2 + Nunito
  cached_network_image: ^3.x       # All remote images
  image_picker: ^1.x               # Avatar upload, post images
  image_cropper: ^7.x              # Circle crop for avatar
  file_picker: ^8.x                # PDF upload for quiz generator
  lottie: ^3.x                     # Mascot animations
  confetti: ^0.7.x                 # Quiz completion celebration
  fl_chart: ^0.x                   # Performance charts
  shared_preferences: ^2.x         # Pomodoro timer, local settings
  intl: ^0.19.x                    # Date formatting
  timeago: ^3.x                    # "2 minutes ago" timestamps
  flutter_svg: ^2.x                # SVG assets

dev_dependencies:
  build_runner: ^2.x
  riverpod_generator: ^2.x
  custom_lint: ^0.x
  riverpod_lint: ^2.x
```

---

## 10. Project Structure

```
lib/
├── main.dart                     # Supabase init, ProviderScope, app entry
├── core/
│   ├── supabase/
│   │   └── supabase_client.dart  # Singleton accessor
│   ├── router/
│   │   └── app_router.dart       # go_router config with auth guard
│   ├── theme/
│   │   ├── ace_colors.dart       # All brand colors (Section 5)
│   │   ├── ace_text_styles.dart  # Baloo2 + Nunito styles
│   │   └── ace_theme.dart        # ThemeData
│   └── widgets/
│       ├── ace_card.dart         # Neo-brutalist card decoration
│       ├── ace_button.dart       # Pill button with hard shadow
│       └── ace_badge.dart        # Type/level badge pill
├── features/
│   ├── auth/
│   │   ├── auth_page.dart
│   │   └── auth_provider.dart
│   ├── onboarding/
│   │   └── onboarding_page.dart  # 3-step wizard
│   ├── feed/
│   │   ├── feed_page.dart
│   │   ├── post_card.dart
│   │   └── feed_provider.dart
│   ├── quiz/
│   │   ├── quiz_page.dart        # Category → Deck → Questions → Analysis
│   │   ├── quiz_provider.dart
│   │   ├── quiz_analysis_card.dart
│   │   └── boss_raid_page.dart
│   ├── profile/
│   │   ├── profile_page.dart
│   │   ├── education_section.dart # LinkedIn-style timeline
│   │   └── profile_provider.dart
│   ├── chat/
│   │   ├── chat_list_page.dart
│   │   ├── chat_thread_page.dart
│   │   └── chat_provider.dart    # Realtime stream
│   ├── discover/
│   │   └── discover_page.dart
│   ├── materials/
│   │   └── materials_page.dart
│   ├── events/
│   │   ├── events_page.dart
│   │   ├── event_detail_page.dart
│   │   ├── my_events_page.dart
│   │   └── events_provider.dart
│   ├── notifications/
│   │   ├── notifications_page.dart
│   │   └── notifications_provider.dart
│   ├── admin/
│   │   └── admin_page.dart
│   ├── mascot/
│   │   ├── mascot_widget.dart     # Floating Lottie overlay
│   │   ├── mascot_chat_sheet.dart # Bottom sheet chat UI
│   │   └── mascot_provider.dart  # Message queue + mood
│   └── pomodoro/
│       ├── pomodoro_widget.dart   # Floating mini timer
│       └── pomodoro_provider.dart # shared_preferences persistence
└── models/
    ├── profile.dart
    ├── deck.dart
    ├── question.dart
    ├── quiz_result.dart
    ├── post.dart
    ├── chat_message.dart
    ├── event.dart
    └── student_school.dart
```

---

## 11. Core Shared Widgets

### AceCard
```dart
Container(
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(20),
    border: Border.all(color: const Color(0xFF0F172A), width: 2.5),
    boxShadow: const [BoxShadow(
      color: Color(0xFF0F172A), offset: Offset(3, 3), blurRadius: 0,
    )],
  ),
  child: child,
)
```

### AcePillButton
```dart
GestureDetector(
  onTapDown: (_) => setState(() => _pressed = true),
  onTapUp:   (_) => setState(() => _pressed = false),
  onTapCancel: () => setState(() => _pressed = false),
  child: AnimatedContainer(
    duration: const Duration(milliseconds: 100),
    transform: Matrix4.translationValues(0, _pressed ? 1 : -1, 0),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(100),
      border: Border.all(color: const Color(0xFF0F172A), width: 2.5),
      boxShadow: [BoxShadow(
        color: const Color(0xFF0F172A),
        offset: _pressed ? const Offset(1, 1) : const Offset(3, 3),
        blurRadius: 0,
      )],
    ),
    child: child,
  ),
)
```

### AceBadge
```dart
Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
  decoration: BoxDecoration(
    color: bgColor,
    borderRadius: BorderRadius.circular(100),
    border: Border.all(color: const Color(0xFF0F172A), width: 2),
    boxShadow: const [BoxShadow(
      color: Color(0xFF0F172A), offset: Offset(1, 1), blurRadius: 0,
    )],
  ),
  child: Text(label, style: GoogleFonts.baloo2(
    fontWeight: FontWeight.w800, fontSize: 11, color: textColor,
  )),
)
```

---

## 12. Priority Build Order

1. Auth (sign in, sign up, session persistence)
2. Onboarding (username → avatar → school)
3. Profile (view, edit, education timeline)
4. Feed (browse, post, like, comment)
5. Quiz (categories → decks → take → results → AI analysis)
6. Chat (list, thread, real-time)
7. Materials (browse, upload, download)
8. Notifications (list, mark read, real-time badge)
9. Events (browse, register, my events)
10. Discover (search users, follow)
11. Goals
12. Pomodoro floating widget
13. Mascot overlay + chat
14. Boss Raid arena
15. Admin panel

---

## 13. Important Rules for Claude

- **Never change the Supabase URL or anon key** — they point to live production
- **Never deviate from the color palette** — use `AceColors` exactly as defined
- **Never use Material default styling** — all cards, buttons, and inputs must use the neo-brutalist style (2.5px solid ink border + hard offset shadow, no blur)
- **Font must be Baloo 2 for headings/buttons and Nunito for body text**
- All AI features call Supabase Edge Functions — never call Gemini API directly from the Flutter app
- RLS is enforced at the database level — the app does not need to manually filter by `user_id` on reads, but must include `user_id` on all writes
- `is_admin` must be read from `profiles.is_admin` — never hardcode or trust client-side flags for sensitive operations
- Always use `.ilike()` for searching the `schools` table — never fetch all rows
- When multiple education entries exist, show them sorted: primary → secondary → preuni → diploma → degree → postgrad
