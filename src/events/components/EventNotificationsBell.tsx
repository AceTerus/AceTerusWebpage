import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell, X, CheckCheck, Sparkles, Calendar, CheckCircle2,
  XCircle, AlertTriangle, Clock, Heart, MessageCircle,
  UserPlus, BookOpen, Flame, Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEventNotifications, EventNotification } from "../context/EventNotificationsContext";

const C = {
  ink: "#0F172A", blue: "#2F7CFF", cyan: "#3BD6F5",
  indigo: "#2E2BE5", sky: "#DDF3FF", pop: "#FF7A59",
};

/* ── per-type config ─────────────────────────────────────────────────── */
type Cfg = { bg: string; color: string; Icon: React.ElementType };

const TYPE_CFG: Record<string, Cfg> = {
  event_registration_approved: { bg: "#D1FAE5", color: "#059669", Icon: CheckCircle2  },
  event_registration_rejected: { bg: "#FFE4E6", color: "#DC2626", Icon: XCircle       },
  event_cancelled:             { bg: "#FEF3C7", color: "#B45309", Icon: AlertTriangle  },
  event_reminder:              { bg: "#DDF3FF", color: "#2F7CFF", Icon: Calendar       },
  // main-app types rendered gracefully if they appear
  follow:                      { bg: C.sky,     color: C.blue,    Icon: UserPlus       },
  like:                        { bg: "#FFE4E6", color: C.pop,     Icon: Heart          },
  comment:                     { bg: "#D1FAE5", color: "#15803d", Icon: MessageCircle  },
  material_like:               { bg: "#FFE4E6", color: C.pop,     Icon: Heart          },
  material_comment:            { bg: "#D1FAE5", color: "#15803d", Icon: MessageCircle  },
  quiz_published:              { bg: "#D6D4FF", color: C.indigo,  Icon: BookOpen       },
  streak_milestone:            { bg: "#FEF3C7", color: "#B45309", Icon: Flame          },
  streak_broken:               { bg: "#FFE4D6", color: C.pop,     Icon: AlertTriangle  },
  goal_reminder:               { bg: "#FEF9C3", color: "#92400e", Icon: Target         },
};

const fallbackCfg: Cfg = { bg: C.sky, color: C.blue, Icon: Bell };

/* ── notification text ───────────────────────────────────────────────── */
function notifText(n: EventNotification): string {
  const m = n.metadata ?? {};
  const title = m.event_title ? `"${m.event_title}"` : "an event";
  switch (n.type) {
    case "event_registration_approved": return `Your registration for ${title} was approved ✓`;
    case "event_registration_rejected": return `Your registration for ${title} was not accepted`;
    case "event_cancelled":             return `${title} has been cancelled`;
    case "event_reminder":              return `${title} starts in 7 days — see you there!`;
    case "follow":                      return "started following you";
    case "like":                        return "liked your post";
    case "comment":                     return "commented on your post";
    case "material_like":               return "liked your material";
    case "material_comment":            return "commented on your material";
    case "quiz_published":              return `New quiz: ${m.category_name ?? ""}`;
    case "streak_milestone":            return `${m.streak}-day streak reached! 🔥`;
    case "streak_broken":               return `Your ${m.old_streak}-day streak was broken`;
    case "goal_reminder":               return `Reminder: "${(m.text ?? "").slice(0, 40)}"`;
    default:                            return "You have a new notification";
  }
}

/* ── link target ─────────────────────────────────────────────────────── */
function notifHref(n: EventNotification): string {
  const m = n.metadata ?? {};
  switch (n.type) {
    case "event_registration_approved":
    case "event_registration_rejected": return "/my-events";
    case "event_cancelled":             return "/";
    case "event_reminder":              return m.event_id ? `/event/${m.event_id}` : "/my-events";
    default:                            return "/";
  }
}

const isSelf = (type: string) =>
  ["event_reminder", "streak_milestone", "streak_broken", "quiz_published", "goal_reminder"].includes(type);

