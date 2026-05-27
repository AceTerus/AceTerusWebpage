-- ClassPulse pitch demo seed
-- Paste into Supabase Dashboard → SQL Editor and run.
-- Safe to re-run: deletes existing demo rows first.

DO $$
DECLARE
  tid uuid;
  s1  uuid;
  s2  uuid;
  s3  uuid;
BEGIN
  SELECT id INTO tid FROM auth.users WHERE email = 'dhirendhiren97@gmail.com';

  IF tid IS NULL THEN
    RAISE EXCEPTION 'User not found — make sure you have signed up with dhirendhiren97@gmail.com';
  END IF;

  -- Ensure teacher role exists
  INSERT INTO classpulse_users (user_id, role, school_name)
  VALUES (tid, 'teacher', 'SMK Sains Selangor')
  ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';

  -- Clean up previous demo rows (idempotent)
  DELETE FROM class_sessions
  WHERE teacher_id = tid
    AND class_name IN ('4 Amanah', '3 Bestari', '5 Cemerlang', '4 Wawasan');

  -- ─── Session 1: English · 4 Amanah ──────────────────────────────────────
  -- coverage=89%, TES=84%
  -- Pacing: |61-63|*2.5=5 → 95; Engagement: 19*4=76 (cap); Clarity: big transcript; Consistency: 55min
  INSERT INTO class_sessions
    (teacher_id, class_name, subject, objective_text, key_concepts, status, started_at, ended_at, created_at)
  VALUES (
    tid, '4 Amanah', 'English',
    'Students identify and use context clues to infer the meaning of unfamiliar words',
    ARRAY['Context Clues', 'Inference', 'Vocabulary', 'Word Meaning', 'Reading Strategy'],
    'completed',
    now() - interval '2 days 55 minutes',
    now() - interval '2 days',
    now() - interval '2 days 1 hour'
  )
  RETURNING id INTO s1;

  INSERT INTO conclusion_reports
    (session_id, coverage_score, teacher_talk_ratio, student_participation_count,
     concepts_covered, concepts_missed, ai_coaching_note,
     teaching_effectiveness_score, criteria_scores)
  VALUES (
    s1, 89, 61, 19,
    ARRAY['Context Clues', 'Inference', 'Vocabulary', 'Word Meaning'],
    ARRAY['Reading Strategy'],
    'Strong engagement throughout — students responded well to vocabulary exercises. Introduce a full reading passage next session to apply Reading Strategy in context.',
    84,
    '{"content_coverage":{"score":89,"weight":30},"lesson_pacing":{"score":95,"weight":20},"student_engagement":{"score":76,"weight":20},"concept_clarity":{"score":82,"weight":15},"delivery_consistency":{"score":69,"weight":15}}'::jsonb
  );

  -- ─── Session 2: Sains · 3 Bestari ───────────────────────────────────────
  -- coverage=68%, TES=61%
  -- Pacing: |72-63|*2.5=22.5 → 77; Engagement: 11*4=44; Clarity: moderate; Consistency: 52min
  INSERT INTO class_sessions
    (teacher_id, class_name, subject, objective_text, key_concepts, status, started_at, ended_at, created_at)
  VALUES (
    tid, '3 Bestari', 'Sains',
    'Students understand photosynthesis and the role of chlorophyll in glucose production',
    ARRAY['Photosynthesis', 'Chlorophyll', 'Glucose', 'Cellular Respiration', 'ATP', 'Light Reactions'],
    'completed',
    now() - interval '4 days 52 minutes',
    now() - interval '4 days',
    now() - interval '4 days 1 hour'
  )
  RETURNING id INTO s2;

  INSERT INTO conclusion_reports
    (session_id, coverage_score, teacher_talk_ratio, student_participation_count,
     concepts_covered, concepts_missed, ai_coaching_note,
     teaching_effectiveness_score, criteria_scores)
  VALUES (
    s2, 68, 72, 11,
    ARRAY['Photosynthesis', 'Chlorophyll', 'Glucose'],
    ARRAY['Cellular Respiration', 'ATP', 'Light Reactions'],
    'Photosynthesis covered well, but ATP and Light Reactions were rushed. Allocate 10 extra minutes to cellular respiration in the follow-up session.',
    61,
    '{"content_coverage":{"score":68,"weight":30},"lesson_pacing":{"score":77,"weight":20},"student_engagement":{"score":44,"weight":20},"concept_clarity":{"score":55,"weight":15},"delivery_consistency":{"score":65,"weight":15}}'::jsonb
  );

  -- ─── Session 3: Matematik · 5 Cemerlang ─────────────────────────────────
  -- coverage=44%, TES=40%
  -- Pacing: |79-63|*2.5=40 → 60; Engagement: 6*4=24; Clarity: low; Consistency: 48min but low talk
  INSERT INTO class_sessions
    (teacher_id, class_name, subject, objective_text, key_concepts, status, started_at, ended_at, created_at)
  VALUES (
    tid, '5 Cemerlang', 'Matematik',
    'Students solve quadratic equations using factoring, completing the square, and the quadratic formula',
    ARRAY['Quadratic Formula', 'Factoring', 'Roots', 'Completing the Square', 'Discriminant', 'Vertex Form'],
    'completed',
    now() - interval '5 days 48 minutes',
    now() - interval '5 days',
    now() - interval '5 days 1 hour'
  )
  RETURNING id INTO s3;

  INSERT INTO conclusion_reports
    (session_id, coverage_score, teacher_talk_ratio, student_participation_count,
     concepts_covered, concepts_missed, ai_coaching_note,
     teaching_effectiveness_score, criteria_scores)
  VALUES (
    s3, 44, 79, 6,
    ARRAY['Quadratic Formula', 'Roots'],
    ARRAY['Factoring', 'Completing the Square', 'Discriminant', 'Vertex Form'],
    'Coverage below target — most time spent on the quadratic formula only. Revisit factoring and completing the square before moving on to discriminant.',
    40,
    '{"content_coverage":{"score":44,"weight":30},"lesson_pacing":{"score":60,"weight":20},"student_engagement":{"score":24,"weight":20},"concept_clarity":{"score":28,"weight":15},"delivery_consistency":{"score":40,"weight":15}}'::jsonb
  );

  -- ─── Session 4: Biologi · 4 Wawasan · Pending (Go Live CTA) ────────────
  INSERT INTO class_sessions
    (teacher_id, class_name, subject, objective_text, key_concepts, status, created_at)
  VALUES (
    tid, '4 Wawasan', 'Biologi',
    'Students explain the stages of mitosis and how DNA is passed to daughter cells',
    ARRAY['Mitosis', 'Meiosis', 'Cell Cycle', 'Chromosomes', 'DNA Replication'],
    'pending',
    now() - interval '20 minutes'
  );

  RAISE NOTICE 'Demo data seeded successfully for %', tid;
END $$;
