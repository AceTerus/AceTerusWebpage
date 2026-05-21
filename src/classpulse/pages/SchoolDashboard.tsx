import { useEffect, useState } from "react";
import { BarChart3, AlertTriangle, TrendingUp, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const C = { blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A" };
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white";

interface SessionSummary {
  id: string;
  class_name: string;
  subject: string;
  ended_at: string;
  coverage_score: number;
  teacher_talk_ratio: number;
  concepts_missed: string[];
}

interface SubjectRow {
  subject: string;
  avg_score: number;
  missed_map: Record<string, number>;
}

export default function SchoolDashboard() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    const { data: cs } = await supabase
      .from("class_sessions")
      .select("id, class_name, subject, ended_at, status")
      .eq("status", "completed")
      .gte("ended_at", weekStart.toISOString())
      .order("ended_at", { ascending: false });

    if (!cs || cs.length === 0) {
      setLoading(false);
      return;
    }

    const sessionIds = cs.map((s: any) => s.id);
    const { data: reports } = await supabase
      .from("conclusion_reports")
      .select("session_id, coverage_score, teacher_talk_ratio, concepts_missed")
      .in("session_id", sessionIds);

    const reportMap = new Map((reports || []).map((r: any) => [r.session_id, r]));

    const merged = cs.map((s: any) => {
      const r = reportMap.get(s.id) as any;
      return {
        id: s.id,
        class_name: s.class_name,
        subject: s.subject,
        ended_at: s.ended_at,
        coverage_score: r?.coverage_score ?? 0,
        teacher_talk_ratio: r?.teacher_talk_ratio ?? 0,
        concepts_missed: r?.concepts_missed ?? [],
      };
    });

    setSessions(merged);
    setLoading(false);
  };

  const flagged = sessions.filter((s) => s.coverage_score < 60);

  const subjectMap = new Map<string, { scores: number[]; missed_map: Record<string, number>; student_ratios: number[] }>();
  sessions.forEach((s) => {
    if (!subjectMap.has(s.subject)) {
      subjectMap.set(s.subject, { scores: [], missed_map: {}, student_ratios: [] });
    }
    const entry = subjectMap.get(s.subject)!;
    entry.scores.push(s.coverage_score);
    entry.student_ratios.push(100 - s.teacher_talk_ratio);
    s.concepts_missed.forEach((c) => {
      entry.missed_map[c] = (entry.missed_map[c] || 0) + 1;
    });
  });

  const subjectRows: SubjectRow[] = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    missed_map: data.missed_map,
  }));

  const avgStudentRatio = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + (100 - s.teacher_talk_ratio), 0) / sessions.length)
    : 0;

  const scoreColor = (score: number) =>
    score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";

  const handleExport = () => {
    const lines = [
      "ClassPulse Weekly Report",
      `Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM yyyy")}`,
      "",
      "Class Sessions This Week",
      sessions.map((s) => `${s.class_name} | ${s.subject} | ${s.coverage_score}% coverage`).join("\n"),
      "",
      "Flagged Sessions (below 60%)",
      flagged.map((s) => `${s.class_name} | ${s.subject} | ${s.coverage_score}%`).join("\n") || "None",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classpulse-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.indigo }}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-2xl text-[#0F172A]`}>School Analytics</h1>
              <p className="font-['Nunito'] text-[13px] text-[#0F172A]/50 font-semibold">
                Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM yyyy")}
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[13px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className={`${CARD} py-20 flex flex-col items-center gap-3 text-center`}>
            <div className="text-5xl">📊</div>
            <p className={`${DISPLAY} font-extrabold text-xl text-[#0F172A]`}>No data this week</p>
            <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50">Session reports will appear here after teachers complete their classes.</p>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Sessions This Week", value: sessions.length, unit: "" },
                { label: "Avg Coverage Score", value: Math.round(sessions.reduce((a, s) => a + s.coverage_score, 0) / sessions.length), unit: "%" },
                { label: "Avg Student Talk", value: avgStudentRatio, unit: "%" },
                { label: "Flagged Sessions", value: flagged.length, unit: "", warn: flagged.length > 0 },
              ].map((kpi) => (
                <div key={kpi.label} className={`${CARD} p-4 text-center`} style={kpi.warn ? { borderColor: "#EF4444", boxShadow: "3px 3px 0 0 #EF4444" } : {}}>
                  <p className={`${DISPLAY} font-extrabold text-3xl text-[#0F172A]`}>
                    {kpi.value}{kpi.unit}
                  </p>
                  <p className="font-['Nunito'] text-[11px] font-bold text-[#0F172A]/50 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Class-by-class table */}
            <div className={`${CARD} overflow-hidden`}>
              <div className="p-5 border-b-[2.5px] border-[#0F172A]">
                <p className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>Class Coverage This Week</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-[2px] border-[#0F172A]/10">
                      {["Class", "Subject", "Coverage", "Student Talk", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 font-['Nunito'] text-[11px] font-bold text-[#0F172A]/50 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-[#0F172A]/5 hover:bg-[#0F172A]/2 transition-colors">
                        <td className="px-5 py-3 font-['Nunito'] text-[13px] font-bold text-[#0F172A]">{s.class_name}</td>
                        <td className="px-5 py-3 font-['Nunito'] text-[13px] text-[#0F172A]/70">{s.subject}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px] h-2 rounded-full bg-[#0F172A]/10 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${s.coverage_score}%`, background: scoreColor(s.coverage_score) }} />
                            </div>
                            <span className="font-['Nunito'] text-[12px] font-bold" style={{ color: scoreColor(s.coverage_score) }}>
                              {s.coverage_score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-['Nunito'] text-[12px] text-[#0F172A]/70">
                          ~{100 - s.teacher_talk_ratio}%
                        </td>
                        <td className="px-5 py-3 font-['Nunito'] text-[12px] text-[#0F172A]/50">
                          {format(new Date(s.ended_at), "d MMM")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject heatmap */}
            <div className={`${CARD} p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#0F172A]/40" />
                <p className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>Subject Heatmap</p>
              </div>
              <div className="space-y-4">
                {subjectRows.map((row) => {
                  const topMissed = Object.entries(row.missed_map)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                  return (
                    <div key={row.subject} className="flex items-center gap-4 flex-wrap">
                      <div className="w-32 shrink-0">
                        <p className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]">{row.subject}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-2 rounded-full bg-[#0F172A]/10 overflow-hidden max-w-[80px]">
                            <div className="h-full rounded-full" style={{ width: `${row.avg_score}%`, background: scoreColor(row.avg_score) }} />
                          </div>
                          <span className="font-['Nunito'] text-[11px] font-bold" style={{ color: scoreColor(row.avg_score) }}>{row.avg_score}%</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {topMissed.length === 0 ? (
                          <span className="font-['Nunito'] text-[12px] text-[#22C55E] font-bold">All concepts covered ✓</span>
                        ) : topMissed.map(([concept, count]) => (
                          <span key={concept} className="text-[11px] font-bold font-['Nunito'] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                            {concept} ×{count}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flagged sessions */}
            {flagged.length > 0 && (
              <div className={`${CARD} overflow-hidden`} style={{ borderColor: "#EF4444", boxShadow: "3px 3px 0 0 #EF4444" }}>
                <div className="p-5 border-b-[2.5px] border-red-200 bg-red-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className={`${DISPLAY} font-extrabold text-[17px] text-red-700`}>
                      Flagged Sessions ({flagged.length})
                    </p>
                  </div>
                  <p className="font-['Nunito'] text-[12px] text-red-500/80 mt-0.5">
                    Sessions with objective coverage below 60%
                  </p>
                </div>
                <div className="divide-y divide-[#0F172A]/5">
                  {flagged.map((s) => (
                    <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]">
                          {s.class_name} · {s.subject}
                        </p>
                        {s.concepts_missed.length > 0 && (
                          <p className="font-['Nunito'] text-[11px] text-[#0F172A]/50 mt-0.5">
                            Missed: {s.concepts_missed.slice(0, 3).join(", ")}
                            {s.concepts_missed.length > 3 && ` +${s.concepts_missed.length - 3} more`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Nunito'] text-[20px] font-extrabold text-red-500">{s.coverage_score}%</span>
                        <span className="font-['Nunito'] text-[11px] text-[#0F172A]/40">
                          {format(new Date(s.ended_at), "d MMM")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
