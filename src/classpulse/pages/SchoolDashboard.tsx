import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { format, subDays } from "date-fns";

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const CPA_CSS = `
.cpa-wrap *{box-sizing:border-box}
.cpa-wrap button{font-family:inherit;cursor:pointer}
.cpa-page{max-width:1280px;margin:0 auto;padding:24px 22px 80px}

.cpa-ph{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px;flex-wrap:wrap}
.cpa-ph-left{display:flex;align-items:center;gap:14px}
.cpa-ph-icon{width:48px;height:48px;border-radius:14px;background:#2E2BE5;border:2.5px solid #0F172A;box-shadow:3px 3px 0 0 #0F172A;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cpa-ph-icon svg{width:24px;height:24px;color:#fff}
.cpa-ph-title{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:26px;letter-spacing:-0.02em;line-height:1.05;margin:0;color:#0F172A}
.cpa-ph-sub{font-size:13px;font-weight:700;color:rgba(15,23,42,.5);margin-top:4px;font-family:'Nunito',ui-sans-serif}
.cpa-crumbs{font-size:11.5px;font-weight:700;color:rgba(15,23,42,.4);display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-family:'Nunito',ui-sans-serif}
.cpa-crumbs .sep{color:rgba(15,23,42,.2)}

.cpa-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cpa-seg{display:flex;background:#fff;border:2px solid #0F172A;border-radius:12px;padding:3px;box-shadow:2px 2px 0 0 #0F172A}
.cpa-seg button{border:0;background:transparent;padding:6px 12px;border-radius:8px;font-family:'Nunito',ui-sans-serif;font-size:12px;font-weight:800;color:rgba(15,23,42,.5);white-space:nowrap}
.cpa-seg button.on{background:#0F172A;color:#fff}
.cpa-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:12px;font-family:'Nunito',ui-sans-serif;font-size:13px;font-weight:800;line-height:1;background:#fff;color:#0F172A;border:2px solid #0F172A;box-shadow:2px 2px 0 0 #0F172A;transition:transform .08s,box-shadow .08s}
.cpa-btn:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 0 #0F172A}
.cpa-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 0 #0F172A}
.cpa-btn.primary{background:#2E2BE5;color:#fff}
.cpa-btn.ghost{background:transparent;border-color:rgba(15,23,42,.2);box-shadow:none;color:rgba(15,23,42,.5)}
.cpa-btn.ghost:hover{color:#0F172A;border-color:#0F172A;transform:none;box-shadow:none;background:rgba(15,23,42,.05)}
.cpa-btn svg{width:14px;height:14px;flex-shrink:0}

.cpa-flag-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;background:linear-gradient(90deg,#FFF1ED 0%,#FFFFFF 80%);border:2.5px solid #DC2626;border-radius:20px;box-shadow:3px 3px 0 0 #DC2626;margin-bottom:16px}
.cpa-flag-banner .fl{display:flex;align-items:center;gap:12px}
.cpa-flag-banner .fic{width:36px;height:36px;border-radius:10px;background:#DC2626;display:flex;align-items:center;justify-content:center;color:#fff;border:2px solid #0F172A;flex-shrink:0}
.cpa-flag-banner h4{margin:0;font-family:'Baloo 2',ui-sans-serif;font-size:15px;font-weight:800;color:#0F172A}
.cpa-flag-banner p{margin:2px 0 0;font-size:12.5px;font-weight:700;color:rgba(15,23,42,.5);font-family:'Nunito',ui-sans-serif}

.cpa-hero{border:2.5px solid #0F172A;border-radius:20px;box-shadow:3px 3px 0 0 #0F172A;background:radial-gradient(ellipse 80% 60% at 100% 0%,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 60%),linear-gradient(135deg,#2E2BE5 0%,#2F7CFF 100%);color:#fff;overflow:hidden;position:relative}
.cpa-hero-top{padding:18px 22px 0;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.cpa-hero-top .hl{display:flex;align-items:center;gap:10px}
.cpa-hero-top h3{margin:0;font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:17px;letter-spacing:-.01em}
.cpa-live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.22);border-radius:999px;padding:4px 10px;font-family:'Nunito',ui-sans-serif;font-weight:800;font-size:11px;color:#fff}
.cpa-live-badge .dot{width:6px;height:6px;border-radius:999px;background:#fff;flex-shrink:0}
.cpa-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:14px 18px 18px}
@media(max-width:980px){.cpa-kpis{grid-template-columns:repeat(2,1fr)}}
.cpa-kpi{background:rgba(255,255,255,.13);border:2px solid rgba(255,255,255,.22);border-radius:14px;padding:14px 16px;position:relative;min-width:0}
.cpa-kpi .lbl{font-size:11px;font-weight:800;color:rgba(255,255,255,.78);letter-spacing:.02em;margin-bottom:6px;font-family:'Nunito',ui-sans-serif}
.cpa-kpi .val{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:32px;letter-spacing:-.022em;line-height:1;color:#fff}
.cpa-kpi .sub{font-size:14px;opacity:.7;font-weight:700;margin-left:4px}
.cpa-kpi .kpi-delta{margin-top:6px;font-size:11px;font-weight:800;display:flex;align-items:center;gap:4px;font-family:'Nunito',ui-sans-serif}
.cpa-kpi .kpi-delta.up{color:#B6F7CE}
.cpa-kpi .kpi-delta.down{color:#FFC4B7}
.cpa-kpi .kpi-delta.flat{color:rgba(255,255,255,.7)}
.cpa-kpi .spark{position:absolute;right:12px;top:12px;width:60px;height:20px;opacity:.9}

.cpa-card{background:#fff;border:2.5px solid #0F172A;border-radius:20px;box-shadow:3px 3px 0 0 #0F172A;margin-top:14px}
.cpa-panel-h{padding:16px 20px 4px;display:flex;align-items:baseline;justify-content:space-between}
.cpa-panel-h h3{margin:0;font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:15px;color:#0F172A}
.cpa-panel-h .ph-right{font-size:11.5px;font-weight:700;color:rgba(15,23,42,.5);font-family:'Nunito',ui-sans-serif}

.cpa-subjects{padding:8px 20px 20px}
.cpa-subject-row{display:grid;grid-template-columns:130px 1fr 56px 70px;gap:12px;align-items:center;padding:10px 0;border-bottom:1.5px dashed rgba(15,23,42,.10)}
.cpa-subject-row:last-child{border-bottom:0}
.cpa-subject-row .sname{font-size:13px;font-weight:800;color:#0F172A;font-family:'Nunito',ui-sans-serif}
.cpa-subject-row .sbar{height:10px;background:#EEF1F9;border-radius:999px;position:relative;overflow:hidden;border:1.5px solid rgba(15,23,42,.10)}
.cpa-subject-row .sbar>i{position:absolute;inset:0 auto 0 0;border-radius:999px;background:linear-gradient(90deg,#2E2BE5 0%,#2F7CFF 100%)}
.cpa-subject-row .sbar.good>i{background:linear-gradient(90deg,#16A56B 0%,#38C58A 100%)}
.cpa-subject-row .sbar.warn>i{background:linear-gradient(90deg,#C77800 0%,#ECB44A 100%)}
.cpa-subject-row .sbar.bad>i{background:linear-gradient(90deg,#DC2626 0%,#F58D75 100%)}
.cpa-subject-row .spct{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:14px;text-align:right;color:#0F172A}
.cpa-subject-row .sses{font-size:11.5px;font-weight:700;color:rgba(15,23,42,.5);text-align:right;font-family:'Nunito',ui-sans-serif}



.cpa-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;line-height:1;border:1.5px solid transparent;white-space:nowrap;font-family:'Nunito',ui-sans-serif}
.cpa-pill .pdot{width:5px;height:5px;border-radius:999px;flex-shrink:0}
.cpa-pill.good{color:#16A56B;background:#ECFAF3;border-color:rgba(22,165,107,.22)}
.cpa-pill.good .pdot{background:#16A56B}
.cpa-pill.warn{color:#C77800;background:#FFF6E2;border-color:rgba(199,120,0,.22)}
.cpa-pill.warn .pdot{background:#C77800}
.cpa-pill.bad{color:#DC2626;background:#FEEFEC;border-color:rgba(220,38,38,.22)}
.cpa-pill.bad .pdot{background:#DC2626}
.cpa-pill.neutral{color:rgba(15,23,42,.5);background:#EEF1F9;border-color:rgba(15,23,42,.10)}
.cpa-pill.tag{color:#0F172A;background:#fff;border-color:rgba(15,23,42,.15)}
.cpa-pill.subject{color:#2F7CFF;background:#DDF3FF;border-color:rgba(47,124,255,.22)}
.cpa-pill.indigo{color:#2E2BE5;background:#EEEDFF;border-color:rgba(46,43,229,.22)}

.cpa-section-head{display:flex;align-items:baseline;gap:10px;justify-content:space-between;margin:28px 0 12px}
.cpa-section-head h2{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:19px;letter-spacing:-.015em;margin:0;color:#0F172A}
.cpa-section-head .smeta{font-size:12px;font-weight:700;color:rgba(15,23,42,.5);font-family:'Nunito',ui-sans-serif}

.cpa-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cpa-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:10px;border:2px solid rgba(15,23,42,.20);background:#fff;font-family:'Nunito',ui-sans-serif;font-size:12px;font-weight:800;color:rgba(15,23,42,.5);cursor:pointer}
.cpa-chip.on{background:#0F172A;color:#fff;border-color:#0F172A;box-shadow:2px 2px 0 0 #0F172A}
.cpa-chip:hover:not(.on){color:#0F172A;border-color:#0F172A}
.cpa-chip .cnt{background:#EEF1F9;color:#0F172A;padding:1px 7px;border-radius:999px;font-size:10.5px;font-weight:800}
.cpa-chip.on .cnt{background:rgba(255,255,255,.22);color:#fff}

.cpa-table-card{background:#fff;border:2.5px solid #0F172A;border-radius:20px;box-shadow:3px 3px 0 0 #0F172A;overflow:hidden}
.cpa-thead,.cpa-trow{display:grid;grid-template-columns:36px minmax(200px,1.3fr) 110px 1fr 110px 100px 90px 60px;align-items:center;gap:14px;padding:0 20px}
.cpa-thead{height:42px;background:#F8F9FF;border-bottom:2px solid #0F172A;font-size:11px;font-weight:800;color:rgba(15,23,42,.5);letter-spacing:.06em;text-transform:uppercase;font-family:'Nunito',ui-sans-serif}
.cpa-trow{min-height:68px;padding-top:14px;padding-bottom:14px;border-bottom:1.5px solid rgba(15,23,42,.10);transition:background .12s;cursor:pointer}
.cpa-trow:hover{background:#F6F7FF}
.cpa-expander{width:28px;height:28px;border-radius:8px;border:2px solid rgba(15,23,42,.20);background:#fff;display:flex;align-items:center;justify-content:center;color:rgba(15,23,42,.5);transition:transform .18s,color .12s,background .12s,border-color .12s;flex-shrink:0}
.cpa-trow:hover .cpa-expander{border-color:#0F172A;color:#0F172A}
.cpa-trow.open .cpa-expander{transform:rotate(90deg);color:#fff;background:#0F172A;border-color:#0F172A}
.cpa-teacher{display:flex;align-items:center;gap:12px;min-width:0}
.cpa-ava{border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Baloo 2',ui-sans-serif;font-weight:800;border:2px solid #0F172A;box-shadow:2px 2px 0 0 #0F172A}
.cpa-teacher .tname{font-size:14px;font-weight:800;letter-spacing:-.005em;color:#0F172A;line-height:1.2;font-family:'Nunito',ui-sans-serif}
.cpa-teacher .trole{font-size:11.5px;color:rgba(15,23,42,.5);font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;font-family:'Nunito',ui-sans-serif}
.cpa-coverage-cell{display:flex;align-items:center;gap:10px}
.cpa-ring{flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;font-family:'Baloo 2',ui-sans-serif;font-weight:800;letter-spacing:-.02em}
.cpa-trend-cell{display:flex;align-items:center;gap:8px}
.cpa-trend-num{font-size:12.5px;font-weight:800;font-family:'Nunito',ui-sans-serif}
.cpa-sessions-cell,.cpa-goals-cell,.cpa-last-cell{font-size:13px;font-weight:700;font-family:'Nunito',ui-sans-serif}
.cpa-sessions-cell .sbig{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:18px;color:#0F172A}
.cpa-sessions-cell .ssmall{font-size:11px;color:rgba(15,23,42,.5);margin-left:4px;font-weight:700}
.cpa-goal-bar{width:76px;height:7px;background:#EEF1F9;border-radius:999px;position:relative;overflow:hidden;margin-top:5px;border:1.5px solid rgba(15,23,42,.10)}
.cpa-goal-bar>i{position:absolute;inset:0 auto 0 0;background:#16A56B;border-radius:999px}
.cpa-goals-cell .gtxt{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:13px;color:#0F172A}
.cpa-last-cell .ldate{font-size:12.5px;font-weight:800;color:#0F172A}
.cpa-last-cell .lago{font-size:11px;color:rgba(15,23,42,.5);font-weight:700}
.cpa-actions-cell{text-align:right}

.cpa-expand-shell{padding:0 0 0 56px;margin:0 -20px;background:#FAFBFF;border-top:1.5px solid rgba(15,23,42,.10)}
.cpa-expand-inner{padding:16px 28px 20px 0}
.cpa-expand-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cpa-expand-head h4{font-size:11px;font-weight:800;margin:0;color:rgba(15,23,42,.5);text-transform:uppercase;letter-spacing:.06em;font-family:'Nunito',ui-sans-serif}

.cpa-stable{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid #0F172A;border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 0 #0F172A}
.cpa-stable thead th{text-align:left;font-size:10.5px;font-weight:800;color:rgba(15,23,42,.5);text-transform:uppercase;letter-spacing:.05em;padding:10px 14px;background:#F8F9FF;border-bottom:1.5px solid rgba(15,23,42,.15);font-family:'Nunito',ui-sans-serif}
.cpa-stable tbody td{padding:12px 14px;font-size:13px;font-weight:700;border-bottom:1.5px solid rgba(15,23,42,.10);color:#0F172A;vertical-align:middle;font-family:'Nunito',ui-sans-serif}
.cpa-stable tbody tr:last-child td{border-bottom:0}
.cpa-stable tbody tr:hover{background:#F4F6FF;cursor:pointer}
.cpa-sub-cover{display:flex;align-items:center;gap:8px}
.cpa-mini-bar{height:7px;background:#EEF1F9;border-radius:999px;position:relative;overflow:hidden;border:1.5px solid rgba(15,23,42,.10)}
.cpa-mini-bar>i{position:absolute;inset:0 auto 0 0;border-radius:999px}
.cpa-pctxt{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:13px}

.cpa-drawer-scrim{position:fixed;inset:0;background:rgba(15,23,42,.50);backdrop-filter:blur(4px);z-index:80;opacity:0;pointer-events:none;transition:opacity .2s}
.cpa-drawer-scrim.open{opacity:1;pointer-events:auto}
.cpa-drawer{position:fixed;top:0;right:0;bottom:0;width:580px;max-width:100vw;background:#fff;border-left:2.5px solid #0F172A;z-index:90;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,.0,.2,1);display:flex;flex-direction:column}
.cpa-drawer.open{transform:translateX(0)}
.cpa-drawer-head{padding:18px 22px;border-bottom:2px solid #0F172A;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;background:#F8F9FF}
.cpa-drawer-head h3{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:19px;margin:6px 0 2px;letter-spacing:-.015em;color:#0F172A}
.cpa-drawer-head .dmeta{font-size:12px;font-weight:700;color:rgba(15,23,42,.5);font-family:'Nunito',ui-sans-serif}
.cpa-icon-btn{width:32px;height:32px;border-radius:10px;border:2px solid rgba(15,23,42,.20);background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:rgba(15,23,42,.5);cursor:pointer}
.cpa-icon-btn:hover{border-color:#0F172A;color:#0F172A;background:rgba(15,23,42,.05)}
.cpa-drawer-body{flex:1;overflow-y:auto;padding:18px 22px 30px}
.cpa-drawer-body h4{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:rgba(15,23,42,.5);margin:22px 0 10px;font-family:'Nunito',ui-sans-serif}
.cpa-drawer-body h4:first-child{margin-top:0}
.cpa-obj-box{background:#EEEDFF;border:2px solid rgba(46,43,229,.25);border-radius:14px;padding:14px 16px;font-size:13px;font-weight:700;color:#0F172A;line-height:1.5;font-family:'Nunito',ui-sans-serif}
.cpa-stats3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cpa-stat-box{background:#fff;border:2px solid rgba(15,23,42,.15);border-radius:12px;padding:12px 14px}
.cpa-stat-box .sv{font-family:'Baloo 2',ui-sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;color:#0F172A}
.cpa-stat-box .sk{font-size:11px;color:rgba(15,23,42,.5);font-weight:800;margin-top:2px;text-transform:uppercase;letter-spacing:.04em;font-family:'Nunito',ui-sans-serif}
.cpa-stat-mini-bar{height:6px;background:#EEF1F9;border-radius:999px;position:relative;overflow:hidden;margin-top:8px;border:1px solid rgba(15,23,42,.08)}
.cpa-stat-mini-bar>i{position:absolute;inset:0 auto 0 0;border-radius:999px}
.cpa-concept-list{display:flex;flex-wrap:wrap;gap:6px}
.cpa-concept-list .cc{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;padding:5px 10px;border-radius:10px;border:1.5px solid;font-family:'Nunito',ui-sans-serif}
.cpa-concept-list .cc.ok{background:#ECFAF3;color:#16A56B;border-color:rgba(22,165,107,.25)}
.cpa-concept-list .cc.miss{background:#FEEFEC;color:#DC2626;border-color:rgba(220,38,38,.25)}
.cpa-transcript{background:#F8F9FF;border:2px solid rgba(15,23,42,.15);border-radius:12px;padding:14px;font-size:13px;font-weight:600;color:#0F172A;line-height:1.55;max-height:280px;overflow-y:auto;white-space:pre-wrap;font-family:'Nunito',ui-sans-serif}
.cpa-coach{background:linear-gradient(180deg,#F4F3FF 0%,#FFFFFF 100%);border:2px solid rgba(46,43,229,.25);border-radius:14px;padding:14px 16px}
.cpa-coach .ch{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;color:#2E2BE5;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-family:'Nunito',ui-sans-serif}
.cpa-coach p{margin:0;font-size:13.5px;font-weight:700;color:#0F172A;line-height:1.5;font-family:'Nunito',ui-sans-serif}
.cpa-drawer-body::-webkit-scrollbar{width:6px}
.cpa-drawer-body::-webkit-scrollbar-thumb{background:rgba(15,23,42,.15);border-radius:3px}
.cpa-empty-row{padding:60px 20px;text-align:center;color:rgba(15,23,42,.5);font-weight:700;font-family:'Nunito',ui-sans-serif}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SessionData {
  id: string;
  teacher_id: string;
  class_name: string;
  subject: string;
  objective_text: string;
  key_concepts: string[];
  started_at: string | null;
  ended_at: string | null;
  transcript_text: string | null;
  coverage_score: number;
  teaching_effectiveness_score?: number;
  teacher_talk_ratio: number;
  student_participation_count: number;
  concepts_covered: string[];
  concepts_missed: string[];
  ai_coaching_note: string;
}

interface TeacherGroup {
  user_id: string;
  display_name: string;
  sessions: SessionData[];
  avg_coverage: number;
  avg_tes?: number;
  total_sessions: number;
  goals_achieved: number;
  trend?: number;
  trend_data?: number[];
  sessions_this_week?: number;
  department?: string;
  flagged?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 80 ? "#16A56B" : s >= 65 ? "#2F7CFF" : s >= 50 ? "#C77800" : "#DC2626";
}
function scoreTone(s: number) {
  return s >= 80 ? "good" : s >= 65 ? "indigo" : s >= 50 ? "warn" : "bad";
}

function initialsOf(name: string) {
  const parts = name.replace(/^(En\.|Cik|Pn\.|Tn\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}
function formatAgo(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return Math.round(d / 60) + "m ago";
  if (d < 86400) return Math.round(d / 3600) + "h ago";
  if (d < 604800) return Math.round(d / 86400) + "d ago";
  return Math.round(d / 604800) + "w ago";
}
function sessionDuration(s: SessionData) {
  if (!s.started_at || !s.ended_at) return null;
  return Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
}

// ── Static data ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE: [string, string][] = [
  ["#2E2BE5", "#fff"],
  ["#2F7CFF", "#fff"],
  ["#0F172A", "#fff"],
  ["#7A4DFF", "#fff"],
  ["#3BD6F5", "#0F172A"],
  ["#16A56B", "#fff"],
];

const now = new Date();
// Helper to create a session's ended_at as started_at + durationMin
const sess = (daysAgo: number, durationMin: number) => {
  const end = subDays(now, daysAgo);
  const start = new Date(end.getTime() - durationMin * 60000);
  return { started_at: start.toISOString(), ended_at: end.toISOString() };
};

const DEMO_TEACHER_GROUPS: TeacherGroup[] = [
  // ── T1 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-1", display_name: "En. Ahmad Faizi Razali",
    avg_coverage: 83, total_sessions: 16, goals_achieved: 13,
    trend: 4, trend_data: [62, 71, 68, 75, 78, 80, 83],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d1a", teacher_id: "demo-1", class_name: "4 Amanah", subject: "Physics",
        objective_text: "Newton's Laws of Motion and real-world applications.",
        key_concepts: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Friction"],
        ...sess(1, 42), transcript_text: "Good morning class. Today we continue Newton's Laws with real-world examples. The group activity on friction worked very well.",
        coverage_score: 91, teacher_talk_ratio: 45, student_participation_count: 29,
        concepts_covered: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Friction"], concepts_missed: [],
        ai_coaching_note: "Outstanding student talk ratio. Group activity worked well — repeat for Forces chapter." },
      { id: "d1b", teacher_id: "demo-1", class_name: "5 Bestari", subject: "Mathematics",
        objective_text: "Introduction to integration techniques.",
        key_concepts: ["Integration", "Substitution Method", "Definite Integrals", "Area Under Curve"],
        ...sess(3, 38), transcript_text: "Integration is the reverse of differentiation. Today we cover substitution method.",
        coverage_score: 73, teacher_talk_ratio: 71, student_participation_count: 18,
        concepts_covered: ["Integration", "Substitution Method"], concepts_missed: ["Definite Integrals", "Area Under Curve"],
        ai_coaching_note: "Allocate more time for definite integrals before the next test." },
      { id: "d1c", teacher_id: "demo-1", class_name: "4 Amanah", subject: "Mathematics",
        objective_text: "Differentiation — chain rule and product rule.",
        key_concepts: ["Differentiation", "Chain Rule", "Product Rule", "Applications"],
        ...sess(10, 45), transcript_text: null,
        coverage_score: 87, teacher_talk_ratio: 58, student_participation_count: 24,
        concepts_covered: ["Differentiation", "Chain Rule", "Product Rule", "Applications"], concepts_missed: [],
        ai_coaching_note: "Excellent session. Students engaged well with board examples." },
      { id: "d1d", teacher_id: "demo-1", class_name: "5 Bestari", subject: "Physics",
        objective_text: "Electromagnetic induction and Faraday's Law.",
        key_concepts: ["Faraday's Law", "Lenz's Law", "Induced EMF", "Transformer"],
        ...sess(22, 40), transcript_text: null,
        coverage_score: 79, teacher_talk_ratio: 55, student_participation_count: 21,
        concepts_covered: ["Faraday's Law", "Lenz's Law", "Induced EMF"], concepts_missed: ["Transformer"],
        ai_coaching_note: "Transformer section needs a dedicated 15-min follow-up next session." },
      { id: "d1e", teacher_id: "demo-1", class_name: "4 Amanah", subject: "Mathematics",
        objective_text: "Vectors in 2D — magnitude, direction and addition.",
        key_concepts: ["Vector Magnitude", "Vector Direction", "Vector Addition", "Unit Vectors"],
        ...sess(55, 38), transcript_text: null,
        coverage_score: 84, teacher_talk_ratio: 60, student_participation_count: 23,
        concepts_covered: ["Vector Magnitude", "Vector Direction", "Vector Addition", "Unit Vectors"], concepts_missed: [],
        ai_coaching_note: "Clean session. Unit vector section was well-received." },
    ],
  },
  // ── T2 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-2", display_name: "Cik Nurul Huda Azman",
    avg_coverage: 79, total_sessions: 18, goals_achieved: 14,
    trend: 1, trend_data: [70, 74, 72, 78, 76, 79, 79],
    sessions_this_week: 4, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d2a", teacher_id: "demo-2", class_name: "4 Bestari", subject: "Biology",
        objective_text: "Cell division — mitosis and meiosis.",
        key_concepts: ["Mitosis", "Meiosis", "Chromosomes", "Cell Cycle"],
        ...sess(2, 44), transcript_text: "Mitosis produces identical daughter cells while meiosis halves the chromosome number.",
        coverage_score: 94, teacher_talk_ratio: 40, student_participation_count: 31,
        concepts_covered: ["Mitosis", "Meiosis", "Chromosomes", "Cell Cycle"], concepts_missed: [],
        ai_coaching_note: "Excellent use of diagrams and peer discussion. Share recording with department." },
      { id: "d2b", teacher_id: "demo-2", class_name: "5 Cemerlang", subject: "Chemistry",
        objective_text: "Acid-base reactions and titration.",
        key_concepts: ["Acids & Bases", "Neutralisation", "Titration", "pH Scale", "Buffer Solutions"],
        ...sess(5, 37), transcript_text: null,
        coverage_score: 65, teacher_talk_ratio: 68, student_participation_count: 14,
        concepts_covered: ["Acids & Bases", "Neutralisation", "Titration"], concepts_missed: ["pH Scale", "Buffer Solutions"],
        ai_coaching_note: "Buffer solutions need a dedicated follow-up. Consider lab-based reinforcement." },
      { id: "d2c", teacher_id: "demo-2", class_name: "4 Bestari", subject: "Chemistry",
        objective_text: "Ionic and covalent bonding.",
        key_concepts: ["Ionic Bonding", "Covalent Bonding", "Electronegativity", "Bond Energy"],
        ...sess(14, 41), transcript_text: "Atoms bond to achieve stable electron configuration.",
        coverage_score: 78, teacher_talk_ratio: 55, student_participation_count: 22,
        concepts_covered: ["Ionic Bonding", "Covalent Bonding", "Electronegativity", "Bond Energy"], concepts_missed: [],
        ai_coaching_note: "Good pacing. Electronegativity table exercise was effective." },
      { id: "d2d", teacher_id: "demo-2", class_name: "5 Cemerlang", subject: "Biology",
        objective_text: "Genetics — Mendelian inheritance and genetic ratios.",
        key_concepts: ["Dominant/Recessive", "Punnett Square", "Dihybrid Cross", "Linkage"],
        ...sess(40, 43), transcript_text: null,
        coverage_score: 80, teacher_talk_ratio: 48, student_participation_count: 26,
        concepts_covered: ["Dominant/Recessive", "Punnett Square", "Dihybrid Cross"], concepts_missed: ["Linkage"],
        ai_coaching_note: "Linkage was only briefly mentioned — plan a full lesson on it." },
    ],
  },
  // ── T3 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-3", display_name: "En. Radzuan Ismail",
    avg_coverage: 82, total_sessions: 14, goals_achieved: 14,
    trend: 2, trend_data: [75, 78, 76, 80, 81, 82, 82],
    sessions_this_week: 3, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d3a", teacher_id: "demo-3", class_name: "5 Dinamik", subject: "BM",
        objective_text: "Penulisan karangan jenis perbincangan.",
        key_concepts: ["Struktur Karangan", "Hujah Utama", "Hujah Sokongan", "Penutup"],
        ...sess(1, 43), transcript_text: "Selamat pagi. Hari ini kita belajar cara menulis karangan perbincangan dengan berkesan.",
        coverage_score: 88, teacher_talk_ratio: 50, student_participation_count: 27,
        concepts_covered: ["Struktur Karangan", "Hujah Utama", "Hujah Sokongan", "Penutup"], concepts_missed: [],
        ai_coaching_note: "Students produced strong draft paragraphs during class time." },
      { id: "d3b", teacher_id: "demo-3", class_name: "4 Cemerlang", subject: "History",
        objective_text: "The formation of Malaysia — key events and figures.",
        key_concepts: ["Independence 1957", "Malaysia 1963", "Tunku Abdul Rahman", "Merger & Separation"],
        ...sess(4, 39), transcript_text: "We trace the journey from Merdeka 1957 to the formation of Malaysia in 1963.",
        coverage_score: 82, teacher_talk_ratio: 52, student_participation_count: 25,
        concepts_covered: ["Independence 1957", "Malaysia 1963", "Tunku Abdul Rahman", "Merger & Separation"], concepts_missed: [],
        ai_coaching_note: "Timeline activity boosted retention. Consider extending next session." },
      { id: "d3c", teacher_id: "demo-3", class_name: "5 Dinamik", subject: "English",
        objective_text: "Comprehension strategies and passive voice.",
        key_concepts: ["Skimming", "Scanning", "Passive Voice", "Inference Skills"],
        ...sess(18, 36), transcript_text: null,
        coverage_score: 76, teacher_talk_ratio: 58, student_participation_count: 20,
        concepts_covered: ["Skimming", "Scanning", "Passive Voice", "Inference Skills"], concepts_missed: [],
        ai_coaching_note: "Students need more practice with inference — a common SPM weak point." },
      { id: "d3d", teacher_id: "demo-3", class_name: "4 Cemerlang", subject: "BM",
        objective_text: "Tatabahasa — kata kerja aktif dan pasif.",
        key_concepts: ["Kata Kerja Aktif", "Kata Kerja Pasif", "Ayat Transformasi", "Contoh Soalan SPM"],
        ...sess(50, 40), transcript_text: null,
        coverage_score: 85, teacher_talk_ratio: 55, student_participation_count: 28,
        concepts_covered: ["Kata Kerja Aktif", "Kata Kerja Pasif", "Ayat Transformasi", "Contoh Soalan SPM"], concepts_missed: [],
        ai_coaching_note: "SPM examples were particularly effective. Students attempted all exercises." },
    ],
  },
  // ── T4 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-4", display_name: "Pn. Salmah Mohamad",
    avg_coverage: 51, total_sessions: 9, goals_achieved: 1,
    trend: -8, trend_data: [70, 66, 60, 58, 55, 53, 51],
    sessions_this_week: 2, department: "Sains & Matematik", flagged: true,
    sessions: [
      { id: "d4a", teacher_id: "demo-4", class_name: "4 Dinamik", subject: "Mathematics",
        objective_text: "Trigonometry — sine, cosine, tangent rules.",
        key_concepts: ["Sine Rule", "Cosine Rule", "Trigonometric Identities", "Graphs"],
        ...sess(1, 34), transcript_text: null,
        coverage_score: 47, teacher_talk_ratio: 74, student_participation_count: 8,
        concepts_covered: ["Sine Rule"], concepts_missed: ["Cosine Rule", "Trigonometric Identities", "Graphs"],
        ai_coaching_note: "Critical gap. Cosine rule and identities are high-frequency SPM topics — urgent follow-up needed." },
      { id: "d4b", teacher_id: "demo-4", class_name: "5 Bestari", subject: "Mathematics",
        objective_text: "Statistics — mean, mode, median and standard deviation.",
        key_concepts: ["Mean", "Median", "Mode", "Standard Deviation", "Normal Distribution"],
        ...sess(5, 32), transcript_text: null,
        coverage_score: 54, teacher_talk_ratio: 72, student_participation_count: 10,
        concepts_covered: ["Mean", "Median"], concepts_missed: ["Mode", "Standard Deviation", "Normal Distribution"],
        ai_coaching_note: "Session ran short. Standard deviation and normal distribution skipped — schedule a catch-up." },
      { id: "d4c", teacher_id: "demo-4", class_name: "4 Dinamik", subject: "Mathematics",
        objective_text: "Quadratic equations — factorisation and completing the square.",
        key_concepts: ["Factorisation", "Completing the Square", "Quadratic Formula", "Discriminant"],
        ...sess(20, 35), transcript_text: null,
        coverage_score: 52, teacher_talk_ratio: 76, student_participation_count: 9,
        concepts_covered: ["Factorisation", "Completing the Square"], concepts_missed: ["Quadratic Formula", "Discriminant"],
        ai_coaching_note: "Only basic factorisation covered. Quadratic formula must be introduced before next assessment." },
    ],
  },
  // ── T5 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-5", display_name: "Cik Lee Mei Ling",
    avg_coverage: 88, total_sessions: 12, goals_achieved: 11,
    trend: 6, trend_data: [76, 80, 82, 84, 85, 87, 88],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d5a", teacher_id: "demo-5", class_name: "5 Pintar", subject: "Add. Math",
        objective_text: "Progressions — arithmetic and geometric.",
        key_concepts: ["AP Formula", "GP Formula", "Sum to Infinity", "Word Problems"],
        ...sess(0, 45), transcript_text: "Let's start with arithmetic progressions. The formula for the nth term is a + (n-1)d.",
        coverage_score: 93, teacher_talk_ratio: 48, student_participation_count: 28,
        concepts_covered: ["AP Formula", "GP Formula", "Sum to Infinity", "Word Problems"], concepts_missed: [],
        ai_coaching_note: "Pacing was exemplary. All four worked examples completed within session." },
      { id: "d5b", teacher_id: "demo-5", class_name: "4 Pintar", subject: "Physics",
        objective_text: "Heat — specific heat capacity and latent heat.",
        key_concepts: ["Specific Heat", "Latent Heat", "Phase Change", "Calorimetry"],
        ...sess(3, 40), transcript_text: null,
        coverage_score: 86, teacher_talk_ratio: 52, student_participation_count: 24,
        concepts_covered: ["Specific Heat", "Latent Heat", "Phase Change", "Calorimetry"], concepts_missed: [],
        ai_coaching_note: "Calorimetry demo very effective. Consider filming for future reference." },
      { id: "d5c", teacher_id: "demo-5", class_name: "5 Pintar", subject: "Add. Math",
        objective_text: "Integration — definite integrals and area under a curve.",
        key_concepts: ["Definite Integrals", "Area Under Curve", "Negative Area", "Volume of Revolution"],
        ...sess(15, 42), transcript_text: null,
        coverage_score: 85, teacher_talk_ratio: 50, student_participation_count: 26,
        concepts_covered: ["Definite Integrals", "Area Under Curve", "Negative Area"], concepts_missed: ["Volume of Revolution"],
        ai_coaching_note: "Volume of revolution needs a dedicated session — complex topic for SPM." },
      { id: "d5d", teacher_id: "demo-5", class_name: "4 Pintar", subject: "Add. Math",
        objective_text: "Coordinate geometry — distance, midpoint, locus.",
        key_concepts: ["Distance Formula", "Midpoint Formula", "Gradient", "Locus"],
        ...sess(60, 38), transcript_text: null,
        coverage_score: 90, teacher_talk_ratio: 45, student_participation_count: 27,
        concepts_covered: ["Distance Formula", "Midpoint Formula", "Gradient", "Locus"], concepts_missed: [],
        ai_coaching_note: "Outstanding session. Students independently solved the locus problems." },
    ],
  },
  // ── T6 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-6", display_name: "En. Hafiz Tan",
    avg_coverage: 71, total_sessions: 11, goals_achieved: 7,
    trend: -2, trend_data: [76, 75, 72, 74, 73, 72, 71],
    sessions_this_week: 2, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d6a", teacher_id: "demo-6", class_name: "4 Bestari", subject: "Geography",
        objective_text: "Tropical climate and monsoon patterns.",
        key_concepts: ["Monsoon Winds", "ITCZ", "Rainfall Patterns", "Climate Graphs"],
        ...sess(2, 38), transcript_text: null,
        coverage_score: 72, teacher_talk_ratio: 64, student_participation_count: 17,
        concepts_covered: ["Monsoon Winds", "Rainfall Patterns", "Climate Graphs"], concepts_missed: ["ITCZ"],
        ai_coaching_note: "ITCZ alluded to but not formally introduced — recommend a 10-min refresh." },
      { id: "d6b", teacher_id: "demo-6", class_name: "5 Cemerlang", subject: "Moral",
        objective_text: "Civic responsibility and community service.",
        key_concepts: ["Civic Duty", "Volunteerism", "Community Welfare", "Citizenship"],
        ...sess(6, 35), transcript_text: null,
        coverage_score: 70, teacher_talk_ratio: 67, student_participation_count: 14,
        concepts_covered: ["Civic Duty", "Volunteerism", "Community Welfare"], concepts_missed: ["Citizenship"],
        ai_coaching_note: "Strong discussion but ran out of time before citizenship case study." },
      { id: "d6c", teacher_id: "demo-6", class_name: "4 Bestari", subject: "Geography",
        objective_text: "Population distribution and urbanisation in Malaysia.",
        key_concepts: ["Population Density", "Push-Pull Factors", "Urbanisation", "Mega-cities"],
        ...sess(25, 37), transcript_text: null,
        coverage_score: 68, teacher_talk_ratio: 62, student_participation_count: 16,
        concepts_covered: ["Population Density", "Push-Pull Factors", "Urbanisation"], concepts_missed: ["Mega-cities"],
        ai_coaching_note: "Mega-cities topic was skipped due to time. Should be included before the monthly test." },
    ],
  },
  // ── T7 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-7", display_name: "Pn. Rozita Ahmad",
    avg_coverage: 85, total_sessions: 13, goals_achieved: 11,
    trend: 3, trend_data: [78, 80, 81, 82, 83, 84, 85],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d7a", teacher_id: "demo-7", class_name: "5 Amanah", subject: "Chemistry",
        objective_text: "Electrochemistry — electrolysis and electroplating.",
        key_concepts: ["Electrolysis", "Cathode/Anode", "Discharge of Ions", "Electroplating"],
        ...sess(1, 44), transcript_text: "Today we explore how electrolysis separates compounds using electricity.",
        coverage_score: 88, teacher_talk_ratio: 50, student_participation_count: 26,
        concepts_covered: ["Electrolysis", "Cathode/Anode", "Discharge of Ions", "Electroplating"], concepts_missed: [],
        ai_coaching_note: "Lab demonstration was very clear. Students correctly predicted cathode products." },
      { id: "d7b", teacher_id: "demo-7", class_name: "4 Cemerlang", subject: "Chemistry",
        objective_text: "Periodic table trends — atomic radius, ionisation energy, electronegativity.",
        key_concepts: ["Atomic Radius", "Ionisation Energy", "Electronegativity", "Electron Affinity"],
        ...sess(8, 41), transcript_text: null,
        coverage_score: 82, teacher_talk_ratio: 55, student_participation_count: 22,
        concepts_covered: ["Atomic Radius", "Ionisation Energy", "Electronegativity"], concepts_missed: ["Electron Affinity"],
        ai_coaching_note: "Electron affinity was rushed at the end. Revisit in next lesson." },
      { id: "d7c", teacher_id: "demo-7", class_name: "5 Amanah", subject: "Chemistry",
        objective_text: "Organic chemistry — alkanes, alkenes and functional groups.",
        key_concepts: ["Alkanes", "Alkenes", "Functional Groups", "IUPAC Naming"],
        ...sess(35, 45), transcript_text: null,
        coverage_score: 86, teacher_talk_ratio: 52, student_participation_count: 25,
        concepts_covered: ["Alkanes", "Alkenes", "Functional Groups", "IUPAC Naming"], concepts_missed: [],
        ai_coaching_note: "IUPAC naming exercises were very effective — students practised independently." },
    ],
  },
  // ── T8 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-8", display_name: "En. Sivakumar Pillai",
    avg_coverage: 76, total_sessions: 14, goals_achieved: 10,
    trend: -1, trend_data: [78, 79, 77, 76, 77, 76, 76],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d8a", teacher_id: "demo-8", class_name: "5 Dinamik", subject: "Add. Math",
        objective_text: "Linear programming — feasible region and optimal solutions.",
        key_concepts: ["Constraints", "Feasible Region", "Objective Function", "Optimal Point"],
        ...sess(2, 43), transcript_text: "Linear programming helps us find the best outcome given a set of constraints.",
        coverage_score: 78, teacher_talk_ratio: 60, student_participation_count: 20,
        concepts_covered: ["Constraints", "Feasible Region", "Objective Function"], concepts_missed: ["Optimal Point"],
        ai_coaching_note: "The optimal point section was glossed over — allocate 10 more minutes next time." },
      { id: "d8b", teacher_id: "demo-8", class_name: "4 Pintar", subject: "Mathematics",
        objective_text: "Number bases — binary, octal and hexadecimal.",
        key_concepts: ["Binary", "Octal", "Hexadecimal", "Base Conversion"],
        ...sess(9, 38), transcript_text: null,
        coverage_score: 75, teacher_talk_ratio: 65, student_participation_count: 18,
        concepts_covered: ["Binary", "Octal", "Hexadecimal"], concepts_missed: ["Base Conversion"],
        ai_coaching_note: "Students struggled with base conversion. More practice problems needed." },
      { id: "d8c", teacher_id: "demo-8", class_name: "5 Dinamik", subject: "Add. Math",
        objective_text: "Permutations and combinations.",
        key_concepts: ["Permutations", "Combinations", "nPr", "nCr"],
        ...sess(28, 40), transcript_text: null,
        coverage_score: 74, teacher_talk_ratio: 62, student_participation_count: 19,
        concepts_covered: ["Permutations", "Combinations", "nPr", "nCr"], concepts_missed: [],
        ai_coaching_note: "Good conceptual coverage. Word problems were particularly challenging for students." },
    ],
  },
  // ── T9 ────────────────────────────────────────────────────────────────────
  {
    user_id: "demo-9", display_name: "Cik Wong Mei Fong",
    avg_coverage: 90, total_sessions: 11, goals_achieved: 10,
    trend: 5, trend_data: [82, 84, 85, 87, 88, 89, 90],
    sessions_this_week: 2, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d9a", teacher_id: "demo-9", class_name: "5 Pintar", subject: "Biology",
        objective_text: "Ecology — food chains, energy flow and nutrient cycles.",
        key_concepts: ["Food Chain", "Food Web", "Energy Pyramid", "Nitrogen Cycle"],
        ...sess(1, 45), transcript_text: "Ecology studies how organisms interact with each other and their environment.",
        coverage_score: 94, teacher_talk_ratio: 42, student_participation_count: 30,
        concepts_covered: ["Food Chain", "Food Web", "Energy Pyramid", "Nitrogen Cycle"], concepts_missed: [],
        ai_coaching_note: "Excellent student engagement. Diagram activity for nitrogen cycle was outstanding." },
      { id: "d9b", teacher_id: "demo-9", class_name: "4 Amanah", subject: "Biology",
        objective_text: "Transport in plants — xylem, phloem and transpiration.",
        key_concepts: ["Xylem", "Phloem", "Transpiration", "Root Pressure"],
        ...sess(7, 40), transcript_text: null,
        coverage_score: 88, teacher_talk_ratio: 44, student_participation_count: 28,
        concepts_covered: ["Xylem", "Phloem", "Transpiration", "Root Pressure"], concepts_missed: [],
        ai_coaching_note: "Students correctly drew and labelled cross-sections. Excellent practical skills." },
      { id: "d9c", teacher_id: "demo-9", class_name: "5 Pintar", subject: "Biology",
        objective_text: "Human physiology — circulatory and respiratory systems.",
        key_concepts: ["Heart Chambers", "Blood Vessels", "Gas Exchange", "Haemoglobin"],
        ...sess(45, 42), transcript_text: null,
        coverage_score: 87, teacher_talk_ratio: 46, student_participation_count: 27,
        concepts_covered: ["Heart Chambers", "Blood Vessels", "Gas Exchange", "Haemoglobin"], concepts_missed: [],
        ai_coaching_note: "Model heart demonstration was very effective. Peer-quiz at end was a great idea." },
    ],
  },
  // ── T10 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-10", display_name: "Pn. Norashikin Wahab",
    avg_coverage: 78, total_sessions: 15, goals_achieved: 12,
    trend: 2, trend_data: [72, 74, 75, 76, 77, 78, 78],
    sessions_this_week: 3, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d10a", teacher_id: "demo-10", class_name: "4 Dinamik", subject: "BM",
        objective_text: "Pemahaman teks — teknik menjawab soalan KBAT.",
        key_concepts: ["Teknik Skim", "Teknik Scan", "Soalan KBAT", "Penghuraian Isi"],
        ...sess(2, 40), transcript_text: "KBAT ialah kemahiran berfikir aras tinggi. Mari kita amalkan teknik menjawab soalan pemahaman.",
        coverage_score: 80, teacher_talk_ratio: 56, student_participation_count: 24,
        concepts_covered: ["Teknik Skim", "Teknik Scan", "Soalan KBAT", "Penghuraian Isi"], concepts_missed: [],
        ai_coaching_note: "Students responded well to the KBAT framework. More practice texts needed." },
      { id: "d10b", teacher_id: "demo-10", class_name: "5 Bestari", subject: "History",
        objective_text: "Nasionalisme di Asia Tenggara — gerakan kemerdekaan.",
        key_concepts: ["Nasionalisme", "Gerakan Kemerdekaan", "Tokoh-tokoh Pejuang", "Strategi Perjuangan"],
        ...sess(11, 38), transcript_text: null,
        coverage_score: 76, teacher_talk_ratio: 58, student_participation_count: 21,
        concepts_covered: ["Nasionalisme", "Gerakan Kemerdekaan", "Tokoh-tokoh Pejuang"], concepts_missed: ["Strategi Perjuangan"],
        ai_coaching_note: "Strategi perjuangan needs more time. Students found this concept abstract." },
      { id: "d10c", teacher_id: "demo-10", class_name: "4 Dinamik", subject: "History",
        objective_text: "Sistem feudal Kesultanan Melayu.",
        key_concepts: ["Sultan", "Pembesar", "Rakyat", "Sistem Pemerintahan"],
        ...sess(42, 37), transcript_text: null,
        coverage_score: 78, teacher_talk_ratio: 60, student_participation_count: 20,
        concepts_covered: ["Sultan", "Pembesar", "Rakyat", "Sistem Pemerintahan"], concepts_missed: [],
        ai_coaching_note: "Good coverage. Role-play activity made the feudal system memorable." },
    ],
  },
  // ── T11 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-11", display_name: "En. Mohd Faizal Ibrahim",
    avg_coverage: 74, total_sessions: 12, goals_achieved: 8,
    trend: 0, trend_data: [74, 73, 75, 74, 74, 75, 74],
    sessions_this_week: 2, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d11a", teacher_id: "demo-11", class_name: "4 Cemerlang", subject: "English",
        objective_text: "Essay writing — descriptive and narrative techniques.",
        key_concepts: ["Descriptive Writing", "Narrative Voice", "Imagery", "Paragraph Structure"],
        ...sess(3, 42), transcript_text: "A good essay paints a picture in the reader's mind. Let's look at descriptive techniques.",
        coverage_score: 76, teacher_talk_ratio: 58, student_participation_count: 22,
        concepts_covered: ["Descriptive Writing", "Narrative Voice", "Imagery"], concepts_missed: ["Paragraph Structure"],
        ai_coaching_note: "Paragraph structure was briefly mentioned but not practised. Add a structured exercise next session." },
      { id: "d11b", teacher_id: "demo-11", class_name: "5 Amanah", subject: "English",
        objective_text: "Literature component — analysing poetry themes.",
        key_concepts: ["Theme", "Tone", "Imagery", "Poetic Devices"],
        ...sess(12, 38), transcript_text: null,
        coverage_score: 72, teacher_talk_ratio: 62, student_participation_count: 19,
        concepts_covered: ["Theme", "Tone", "Imagery"], concepts_missed: ["Poetic Devices"],
        ai_coaching_note: "Poetic devices analysis was weak — students need more exposure to metaphor and simile identification." },
      { id: "d11c", teacher_id: "demo-11", class_name: "4 Cemerlang", subject: "English",
        objective_text: "Grammar — modal verbs and reported speech.",
        key_concepts: ["Modal Verbs", "Direct Speech", "Reported Speech", "Backshift of Tense"],
        ...sess(38, 40), transcript_text: null,
        coverage_score: 74, teacher_talk_ratio: 60, student_participation_count: 21,
        concepts_covered: ["Modal Verbs", "Direct Speech", "Reported Speech"], concepts_missed: ["Backshift of Tense"],
        ai_coaching_note: "Backshift of tense confused many students — revisit with more examples." },
    ],
  },
  // ── T12 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-12", display_name: "Pn. Lim Siew Bee",
    avg_coverage: 86, total_sessions: 10, goals_achieved: 9,
    trend: 4, trend_data: [79, 81, 82, 83, 84, 85, 86],
    sessions_this_week: 2, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d12a", teacher_id: "demo-12", class_name: "4 Pintar", subject: "Mandarin",
        objective_text: "汉字书写与语段理解 — Writing characters and passage comprehension.",
        key_concepts: ["Stroke Order", "Character Radicals", "Reading Comprehension", "Vocabulary"],
        ...sess(2, 43), transcript_text: "今天我们练习书写汉字，注意笔顺的重要性。Let's practise writing characters with correct stroke order.",
        coverage_score: 88, teacher_talk_ratio: 48, student_participation_count: 26,
        concepts_covered: ["Stroke Order", "Character Radicals", "Reading Comprehension", "Vocabulary"], concepts_missed: [],
        ai_coaching_note: "Students showed significant improvement in stroke order. Character dictation scores up 12% from last month." },
      { id: "d12b", teacher_id: "demo-12", class_name: "5 Pintar", subject: "Mandarin",
        objective_text: "写作技巧 — Essay writing techniques in Chinese.",
        key_concepts: ["文章结构", "开头段", "论点展开", "结语"],
        ...sess(16, 40), transcript_text: null,
        coverage_score: 84, teacher_talk_ratio: 52, student_participation_count: 24,
        concepts_covered: ["文章结构", "开头段", "论点展开", "结语"], concepts_missed: [],
        ai_coaching_note: "All sections covered. Students wrote impressive opening paragraphs independently." },
      { id: "d12c", teacher_id: "demo-12", class_name: "4 Pintar", subject: "Mandarin",
        objective_text: "口语表达 — Oral presentation techniques.",
        key_concepts: ["发音", "语调", "表达流利", "身体语言"],
        ...sess(55, 38), transcript_text: null,
        coverage_score: 85, teacher_talk_ratio: 46, student_participation_count: 25,
        concepts_covered: ["发音", "语调", "表达流利", "身体语言"], concepts_missed: [],
        ai_coaching_note: "Oral presentations were impressive. Encourage shy students with more pair practice." },
    ],
  },
  // ── T13 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-13", display_name: "En. Ramasamy Gopal",
    avg_coverage: 58, total_sessions: 10, goals_achieved: 2,
    trend: -6, trend_data: [72, 68, 64, 62, 60, 59, 58],
    sessions_this_week: 2, department: "Sains & Matematik", flagged: true,
    sessions: [
      { id: "d13a", teacher_id: "demo-13", class_name: "5 Amanah", subject: "Add. Math",
        objective_text: "Differentiation — second derivatives and curve sketching.",
        key_concepts: ["Second Derivative", "Turning Points", "Concavity", "Curve Sketching"],
        ...sess(2, 35), transcript_text: null,
        coverage_score: 55, teacher_talk_ratio: 78, student_participation_count: 9,
        concepts_covered: ["Second Derivative", "Turning Points"], concepts_missed: ["Concavity", "Curve Sketching"],
        ai_coaching_note: "Curve sketching was not attempted at all. This is a critical SPM topic — must be addressed urgently." },
      { id: "d13b", teacher_id: "demo-13", class_name: "4 Amanah", subject: "Mathematics",
        objective_text: "Matrices — operations, determinant and inverse.",
        key_concepts: ["Matrix Addition", "Matrix Multiplication", "Determinant", "Inverse Matrix"],
        ...sess(7, 33), transcript_text: null,
        coverage_score: 60, teacher_talk_ratio: 75, student_participation_count: 10,
        concepts_covered: ["Matrix Addition", "Matrix Multiplication"], concepts_missed: ["Determinant", "Inverse Matrix"],
        ai_coaching_note: "Determinant and inverse skipped. Both appear annually in SPM — immediate intervention needed." },
      { id: "d13c", teacher_id: "demo-13", class_name: "5 Amanah", subject: "Add. Math",
        objective_text: "Integration — area between curves.",
        key_concepts: ["Area Between Curves", "Intersection Points", "Definite Integrals", "Sign Convention"],
        ...sess(30, 34), transcript_text: null,
        coverage_score: 58, teacher_talk_ratio: 77, student_participation_count: 8,
        concepts_covered: ["Area Between Curves", "Intersection Points"], concepts_missed: ["Definite Integrals", "Sign Convention"],
        ai_coaching_note: "Sessions consistently end early with key topics skipped. Recommend classroom observation and coaching." },
    ],
  },
  // ── T14 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-14", display_name: "Cik Nurhafiza Zainudin",
    avg_coverage: 80, total_sessions: 12, goals_achieved: 9,
    trend: 2, trend_data: [74, 76, 77, 78, 79, 80, 80],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d14a", teacher_id: "demo-14", class_name: "4 Bestari", subject: "Physics",
        objective_text: "Waves — transverse and longitudinal, reflection and refraction.",
        key_concepts: ["Wave Properties", "Transverse Waves", "Longitudinal Waves", "Refraction"],
        ...sess(1, 42), transcript_text: "All waves transfer energy without transferring matter. Let's classify them.",
        coverage_score: 82, teacher_talk_ratio: 54, student_participation_count: 23,
        concepts_covered: ["Wave Properties", "Transverse Waves", "Longitudinal Waves", "Refraction"], concepts_missed: [],
        ai_coaching_note: "Demonstration with slinky spring was very engaging. Students drew accurate wave diagrams." },
      { id: "d14b", teacher_id: "demo-14", class_name: "5 Dinamik", subject: "Physics",
        objective_text: "Radioactivity — types of decay and nuclear equations.",
        key_concepts: ["Alpha Decay", "Beta Decay", "Gamma Radiation", "Half-life"],
        ...sess(13, 40), transcript_text: null,
        coverage_score: 77, teacher_talk_ratio: 57, student_participation_count: 20,
        concepts_covered: ["Alpha Decay", "Beta Decay", "Gamma Radiation"], concepts_missed: ["Half-life"],
        ai_coaching_note: "Half-life calculation needs a full lesson — high-frequency SPM topic." },
      { id: "d14c", teacher_id: "demo-14", class_name: "4 Bestari", subject: "Physics",
        objective_text: "Optics — lenses, focal length and ray diagrams.",
        key_concepts: ["Converging Lens", "Diverging Lens", "Focal Length", "Ray Diagrams"],
        ...sess(48, 41), transcript_text: null,
        coverage_score: 80, teacher_talk_ratio: 55, student_participation_count: 22,
        concepts_covered: ["Converging Lens", "Diverging Lens", "Focal Length", "Ray Diagrams"], concepts_missed: [],
        ai_coaching_note: "Ray diagram exercises were well-structured. Students completed all three examples." },
    ],
  },
  // ── T15 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-15", display_name: "En. Chong Kok Keong",
    avg_coverage: 77, total_sessions: 13, goals_achieved: 9,
    trend: 1, trend_data: [73, 74, 75, 75, 76, 77, 77],
    sessions_this_week: 3, department: "Teknologi & ICT", flagged: false,
    sessions: [
      { id: "d15a", teacher_id: "demo-15", class_name: "4 Dinamik", subject: "ICT",
        objective_text: "Database management — tables, queries and relationships.",
        key_concepts: ["Database Tables", "Primary Key", "SQL Queries", "Table Relationships"],
        ...sess(1, 44), transcript_text: "A database organises data into tables. Today we learn to query data using SQL.",
        coverage_score: 80, teacher_talk_ratio: 55, student_participation_count: 22,
        concepts_covered: ["Database Tables", "Primary Key", "SQL Queries"], concepts_missed: ["Table Relationships"],
        ai_coaching_note: "Table relationships need more time — entity-relationship diagrams were unclear to most students." },
      { id: "d15b", teacher_id: "demo-15", class_name: "5 Amanah", subject: "ICT",
        objective_text: "Network fundamentals — topologies, protocols and IP addressing.",
        key_concepts: ["Network Topologies", "TCP/IP", "IP Addressing", "Subnetting"],
        ...sess(10, 42), transcript_text: null,
        coverage_score: 74, teacher_talk_ratio: 60, student_participation_count: 19,
        concepts_covered: ["Network Topologies", "TCP/IP", "IP Addressing"], concepts_missed: ["Subnetting"],
        ai_coaching_note: "Subnetting is complex — dedicate the next session to it with worked examples." },
      { id: "d15c", teacher_id: "demo-15", class_name: "4 Dinamik", subject: "ICT",
        objective_text: "Spreadsheet skills — formulas, charts and pivot tables.",
        key_concepts: ["Cell References", "Formulas", "Charts", "Pivot Tables"],
        ...sess(32, 40), transcript_text: null,
        coverage_score: 76, teacher_talk_ratio: 58, student_participation_count: 21,
        concepts_covered: ["Cell References", "Formulas", "Charts"], concepts_missed: ["Pivot Tables"],
        ai_coaching_note: "Pivot tables were not covered — include in next practical session." },
    ],
  },
  // ── T16 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-16", display_name: "Pn. Salwani Hashim",
    avg_coverage: 69, total_sessions: 11, goals_achieved: 6,
    trend: -1, trend_data: [72, 71, 70, 70, 69, 69, 69],
    sessions_this_week: 2, department: "Bahasa & Kemanusiaan", flagged: false,
    sessions: [
      { id: "d16a", teacher_id: "demo-16", class_name: "4 Bestari", subject: "Moral",
        objective_text: "Nilai murni — tanggungjawab terhadap keluarga dan masyarakat.",
        key_concepts: ["Tanggungjawab Keluarga", "Tanggungjawab Masyarakat", "Nilai Murni", "Aplikasi Nilai"],
        ...sess(3, 38), transcript_text: null,
        coverage_score: 70, teacher_talk_ratio: 65, student_participation_count: 16,
        concepts_covered: ["Tanggungjawab Keluarga", "Tanggungjawab Masyarakat", "Nilai Murni"], concepts_missed: ["Aplikasi Nilai"],
        ai_coaching_note: "Application of values to real-life scenarios was not practised — essential for exam." },
      { id: "d16b", teacher_id: "demo-16", class_name: "5 Dinamik", subject: "Moral",
        objective_text: "Patriotisme dan semangat kewarganegaraan.",
        key_concepts: ["Patriotisme", "Kewarganegaraan", "Lambang Negara", "Jata Negara"],
        ...sess(8, 35), transcript_text: null,
        coverage_score: 68, teacher_talk_ratio: 67, student_participation_count: 15,
        concepts_covered: ["Patriotisme", "Kewarganegaraan", "Lambang Negara"], concepts_missed: ["Jata Negara"],
        ai_coaching_note: "Jata Negara details were skipped. Students need to memorise components for SPM." },
      { id: "d16c", teacher_id: "demo-16", class_name: "4 Bestari", subject: "Moral",
        objective_text: "Hak asasi manusia dan perlembagaan Malaysia.",
        key_concepts: ["Hak Asasi", "Perlembagaan", "Kebebasan Asasi", "Pindaan Perlembagaan"],
        ...sess(52, 36), transcript_text: null,
        coverage_score: 66, teacher_talk_ratio: 66, student_participation_count: 14,
        concepts_covered: ["Hak Asasi", "Perlembagaan", "Kebebasan Asasi"], concepts_missed: ["Pindaan Perlembagaan"],
        ai_coaching_note: "Constitutional amendments were not discussed. This is a key SPM focus area." },
    ],
  },
  // ── T17 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-17", display_name: "En. Zulkifli Mohd Nor",
    avg_coverage: 82, total_sessions: 10, goals_achieved: 8,
    trend: 0, trend_data: [80, 81, 82, 81, 82, 82, 82],
    sessions_this_week: 2, department: "Sukan & Ko-Kurikulum", flagged: false,
    sessions: [
      { id: "d17a", teacher_id: "demo-17", class_name: "4 Amanah", subject: "Physical Education",
        objective_text: "Badminton — stroke techniques and court positioning.",
        key_concepts: ["Clear Shot", "Drop Shot", "Smash", "Court Positioning"],
        ...sess(2, 60), transcript_text: "Today we focus on stroke techniques. A good clear shot puts your opponent at the back of the court.",
        coverage_score: 85, teacher_talk_ratio: 38, student_participation_count: 32,
        concepts_covered: ["Clear Shot", "Drop Shot", "Smash", "Court Positioning"], concepts_missed: [],
        ai_coaching_note: "Excellent student participation. Live drills worked very well — smash technique improved significantly." },
      { id: "d17b", teacher_id: "demo-17", class_name: "5 Bestari", subject: "Physical Education",
        objective_text: "Health and fitness — components and measurement.",
        key_concepts: ["Cardiovascular Endurance", "Muscular Strength", "Flexibility", "BMI"],
        ...sess(9, 55), transcript_text: null,
        coverage_score: 80, teacher_talk_ratio: 42, student_participation_count: 28,
        concepts_covered: ["Cardiovascular Endurance", "Muscular Strength", "Flexibility"], concepts_missed: ["BMI"],
        ai_coaching_note: "BMI calculation was skipped due to rain delay. Reschedule indoor session." },
      { id: "d17c", teacher_id: "demo-17", class_name: "4 Amanah", subject: "Physical Education",
        objective_text: "Team sports — football tactics and positioning.",
        key_concepts: ["Formation", "Offside Rule", "Set Pieces", "Team Communication"],
        ...sess(45, 60), transcript_text: null,
        coverage_score: 82, teacher_talk_ratio: 36, student_participation_count: 31,
        concepts_covered: ["Formation", "Offside Rule", "Set Pieces", "Team Communication"], concepts_missed: [],
        ai_coaching_note: "Tactical awareness is improving. Set piece drills were very effective." },
    ],
  },
  // ── T18 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-18", display_name: "Pn. Haslinda Yusof",
    avg_coverage: 73, total_sessions: 12, goals_achieved: 8,
    trend: -3, trend_data: [80, 78, 76, 75, 74, 73, 73],
    sessions_this_week: 2, department: "Sains Sosial", flagged: false,
    sessions: [
      { id: "d18a", teacher_id: "demo-18", class_name: "5 Amanah", subject: "Geography",
        objective_text: "Development geography — measuring economic development.",
        key_concepts: ["GDP", "HDI", "Gini Coefficient", "Development Indicators"],
        ...sess(4, 39), transcript_text: null,
        coverage_score: 74, teacher_talk_ratio: 63, student_participation_count: 18,
        concepts_covered: ["GDP", "HDI", "Gini Coefficient"], concepts_missed: ["Development Indicators"],
        ai_coaching_note: "Development indicators chart exercise was skipped. Important for analysis questions." },
      { id: "d18b", teacher_id: "demo-18", class_name: "4 Cemerlang", subject: "Economics",
        objective_text: "Supply and demand — equilibrium and price mechanism.",
        key_concepts: ["Law of Demand", "Law of Supply", "Equilibrium Price", "Price Elasticity"],
        ...sess(11, 42), transcript_text: "When price rises, quantity demanded falls. This is the Law of Demand.",
        coverage_score: 72, teacher_talk_ratio: 65, student_participation_count: 17,
        concepts_covered: ["Law of Demand", "Law of Supply", "Equilibrium Price"], concepts_missed: ["Price Elasticity"],
        ai_coaching_note: "Price elasticity calculation needs a dedicated session — appears every year in SPM." },
      { id: "d18c", teacher_id: "demo-18", class_name: "5 Amanah", subject: "Geography",
        objective_text: "Agricultural systems in Malaysia — wet padi and plantation crops.",
        key_concepts: ["Wet Padi Farming", "Plantation Agriculture", "Green Revolution", "FELDA"],
        ...sess(38, 38), transcript_text: null,
        coverage_score: 72, teacher_talk_ratio: 64, student_participation_count: 16,
        concepts_covered: ["Wet Padi Farming", "Plantation Agriculture", "Green Revolution"], concepts_missed: ["FELDA"],
        ai_coaching_note: "FELDA's role in agricultural development was not discussed — important Malaysian context." },
    ],
  },
  // ── T19 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-19", display_name: "En. Krishnamurthy Selvaraj",
    avg_coverage: 55, total_sessions: 9, goals_achieved: 1,
    trend: -5, trend_data: [68, 65, 62, 60, 57, 56, 55],
    sessions_this_week: 2, department: "Sains & Matematik", flagged: true,
    sessions: [
      { id: "d19a", teacher_id: "demo-19", class_name: "5 Dinamik", subject: "Mathematics",
        objective_text: "Probability — simple and compound events.",
        key_concepts: ["Simple Events", "Compound Events", "Tree Diagram", "Conditional Probability"],
        ...sess(2, 33), transcript_text: null,
        coverage_score: 52, teacher_talk_ratio: 80, student_participation_count: 7,
        concepts_covered: ["Simple Events", "Compound Events"], concepts_missed: ["Tree Diagram", "Conditional Probability"],
        ai_coaching_note: "Tree diagrams and conditional probability completely skipped. These form 40% of probability marks in SPM." },
      { id: "d19b", teacher_id: "demo-19", class_name: "4 Cemerlang", subject: "Mathematics",
        objective_text: "Linear equations in two variables — simultaneous equations.",
        key_concepts: ["Substitution Method", "Elimination Method", "Graphical Method", "Word Problems"],
        ...sess(6, 31), transcript_text: null,
        coverage_score: 57, teacher_talk_ratio: 78, student_participation_count: 8,
        concepts_covered: ["Substitution Method", "Elimination Method"], concepts_missed: ["Graphical Method", "Word Problems"],
        ai_coaching_note: "Word problems were not attempted. Students need to apply simultaneous equations to real contexts." },
      { id: "d19c", teacher_id: "demo-19", class_name: "5 Dinamik", subject: "Mathematics",
        objective_text: "Indices and logarithms — laws and applications.",
        key_concepts: ["Index Laws", "Logarithm Laws", "Change of Base", "Exponential Equations"],
        ...sess(22, 32), transcript_text: null,
        coverage_score: 55, teacher_talk_ratio: 79, student_participation_count: 7,
        concepts_covered: ["Index Laws", "Logarithm Laws"], concepts_missed: ["Change of Base", "Exponential Equations"],
        ai_coaching_note: "Pattern of incomplete coverage continues. Recommend immediate HoD intervention and lesson observation." },
    ],
  },
  // ── T20 ───────────────────────────────────────────────────────────────────
  {
    user_id: "demo-20", display_name: "Cik Tan Ai Ling",
    avg_coverage: 91, total_sessions: 11, goals_achieved: 11,
    trend: 7, trend_data: [80, 83, 85, 87, 88, 90, 91],
    sessions_this_week: 3, department: "Sains & Matematik", flagged: false,
    sessions: [
      { id: "d20a", teacher_id: "demo-20", class_name: "5 Cemerlang", subject: "Add. Math",
        objective_text: "Functions — composite and inverse functions.",
        key_concepts: ["Composite Functions", "Inverse Functions", "Domain & Range", "Function Notation"],
        ...sess(1, 45), transcript_text: "A composite function applies one function after another. Let's work through several examples together.",
        coverage_score: 95, teacher_talk_ratio: 44, student_participation_count: 30,
        concepts_covered: ["Composite Functions", "Inverse Functions", "Domain & Range", "Function Notation"], concepts_missed: [],
        ai_coaching_note: "Best session I've observed in this department. Students independently derived inverse functions." },
      { id: "d20b", teacher_id: "demo-20", class_name: "4 Cemerlang", subject: "Add. Math",
        objective_text: "Binomial expansion — Pascal's triangle and general term.",
        key_concepts: ["Pascal's Triangle", "Binomial Theorem", "General Term", "Coefficient"],
        ...sess(4, 42), transcript_text: null,
        coverage_score: 90, teacher_talk_ratio: 46, student_participation_count: 27,
        concepts_covered: ["Pascal's Triangle", "Binomial Theorem", "General Term", "Coefficient"], concepts_missed: [],
        ai_coaching_note: "Excellent. Students correctly found the general term independently in 4 out of 5 exam-style questions." },
      { id: "d20c", teacher_id: "demo-20", class_name: "5 Cemerlang", subject: "Add. Math",
        objective_text: "Trigonometric functions — graphs, amplitude and period.",
        key_concepts: ["Sin/Cos/Tan Graphs", "Amplitude", "Period", "Phase Shift"],
        ...sess(20, 44), transcript_text: null,
        coverage_score: 88, teacher_talk_ratio: 48, student_participation_count: 28,
        concepts_covered: ["Sin/Cos/Tan Graphs", "Amplitude", "Period", "Phase Shift"], concepts_missed: [],
        ai_coaching_note: "Graphing exercise with GeoGebra was innovative — highly recommend for other Add. Math teachers." },
      { id: "d20d", teacher_id: "demo-20", class_name: "4 Cemerlang", subject: "Add. Math",
        objective_text: "Quadratic functions — nature of roots and completing the square.",
        key_concepts: ["Discriminant", "Completing the Square", "Vertex Form", "Graph Sketching"],
        ...sess(62, 43), transcript_text: null,
        coverage_score: 92, teacher_talk_ratio: 42, student_participation_count: 29,
        concepts_covered: ["Discriminant", "Completing the Square", "Vertex Form", "Graph Sketching"], concepts_missed: [],
        ai_coaching_note: "Highly structured lesson. Students discovered the discriminant rule through guided discovery." },
    ],
  },
];

// ── Small components ──────────────────────────────────────────────────────────
function Sparkline({ data, width = 80, height = 24, color = "#2E2BE5" }: {
  data: number[]; width?: number; height?: number; color?: string;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1.5;
  const w = width - pad * 2, h = height - pad * 2;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * w,
    pad + h - ((v - min) / range) * h,
  ]);
  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const area = `${d} L ${pts[pts.length - 1][0]} ${pad + h} L ${pts[0][0]} ${pad + h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={area} fill={color} opacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

function ScoreRingCPA({ score, size = 40 }: { score: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color = scoreColor(score);
  const cx = size / 2;
  return (
    <div className="cpa-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} stroke="rgba(15,23,42,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }} />
      </svg>
      <span style={{ color, fontSize: size * 0.32, fontWeight: 800, position: "relative" }}>{score}</span>
    </div>
  );
}

function AvatarCPA({ name, seed = 0, size = 40 }: { name: string; seed?: number; size?: number }) {
  const [bg, fg] = AVATAR_PALETTE[seed % AVATAR_PALETTE.length];
  return (
    <div className="cpa-ava" style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.38) }}>
      {initialsOf(name)}
    </div>
  );
}

