import { useState, useEffect, useCallback } from "react";
import { usePomodoro, WORK_SECS, BREAK_SECS } from "@/context/PomodoroContext";
import {
  X, Plus, Sparkles, BookOpen, Check, Trash2,
  Bell, CalendarClock, Flag, ChevronDown, ChevronUp, Rocket,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  format, parseISO, isPast,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/* ── brand colours ──────────────────────────────────────────────────────── */
const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF",
  cloud: "#F3FAFF", sun: "#FFD65C", pop: "#FF7A59",
};

/* ── shared styles ──────────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const STICKER = "border-[3px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const STICKER_SM = "border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[3px_3px_0_0_#0F172A] bg-white";
const BTN = "inline-flex items-center justify-center gap-2.5 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none";
const BTN_SM = "inline-flex items-center justify-center gap-2 font-bold font-['Baloo_2'] border-[2.5px] border-[#0F172A] rounded-full px-4 py-2.5 shadow-[3px_3px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none text-sm";
const TAG = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-[11px]";

/* ── types ──────────────────────────────────────────────────────────────── */
interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  deckName?: string;
  subject?: string | null;
  accuracy?: number;
  wrongQuestions?: string[];
}

interface Goal {
  id: string;
  user_id: string;
  text: string;
  date: string;
  deadline: string | null;
  reminder_at: string | null;
  reminder_sent: boolean;
  priority: "low" | "medium" | "high";
  completed: boolean;
  created_at: string;
}

type Priority = "low" | "medium" | "high";

/* ── priority config ────────────────────────────────────────────────────── */
const P_CFG: Record<Priority, { label: string; bg: string; text: string; accent: string }> = {
  low:    { label: "Low",    bg: C.cyan,  text: C.ink,  accent: "#0e7490" },
  medium: { label: "Medium", bg: C.sun,   text: C.ink,  accent: "#92400e" },
  high:   { label: "High",   bg: C.pop,   text: "#fff", accent: "#9a1c1c" },
};

const toISOTimestamp = (date: string, time: string) =>
  new Date(`${date}T${time}`).toISOString();

const buildAiMessage = (deckName: string, accuracy: number): string => {
  if (accuracy >= 85)
    return `Outstanding on "${deckName}"! You've nailed most of it. Let's lock in the last gaps with a focused sprint.`;
  if (accuracy >= 60)
    return `Good progress on "${deckName}" — ${accuracy}%. The questions you missed are the fastest path to a higher score.`;
  return `I've analysed "${deckName}". You scored ${accuracy}% — a 3-day sprint can make a real difference here.`;
};

/* ══════════════════════════════════════════════════════════════════════════
   ADD GOAL FORM
══════════════════════════════════════════════════════════════════════════ */
interface AddGoalFormProps {
  selectedDate: Date;
  suggestions: { id: string; label: string }[];
  onSave: (goal: { text: string; priority: Priority; deadline: string | null; reminder_at: string | null }) => Promise<void>;
  onCancel: () => void;
}

