-- Add Teaching Effectiveness Score columns to conclusion_reports
-- teaching_effectiveness_score: composite 0-100 score from 5 criteria
-- criteria_scores: jsonb breakdown { criterion_key: { score, weight } }

ALTER TABLE conclusion_reports
  ADD COLUMN IF NOT EXISTS teaching_effectiveness_score float,
  ADD COLUMN IF NOT EXISTS criteria_scores jsonb DEFAULT '{}'::jsonb;
