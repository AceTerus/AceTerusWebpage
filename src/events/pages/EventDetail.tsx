import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar, MapPin, ExternalLink, Share2, CheckCircle2, Coins,
  ArrowLeft, Building2, BadgeCheck, Trophy, Code2, Mic, Briefcase,
  BookOpen, Tag, Users, Zap, Clock, PartyPopper, Globe, Link2, FileDown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, isPast, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";

/* ── design tokens ─────────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const BTN_PRIMARY = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 active:shadow-[2px_2px_0_0_#0F172A] transition-all duration-150 font-['Nunito'] text-[15px] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
const BTN_GHOST = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all duration-150 font-['Nunito'] text-[15px] text-[#0F172A]";

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; gradient: string; icon: React.FC<any> }> = {
  competition: { label: "Competition", emoji: "🏆", color: "#2E2BE5", bg: "#D6D4FF", gradient: "from-[#2E2BE5] via-[#4F46E5] to-[#7C3AED]", icon: Trophy },
  hackathon:   { label: "Hackathon",   emoji: "💻", color: "#2F7CFF", bg: "#DDF3FF", gradient: "from-[#2F7CFF] via-[#0EA5E9] to-[#3BD6F5]", icon: Code2 },
  workshop:    { label: "Workshop",    emoji: "🛠️", color: "#0891B2", bg: "#E0FAFF", gradient: "from-[#3BD6F5] via-[#06B6D4] to-[#0891B2]", icon: BookOpen },
  talk:        { label: "Talk",        emoji: "🎤", color: "#059669", bg: "#D1FAE5", gradient: "from-[#059669] via-[#10B981] to-[#34D399]", icon: Mic },
  internship:  { label: "Internship",  emoji: "💼", color: "#D97706", bg: "#FEF3C7", gradient: "from-[#D97706] via-[#F59E0B] to-[#FCD34D]", icon: Briefcase },
  deal:        { label: "Deal",        emoji: "🎁", color: "#DB2777", bg: "#FCE7F3", gradient: "from-[#DB2777] via-[#EC4899] to-[#F472B6]", icon: Tag },
};

/* ── Live countdown ──────────────────────────────────────────────────── */
const Countdown = ({ date }: { date: string }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(date);
  if (isPast(target)) return null;

  const days  = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const mins  = differenceInMinutes(target, now) % 60;
  const secs  = differenceInSeconds(target, now) % 60;

  const Unit = ({ v, label }: { v: number; label: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-[14px] border-[2.5px] border-[#0F172A] bg-[#0F172A] shadow-[3px_3px_0_0_rgba(15,23,42,0.4)] flex items-center justify-center">
        <span className={`${DISPLAY} font-extrabold text-[22px] text-white leading-none`}>{String(v).padStart(2, "0")}</span>
      </div>
      <span className="text-[10px] font-bold text-[#0F172A]/50 font-['Nunito'] uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13px] font-bold text-[#0F172A]/60 font-['Nunito']">
        <Clock className="w-4 h-4" /> Starts in
      </div>
      <div className="flex items-end gap-3">
        <Unit v={days}  label="Days"  />
        <span className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]/30 pb-6`}>:</span>
        <Unit v={hours} label="Hours" />
        <span className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]/30 pb-6`}>:</span>
        <Unit v={mins}  label="Mins"  />
        <span className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]/30 pb-6`}>:</span>
        <Unit v={secs}  label="Secs"  />
      </div>
    </div>
  );
};

/* ── Confetti burst (CSS only) ───────────────────────────────────────── */
const Confetti = () => (
  <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-2.5 h-2.5 rounded-sm opacity-0"
        style={{
          background: ["#3BD6F5","#2F7CFF","#2E2BE5","#FFD65C","#FF7A59"][i % 5],
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `confetti-${i % 4} 0.8s ease-out forwards`,
          animationDelay: `${Math.random() * 0.3}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
      />
    ))}
  </div>
);

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refId = searchParams.get("ref");
  const { user, setAceCoins } = useAuth();
  const qc = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_organizers(name, logo_url, verified, type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: isRegistered } = useQuery({
    queryKey: ["event-registered", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: regCount } = useQuery({
    queryKey: ["event-reg-count", id],
    enabled: !!id,
    queryFn: async () => {
      const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id!);
      return count ?? 0;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to register");
      const { error } = await supabase.from("event_registrations").insert({
        event_id: id!, user_id: user.id, referrer_id: refId ?? null,
      });
      if (error) throw error;
      if (refId && refId !== user.id) {
        await supabase.rpc("award_event_promoter", {
          p_event_id: id!, p_promoter_user_id: refId, p_coins: 50,
        });
      }
      if (event?.ace_coins_reward) {
        setAceCoins((c: number) => c + event.ace_coins_reward);
      }
    },
    onSuccess: () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);
      toast.success("🎉 You're registered! Check your email for details.");
      qc.invalidateQueries({ queryKey: ["event-registered", id, user?.id] });
      qc.invalidateQueries({ queryKey: ["event-reg-count", id] });
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) toast.error("You're already registered!");
      else toast.error(err.message);
    },
  });

  const handleShare = async () => {
    if (!user) { toast.error("Sign in to generate your referral link!"); return; }
    const url = `${window.location.origin}/event/${id}?ref=${user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("🔗 Link copied! Earn 50 ACE Coins per referral.");
    } catch {
      toast.info(`Your link: ${url}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <Skeleton className="h-72 w-full rounded-[24px]" />
        <Skeleton className="h-8 w-2/3 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-4 w-4/5 rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🔍</div>
        <p className={`${DISPLAY} font-bold text-[24px] text-[#0F172A]/40`}>Event not found.</p>
        <Link to="/" className={BTN_GHOST + " w-fit mx-auto"}><ArrowLeft className="w-4 h-4" /> Back to Events</Link>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.talk;
  const Icon = cfg.icon;
  const expired = event.end_date ? isPast(new Date(event.end_date)) : false;
  const upcoming = event.start_date ? !isPast(new Date(event.start_date)) : false;
  const org = event.event_organizers;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {showConfetti && <Confetti />}

      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-[14px] font-bold font-['Nunito'] text-[#0F172A]/55 hover:text-[#0F172A] transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Events
      </Link>

      {/* Hero banner */}
      <div className={`relative rounded-[24px] overflow-hidden border-[2.5px] border-[#0F172A] shadow-[5px_5px_0_0_#0F172A] bg-gradient-to-br ${cfg.gradient}`} style={{ minHeight: 220 }}>
        {event.image_url ? (
          <>
            <img src={event.image_url} alt={event.title} className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="w-full h-52 flex items-center justify-center relative overflow-hidden">
            <span className="text-[120px] opacity-20 select-none">{cfg.emoji}</span>
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-8 w-48 h-48 rounded-full bg-white/10" />
          </div>
        )}

        {/* Overlaid badges */}
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border-[2px] border-[#0F172A] text-[12px] font-extrabold shadow-[2px_2px_0_0_#0F172A]" style={{ color: cfg.color }}>
            {cfg.emoji} {cfg.label}
          </span>
          {event.is_sponsored && (
            <span className="px-3 py-1 rounded-xl bg-amber-400 border-[2px] border-[#0F172A] text-[12px] font-extrabold text-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
              ⭐ SPONSORED
            </span>
          )}
          {expired && (
            <span className="px-3 py-1 rounded-xl bg-red-500 border-[2px] border-white text-[12px] font-extrabold text-white">
              ENDED
            </span>
          )}
        </div>
      </div>

      {/* Title + organizer */}
      <div className="space-y-3">
        <h1 className={`${DISPLAY} font-extrabold text-[32px] sm:text-[38px] text-[#0F172A] leading-tight`}>
          {event.title}
        </h1>

        {org && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[16px] bg-[#F3FAFF] border-[2.5px] border-[#0F172A]/12 w-fit">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-9 h-9 rounded-[10px] object-cover border-[2px] border-[#0F172A]/15" />
            ) : (
              <div className="w-9 h-9 rounded-[10px] bg-[#DDF3FF] border-[2px] border-[#0F172A]/15 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#2F7CFF]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-['Nunito'] text-[14px] text-[#0F172A]">{org.name}</span>
                {org.verified && <BadgeCheck className="w-4 h-4 text-[#2F7CFF]" />}
              </div>
              <span className="text-[11px] text-[#0F172A]/45 font-['Nunito'] capitalize">{org.type}</span>
            </div>
          </div>
        )}
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        {event.location && (
          <div className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
              <MapPin className="w-5 h-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#0F172A]/45 uppercase tracking-wider font-['Nunito']">Location</p>
              <p className="font-bold font-['Nunito'] text-[13px] text-[#0F172A] leading-tight">{event.location}</p>
            </div>
          </div>
        )}
        {event.start_date && (
          <div className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
              <Calendar className="w-5 h-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#0F172A]/45 uppercase tracking-wider font-['Nunito']">Date</p>
              <p className="font-bold font-['Nunito'] text-[13px] text-[#0F172A] leading-tight">
                {format(new Date(event.start_date), "d MMM yyyy")}
              </p>
              <p className="font-['Nunito'] text-[12px] text-[#0F172A]/50 leading-tight">
                {format(new Date(event.start_date), "h:mm a")}
                {event.end_date && ` – ${format(new Date(event.end_date), "h:mm a")}`}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white">
          <div className="w-10 h-10 rounded-[12px] bg-[#D1FAE5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#0F172A]/45 uppercase tracking-wider font-['Nunito']">Registered</p>
            <p className={`${DISPLAY} font-extrabold text-[18px] text-[#0F172A] leading-none`}>{regCount ?? 0}</p>
          </div>
        </div>
        {event.ace_coins_reward > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-amber-400 shadow-[3px_3px_0_0_#D97706] bg-amber-50">
            <div className="w-10 h-10 rounded-[12px] bg-amber-400 border-[2px] border-amber-500 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-wider font-['Nunito']">You Earn</p>
              <p className={`${DISPLAY} font-extrabold text-[18px] text-amber-700 leading-none`}>+{event.ace_coins_reward}</p>
            </div>
          </div>
        )}
        {event.website_url && (
          <a href={event.website_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all">
            <div className="w-10 h-10 rounded-[12px] bg-[#DDF3FF] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[#2F7CFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#0F172A]/45 uppercase tracking-wider font-['Nunito']">Website</p>
              <p className="font-bold font-['Nunito'] text-[13px] text-[#2F7CFF] truncate">{event.website_url.replace(/^https?:\/\//, "")}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#0F172A]/30 shrink-0" />
          </a>
        )}
        {event.socmed_url && (
          <a href={event.socmed_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all">
            <div className="w-10 h-10 rounded-[12px] bg-[#FCE7F3] flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-[#DB2777]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#0F172A]/45 uppercase tracking-wider font-['Nunito']">Social Media</p>
              <p className="font-bold font-['Nunito'] text-[13px] text-[#DB2777] truncate">{event.socmed_url.replace(/^https?:\/\//, "")}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#0F172A]/30 shrink-0" />
          </a>
        )}
      </div>

      {/* Countdown */}
      {upcoming && event.start_date && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-5">
          <Countdown date={event.start_date} />
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-6">
          <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A] mb-3`}>About this Event</h3>
          <p className="font-['Nunito'] text-[15px] text-[#0F172A]/75 leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* PDF attachment */}
      {event.pdf_url && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-5 space-y-3">
          <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>📄 Event Brochure / Info Pack</h3>
          <a href={event.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-[16px] border-[2.5px] border-[#0F172A] bg-[#F3FAFF] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0">
              <FileDown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A]">Download PDF</p>
              <p className="text-[12px] font-['Nunito'] text-[#0F172A]/45 truncate">{event.pdf_url.replace(/^https?:\/\/[^/]+\//, "")}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#0F172A]/30 shrink-0 group-hover:text-[#2F7CFF] transition-colors" />
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-5 space-y-4">

        {/* External registration link — always shown when set */}
        {event.registration_url && (
          <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY + " w-full"}>
            <ExternalLink className="w-4 h-4" /> Register / Apply on Official Site →
          </a>
        )}

        {/* Mark as Going — always the coin/referral action */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => registerMutation.mutate()}
            disabled={isRegistered || registerMutation.isPending || !user}
            className={`${isRegistered ? BTN_GHOST : BTN_PRIMARY} flex-1`}
          >
            {isRegistered
              ? <><PartyPopper className="w-4 h-4" /> You're Going!</>
              : registerMutation.isPending ? "Saving…"
              : event.registration_url
                ? <><CheckCircle2 className="w-4 h-4" /> Mark as Going — Earn {event.ace_coins_reward > 0 ? `+${event.ace_coins_reward}` : ""} 🪙</>
                : "Register Now"}
          </button>

          <button onClick={handleShare} className={BTN_GHOST + " flex-1"}>
            <Share2 className="w-4 h-4" /> Share &amp; Earn 50 🪙
          </button>
        </div>

        {/* Contextual hint for external events */}
        {event.registration_url && !isRegistered && user && (
          <p className="text-[12px] font-['Nunito'] text-[#0F172A]/45 text-center leading-snug">
            Register on the official site above, then <strong>Mark as Going</strong> to earn ACE Coins and track your referral.
          </p>
        )}

        {/* Share info box */}
        <div className="flex items-start gap-3 p-3 rounded-[14px] bg-gradient-to-r from-[#D6D4FF] to-[#DDF3FF] border-[2px] border-[#2E2BE5]/20">
          <Zap className="w-4 h-4 text-[#2E2BE5] mt-0.5 shrink-0" />
          <p className="text-[13px] font-['Nunito'] font-semibold text-[#2E2BE5]">
            Share your unique link — earn <strong>50 ACE Coins</strong> every time someone marks as going through it!
          </p>
        </div>

        {!user && (
          <p className="text-center text-[13px] font-['Nunito'] text-[#0F172A]/50">
            <a href="https://aceterus.com/auth" className="text-[#2F7CFF] font-bold hover:underline">Sign in</a> to mark as going and earn ACE Coins
          </p>
        )}
      </div>
    </div>
  );
}
