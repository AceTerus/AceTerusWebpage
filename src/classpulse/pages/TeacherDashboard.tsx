import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, CheckCircle2, PlayCircle, BookOpen, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const C = { cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A" };
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";
const INPUT = "w-full px-4 py-3 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2E2BE5] transition-all bg-white";

const SUBJECTS = [
  "Matematik", "Sains", "Bahasa Melayu", "English", "Sejarah",
  "Geografi", "Pendidikan Islam", "Pendidikan Moral", "Fizik",
  "Kimia", "Biologi", "Ekonomi", "Perniagaan", "Pendidikan Jasmani",
  "Seni Visual", "Muzik", "Teknologi Maklumat",
];

const PERIODS = ["Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6", "Period 7", "Period 8"];

interface ClassSession {
  id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  status: "pending" | "active" | "completed";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface NewSessionForm {
  subject: string;
  class_name: string;
  objective_text: string;
  key_concepts_input: string;
  date: string;
  period: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<NewSessionForm>({
    subject: "",
    class_name: "",
    objective_text: "",
    key_concepts_input: "",
    date: new Date().toISOString().split("T")[0],
    period: "Period 1",
  });

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setSessions((data as ClassSession[]) || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.subject || !form.class_name || !form.objective_text) {
      setFormError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setFormError("");

    const concepts = form.key_concepts_input
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from("class_sessions")
      .insert({
        teacher_id: user.id,
        class_name: form.class_name,
        subject: form.subject,
        objective_text: form.objective_text,
        key_concepts: concepts,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setSessions((prev) => [data as ClassSession, ...prev]);
    setShowForm(false);
    setForm({
      subject: "", class_name: "", objective_text: "",
      key_concepts_input: "", date: new Date().toISOString().split("T")[0], period: "Period 1",
    });
    setSaving(false);
    navigate(`/session/${data.id}`);
  };

  const statusBadge = (status: ClassSession["status"]) => {
    if (status === "pending") return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
    if (status === "active") return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">
        <PlayCircle className="w-3 h-3" /> Live
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.blue }}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-2xl text-[#0F172A]`}>My Sessions</h1>
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 font-semibold">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className={`${CARD} py-20 flex flex-col items-center gap-4 text-center`}>
            <div className="text-5xl">📋</div>
            <p className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>No sessions yet</p>
            <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50 max-w-xs">
              Create your first session to start monitoring your class.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  s.status === "completed"
                    ? navigate(`/report/${s.id}`)
                    : navigate(`/session/${s.id}`)
                }
                className={`${CARD} w-full text-left p-5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {statusBadge(s.status)}
                      <span className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/40 border border-[#0F172A]/15 rounded-full px-2 py-0.5">
                        {s.subject}
                      </span>
                      <span className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/40 border border-[#0F172A]/15 rounded-full px-2 py-0.5">
                        {s.class_name}
                      </span>
                    </div>
                    <p className={`${DISPLAY} font-extrabold text-[15px] text-[#0F172A] mb-1 truncate`}>
                      {s.objective_text}
                    </p>
                    {s.key_concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.key_concepts.slice(0, 4).map((c) => (
                          <span key={c} className="text-[10px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-[#DDF3FF] text-[#2F7CFF] border border-[#2F7CFF]/20">
                            {c}
                          </span>
                        ))}
                        {s.key_concepts.length > 4 && (
                          <span className="text-[10px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-[#0F172A]/5 text-[#0F172A]/50">
                            +{s.key_concepts.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold font-['Nunito'] text-[#0F172A]/40">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </p>
                    {s.ended_at && (
                      <p className="text-[11px] font-semibold font-['Nunito'] text-[#0F172A]/40 mt-0.5">
                        {format(new Date(s.ended_at), "d MMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className={`${CARD} w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-6 border-b-[2.5px] border-[#0F172A]">
              <h2 className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>New Session</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border-[2px] border-[#0F172A]/20 hover:border-[#0F172A] hover:bg-[#0F172A]/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Subject */}
              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={INPUT}
                  required
                >
                  <option value="">Select subject…</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Class name */}
              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 Bestari"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  className={INPUT}
                  required
                />
              </div>

              {/* Lesson objective */}
              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Lesson Objective <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="e.g. Students understand osmosis and concentration gradient"
                  value={form.objective_text}
                  onChange={(e) => setForm({ ...form, objective_text: e.target.value })}
                  className={`${INPUT} resize-none`}
                  rows={3}
                  required
                />
              </div>

              {/* Key concepts */}
              <div>
                <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">
                  Key Concepts to Track
                  <span className="font-normal text-[#0F172A]/40 ml-1">(comma-separated)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="osmosis, concentration gradient, semi-permeable membrane"
                    value={form.key_concepts_input}
                    onChange={(e) => setForm({ ...form, key_concepts_input: e.target.value })}
                    className={INPUT}
                  />
                  {form.objective_text && !form.key_concepts_input && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold font-['Nunito'] text-[#2E2BE5]/70">
                      <Sparkles className="w-3 h-3" /> Type concepts above or they will be auto-detected from your objective
                    </div>
                  )}
                </div>
                {form.key_concepts_input && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.key_concepts_input.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                      <span key={c} className="text-[10px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-[#DDF3FF] text-[#2F7CFF] border border-[#2F7CFF]/20">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Date + Period row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 mb-1.5">Period</label>
                  <select
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className={INPUT}
                  >
                    {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="font-['Nunito'] text-[13px] text-red-500 font-semibold">{formError}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[15px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Go to Session →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