/* ── single row ──────────────────────────────────────────────────────── */
const NotifRow = ({ n, onRead, onClose }: {
  n: EventNotification;
  onRead: (id: string) => void;
  onClose: () => void;
}) => {
  const cfg  = TYPE_CFG[n.type] ?? fallbackCfg;
  const Icon = cfg.Icon;
  const self = isSelf(n.type);
  const actor = n.actor;
  const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  return (
    <Link
      to={notifHref(n)}
      onClick={() => { if (!n.read) onRead(n.id); onClose(); }}
      className="block"
    >
      <div className={`flex items-start gap-3 px-4 py-3 border-b border-[#0F172A]/05 transition-colors hover:bg-slate-50 ${!n.read ? "bg-[#F0F7FF]" : "bg-white"}`}>
        {/* Icon / avatar */}
        <div className="relative shrink-0">
          {self || !actor ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]" style={{ background: cfg.bg }}>
              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            </span>
          ) : (
            <>
              <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
                <AvatarImage src={actor.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="font-extrabold text-sm" style={{ background: cfg.bg, color: cfg.color }}>
                  {(actor.username ?? "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[2px] border-white flex items-center justify-center" style={{ background: cfg.bg }}>
                <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
              </span>
            </>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug text-[#0F172A]">
            {!self && actor?.username && <span className="font-bold">{actor.username} </span>}
            <span className={self ? "font-semibold" : "text-slate-600"}>{notifText(n)}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">{timeAgo}</p>
        </div>

        {/* Unread dot */}
        {!n.read && <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: C.blue }} />}
      </div>
    </Link>
  );
};

/* ── bell button + panel ─────────────────────────────────────────────── */
export const EventNotificationsBell = () => {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useEventNotifications();
  const [open, setOpen] = useState(false);
  const bellRef  = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const openPanel = () => {
    if (!bellRef.current) return;
    const r = bellRef.current.getBoundingClientRect();
    const panelW = 320;
    const panelH = Math.min(500, window.innerHeight - 32);
    // Position to the left if too close to right edge
    const left = r.right + 10 + panelW > window.innerWidth
      ? r.left - panelW - 10
      : r.right + 10;
    const top  = Math.min(r.top, window.innerHeight - panelH - 16);
    setPos({ top, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (bellRef.current?.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      const panelW = 320;
      const panelH = Math.min(500, window.innerHeight - 32);
      const left = r.right + 10 + panelW > window.innerWidth ? r.left - panelW - 10 : r.right + 10;
      setPos({ top: Math.min(r.top, window.innerHeight - panelH - 16), left });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const panel = open && pos ? (
    <div
      ref={panelRef}
      className="fixed z-[60] flex flex-col border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: 320, maxHeight: Math.min(500, window.innerHeight - 32) }}
    >
      {/* Gradient bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[#0F172A]/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.sky }}>
            <Bell className="w-4 h-4" style={{ color: C.blue }} />
          </div>
          <div>
            <p className="font-extrabold font-['Baloo_2'] text-base leading-tight">Notifications</p>
            {unreadCount > 0 && <p className="text-[11px] font-bold text-slate-400">{unreadCount} unread</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-bold border-[2px] border-[#0F172A] rounded-full px-2.5 py-1 shadow-[2px_2px_0_0_#0F172A] transition-all hover:-translate-y-0.5"
              style={{ background: C.sky, color: C.blue }}>
              <CheckCheck className="w-3 h-3" /> All read
            </button>
          )}
          <button onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-[8px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center transition-all hover:-translate-y-0.5"
            style={{ background: "#FFE4E6" }}>
            <X className="w-3.5 h-3.5" style={{ color: C.pop }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-36 gap-3">
            <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center animate-pulse" style={{ background: C.sky }}>
              <Bell className="w-4 h-4" style={{ color: C.blue }} />
            </div>
            <p className="text-sm font-semibold text-slate-400">Loading…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: "#D6D4FF" }}>
              <Sparkles className="w-6 h-6" style={{ color: C.indigo }} />
            </div>
            <p className="font-extrabold font-['Baloo_2'] text-base">All caught up!</p>
            <p className="text-sm font-semibold text-slate-400">No notifications yet.</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotifRow key={n.id} n={n} onRead={markRead} onClose={() => setOpen(false)} />
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={bellRef}
        aria-label="Notifications"
        onClick={() => open ? setOpen(false) : openPanel()}
        className="relative w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] shrink-0"
        style={{ background: open ? C.blue : C.sky }}
      >
        <Bell className="w-4 h-4" style={{ color: open ? "#fff" : C.blue }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white leading-none py-0.5 border-[1.5px] border-white" style={{ background: C.pop }}>
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>
      {createPortal(panel, document.body)}
    </>
  );
};
