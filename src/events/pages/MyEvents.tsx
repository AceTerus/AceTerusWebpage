import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, LogIn, Coins, Ticket, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";

const C = { bg: "#F3FAFF", cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A" };
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const STATUS_CFG = {
  approved: { label: "Approved",      Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
  pending:  { label: "Pending Review", Icon: Clock,        color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     dot: "bg-amber-400"   },
  rejected: { label: "Rejected",       Icon: XCircle,      color: "text-red-700",     bg: "bg-red-50 border-red-200",         dot: "bg-red-400"     },
} as const;

/* ── Custom cursor ─────────────────────────────────────────────────── */
const CustomCursor = () => {
  const ring = useRef<HTMLDivElement>(null);
  const dot  = useRef<HTMLDivElement>(null);
  const pos  = useRef({ x: -200, y: -200, tx: -200, ty: -200 });
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf: number;
    const onMove = (e: MouseEvent) => {
      pos.current.tx = e.clientX; pos.current.ty = e.clientY;
      if (!show) setShow(true);
      if (dot.current) { dot.current.style.left = `${e.clientX}px`; dot.current.style.top = `${e.clientY}px`; }
    };
    const onOver = (e: MouseEvent) => {
      const hit = (e.target as HTMLElement).closest("a,button,[role='button']");
      if (ring.current) {
        ring.current.style.transform = `translate(-50%,-50%) scale(${hit ? 1.9 : 1})`;
        ring.current.style.borderColor = hit ? C.blue : "rgba(47,124,255,0.45)";
        ring.current.style.background  = hit ? "rgba(47,124,255,0.08)" : "transparent";
      }
    };
    const tick = () => {
      pos.current.x += (pos.current.tx - pos.current.x) * 0.11;
      pos.current.y += (pos.current.ty - pos.current.y) * 0.11;
      if (ring.current) { ring.current.style.left = `${pos.current.x}px`; ring.current.style.top = `${pos.current.y}px`; }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); document.removeEventListener("mouseover", onOver); cancelAnimationFrame(raf); };
  }, []);
  if (!show) return null;
  return (
    <>
      <div ref={ring} className="fixed z-[9999] pointer-events-none rounded-full"
        style={{ width: 36, height: 36, border: "1.5px solid rgba(47,124,255,0.45)", left: -200, top: -200, transform: "translate(-50%,-50%)", transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1),border-color 0.2s,background 0.2s" }} />
      <div ref={dot} className="fixed z-[9999] pointer-events-none rounded-full"
        style={{ width: 5, height: 5, background: C.blue, left: -200, top: -200, transform: "translate(-50%,-50%)", boxShadow: "0 0 8px 3px rgba(47,124,255,0.5)" }} />
    </>
  );
};