function PillCPA({ tone = "neutral", children, dot = true }: {
  tone?: string; children: React.ReactNode; dot?: boolean;
}) {
  return (
    <span className={`cpa-pill ${tone}`}>
      {dot && !["tag", "subject", "indigo"].includes(tone) && <span className="pdot" />}
      {children}
    </span>
  );
}

function MiniBarCPA({ pct, width = 64 }: { pct: number; width?: number | string }) {
  const color = scoreColor(pct);
  return (
    <div className="cpa-mini-bar" style={{ width }}>
      <i style={{ width: pct + "%", background: color }} />
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCPA({ label, value, sub, delta, invert, spark }: {
  label: string; value: string; sub?: string; delta?: number; invert?: boolean; spark?: number[];
}) {
  let dirClass = "flat";
  if (delta !== undefined && delta > 0) dirClass = invert ? "down" : "up";
  if (delta !== undefined && delta < 0) dirClass = invert ? "up" : "down";

  const ArrowSvg = delta && delta > 0
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>
    : delta && delta < 0
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>
    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14"/></svg>;

  return (
    <div className="cpa-kpi">
      {spark && (
        <div className="spark">
          <Sparkline data={spark} width={60} height={20} color="rgba(255,255,255,0.85)" />
        </div>
      )}
      <div className="lbl">{label}</div>
      <div className="val">{value}{sub && <span className="sub">{sub}</span>}</div>
      {delta !== undefined && (
        <div className={`kpi-delta ${dirClass}`}>
          {ArrowSvg}
          {delta > 0 ? "+" : ""}{delta}
          {(label.includes("%") || label === "Avg Coverage" || label === "Student Talk") ? "%" : ""}
          <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: 3, fontWeight: 700 }}>vs prev</span>
        </div>
      )}
    </div>
  );
}

