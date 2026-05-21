import { useState } from "react";
import { GraduationCap, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const C = { indigo: "#2E2BE5", blue: "#2F7CFF", ink: "#0F172A" };

interface RoleSetupProps {
  onComplete: () => void;
}

export default function RoleSetup({ onComplete }: RoleSetupProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<"teacher" | "school_authority" | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selected || !user) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.from("classpulse_users").upsert({
      user_id: user.id,
      role: selected,
      school_name: schoolName || null,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onComplete();
  };

  const roles = [
    {
      key: "teacher" as const,
      label: "Teacher",
      emoji: "👩‍🏫",
      description: "Run live sessions, get AI coaching reports, track student engagement.",
      color: C.blue,
      bg: "#DDF3FF",
    },
    {
      key: "school_authority" as const,
      label: "School Authority",
      emoji: "🏫",
      description: "View aggregated class performance, subject trends, and flagged sessions.",
      color: C.indigo,
      bg: "#D6D4FF",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F8F9FF]">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className={`${DISPLAY} font-extrabold text-3xl text-[${C.ink}]`}>Welcome to ClassPulse</h1>
          <p className="font-['Nunito'] text-[#0F172A]/50 text-[14px]">
            Tell us your role to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelected(r.key)}
              className={`text-left p-5 rounded-[20px] border-[2.5px] transition-all cursor-pointer ${
                selected === r.key
                  ? "border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] -translate-y-0.5"
                  : "border-[#0F172A]/20 hover:border-[#0F172A]/50 shadow-[2px_2px_0_0_#0F172A10]"
              }`}
              style={{ background: selected === r.key ? r.bg : "white" }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl mt-0.5">{r.emoji}</span>
                <div>
                  <p className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A] mb-1`}>{r.label}</p>
                  <p className="font-['Nunito'] text-[13px] text-[#0F172A]/60">{r.description}</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-[2.5px] flex-shrink-0 mt-1 transition-all ${
                  selected === r.key
                    ? "border-transparent"
                    : "border-[#0F172A]/30"
                }`} style={selected === r.key ? { background: r.color } : {}}>
                  {selected === r.key && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70">
            School Name <span className="font-normal text-[#0F172A]/40">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. SMK Dato' Harun"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-4 py-3 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2E2BE5] transition-all"
          />
        </div>

        {error && (
          <p className="font-['Nunito'] text-[13px] text-red-500 font-semibold">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[15px] shadow-[4px_4px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[4px_4px_0_0_#0F172A]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Started →"}
        </button>
      </div>
    </div>
  );
}
