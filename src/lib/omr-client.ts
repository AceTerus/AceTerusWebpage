import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// OMR exam data layer (Supabase). Exams are admin-authored answer keys; users
// scan against a chosen exam and each attempt is saved for admin review.
// The omr_exams / omr_scan_results tables aren't in the generated Supabase types,
// so we use the `(supabase as any)` escape hatch (same pattern as Quiz.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export interface OmrMarking {
  correct: string;
  incorrect: string;
  unmarked: string;
}

export interface OmrExam {
  id: string;
  title: string;
  question_count: number;
  answers: string[];
  marking: OmrMarking;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OmrPerQuestion {
  question: string;
  marked: string;
  answer: string;
  verdict: string;
  delta: string;
}

export interface OmrScanRow {
  id: string;
  exam_id: string;
  user_id: string;
  score: number | null;
  max_score: number | null;
  correct_count: number | null;
  total_count: number | null;
  responses: Record<string, string> | null;
  per_question: OmrPerQuestion[] | null;
  created_at: string;
  username?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Exams ───────────────────────────────────────────────────────────────────

export const fetchOmrExams = async (publishedOnly = false): Promise<OmrExam[]> => {
  let query = db.from("omr_exams").select("*").order("created_at", { ascending: false });
  if (publishedOnly) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OmrExam[];
};

export const createOmrExam = async (exam: {
  title: string;
  question_count: number;
  answers: string[];
  marking: OmrMarking;
  is_published?: boolean;
}): Promise<OmrExam> => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await db
    .from("omr_exams")
    .insert([{ is_published: true, ...exam, created_by: user?.id }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OmrExam;
};

export const updateOmrExam = async (
  id: string,
  patch: Partial<Pick<OmrExam, "title" | "question_count" | "answers" | "marking" | "is_published">>,
): Promise<OmrExam> => {
  const { data, error } = await db.from("omr_exams").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as OmrExam;
};

export const toggleOmrExamPublished = async (id: string, isPublished: boolean): Promise<void> => {
  const { error } = await db.from("omr_exams").update({ is_published: isPublished }).eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteOmrExam = async (id: string): Promise<void> => {
  const { error } = await db.from("omr_exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

// ── Scan results ──────────────────────────────────────────────────────────────

export const saveOmrScanResult = async (row: {
  exam_id: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_count: number;
  responses: Record<string, string>;
  per_question: OmrPerQuestion[];
}): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await db.from("omr_scan_results").insert([{ ...row, user_id: user.id }]);
  if (error) throw new Error(error.message);
};

/** Admin-only: scan attempts for one exam, with the scanner's username merged in. */
export const fetchOmrScanResults = async (examId: string): Promise<OmrScanRow[]> => {
  const { data, error } = await db
    .from("omr_scan_results")
    .select("*")
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as OmrScanRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length) {
    const { data: profs } = await db
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);
    const nameMap: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (profs ?? []) as any[]) nameMap[p.user_id] = p.username;
    rows.forEach((r) => { r.username = nameMap[r.user_id] ?? null; });
  }
  return rows;
};