// ── Session drawer ────────────────────────────────────────────────────────────
function SessionDrawer({ open, onClose, session, teacher }: {
  open: boolean; onClose: () => void;
  session: SessionData | null; teacher: TeacherGroup | null;
}) {
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => { setShowFullTranscript(false); }, [session]);

  const handleDownload = () => {
    if (!session) return;
    const dur = sessionDuration(session);
    const lines = [
      "ClassPulse Session Report",
      teacher ? `Teacher: ${teacher.display_name}` : "",
      `Class: ${session.class_name} · ${session.subject}`,
      session.ended_at ? `Date: ${format(new Date(session.ended_at), "EEEE, d MMMM yyyy")}` : "",
      dur ? `Duration: ${dur} min` : "",
      "",
      `Objective: ${session.objective_text}`,
      "",
      `Coverage: ${session.coverage_score}%`,
      `Student Talk: ${100 - session.teacher_talk_ratio}%`,
      `Participation: ${session.student_participation_count} student turns`,
      "",
      `Concepts Covered (${session.concepts_covered.length}): ${session.concepts_covered.join(", ") || "None"}`,
      session.concepts_missed.length
        ? `Concepts Missed (${session.concepts_missed.length}): ${session.concepts_missed.join(", ")}`
        : "All concepts covered",
      session.ai_coaching_note ? `\nAI Coaching Note:\n${session.ai_coaching_note}` : "",
      session.transcript_text ? `\nTranscript:\n${session.transcript_text}` : "",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${session.class_name.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!session) return null;

  const sColor = scoreColor(session.coverage_score);
  const tone = session.concepts_missed.length === 0 ? "good" : session.concepts_missed.length <= 1 ? "warn" : "bad";
  const dur = sessionDuration(session);
  const studentTalk = 100 - session.teacher_talk_ratio;

  return (
    <>
      <div className={`cpa-drawer-scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`cpa-drawer${open ? " open" : ""}`} aria-hidden={!open}>
        <header className="cpa-drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <PillCPA tone="subject" dot={false}>{session.subject}</PillCPA>
              <PillCPA tone="tag" dot={false}>{session.class_name}</PillCPA>
              <PillCPA tone={tone} dot={false}>
                {session.concepts_missed.length === 0 ? "Goals achieved" : `${session.concepts_missed.length} missed`}
              </PillCPA>
            </div>
            <h3>Session Report</h3>
            <p className="dmeta">
              {teacher && <><strong style={{ color: "#0F172A", fontWeight: 800 }}>{teacher.display_name}</strong> · </>}
              {session.ended_at && format(new Date(session.ended_at), "EEEE, d MMMM yyyy")}
              {dur && ` · ${dur} min`}
            </p>
          </div>
          <button className="cpa-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </header>

        <div className="cpa-drawer-body">
          <h4>Lesson Objective</h4>
          <div className="cpa-obj-box">{session.objective_text}</div>

          <h4>Session Metrics</h4>
          <div className="cpa-stats3">
            <div className="cpa-stat-box">
              <div className="sv" style={{ color: sColor }}>{session.coverage_score}%</div>
              <div className="sk">Coverage</div>
              <div className="cpa-stat-mini-bar"><i style={{ width: session.coverage_score + "%", background: sColor }} /></div>
            </div>
            <div className="cpa-stat-box">
              <div className="sv">{studentTalk}%</div>
              <div className="sk">Student Talk</div>
              <div className="cpa-stat-mini-bar"><i style={{ width: studentTalk + "%", background: "#2F7CFF" }} /></div>
            </div>
            <div className="cpa-stat-box">
              <div className="sv">{session.student_participation_count}</div>
              <div className="sk">Participation</div>
              <div style={{ fontFamily: "'Nunito',ui-sans-serif", fontSize: 11, color: "rgba(15,23,42,.5)", fontWeight: 700, marginTop: 3 }}>student turns</div>
            </div>
          </div>

          <h4>Concept Coverage ({session.concepts_covered.length} of {session.key_concepts.length})</h4>
          <div className="cpa-concept-list">
            {session.concepts_covered.map(c => (
              <span key={c} className="cc ok">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
                {c}
              </span>
            ))}
            {session.concepts_missed.map(c => (
              <span key={c} className="cc miss">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                {c}
              </span>
            ))}
          </div>

          {session.ai_coaching_note && (
            <>
              <h4>AI Coaching Insight</h4>
              <div className="cpa-coach">
                <div className="ch">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M5.5 5.5l3 3M15.5 15.5l3 3M5.5 18.5l3-3M15.5 8.5l3-3"/></svg>
                  Suggestion
                </div>
                <p>{session.ai_coaching_note}</p>
              </div>
            </>
          )}

          {session.transcript_text && (
            <>
              <h4 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Transcript</span>
                <button
                  onClick={() => setShowFullTranscript(v => !v)}
                  style={{ textTransform: "none", letterSpacing: 0, fontSize: 11, fontWeight: 800, color: "#2E2BE5", background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito',ui-sans-serif", padding: 0 }}
                >
                  {showFullTranscript ? "Collapse" : "Show full"}
                </button>
              </h4>
              <div className="cpa-transcript" style={showFullTranscript ? { maxHeight: "none" } : {}}>
                {session.transcript_text}
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="cpa-btn primary" onClick={handleDownload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>
              Download Report
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Teacher table row ─────────────────────────────────────────────────────────
function TeacherTableRow({ teacher, open, onToggle, onOpenSession }: {
  teacher: TeacherGroup;
  open: boolean;
  onToggle: () => void;
  onOpenSession: (s: SessionData, t: TeacherGroup) => void;
}) {
  const handleExportTeacher = () => {
    const lines = [
      "ClassPulse Teacher Report",
      `Teacher: ${teacher.display_name}`,
      `Department: ${teacher.department ?? "General"}`,
      `Generated: ${format(new Date(), "d MMM yyyy")}`,
      "",
      `Avg Coverage: ${teacher.avg_coverage}%`,
      `Total Sessions: ${teacher.total_sessions}`,
      `Goals Achieved: ${teacher.goals_achieved}/${teacher.total_sessions}`,
      "",
      "Sessions:",
      ...teacher.sessions.flatMap(s => [
        `  ${s.class_name} · ${s.subject} · ${s.ended_at ? format(new Date(s.ended_at), "d MMM yyyy") : "—"}`,
        `  Coverage: ${s.coverage_score}% | Student Talk: ${100 - s.teacher_talk_ratio}% | Participation: ${s.student_participation_count}`,
        `  Objective: ${s.objective_text}`,
        `  Covered: ${s.concepts_covered.join(", ") || "—"}`,
        s.concepts_missed.length ? `  Missed: ${s.concepts_missed.join(", ")}` : "  All concepts covered",
        s.ai_coaching_note ? `  AI Note: ${s.ai_coaching_note}` : "",
        "",
      ].filter(Boolean)),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-${teacher.display_name.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const seed = teacher.user_id.charCodeAt(teacher.user_id.length - 1);
  const goalsPct = teacher.total_sessions > 0
    ? Math.round((teacher.goals_achieved / teacher.total_sessions) * 100)
    : 0;
  const goalsToneColor = goalsPct === 100 ? "#16A56B" : goalsPct >= 70 ? "#2E2BE5" : goalsPct >= 50 ? "#C77800" : "#DC2626";
  const lastSession = teacher.sessions[0];
  const trend = teacher.trend ?? 0;
  const trendData = teacher.trend_data ?? [];

  return (
    <>
      <div className={`cpa-trow${open ? " open" : ""}`} onClick={onToggle}>
        <button className="cpa-expander" aria-label={open ? "Collapse" : "Expand"}
          onClick={e => { e.stopPropagation(); onToggle(); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>

        <div className="cpa-teacher">
          <AvatarCPA name={teacher.display_name} seed={seed} size={40} />
          <div>
            <div className="tname">
              {teacher.display_name}
              {teacher.flagged && (
                <span style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  <PillCPA tone="bad" dot={false}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
                    Needs review
                  </PillCPA>
                </span>
              )}
            </div>
            <div className="trole">{teacher.department ?? "General"}</div>
          </div>
        </div>

        <div className="cpa-coverage-cell">
          <ScoreRingCPA score={teacher.avg_tes ?? teacher.avg_coverage} size={40} />
          <PillCPA tone={scoreTone(teacher.avg_tes ?? teacher.avg_coverage)} dot={false}>
            {(teacher.avg_tes ?? teacher.avg_coverage) >= 80 ? "High" : (teacher.avg_tes ?? teacher.avg_coverage) >= 65 ? "Steady" : (teacher.avg_tes ?? teacher.avg_coverage) >= 50 ? "Watch" : "Critical"}
          </PillCPA>
        </div>

        <div className="cpa-trend-cell">
          {trendData.length >= 2 && (
            <Sparkline data={trendData} width={80} height={26} color={scoreColor(teacher.avg_tes ?? teacher.avg_coverage)} />
          )}
          <span className="cpa-trend-num" style={{
            color: trend > 0 ? "#16A56B" : trend < 0 ? "#DC2626" : "rgba(15,23,42,.5)"
          }}>
            {trend > 0 ? "+" : ""}{trend}
          </span>
        </div>

        <div className="cpa-sessions-cell">
          <span className="sbig">{teacher.total_sessions}</span>
          <span className="ssmall">total</span>
          {(teacher.sessions_this_week ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: "rgba(15,23,42,.5)", fontWeight: 700, marginTop: 3 }}>
              {teacher.sessions_this_week} this week
            </div>
          )}
        </div>

        <div className="cpa-goals-cell">
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="gtxt">{teacher.goals_achieved}</span>
            <span style={{ fontSize: 11, color: "rgba(15,23,42,.5)", fontWeight: 700 }}>
              / {teacher.total_sessions}
            </span>
          </div>
          <div className="cpa-goal-bar">
            <i style={{ width: goalsPct + "%", background: goalsToneColor }} />
          </div>
        </div>

        <div className="cpa-last-cell">
          {lastSession?.ended_at ? (
            <>
              <div className="ldate">{format(new Date(lastSession.ended_at), "d MMM")}</div>
              <div className="lago">{formatAgo(lastSession.ended_at)}</div>
            </>
          ) : (
            <div className="lago">—</div>
          )}
        </div>

        <div className="cpa-actions-cell" onClick={e => e.stopPropagation()}>
          <button className="cpa-btn ghost" style={{ padding: "6px 8px" }} onClick={e => { e.stopPropagation(); handleExportTeacher(); }} title="Export teacher report">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="cpa-expand-shell">
          <div className="cpa-expand-inner">
            <div className="cpa-expand-head">
              <h4>Recent sessions · {teacher.sessions.length}</h4>
              <button className="cpa-btn ghost" style={{ padding: "6px 12px" }} onClick={handleExportTeacher}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>
                Export teacher report
              </button>
            </div>
            <table className="cpa-stable">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Class</th>
                  <th style={{ width: 110 }}>Subject</th>
                  <th>Objective</th>
                  <th style={{ width: 150 }}>Coverage</th>
                  <th style={{ width: 100 }}>Goals</th>
                  <th style={{ width: 70 }}>Date</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {teacher.sessions.map(s => {
                  const goalsOk = s.concepts_missed.length === 0;
                  return (
                    <tr key={s.id} onClick={() => onOpenSession(s, teacher)}>
                      <td><strong style={{ fontWeight: 800 }}>{s.class_name}</strong></td>
                      <td><PillCPA tone="subject" dot={false}>{s.subject}</PillCPA></td>
                      <td style={{ color: "rgba(15,23,42,.5)", fontWeight: 600, fontSize: 12.5, paddingRight: 14 }}>
                        {s.objective_text}
                      </td>
                      <td>
                        <div className="cpa-sub-cover">
                          <MiniBarCPA pct={s.coverage_score} width={64} />
                          <span className="cpa-pctxt" style={{ color: scoreColor(s.coverage_score) }}>{s.coverage_score}%</span>
                        </div>
                      </td>
                      <td>
                        {goalsOk ? (
                          <PillCPA tone="good" dot={false}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
                            Met
                          </PillCPA>
                        ) : (
                          <PillCPA tone="bad" dot={false}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                            {s.concepts_missed.length}
                          </PillCPA>
                        )}
                      </td>
                      <td style={{ color: "rgba(15,23,42,.5)", fontWeight: 700, fontSize: 12 }}>
                        {s.ended_at && format(new Date(s.ended_at), "d MMM")}
                      </td>
                      <td>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,.4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SchoolDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);

  // UI state
  const [period, setPeriod] = useState<"7d" | "30d" | "term" | "year">("30d");
  const [sortBy, setSortBy] = useState<"avg-desc" | "avg-asc" | "trend" | "sessions">("avg-desc");
  const [filter, setFilter] = useState<"all" | "top" | "watch" | "flagged">("all");
  const [openTeacher, setOpenTeacher] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSession, setDrawerSession] = useState<SessionData | null>(null);
  const [drawerTeacher, setDrawerTeacher] = useState<TeacherGroup | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
    const channel = supabase
      .channel("school-coverage-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conclusion_reports" }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const { data: cpUser } = await supabase
      .from("classpulse_users").select("school_name").eq("user_id", user!.id).single();
    const sName = cpUser?.school_name ?? null;
    setSchoolName(sName);

    let teacherQuery = supabase.from("classpulse_users").select("user_id").eq("role", "teacher");
    if (sName) teacherQuery = teacherQuery.eq("school_name", sName);
    const { data: teachers } = await teacherQuery;

    if (!teachers || teachers.length === 0) {
      setTeacherGroups(DEMO_TEACHER_GROUPS);
      setLoading(false); setRefreshing(false); return;
    }

    const teacherIds = teachers.map((t: any) => t.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", teacherIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    const { data: sessions } = await supabase
      .from("class_sessions")
      .select("id, teacher_id, class_name, subject, objective_text, key_concepts, started_at, ended_at, transcript_text, status")
      .in("teacher_id", teacherIds).eq("status", "completed").order("ended_at", { ascending: false });

    if (!sessions || sessions.length === 0) {
      setTeacherGroups(DEMO_TEACHER_GROUPS);
      setLoading(false); setRefreshing(false); return;
    }

    const sessionIds = sessions.map((s: any) => s.id);
    const { data: reports } = await supabase
      .from("conclusion_reports")
      .select("session_id, coverage_score, teaching_effectiveness_score, teacher_talk_ratio, student_participation_count, concepts_covered, concepts_missed, ai_coaching_note")
      .in("session_id", sessionIds);

    const reportMap = new Map((reports || []).map((r: any) => [r.session_id, r]));

    const merged: SessionData[] = sessions.map((s: any) => {
      const r = (reportMap.get(s.id) as any) || {};
      return {
        id: s.id, teacher_id: s.teacher_id, class_name: s.class_name, subject: s.subject,
        objective_text: s.objective_text || "", key_concepts: s.key_concepts || [],
        started_at: s.started_at, ended_at: s.ended_at, transcript_text: s.transcript_text,
        coverage_score: r.coverage_score ?? 0, teaching_effectiveness_score: r.teaching_effectiveness_score ?? r.coverage_score ?? 0, teacher_talk_ratio: r.teacher_talk_ratio ?? 0,
        student_participation_count: r.student_participation_count ?? 0,
        concepts_covered: r.concepts_covered ?? [], concepts_missed: r.concepts_missed ?? [],
        ai_coaching_note: r.ai_coaching_note ?? "",
      };
    });

    const groupMap = new Map<string, SessionData[]>();
    merged.forEach(s => {
      if (!groupMap.has(s.teacher_id)) groupMap.set(s.teacher_id, []);
      groupMap.get(s.teacher_id)!.push(s);
    });

    const groups: TeacherGroup[] = teacherIds
      .filter((id: string) => groupMap.has(id))
      .map((id: string, idx: number) => {
        const ts = groupMap.get(id)!;
        const avg = Math.round(ts.reduce((a, s) => a + s.coverage_score, 0) / ts.length);
        const avgTes = Math.round(ts.reduce((a, s) => a + (s.teaching_effectiveness_score ?? s.coverage_score), 0) / ts.length);
        return {
          user_id: id,
          display_name: profileMap.get(id) || `Teacher ${idx + 1}`,
          sessions: ts,
          avg_coverage: avg,
          avg_tes: avgTes,
          total_sessions: ts.length,
          goals_achieved: ts.filter(s => s.concepts_missed.length === 0).length,
          trend: 0,
          trend_data: Array(7).fill(avg),
          sessions_this_week: 0,
          department: "General",
          flagged: avg < 60,
        };
      })
      .sort((a: TeacherGroup, b: TeacherGroup) => b.avg_coverage - a.avg_coverage);

    setTeacherGroups([...groups, ...DEMO_TEACHER_GROUPS]);
    setLoading(false); setRefreshing(false);
  };

  // Period filter — slice sessions to the selected time window and recompute stats per teacher
  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : period === "term" ? 90 : 365;
  const periodStart = useMemo(() => subDays(new Date(), periodDays), [periodDays]);

  const periodGroups = useMemo(() =>
    teacherGroups
      .map(g => {
        const sessions = g.sessions.filter(s =>
          s.ended_at ? new Date(s.ended_at) >= periodStart : false
        );
        if (sessions.length === 0) return null;
        const avg = Math.round(sessions.reduce((a, s) => a + s.coverage_score, 0) / sessions.length);
        const avgTes = Math.round(sessions.reduce((a, s) => a + (s.teaching_effectiveness_score ?? s.coverage_score), 0) / sessions.length);
        return {
          ...g,
          sessions,
          total_sessions: sessions.length,
          goals_achieved: sessions.filter(s => s.concepts_missed.length === 0).length,
          avg_coverage: avg,
          avg_tes: avgTes,
          flagged: g.flagged || avgTes < 60,
        };
      })
      .filter((g): g is TeacherGroup => g !== null),
    [teacherGroups, periodStart]);

  // Derived — all from period-filtered groups
  const allSessions = useMemo(() => periodGroups.flatMap(g => g.sessions), [periodGroups]);
  const overallAvg = useMemo(() =>
    allSessions.length > 0 ? Math.round(allSessions.reduce((a, s) => a + (s.teaching_effectiveness_score ?? s.coverage_score), 0) / allSessions.length) : 0,
    [allSessions]);
  const avgStudentTalk = useMemo(() =>
    allSessions.length > 0 ? Math.round(allSessions.reduce((a, s) => a + (100 - s.teacher_talk_ratio), 0) / allSessions.length) : 0,
    [allSessions]);
  const totalGoalsAchieved = useMemo(() => allSessions.filter(s => s.concepts_missed.length === 0).length, [allSessions]);
  const flaggedCount = useMemo(() => periodGroups.filter(g => g.flagged || g.avg_coverage < 60).length, [periodGroups]);
  const avgParticipation = useMemo(() =>
    allSessions.length > 0 ? Math.round(allSessions.reduce((a, s) => a + s.student_participation_count, 0) / allSessions.length) : 0,
    [allSessions]);

  const subjectRows = useMemo(() => {
    const map = new Map<string, number[]>();
    allSessions.forEach(s => {
      if (!map.has(s.subject)) map.set(s.subject, []);
      map.get(s.subject)!.push(s.teaching_effectiveness_score ?? s.coverage_score);
    });
    return Array.from(map.entries())
      .map(([subject, scores]) => ({
        subject,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        sessions: scores.length,
        classes: new Set(allSessions.filter(s => s.subject === subject).map(s => s.class_name)).size,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [allSessions]);

  const counts = useMemo(() => ({
    all: periodGroups.length,
    top: periodGroups.filter(g => g.avg_coverage >= 85).length,
    watch: periodGroups.filter(g => g.avg_coverage >= 60 && g.avg_coverage < 80).length,
    flagged: periodGroups.filter(g => g.flagged || g.avg_coverage < 60).length,
  }), [periodGroups]);

  const filteredTeachers = useMemo(() => {
    let list = periodGroups.slice();
    if (filter === "top")     list = list.filter(g => g.avg_coverage >= 85);
    if (filter === "watch")   list = list.filter(g => g.avg_coverage >= 60 && g.avg_coverage < 80);
    if (filter === "flagged") list = list.filter(g => g.flagged || g.avg_coverage < 60);
    if (sortBy === "avg-desc")  list.sort((a, b) => b.avg_coverage - a.avg_coverage);
    if (sortBy === "avg-asc")   list.sort((a, b) => a.avg_coverage - b.avg_coverage);
    if (sortBy === "trend")     list.sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));
    if (sortBy === "sessions")  list.sort((a, b) => b.total_sessions - a.total_sessions);
    return list;
  }, [periodGroups, filter, sortBy]);

  const flaggedNames = useMemo(() =>
    periodGroups.filter(g => g.flagged || g.avg_coverage < 60).map(g => g.display_name.split(" ").slice(0, 2).join(" ")),
    [periodGroups]);

  const handleOpenSession = (s: SessionData, t: TeacherGroup) => {
    setDrawerSession(s); setDrawerTeacher(t); setDrawerOpen(true);
  };
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { setDrawerSession(null); setDrawerTeacher(null); }, 300);
  };

  const handleExport = () => {
    const lines = [
      "ClassPulse School Analytics Report",
      schoolName ? `School: ${schoolName}` : "School: SMK Tinggi Bukit Mertajam",
      `Generated: ${format(new Date(), "d MMM yyyy")}`,
      "",
      "Overall Performance",
      `Total Sessions: ${allSessions.length}`,
      `Average Coverage: ${overallAvg}%`,
      `Average Student Talk: ${avgStudentTalk}%`,
      `Goals Achieved: ${totalGoalsAchieved}/${allSessions.length}`,
      `Flagged (below 60%): ${flaggedCount}`,
      "",
      "Teacher Performance",
      teacherGroups.map(g => `${g.display_name}: ${g.total_sessions} sessions | avg ${g.avg_coverage}% | goals ${g.goals_achieved}/${g.total_sessions}`).join("\n"),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `classpulse-school-${format(new Date(), "yyyy-MM-dd")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // KPI sparklines (representative trend data)
  const kpiSpark = Array(12).fill(0).map((_, i) => Math.max(0, overallAvg - 10 + i));
  const talkSpark = Array(12).fill(0).map((_, i) => Math.max(0, avgStudentTalk - 8 + i));

  return (
    <>
      <style>{CPA_CSS}</style>
      <div className="cpa-wrap" style={{ fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif", fontWeight: 600, color: "#0F172A", background: "#F8F9FF", minHeight: "100vh" }}>
        <div className="cpa-page">

          {/* Page header */}
          <div className="cpa-ph">
            <div className="cpa-ph-left">
              <div className="cpa-ph-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7" rx="1"/><rect x="12" y="7" width="3" height="11" rx="1"/><rect x="17" y="13" width="3" height="5" rx="1"/>
                </svg>
              </div>
              <div>
                <div className="cpa-crumbs">
                  <span>School</span><span className="sep">›</span>
                  <span>{schoolName || "SMK Tinggi Bukit Mertajam"}</span><span className="sep">›</span>
                  <span style={{ color: "#0F172A" }}>Analytics</span>
                </div>
                <h1 className="cpa-ph-title">School Analytics Overview</h1>
                <p className="cpa-ph-sub">
                  Lesson coverage and engagement across{" "}
                  <strong style={{ color: "#0F172A", fontWeight: 800 }}>{teacherGroups.length} teachers</strong>
                  {" "}· last{" "}
                  <strong style={{ color: "#0F172A", fontWeight: 800 }}>
                    {period === "7d" ? "7 days" : period === "30d" ? "30 days" : period === "term" ? "term" : "year"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="cpa-toolbar">
              <div className="cpa-seg" role="tablist">
                {(["7d", "30d", "term", "year"] as const).map((k) => (
                  <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>
                    {k === "7d" ? "Week" : k === "30d" ? "Month" : k === "term" ? "Term" : "Year"}
                  </button>
                ))}
              </div>
              {refreshing && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 12, background: "rgba(46,43,229,.1)", border: "1px solid rgba(46,43,229,.2)", fontSize: 12, fontWeight: 800, color: "#2E2BE5" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                  Updating…
                </div>
              )}
              <button className="cpa-btn primary" onClick={handleExport} disabled={allSessions.length === 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E2BE5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
            </div>
          ) : (
            <>
              {/* Flagged banner */}
              {flaggedCount > 0 && (
                <div className="cpa-flag-banner">
                  <div className="fl">
                    <div className="fic">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
                    </div>
                    <div>
                      <h4>{flaggedCount} teacher{flaggedCount !== 1 ? "s" : ""} need attention this period</h4>
                      <p>
                        {flaggedNames.slice(0, 2).join(", ")}
                        {flaggedNames.length > 2 ? ` and ${flaggedNames.length - 2} more` : ""}
                        {" "}— average coverage below 60% or declining trend.
                      </p>
                    </div>
                  </div>
                  <button className="cpa-btn" onClick={() => setFilter("flagged")}>
                    Review flagged
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </div>
              )}

              {/* Hero KPIs */}
              <section className="cpa-hero" aria-label="Key metrics">
                <div className="cpa-hero-top">
                  <div className="hl">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M10 21v-5h4v5"/><circle cx="12" cy="10" r="1.2" fill="rgba(255,255,255,.8)" stroke="none"/>
                    </svg>
                    <h3>Overall School Performance</h3>
                  </div>
                  <div className="cpa-live-badge">
                    <span className="dot" />
                    Live · synced just now
                  </div>
                </div>
                <div className="cpa-kpis">
                  <KpiCPA label="Avg Effectiveness" value={`${overallAvg}%`} delta={3} spark={kpiSpark} />
                  <KpiCPA label="Student Talk" value={`${avgStudentTalk}%`} delta={5} spark={talkSpark} />
                  <KpiCPA label="Goals Hit" value={`${totalGoalsAchieved}`} sub={`/${allSessions.length}`} delta={-2} />
                  <KpiCPA label="Participation" value={`${avgParticipation}`} sub="/class" delta={2} />
                  <KpiCPA label="Flagged" value={`${flaggedCount}`} delta={1} invert />
                </div>
              </section>

              {/* Subject chart — full width */}
              {subjectRows.length > 0 && (
                <div className="cpa-card">
                  <div className="cpa-panel-h">
                    <h3>Performance by Subject</h3>
                    <div className="ph-right">{subjectRows.length} subject{subjectRows.length !== 1 ? "s" : ""} · sorted by coverage</div>
                  </div>
                  <div className="cpa-subjects" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "0 32px" }}>
                    {subjectRows.map(s => {
                      const tone = s.avg >= 80 ? "good" : s.avg >= 65 ? "" : s.avg >= 50 ? "warn" : "bad";
                      return (
                        <div key={s.subject} className="cpa-subject-row">
                          <div className="sname">{s.subject}</div>
                          <div className={`sbar ${tone}`}><i style={{ width: s.avg + "%" }} /></div>
                          <div className="spct">{s.avg}%</div>
                          <div className="sses">{s.sessions} sess · {s.classes} cls</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teacher table */}
              <div className="cpa-section-head" style={{ marginTop: 24 }}>
                <h2>Teacher Performance</h2>
                <div className="smeta">{filteredTeachers.length} of {periodGroups.length} teachers shown</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
                <div className="cpa-filters">
                  <button className={`cpa-chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
                    All <span className="cnt">{counts.all}</span>
                  </button>
                  <button className={`cpa-chip${filter === "top" ? " on" : ""}`} onClick={() => setFilter("top")}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#16A56B", display: "inline-block" }} />
                    High performers <span className="cnt">{counts.top}</span>
                  </button>
                  <button className={`cpa-chip${filter === "watch" ? " on" : ""}`} onClick={() => setFilter("watch")}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#C77800", display: "inline-block" }} />
                    Watch <span className="cnt">{counts.watch}</span>
                  </button>
                  <button className={`cpa-chip${filter === "flagged" ? " on" : ""}`} onClick={() => setFilter("flagged")}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#DC2626", display: "inline-block" }} />
                    Needs review <span className="cnt">{counts.flagged}</span>
                  </button>
                </div>
                <div className="cpa-seg" role="tablist" aria-label="Sort">
                  <button className={sortBy === "avg-desc" ? "on" : ""} onClick={() => setSortBy("avg-desc")}>Top</button>
                  <button className={sortBy === "avg-asc" ? "on" : ""}  onClick={() => setSortBy("avg-asc")}>Bottom</button>
                  <button className={sortBy === "trend" ? "on" : ""}    onClick={() => setSortBy("trend")}>Trend</button>
                  <button className={sortBy === "sessions" ? "on" : ""} onClick={() => setSortBy("sessions")}>Activity</button>
                </div>
              </div>

              <div className="cpa-table-card">
                <div className="cpa-thead">
                  <div></div>
                  <div>Teacher</div>
                  <div>Effectiveness</div>
                  <div>30-day trend</div>
                  <div>Sessions</div>
                  <div>Goals</div>
                  <div>Last seen</div>
                  <div></div>
                </div>
                {filteredTeachers.length === 0 ? (
                  <div className="cpa-empty-row">No teachers match this filter.</div>
                ) : (
                  filteredTeachers.map(t => (
                    <TeacherTableRow
                      key={t.user_id}
                      teacher={t}
                      open={openTeacher === t.user_id}
                      onToggle={() => setOpenTeacher(openTeacher === t.user_id ? null : t.user_id)}
                      onOpenSession={handleOpenSession}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1.5px solid rgba(15,23,42,.10)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 11.5, fontWeight: 700, color: "rgba(15,23,42,.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>ClassPulse · School Analytics</div>
                <div>Data refreshes every 5 minutes</div>
              </div>
            </>
          )}
        </div>
      </div>

      <SessionDrawer open={drawerOpen} onClose={handleCloseDrawer} session={drawerSession} teacher={drawerTeacher} />

      {/* Spin animation for loader */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