/* ── Scroll reveal ─────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.65, delay: delay / 1000, ease: [0.23, 1, 0.32, 1] }}>
      {children}
    </motion.div>
  );
};

const STYLE = `
  @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(55px,-70px) scale(1.14)} 66%{transform:translate(-40px,40px) scale(0.91)} }
  @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-60px,50px) scale(1.08)} 66%{transform:translate(65px,-45px) scale(0.89)} }
  body { cursor: none; }
  @media (pointer:coarse) { body { cursor: auto; } }
  ::-webkit-scrollbar { width: 0; height: 0; }
`;

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
      <div style={{ background: C.bg, minHeight: "100vh" }}>
        <CustomCursor />
        <style>{STYLE}</style>
        <section className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: "100vh", background: "linear-gradient(145deg,#0A0F1E 0%,#0D1A3A 45%,#1A1050 100%)" }}>
          <div className="absolute pointer-events-none" style={{ width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,#2F7CFF,transparent 65%)", top: -150, left: -150, opacity: 0.15, filter: "blur(80px)", animation: "blob1 14s ease-in-out infinite" }} />
          <div className="absolute pointer-events-none" style={{ width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,#3BD6F5,transparent 65%)", bottom: -80, right: -100, opacity: 0.12, filter: "blur(70px)", animation: "blob2 17s ease-in-out infinite" }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "66px 66px" }} />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 text-center space-y-6 px-4 max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-[20px] border-[3px] border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto">
              <Ticket className="w-9 h-9 text-white/60" />
            </div>
            <div>
              <h2 className={`${DISPLAY} font-extrabold text-[32px] text-white`}>My Events</h2>
              <p className="font-['Nunito'] text-white/50 text-[15px] mt-2">Sign in to see events you've registered for.</p>
            </div>
            <a href="https://aceterus.com/auth"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all font-['Nunito'] text-[15px]">
              <LogIn className="w-4 h-4" /> Sign In to AceTerus
            </a>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <CustomCursor />
      <style>{STYLE}</style>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 340, background: "linear-gradient(145deg,#0A0F1E 0%,#0D1A3A 45%,#1A1050 100%)" }}>
        <div className="absolute pointer-events-none" style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,#2F7CFF,transparent 65%)", top: -200, left: -200, opacity: 0.15, filter: "blur(80px)", animation: "blob1 14s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle,#3BD6F5,transparent 65%)", bottom: -100, right: -120, opacity: 0.12, filter: "blur(70px)", animation: "blob2 17s ease-in-out infinite" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "66px 66px" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: NOISE, backgroundSize: "200px 200px" }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4 flex flex-col justify-end pb-20" style={{ minHeight: 340 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(47,124,255,0.12)", border: "1px solid rgba(47,124,255,0.25)", boxShadow: "0 0 20px rgba(47,124,255,0.1)" }}>
              <Ticket className="w-3.5 h-3.5" style={{ color: C.cyan }} />
              <span className="text-[11px] font-bold font-['Nunito'] tracking-[0.2em] uppercase" style={{ color: C.cyan }}>Your Registrations</span>
            </div>
            <h1 className={`${DISPLAY} font-extrabold text-white`} style={{ fontSize: "clamp(36px,6vw,58px)", lineHeight: 1.05 }}>
              My Events 🎟️
            </h1>
            <p className="font-['Nunito'] text-[16px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              Events you've signed up for.
            </p>
            {!isLoading && registrations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex flex-wrap gap-3 pt-1">
                {[
                  { emoji: "🎯", label: "Total",    count: registrations.length },
                  { emoji: "✅", label: "Approved", count: registrations.filter((r: any) => r.status === "approved").length },
                  { emoji: "⏳", label: "Pending",  count: registrations.filter((r: any) => r.status === "pending").length },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] font-['Nunito']"
                    style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
                    <span>{s.emoji}</span>
                    <span className="font-extrabold text-white text-[15px]">{s.count}</span>
                    <span className="text-white/40 text-[12px] font-bold">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="w-full" style={{ height: 72 }}>
            <path d="M0,42 C480,82 960,12 1440,46 L1440,72 L0,72 Z" fill={C.bg} />
            <path d="M0,46 C480,86 960,16 1440,50" fill="none" stroke="rgba(59,214,245,0.12)" strokeWidth="1.5" />
          </svg>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pb-24 space-y-4" style={{ marginTop: -8 }}>
        <div className="flex justify-end">
          <Link to="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[13px] text-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all">
            Browse Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[20px]" />)}
          </div>
        ) : registrations.length === 0 ? (
          <Reveal>
            <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[4px_4px_0_0_#0F172A] bg-white p-16 text-center space-y-4">
              <div className="text-5xl">📭</div>
              <p className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]/40`}>No registrations yet</p>
              <p className="font-['Nunito'] text-[14px] text-[#0F172A]/40">Discover events and sign up!</p>
              <Link to="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all font-['Nunito'] text-[14px]">
                Browse Events →
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {registrations.map((reg: any, i: number) => {
                const ev = reg.events;
                if (!ev) return null;
                const st = STATUS_CFG[reg.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
                const StIcon = st.Icon;
                const ended = ev.end_date
                  ? isPast(new Date(ev.end_date))
                  : ev.start_date ? isPast(new Date(ev.start_date)) : false;

                return (
                  <motion.div key={reg.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.25), ease: [0.23, 1, 0.32, 1] }}>
                    <Link to={`/event/${ev.id}`}
                      className="flex gap-4 p-4 border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#0F172A] transition-all group">
                      <div className="w-20 h-20 rounded-[14px] border-[2px] border-[#0F172A]/10 overflow-hidden shrink-0 bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] flex items-center justify-center">
                        {ev.image_url
                          ? <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                          : <span className="text-2xl">🎉</span>}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`${DISPLAY} font-bold text-[16px] text-[#0F172A] leading-tight group-hover:text-[#2F7CFF] transition-colors`}>
                            {ev.title}
                          </h3>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-[2px] text-[11px] font-extrabold font-['Nunito'] shrink-0 ${st.bg} ${st.color}`}>
                            <StIcon className="w-3 h-3" />{st.label}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2.5 text-[12px] font-['Nunito'] text-[#0F172A]/50">
                          {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
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
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
