-- ClassPulse: classroom session monitoring platform

-- User roles for ClassPulse
CREATE TABLE IF NOT EXISTS classpulse_users (
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role      text NOT NULL CHECK (role IN ('teacher', 'school_authority')),
  school_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE classpulse_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classpulse_users_self_all" ON classpulse_users
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "classpulse_users_read_authenticated" ON classpulse_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Class sessions created by teachers
CREATE TABLE IF NOT EXISTS class_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_name     text NOT NULL,
  subject        text NOT NULL,
  objective_text text NOT NULL,
  key_concepts   text[] DEFAULT '{}' NOT NULL,
  started_at     timestamptz,
  ended_at       timestamptz,
  transcript_text text,
  status         text DEFAULT 'pending' NOT NULL
                   CHECK (status IN ('pending', 'active', 'completed')),
  created_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_sessions_teacher_all" ON class_sessions
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "class_sessions_read_completed" ON class_sessions
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'completed');

-- AI-generated teacher conclusion reports (private to teacher)
CREATE TABLE IF NOT EXISTS conclusion_reports (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                 uuid REFERENCES class_sessions(id) ON DELETE CASCADE NOT NULL,
  coverage_score             float,
  teacher_talk_ratio         float,
  student_participation_count int DEFAULT 0,
  concepts_covered           text[] DEFAULT '{}' NOT NULL,
  concepts_missed            text[] DEFAULT '{}' NOT NULL,
  ai_coaching_note           text,
  created_at                 timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE conclusion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conclusion_reports_teacher_read" ON conclusion_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = conclusion_reports.session_id
        AND cs.teacher_id = auth.uid()
    )
  );

CREATE POLICY "conclusion_reports_authenticated_insert" ON conclusion_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = conclusion_reports.session_id
        AND cs.teacher_id = auth.uid()
    )
  );

-- AI-generated student-facing lesson summaries and gap notes
CREATE TABLE IF NOT EXISTS student_session_summaries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES class_sessions(id) ON DELETE CASCADE NOT NULL,
  class_name    text NOT NULL,
  subject       text NOT NULL,
  date          date NOT NULL,
  covered_notes text,
  key_terms     jsonb DEFAULT '[]' NOT NULL,
  gap_notes     jsonb DEFAULT '[]' NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE student_session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_summaries_read_authenticated" ON student_session_summaries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "student_summaries_authenticated_insert" ON student_session_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = student_session_summaries.session_id
        AND cs.teacher_id = auth.uid()
    )
  );

-- Concepts flagged and pushed to students
CREATE TABLE IF NOT EXISTS flagged_concepts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid REFERENCES class_sessions(id) ON DELETE CASCADE NOT NULL,
  class_name            text NOT NULL,
  concept_name          text NOT NULL,
  pushed_to_students_at timestamptz,
  resolved              boolean DEFAULT false NOT NULL,
  created_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE flagged_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flagged_concepts_read_authenticated" ON flagged_concepts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "flagged_concepts_teacher_insert" ON flagged_concepts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = flagged_concepts.session_id
        AND cs.teacher_id = auth.uid()
    )
  );

CREATE POLICY "flagged_concepts_teacher_update" ON flagged_concepts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = flagged_concepts.session_id
        AND cs.teacher_id = auth.uid()
    )
  );