const AddGoalForm = ({ selectedDate, suggestions, onSave, onCancel }: AddGoalFormProps) => {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(format(selectedDate, "yyyy-MM-dd"));
  const [reminderTime, setReminderTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onSave({
      text: text.trim(),
      priority,
      deadline: hasDeadline ? toISOTimestamp(deadlineDate, deadlineTime) : null,
      reminder_at: hasReminder ? toISOTimestamp(reminderDate, reminderTime) : null,
    });
    setSaving(false);
  };

  const inputCls = "rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] focus:shadow-[4px_4px_0_0_#0F172A] transition-shadow bg-white text-sm font-medium placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-[#2F7CFF]";

  return (
    <div className={`${STICKER} p-5 space-y-5`} style={{ background: C.cloud }}>

      {/* Goal text */}
      <div className="space-y-2">
        <label className={`${DISPLAY} font-extrabold text-sm block`}>What's your goal?</label>
        <Input
          placeholder="e.g. Finish Chapter 3 revision…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quick-add</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setText(s.label)}
                className={`${TAG} bg-white hover:bg-[#DDF3FF] transition-colors cursor-pointer`}
              >
                {s.label.length > 38 ? s.label.slice(0, 38) + "…" : s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority */}
      <div className="space-y-2">
        <label className={`${DISPLAY} font-extrabold text-sm flex items-center gap-1.5`}>
          <Flag className="w-3.5 h-3.5" /> Priority
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["low", "medium", "high"] as Priority[]).map((p) => {
            const cfg = P_CFG[p];
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "py-3 rounded-[16px] border-[2.5px] border-[#0F172A] font-extrabold font-['Baloo_2'] text-sm transition-all duration-150 cursor-pointer",
                  active
                    ? "shadow-[3px_3px_0_0_#0F172A] -translate-y-0.5"
                    : "bg-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A]"
                )}
                style={active ? { background: cfg.bg, color: cfg.text } : {}}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setHasDeadline((v) => !v)}
          className="flex items-center gap-2 cursor-pointer w-full"
        >
          <CalendarClock className="w-4 h-4 text-slate-500" />
          <span className={`${DISPLAY} font-bold text-sm text-slate-600`}>Deadline</span>
          <span className="text-xs text-slate-400 font-medium">(optional)</span>
          <div className="ml-auto">{hasDeadline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
        </button>
        {hasDeadline && (
          <div className="flex gap-2">
            <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)}
              className="flex-1 rounded-[14px] border-[2.5px] border-[#0F172A] bg-white px-3 py-2.5 text-sm font-medium shadow-[2px_2px_0_0_#0F172A] focus:outline-none focus:border-[#2F7CFF]" />
            <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-28 rounded-[14px] border-[2.5px] border-[#0F172A] bg-white px-3 py-2.5 text-sm font-medium shadow-[2px_2px_0_0_#0F172A] focus:outline-none focus:border-[#2F7CFF]" />
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setHasReminder((v) => !v)}
          className="flex items-center gap-2 cursor-pointer w-full"
        >
          <Bell className="w-4 h-4 text-slate-500" />
          <span className={`${DISPLAY} font-bold text-sm text-slate-600`}>Reminder</span>
          <span className="text-xs text-slate-400 font-medium">(optional)</span>
          <div className="ml-auto">{hasReminder ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
        </button>
        {hasReminder && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1 rounded-[14px] border-[2.5px] border-[#0F172A] bg-white px-3 py-2.5 text-sm font-medium shadow-[2px_2px_0_0_#0F172A] focus:outline-none focus:border-[#2F7CFF]" />
              <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                className="w-28 rounded-[14px] border-[2.5px] border-[#0F172A] bg-white px-3 py-2.5 text-sm font-medium shadow-[2px_2px_0_0_#0F172A] focus:outline-none focus:border-[#2F7CFF]" />
            </div>
            <p className="text-xs font-medium text-slate-400">You'll get a notification at this time.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button className={`${BTN_SM} flex-1 bg-white`} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className={`${BTN_SM} flex-1 text-white`}
          style={{ background: !text.trim() || saving ? "#94a3b8" : C.blue }}
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {saving ? "Saving…" : "Save Goal"}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   GOAL CARD
══════════════════════════════════════════════════════════════════════════ */
interface GoalCardProps {
  goal: Goal;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const GoalCard = ({ goal, onToggleComplete, onDelete }: GoalCardProps) => {
  const cfg = P_CFG[goal.priority];

  return (
    <div
      className={cn(
        "rounded-[20px] border-[3px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white p-4 flex gap-3 transition-all duration-200",
        goal.completed && "opacity-55"
      )}
    >
      {/* Priority accent bar */}
      <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ background: cfg.bg }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(`font-semibold text-sm leading-snug ${DISPLAY}`, goal.completed && "line-through text-slate-400")}>
            {goal.text}
          </p>
          {/* Actions — 44×44px touch targets */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onToggleComplete(goal.id, !goal.completed)}
              className="w-11 h-11 -mr-1 flex items-center justify-center cursor-pointer"
              aria-label={goal.completed ? "Mark incomplete" : "Mark complete"}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-[12px] border-[2.5px] border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0_0_#0F172A] transition-all duration-150",
                  goal.completed ? "" : "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A]"
                )}
                style={goal.completed ? { background: C.blue } : { background: C.skySoft }}
              >
                <Check className={cn("w-4 h-4 transition-all duration-150", goal.completed ? "text-white opacity-100" : "text-[#0F172A] opacity-30")} />
              </div>
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="w-11 h-11 flex items-center justify-center cursor-pointer group"
              aria-label="Delete goal"
            >
              <div className="w-8 h-8 rounded-[12px] border-[2.5px] border-[#0F172A] bg-white flex items-center justify-center shadow-[2px_2px_0_0_#0F172A] transition-all duration-150 group-hover:bg-red-50 group-hover:-translate-y-0.5">
                <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className={`${TAG}`} style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
          </span>
          {goal.deadline && (
            <span className={`${TAG} bg-white text-slate-600`}>
              <CalendarClock className="w-3 h-3" />
              Due {format(parseISO(goal.deadline), "d MMM, HH:mm")}
              {isPast(parseISO(goal.deadline)) && !goal.completed && (
                <span className="font-extrabold" style={{ color: C.pop }}>overdue</span>
              )}
            </span>
          )}
          {goal.reminder_at && (
            <span className={`${TAG} bg-white text-slate-600`}>
              <Bell className="w-3 h-3" />
              {goal.reminder_sent ? "Reminded" : format(parseISO(goal.reminder_at), "d MMM, HH:mm")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   POMODORO TIMER  (state lives in PomodoroContext — persists across pages)
══════════════════════════════════════════════════════════════════════════ */
const PomodoroTimer = () => {
  const { mode, secs, active, done, sessions, toggle, reset, switchMode, setModeManual } = usePomodoro();

  const total    = mode === "work" ? WORK_SECS : BREAK_SECS;
  const progress = (total - secs) / total;
  const R        = 52;
  const CIRC     = 2 * Math.PI * R;
  const offset   = CIRC * (1 - progress);
  const mins     = Math.floor(secs / 60);
  const ss       = secs % 60;
  const col      = mode === "work" ? C.blue : "#22c55e";

  return (
    <div className={`${STICKER} p-5`} style={{ background: C.cloud }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`${DISPLAY} font-extrabold text-base`}>Pomodoro 🍅</p>
          <p className="text-xs font-semibold text-slate-400">{sessions} session{sessions !== 1 ? "s" : ""} completed</p>
        </div>
        <div className="flex gap-1.5">
          {(["work", "break"] as const).map(m => (
            <button
              key={m}
              onClick={() => setModeManual(m)}
              className={cn(
                "px-3 py-1.5 rounded-full border-[2px] border-[#0F172A] text-xs font-extrabold font-['Baloo_2'] cursor-pointer transition-all",
                mode === m ? "shadow-[2px_2px_0_0_#0F172A] -translate-y-0.5" : "opacity-40 bg-white"
              )}
              style={mode === m ? { background: col, color: "#fff" } : {}}
            >
              {m === "work" ? "Focus" : "Break"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#E2E8F0" strokeWidth="9" />
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke={done ? "#22c55e" : col}
              strokeWidth="9" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {done ? (
              <span className="text-3xl">🎉</span>
            ) : (
              <>
                <span className={`${DISPLAY} font-extrabold text-2xl leading-none`} style={{ color: col }}>
                  {String(mins).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                  {mode === "work" ? "focus" : "break"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2.5">
          {done ? (
            <button className={`${BTN_SM} w-full text-white`} style={{ background: "#22c55e" }} onClick={switchMode}>
              {mode === "work" ? "☕ Start break" : "🎯 Focus again"}
            </button>
          ) : (
            <button
              className={`${BTN_SM} w-full`}
              style={{ background: active ? "#fff" : col, color: active ? C.ink : "#fff" }}
              onClick={toggle}
            >
              {active ? "⏸ Pause" : "▶ Start"}
            </button>
          )}
          <button className={`${BTN_SM} w-full bg-white`} onClick={reset}>↺ Reset</button>
          <p className="text-[10px] font-semibold text-slate-400 text-center">
            {mode === "work" ? "25 min focus" : "5 min break"}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── heat helpers ───────────────────────────────────────────────────────── */
const getHeatStyle = (count: number): { bg: string; text: string } => {
  if (count === 0) return { bg: "#ebedf0", text: "#57606a" };
  if (count === 1) return { bg: "#4575b4", text: "#fff"     };
  if (count <= 3) return { bg: "#74c476", text: "#1a3a1a"  };
  if (count <= 5) return { bg: "#fecc5c", text: "#5a3a00"  };
  return             { bg: "#d7191c", text: "#fff"     };
};

/* ══════════════════════════════════════════════════════════════════════════
   HEATMAP CALENDAR
══════════════════════════════════════════════════════════════════════════ */
interface HeatmapCalendarProps {
  selectedDate: Date;
  viewMonth: Date;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (month: Date) => void;
  goalsDateSet: Set<string>;
  activityMap: Record<string, number>;
}

const HeatmapCalendar = ({
  selectedDate, viewMonth, onSelectDate, onChangeMonth, goalsDateSet, activityMap,
}: HeatmapCalendarProps) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays    = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  return (
    <div className={`${STICKER}`} style={{ overflow: "visible" }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b-[2.5px] border-[#0F172A]" style={{ background: C.cloud }}>
        <button
          onClick={() => onChangeMonth(subMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] border-[2px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={`${DISPLAY} font-extrabold text-base`}>{format(viewMonth, "MMMM yyyy")}</span>
        <button
          onClick={() => onChangeMonth(addMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] border-[2px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b-[2px] border-[#0F172A]" style={{ background: "#f6f8fa" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className={`text-center text-[10px] font-extrabold py-1.5 ${DISPLAY}`} style={{ color: C.ink, opacity: 0.45 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid grid-cols-7"
          style={{ borderBottom: wi < weeks.length - 1 ? "1px solid rgba(15,23,42,0.07)" : "none" }}
        >
          {week.map((day, di) => {
            const dateStr    = format(day, "yyyy-MM-dd");
            const count      = activityMap[dateStr] || 0;
            const heat       = getHeatStyle(count);
            const inMonth    = isSameMonth(day, viewMonth);
            const isSelected = isSameDay(day, selectedDate);
            const todayDay   = isToday(day);
            const hasGoal    = goalsDateSet.has(dateStr);
            const isHovered  = hoveredDate === dateStr;
            const quizLabel  = count === 1 ? "1 quiz" : count > 1 ? `${count} quizzes` : "No quizzes";

            return (
              <button
                key={di}
                onClick={() => onSelectDate(day)}
                onMouseEnter={() => setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                className="relative flex flex-col items-center justify-center cursor-pointer"
                style={{
                  background: heat.bg,
                  borderLeft: di > 0 ? "1px solid rgba(15,23,42,0.07)" : "none",
                  opacity: inMonth ? 1 : 0.25,
                  minHeight: 54,
                  paddingTop: 6,
                  paddingBottom: hasGoal ? 14 : 6,
                  zIndex: isSelected || isHovered ? 10 : 1,
                  outline: isSelected
                    ? "3px solid #2F7CFF"
                    : todayDay
                    ? "2px dashed #2F7CFF"
                    : "none",
                  outlineOffset: isSelected ? "-3px" : "-2px",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  boxShadow: isSelected
                    ? "0 4px 14px rgba(47,124,255,0.45)"
                    : "none",
                  transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease, outline 0.1s ease",
                }}
              >
                {/* Hover tooltip */}
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap pointer-events-none z-20"
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}
                  >
                    <div
                      className="px-2 py-1 rounded-[8px] border-[1.5px] border-[#0F172A] text-[10px] font-bold"
                      style={{ background: "#0F172A", color: "#fff" }}
                    >
                      {format(day, "d MMM")} · {quizLabel}
                    </div>
                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="w-2 h-2 rotate-45 border-r-[1.5px] border-b-[1.5px] border-[#0F172A]" style={{ background: "#0F172A", marginTop: -5 }} />
                    </div>
                  </div>
                )}

                <span
                  className={`${DISPLAY} font-bold text-[13px] leading-none`}
                  style={{ color: isSelected ? "#2F7CFF" : heat.text, fontWeight: isSelected ? 900 : 700 }}
                >
                  {format(day, "d")}
                </span>

                {/* Quiz description label */}
                {count > 0 && (
                  <span
                    className="text-[8px] font-semibold leading-none mt-[3px]"
                    style={{ color: isSelected ? "#2F7CFF" : heat.text, opacity: isSelected ? 1 : 0.8 }}
                  >
                    {count} quiz{count !== 1 ? "zes" : ""}
                  </span>
                )}

                {/* Goal dot */}
                {hasGoal && (
                  <div
                    className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full"
                    style={{ background: C.blue }}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-[#0F172A]/10" style={{ background: "#f6f8fa" }}>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-0.5">Less</span>
        {[0, 1, 2, 4, 6].map((n) => {
          const { bg } = getHeatStyle(n);
          return <div key={n} className="w-3 h-3 rounded-[3px] border border-black/10" style={{ background: bg }} />;
        })}
        <span className="text-[9px] font-bold text-slate-400 ml-0.5">More</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-[5px] h-[5px] rounded-full bg-[#2F7CFF]" />
          <span className="text-[9px] font-bold text-slate-400">goal</span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export const GoalSheet = ({
  open,
  onClose,
  deckName = "",
  subject = null,
  accuracy = -1,
  wrongQuestions = [],
}: GoalSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStandalone = !deckName;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [quizActivityMap, setQuizActivityMap] = useState<Record<string, number>>({});

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("goals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    if (!error && data) setGoals(data as unknown as Goal[]);
    setIsLoading(false);
  }, [user]);

  const loadQuizActivity = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("quiz_performance_results" as any)
      .select("completed_at")
      .eq("user_id", user.id);
    if (data) {
      const map: Record<string, number> = {};
      (data as { completed_at: string }[]).forEach((r) => {
        if (!r.completed_at) return;
        const d = format(new Date(r.completed_at), "yyyy-MM-dd");
        map[d] = (map[d] || 0) + 1;
      });
      setQuizActivityMap(map);
    }
  }, [user]);

  useEffect(() => { if (open) loadGoals(); }, [open, loadGoals]);
  useEffect(() => { if (open) loadQuizActivity(); }, [open, loadQuizActivity]);

  const goalsDateSet = new Set(goals.map((g) => g.date));
  const goalsForDate = goals.filter((g) => g.date === format(selectedDate, "yyyy-MM-dd"));

  const suggestions = [
    ...(deckName ? [{ id: "retake", label: `Retake "${deckName}"` }] : []),
    { id: "omr",    label: "Scan OMR Practice Sheet" },
    { id: "ar",     label: "Review 3D Model (AR Scanner)" },
    ...(isStandalone
      ? [{ id: "quiz", label: "Take a Quiz" }, { id: "browse", label: "Browse Study Materials" }]
      : []),
    ...wrongQuestions.slice(0, 2).map((q, i) => ({
      id: `wrong-${i}`,
      label: `Review: "${q.length > 38 ? q.slice(0, 38) + "…" : q}"`,
    })),
  ];

  const handleSaveGoal = async (fields: { text: string; priority: Priority; deadline: string | null; reminder_at: string | null }) => {
    if (!user) return;
    const { data, error } = await supabase.from("goals" as any).insert({
      user_id: user.id, text: fields.text,
      date: format(selectedDate, "yyyy-MM-dd"),
      priority: fields.priority, deadline: fields.deadline,
      reminder_at: fields.reminder_at, reminder_sent: false, completed: false,
    }).select().single();
    if (error) { toast({ title: "Failed to save goal", variant: "destructive" }); return; }
    setGoals((prev) => [...prev, data as unknown as Goal]);
    setIsAdding(false);
    toast({ title: "Goal saved! 🎯" });
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, completed } : g)));
    await supabase.from("goals" as any).update({ completed }).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("goals" as any).delete().eq("id", id);
    toast({ title: "Goal removed" });
  };

  if (!open) return null;

  const completedCount = goals.filter((g) => g.completed).length;
  const remainingCount = goals.filter((g) => !g.completed).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm gs-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] border-t-[3px] border-x-[3px] border-[#0F172A] shadow-[0_-6px_0_0_#0F172A] gs-sheet-in"
        style={{ maxHeight: "93dvh", overflowY: "auto", background: C.cloud, fontFamily: "Nunito, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Keyframes */}
        <style>{`
          @keyframes gs-sheet-in {
            0%   { transform: translateY(100%); }
            55%  { transform: translateY(-14px); }
            75%  { transform: translateY(6px); }
            90%  { transform: translateY(-3px); }
            100% { transform: translateY(0); }
          }
          .gs-sheet-in { animation: gs-sheet-in 0.52s cubic-bezier(0.22,1,0.36,1) both; }

          @keyframes gs-backdrop { from{opacity:0} to{opacity:1} }
          .gs-backdrop { animation: gs-backdrop 0.25s ease both; }

          @keyframes gs-handle {
            0%   { transform: scaleX(0.2); opacity: 0; }
            65%  { transform: scaleX(1.3); opacity: 1; }
            100% { transform: scaleX(1);   opacity: 1; }
          }
          .gs-handle { animation: gs-handle 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.28s both; }

          @keyframes gs-pop { 0%{opacity:0;transform:scale(0.92) translateY(12px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
          .gs-pop { animation: gs-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
          @keyframes gs-stagger { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .gs-stagger { animation: gs-stagger 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        `}</style>

        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2 sticky top-0 z-10 rounded-t-[25px]" style={{ background: C.cloud }}>
          <div className="w-12 h-1.5 rounded-full bg-[#0F172A]/20 gs-handle" />
        </div>

        <div className="px-5 pb-10 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 pt-1 gs-pop">
            <div>
              <h2 className={`${DISPLAY} font-extrabold text-2xl leading-none`}>My Goals 🎯</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Plan your study sprint</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-[14px] border-[2.5px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_4px_0_0_#0F172A] transition-all duration-150 mt-0.5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* AI insight card */}
          <div className={`${STICKER} p-4 gs-pop`} style={{ animationDelay: "60ms", background: C.indigo, borderColor: C.ink }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-[10px] border-[2px] border-white/30 bg-white/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={`${DISPLAY} font-extrabold text-sm text-white`}>Ace AI</span>
            </div>
            <p className="text-sm font-medium text-white/90 leading-relaxed">
              {isStandalone
                ? "Pick a day on the calendar, set your study goals, choose a priority, and I'll remind you at the right time."
                : buildAiMessage(deckName, accuracy)}
            </p>
          </div>

          {/* Heatmap Calendar */}
          <div className="gs-pop" style={{ animationDelay: "100ms" }}>
            <HeatmapCalendar
              selectedDate={selectedDate}
              viewMonth={viewMonth}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setIsAdding(false);
                if (!isSameMonth(d, viewMonth)) setViewMonth(d);
              }}
              onChangeMonth={setViewMonth}
              goalsDateSet={goalsDateSet}
              activityMap={quizActivityMap}
            />
          </div>

          {/* Date + Stats strip */}
          <div className="flex items-center gap-2 gs-pop" style={{ animationDelay: "140ms" }}>
            {/* Selected date chip */}
            <div className={`${STICKER_SM} px-3 py-2 shrink-0 text-center`} style={{ background: C.cyan }}>
              <div className={`${DISPLAY} font-extrabold text-2xl leading-none`} style={{ color: C.ink }}>
                {format(selectedDate, "d")}
              </div>
              <div className={`${DISPLAY} font-bold text-[10px] leading-tight mt-0.5`} style={{ color: C.ink }}>
                {format(selectedDate, "MMM ''yy")}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: C.ink, opacity: 0.5 }}>
                {format(selectedDate, "EEE")}
              </div>
            </div>

            {/* Stats */}
            {[
              { label: "Total", value: goals.length,  bg: C.blue,    tc: "#fff" },
              { label: "Done",  value: completedCount, bg: "#22c55e", tc: "#fff" },
              { label: "Left",  value: remainingCount, bg: C.sun,     tc: C.ink  },
            ].map(({ label, value, bg, tc }) => (
              <div key={label} className={`${STICKER_SM} px-3 py-2 flex-1 text-center`} style={{ background: bg }}>
                <div className={`${DISPLAY} font-extrabold text-2xl leading-none`} style={{ color: tc }}>{value}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: tc, opacity: 0.7 }}>{label}</div>
              </div>
            ))}

            {/* Add goal button */}
            {!isAdding && (
              <button
                className={`${BTN_SM} shrink-0 text-white`}
                style={{ background: C.indigo }}
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {/* Goals list for selected date */}
          <div className="space-y-3 gs-pop" style={{ animationDelay: "160ms" }}>
            <p className={`${DISPLAY} font-extrabold text-base`}>
              Goals for{" "}
              <span style={{ color: C.blue }}>{format(selectedDate, "d MMM")}</span>
            </p>

            {/* Loading skeletons */}
            {isLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-[20px] border-[3px] border-[#0F172A]/20 bg-white/60 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && goalsForDate.length === 0 && !isAdding && (
              <div className={`${STICKER} p-6 text-center`}>
                <div className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center mx-auto mb-3" style={{ background: C.skySoft }}>
                  <BookOpen className="w-6 h-6" style={{ color: C.blue }} />
                </div>
                <p className={`${DISPLAY} font-extrabold text-base`}>Nothing here yet</p>
                <p className="text-xs font-medium text-slate-500 mt-1">Tap Add Goal above to set a target for this day.</p>
              </div>
            )}

            {/* Goals list */}
            {!isLoading && goalsForDate.length > 0 && (
              <div className="space-y-2">
                {goalsForDate.map((g, i) => (
                  <div key={g.id} className="gs-stagger" style={{ animationDelay: `${i * 50}ms` }}>
                    <GoalCard goal={g} onToggleComplete={handleToggleComplete} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            {isAdding && (
              <div className="gs-pop">
                <AddGoalForm
                  selectedDate={selectedDate}
                  suggestions={suggestions}
                  onSave={handleSaveGoal}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            )}
          </div>

          {/* Pomodoro timer */}
          <PomodoroTimer />

          {/* Done CTA */}
          <button className={`${BTN} w-full text-white`} style={{ background: C.blue }} onClick={onClose}>
            Done — let's study! <Rocket className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};
