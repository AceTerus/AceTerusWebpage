import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2, CheckCircle2, ExternalLink, LogIn } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const BTN_PRIMARY = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[15px] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
const BTN_GHOST = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[14px] text-[#0F172A]";

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  competition: { emoji: "🏆", color: "#2E2BE5", bg: "#D6D4FF" },
  hackathon:   { emoji: "💻", color: "#2F7CFF", bg: "#DDF3FF" },
  workshop:    { emoji: "🛠️", color: "#0891B2", bg: "#E0FAFF" },
  talk:        { emoji: "🎤", color: "#059669", bg: "#D1FAE5" },
  internship:  { emoji: "💼", color: "#D97706", bg: "#FEF3C7" },
  deal:        { emoji: "🎁", color: "#DB2777", bg: "#FCE7F3" },
};

export default function EventRegister() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [registered, setRegistered] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-register", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*, event_organizers(name, logo_url, verified)")
        .eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: existingReg, isLoading: regLoading } = useQuery({
    queryKey: ["my-event-reg", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_registrations")
        .select("id, status, submitted_at")
        .eq("event_id", id!).eq("user_id", user!.id).maybeSingle();
      return data as { id: string; status: string; submitted_at: string } | null;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not authenticated");
      const { error } = await supabase.from("event_registrations").insert({
        event_id: id,
        user_id: user.id,
        status: "approved",
      });
      if (error) {
        if (error.code === "23505") return; // already registered — treat as ok
        throw error;
      }
    },
    onSuccess: () => {
      setRegistered(true);
      qc.invalidateQueries({ queryKey: ["my-event-reg", id, user?.id] });
      qc.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Auto-register on mount if user is logged in and hasn't registered
  useEffect(() => {
    if (user && event && existingReg === null && !registered && !registerMutation.isPending) {
      registerMutation.mutate();
    }
  }, [user, event, existingReg]);

  const isLoading = eventLoading || regLoading;

  if (isLoading || registerMutation.isPending) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F7CFF]" />
        <p className="font-['Nunito'] font-bold text-[#0F172A]/50 text-[14px]">Setting up your registration…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🔍</div>
        <p className={`${DISPLAY} font-bold text-[22px] text-[#0F172A]/40`}>Event not found.</p>
        <Link to="/" className={BTN_GHOST + " mx-auto w-fit"}><ArrowLeft className="w-4 h-4" /> Back</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <Link to={`/event/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event
        </Link>
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] bg-white p-10 text-center space-y-4">
          <div className="text-5xl">🔐</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Sign in to Register</h2>
          <p className="font-['Nunito'] text-[#0F172A]/55 text-[14px]">You need an AceTerus account to register for events.</p>
          <a href="https://aceterus.com/auth" className={BTN_PRIMARY + " w-full"}>
            <LogIn className="w-4 h-4" /> Sign In with AceTerus
          </a>
        </div>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.talk;
  const isRegistered = registered || (existingReg !== null && existingReg !== undefined);
  const googleFormUrl = event.google_form_url as string | null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link to={`/event/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Event
      </Link>

      {/* Event header */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] overflow-hidden">
        <div className="p-5 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${cfg.bg}, white)` }}>
          <div className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center text-2xl shrink-0" style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider font-['Nunito']" style={{ color: cfg.color }}>
              {event.event_organizers?.name ?? "Event"} · Registration
            </p>
            <h1 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] leading-tight truncate`}>{event.title}</h1>
            {event.start_date && (
              <p className="text-[12px] font-['Nunito'] text-[#0F172A]/50">
                {format(new Date(event.start_date), "d MMM yyyy, h:mm a")}
              </p>
            )}
          </div>
        </div>

        {/* Registration confirmed banner */}
        {isRegistered && (
          <div className="px-5 py-3 bg-emerald-50 border-t-[2px] border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[13px] font-bold font-['Nunito'] text-emerald-700">
              You're registered! {event.ace_coins_reward > 0 ? `Earn ${event.ace_coins_reward} ACE Coins using a reward code after the event.` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Google Form embed */}
      {isRegistered && googleFormUrl && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] overflow-hidden">
          <div className="px-5 py-4 border-b-[2px] border-[#0F172A]/10 bg-[#F3FAFF] flex items-center justify-between">
            <div>
              <p className={`${DISPLAY} font-bold text-[16px] text-[#0F172A]`}>Complete the Event Form</p>
              <p className="text-[12px] font-['Nunito'] text-[#0F172A]/50 mt-0.5">Fill in the organiser's form below to confirm your participation details.</p>
            </div>
            <a href={googleFormUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/15 bg-white text-[#0F172A]/60 text-[12px] font-bold font-['Nunito'] hover:border-[#0F172A]/30 transition-colors shrink-0">
              <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
            </a>
          </div>
          <iframe
            src={googleFormUrl}
            title="Event Registration Form"
            className="w-full border-0"
            style={{ height: 720 }}
            allow="camera; microphone"
          />
        </div>
      )}

      {/* No google form — just show done state */}
      {isRegistered && !googleFormUrl && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-10 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className={`${DISPLAY} font-extrabold text-[26px] text-[#0F172A]`}>You're all set!</h2>
          <p className="font-['Nunito'] text-[#0F172A]/55 text-[15px]">
            Your registration has been confirmed. We'll see you at the event!
          </p>
        </div>
      )}

      {/* Action buttons */}
      {isRegistered && (
        <div className="flex gap-3">
          <Link to={`/event/${id}`} className={BTN_GHOST + " flex-1"}><ArrowLeft className="w-4 h-4" /> Event Page</Link>
          <Link to="/my-events" className={BTN_PRIMARY + " flex-1"}>View My Events →</Link>
        </div>
      )}
    </div>
  );
}
