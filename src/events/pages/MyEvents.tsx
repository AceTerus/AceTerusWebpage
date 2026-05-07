import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, LogIn, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";

const STATUS_CFG = {
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-400",
  },
  pending: {
    label: "Pending Review",
    Icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    dot: "bg-red-400",
  },
} as const;

export default function MyEvents() {
  useEffect(() => { document.title = "My Events – AceTerus"; }, []);
  const { user } = useAuth();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id, status, submitted_at, rejection_reason,
          events (
            id, title, type, location, start_date, end_date,
            image_url, ace_coins_reward,
            event_organizers ( name, logo_url, verified )
          )
        `)
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🎟️</div>
          <h2 className={`${DISPLAY} font-extrabold text-[26px] text-[#0F172A]`}>My Events</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[15px]">Sign in to see events you've registered for.</p>
          <a href="https://aceterus.com/auth"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all font-['Nunito'] text-[14px] w-full">
            <LogIn className="w-4 h-4" /> Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${DISPLAY} font-extrabold text-[32px] text-[#0F172A]`}>My Events 🎟️</h1>
          <p className="font-['Nunito'] text-[14px] text-[#0F172A]/50 mt-1">
            Events you've signed up for.
          </p>
        </div>
        <Link to="/"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[13px] text-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all">
          Browse Events →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white p-16 text-center space-y-4">
          <div className="text-5xl">📭</div>
          <p className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]/40`}>No registrations yet</p>
          <p className="font-['Nunito'] text-[14px] text-[#0F172A]/40">Discover events and sign up!</p>
          <Link to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all font-['Nunito'] text-[14px]">
            Browse Events →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg: any) => {
            const ev = reg.events;
            if (!ev) return null;
            const st = STATUS_CFG[reg.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
            const StIcon = st.Icon;
            const ended = ev.end_date
              ? isPast(new Date(ev.end_date))
              : ev.start_date ? isPast(new Date(ev.start_date)) : false;

            return (
              <Link
                key={reg.id}
                to={`/event/${ev.id}`}
                className="flex gap-4 p-4 border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-[14px] border-[2px] border-[#0F172A]/10 overflow-hidden shrink-0 bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] flex items-center justify-center">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🎉</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`${DISPLAY} font-bold text-[16px] text-[#0F172A] leading-tight group-hover:text-[#2F7CFF] transition-colors`}>
                      {ev.title}
                    </h3>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-[2px] text-[11px] font-extrabold font-['Nunito'] shrink-0 ${st.bg} ${st.color}`}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 text-[12px] font-['Nunito'] text-[#0F172A]/50 pl-0">
                    {ev.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                    )}
                    {ev.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(ev.start_date), "d MMM yyyy")}
                        {ended && <span className="ml-1 text-[#0F172A]/30">(Ended)</span>}
                      </span>
                    )}
                    {reg.status === "approved" && ev.ace_coins_reward > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Coins className="w-3 h-3" />+{ev.ace_coins_reward} coins earned
                      </span>
                    )}
                  </div>

                  {reg.status === "rejected" && reg.rejection_reason && (
                    <p className="text-[12px] font-['Nunito'] text-red-600/80 bg-red-50 px-2.5 py-1.5 rounded-[10px] border border-red-100 w-fit">
                      Reason: {reg.rejection_reason}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
