import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Tag, ExternalLink, Zap, Search, Clock, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, differenceInDays } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface Deal {
  id: string; title: string; description: string | null; brand_name: string;
  discount_details: string | null; logo_url: string | null; category: string | null;
  expiry_date: string | null; redemption_url: string | null; is_featured: boolean;
}

const CATEGORIES = [
  { key: "All",               emoji: "✨" },
  { key: "Food & Drink",      emoji: "🍔" },
  { key: "Tech & Gadgets",    emoji: "💻" },
  { key: "Fashion",           emoji: "👗" },
  { key: "Education",         emoji: "📚" },
  { key: "Travel",            emoji: "✈️" },
  { key: "Entertainment",     emoji: "🎮" },
  { key: "Health & Wellness", emoji: "🏃" },
];

const PALETTE = [
  { from: "#2F7CFF", to: "#3BD6F5" },
  { from: "#2E2BE5", to: "#7C3AED" },
  { from: "#DB2777", to: "#F472B6" },
  { from: "#059669", to: "#34D399" },
  { from: "#D97706", to: "#FCD34D" },
  { from: "#DC2626", to: "#F87171" },
];

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ── Custom cursor ────────────────────────────────────────────────────── */
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
        ring.current.style.borderColor = hit ? "#DB2777" : "rgba(219,39,119,0.45)";
        ring.current.style.background  = hit ? "rgba(219,39,119,0.08)" : "transparent";
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
        style={{ width: 36, height: 36, border: "1.5px solid rgba(219,39,119,0.45)", left: -200, top: -200, transform: "translate(-50%,-50%)", transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1),border-color 0.2s,background 0.2s" }} />
      <div ref={dot}  className="fixed z-[9999] pointer-events-none rounded-full"
        style={{ width: 5, height: 5, background: "#DB2777", left: -200, top: -200, transform: "translate(-50%,-50%)", boxShadow: "0 0 8px 3px rgba(219,39,119,0.5)" }} />
    </>
  );
};

/* ── Rotating word ────────────────────────────────────────────────────── */
const WORDS = ["Students 🎁", "Hackers 💻", "Dreamers ✨", "Builders ⚡", "Champions 🏆"];
const RotatingWord = () => {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setOut(true); setTimeout(() => { setIdx(i => (i + 1) % WORDS.length); setOut(false); }, 360); }, 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: "inline-block", color: "#FCD34D", opacity: out ? 0 : 1, transform: out ? "translateY(-18px) skewX(-3deg)" : "translateY(0) skewX(0)", transition: "all 0.36s cubic-bezier(0.23,1,0.32,1)", textShadow: "0 0 40px rgba(252,211,77,0.6),0 0 90px rgba(252,211,77,0.2)" }}>
      {WORDS[idx]}
    </span>
  );
};

/* ── Floating sticker ─────────────────────────────────────────────────── */
const FloatingSticker = ({ emoji, label, color, bg, border, style }: { emoji: string; label: string; color: string; bg: string; border: string; style: React.CSSProperties }) => (
  <div className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] pointer-events-none select-none font-['Nunito'] font-extrabold text-[13px]"
    style={{ background: bg, border: `2px solid ${border}40`, color, boxShadow: "2px 2px 0 0 rgba(15,23,42,0.15)", ...style }}>
    <span>{emoji}</span><span>{label}</span>
  </div>
);

/* ── Marquee ──────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  { text: "50% off Notion Pro",         emoji: "📝" },
  { text: "Free GitHub Copilot",        emoji: "💻" },
  { text: "Grab Student Discount",      emoji: "🎁" },
  { text: "Flash Sale – Food & Drink",  emoji: "🍔" },
  { text: "Tech Deals This Week",       emoji: "⚡" },
  { text: "Travel Perks for Students",  emoji: "✈️" },
  { text: "Fashion at Student Price",   emoji: "👗" },
];
const Marquee = () => (
  <div className="overflow-hidden border-y-[2.5px] border-[#0F172A] bg-[#DB2777] py-2 relative">
    <div className="flex gap-10 whitespace-nowrap" style={{ animation: "marqueeRoll 22s linear infinite" }}>
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="flex items-center gap-2 shrink-0 font-['Nunito'] font-bold text-[13px] text-white">
          <span className="opacity-90">{item.emoji}</span>{item.text}
          <span className="text-white/30 mx-1">·</span>
        </span>
      ))}
    </div>
  </div>
);

/* ── Scroll reveal ────────────────────────────────────────────────────── */
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

/* ── Section header ───────────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, label, iconBg, iconColor }: { icon: React.ComponentType<any>; label: string; iconBg: string; iconColor: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl border-[2.5px] border-[#0F172A] flex items-center justify-center" style={{ background: iconBg, boxShadow: "2px 2px 0 0 #0F172A" }}>
      <Icon className="w-4 h-4" style={{ color: iconColor }} />
    </div>
    <h2 className={`${DISPLAY} font-extrabold text-[22px] text-[#0F172A]`}>{label}</h2>
  </div>
);

/* ── Expiry urgency badge ─────────────────────────────────────────────── */
const ExpiryBadge = ({ date }: { date: string }) => {
  const days = differenceInDays(new Date(date), new Date());
  if (isPast(new Date(date))) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0F172A]/8 text-[11px] font-bold text-[#0F172A]/40 font-['Nunito']">
      Expired
    </span>
  );
  if (days <= 3) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 border-[1.5px] border-red-300 text-[11px] font-extrabold text-red-600 font-['Nunito'] animate-pulse">
      <Clock className="w-3 h-3" /> {days === 0 ? "Last day!" : `${days}d left!`}
    </span>
  );
  if (days <= 7) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100 border-[1.5px] border-orange-300 text-[11px] font-extrabold text-orange-600 font-['Nunito']">
      <Clock className="w-3 h-3" /> {days}d left
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border-[1.5px] border-emerald-200 text-[11px] font-bold text-emerald-600 font-['Nunito']">
      Until {format(new Date(date), "d MMM")}
    </span>
  );
};

/* ── DealCard ─────────────────────────────────────────────────────────── */
const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  const expired = deal.expiry_date ? isPast(new Date(deal.expiry_date)) : false;
  const palette = PALETTE[index % PALETTE.length];

  return (
    <div className={`group border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden transition-all duration-200 ${expired ? "opacity-60" : "hover:-translate-y-1.5 hover:shadow-[6px_6px_0_0_#0F172A]"}`}>

      {/* Coloured header */}
      <div className="relative" style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, padding: "20px 20px 28px" }}>
        <div className="flex items-start justify-between gap-3">
          {deal.logo_url ? (
            <img src={deal.logo_url} alt={deal.brand_name} className="w-12 h-12 rounded-[14px] object-cover border-[2.5px] border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]" />
          ) : (
            <div className="w-12 h-12 rounded-[14px] bg-white/25 border-[2.5px] border-white/40 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
              <Tag className="w-5 h-5 text-white" />
            </div>
          )}
          {deal.is_featured && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-400 border-[2px] border-white text-[11px] font-extrabold text-[#0F172A] shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]">
              🔥 HOT
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-white/60 font-['Nunito'] font-bold text-[11px] uppercase tracking-wider">{deal.brand_name}</p>
          <h3 className={`${DISPLAY} font-extrabold text-[17px] text-white leading-tight mt-0.5 line-clamp-2`}>{deal.title}</h3>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-4 bg-white rounded-t-[18px]" />
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-3">
        {deal.discount_details && (
          <div className="text-center py-3 -mx-1">
            <p className={`${DISPLAY} font-extrabold text-[28px] leading-none`} style={{ color: palette.from }}>
              {deal.discount_details}
            </p>
          </div>
        )}

        {deal.description && (
          <p className="text-[13px] font-['Nunito'] text-[#0F172A]/60 leading-snug line-clamp-2">{deal.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {deal.category && (
            <span className="px-2 py-0.5 rounded-lg bg-[#F3FAFF] border-[1.5px] border-[#0F172A]/15 text-[11px] font-bold text-[#0F172A]/55 font-['Nunito']">
              {CATEGORIES.find(c => c.key === deal.category)?.emoji ?? "🏷️"} {deal.category}
            </span>
          )}
          {deal.expiry_date && <ExpiryBadge date={deal.expiry_date} />}
        </div>

        {deal.redemption_url && !expired ? (
          <a
            href={deal.redemption_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[14px] border-[2.5px] border-[#0F172A] font-bold font-['Nunito'] text-[14px] text-white shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all duration-150"
            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
          >
            <ExternalLink className="w-4 h-4" /> Claim Deal
          </a>
        ) : expired ? (
          <div className="flex items-center justify-center py-2.5 rounded-[14px] bg-[#0F172A]/06 text-[14px] font-bold text-[#0F172A]/35 font-['Nunito']">
            Deal Expired
          </div>
        ) : null}
      </div>
    </div>
  );
};

const DealSkeleton = () => (
  <div className="border-[2.5px] border-[#0F172A]/20 rounded-[20px] bg-white overflow-hidden">
    <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200" />
    <div className="px-5 pb-5 pt-3 space-y-3">
      <Skeleton className="h-8 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-[14px]" />
    </div>
  </div>
);

export default function DealsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => { document.title = "Student Deals – AceTerus Events"; }, []);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", activeCategory, search],
    queryFn: async () => {
      let q = supabase
        .from("deals")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (activeCategory !== "All") q = q.eq("category", activeCategory);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as Deal[];
    },
  });

  const featured = deals.filter((d) => d.is_featured);
  const rest     = deals.filter((d) => !d.is_featured);

  return (
    <div style={{ background: "#F3FAFF", minHeight: "100vh" }}>
      <CustomCursor />

      <style>{`
        @keyframes marqueeRoll { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes floatA      { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-16px) rotate(1.5deg)} }
        @keyframes floatB      { 0%,100%{transform:translateY(-10px) rotate(2deg)} 50%{transform:translateY(8px) rotate(-1.5deg)} }
        @keyframes floatC      { 0%,100%{transform:translateY(4px) rotate(1deg)} 50%{transform:translateY(-12px) rotate(-2deg)} }
        @keyframes floatD      { 0%,100%{transform:translateY(-6px) rotate(-1deg)} 50%{transform:translateY(10px) rotate(2deg)} }
        @keyframes blob1       { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(55px,-70px) scale(1.14)} 66%{transform:translate(-40px,40px) scale(0.91)} }
        @keyframes blob2       { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-60px,50px) scale(1.08)} 66%{transform:translate(65px,-45px) scale(0.89)} }
        @keyframes blob3       { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.18)} }
        @keyframes blob4       { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-28px,-28px)} }
        body { cursor: none; }
        @media (pointer:coarse) { body { cursor: auto; } }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <Marquee />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center"
        style={{ minHeight: "88vh", padding: "80px 24px 0", background: "linear-gradient(145deg,#1A0A14 0%,#2D0A2E 45%,#0D0A2A 100%)" }}>

        {/* Blobs */}
        <div className="absolute pointer-events-none" style={{ width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,#DB2777,transparent 65%)", top: -220, left: -240, opacity: 0.16, filter: "blur(80px)", animation: "blob1 14s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width: 580, height: 580, borderRadius: "50%", background: "radial-gradient(circle,#9333EA,transparent 65%)", bottom: -80, right: -150, opacity: 0.16, filter: "blur(80px)", animation: "blob2 17s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,#2E2BE5,transparent 65%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.09, filter: "blur(90px)", animation: "blob3 12s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,#FFD65C,transparent 65%)", top: "14%", right: "16%", opacity: 0.11, filter: "blur(60px)", animation: "blob4 10s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,#F472B6,transparent 65%)", bottom: "24%", left: "10%", opacity: 0.08, filter: "blur(50px)", animation: "floatC 9s ease-in-out infinite" }} />

        {/* Grid + noise */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "66px 66px" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: NOISE, backgroundSize: "200px 200px" }} />

        {/* Dot accents */}
        <div className="absolute top-8 left-8 hidden lg:block pointer-events-none opacity-25"
          style={{ width: 80, height: 80, backgroundImage: "radial-gradient(circle,rgba(219,39,119,0.9) 1.5px,transparent 1.5px)", backgroundSize: "14px 14px" }} />
        <div className="absolute bottom-20 right-10 hidden lg:block pointer-events-none opacity-[0.18]"
          style={{ width: 72, height: 72, backgroundImage: "radial-gradient(circle,rgba(255,213,92,0.9) 1.5px,transparent 1.5px)", backgroundSize: "13px 13px" }} />

        {/* Floating stickers */}
        <FloatingSticker emoji="🎁" label="Deals"     color="#DB2777" bg="#FCE7F3" border="#DB2777" style={{ top: "13%",   left: "4%",    animation: "floatA 7s ease-in-out infinite",        opacity: 0.75 }} />
        <FloatingSticker emoji="💸" label="Savings"   color="#9333EA" bg="#F3E8FF" border="#9333EA" style={{ top: "18%",   right: "5%",   animation: "floatB 8.5s ease-in-out infinite",      opacity: 0.68 }} />
        <FloatingSticker emoji="⚡" label="Flash"     color="#D97706" bg="#FEF3C7" border="#D97706" style={{ bottom: "26%", left: "3.5%", animation: "floatC 6.5s ease-in-out infinite",      opacity: 0.62 }} />
        <FloatingSticker emoji="🎉" label="Exclusive" color="#2E2BE5" bg="#D6D4FF" border="#2E2BE5" style={{ bottom: "30%", right: "4%",  animation: "floatD 9s ease-in-out infinite",         opacity: 0.60 }} />
        <FloatingSticker emoji="🛍️" label="Shop"    color="#DB2777" bg="#FCE7F3" border="#DB2777" style={{ top: "50%",   left: "2%",    animation: "floatB 7.5s ease-in-out infinite 1s",   opacity: 0.52 }} />
        <FloatingSticker emoji="🏷️" label="Tag"     color="#059669" bg="#D1FAE5" border="#059669" style={{ top: "44%",   right: "3%",   animation: "floatA 8s ease-in-out infinite 0.5s",   opacity: 0.52 }} />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(219,39,119,0.1)", border: "1px solid rgba(219,39,119,0.25)", boxShadow: "0 0 20px rgba(219,39,119,0.1)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#F472B6" }} />
              <span className="text-[11px] font-bold font-['Nunito'] tracking-[0.2em] uppercase" style={{ color: "#F472B6" }}>Exclusive for Malaysian Students</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="font-['Baloo_2'] font-extrabold tracking-tighter leading-[0.96]"
            style={{ fontSize: "clamp(52px,9.5vw,96px)", color: "rgba(255,255,255,0.94)" }}>
            Deals for<br /><RotatingWord />.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.22 }}
            className="font-['Nunito'] text-[17px] max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
            Discounts, free tools, and student perks.<br />Everything worth saving on.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.3 }} className="max-w-2xl mx-auto w-full">
            <div className="relative rounded-[18px]"
              style={{ boxShadow: focused ? "0 0 0 2.5px #DB2777,0 0 50px rgba(219,39,119,0.18)" : "0 0 0 1.5px rgba(255,255,255,0.12),0 8px 32px rgba(0,0,0,0.45)", transition: "box-shadow 0.3s ease" }}>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200" style={{ color: focused ? "#DB2777" : "rgba(255,255,255,0.3)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder="Search deals, brands, categories…"
                className="w-full pl-14 pr-6 py-4 outline-none font-['Nunito'] text-[15px] rounded-[18px]"
                style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", color: "rgba(255,255,255,0.88)", caretColor: "#DB2777" }} />
            </div>
          </motion.div>

          {/* Live stats */}
          {!isLoading && deals.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.42 }} className="flex flex-wrap justify-center gap-3">
              {[
                { emoji: "🎁", count: deals.length,    label: "Deals",      color: "#F472B6" },
                { emoji: "🔥", count: featured.length, label: "Hot Deals",  color: "#FCD34D" },
                { emoji: "✨", count: 8,               label: "Categories", color: "#A78BFA" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-[16px] font-['Nunito']"
                  style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: `1.5px solid ${s.color}25` }}>
                  <span className="text-lg">{s.emoji}</span>
                  <div>
                    <div className="text-[17px] font-extrabold leading-none" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-[11px] font-bold leading-none mt-0.5 text-white/40">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Wave into light */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="w-full" style={{ height: 72 }}>
            <path d="M0,42 C480,82 960,12 1440,46 L1440,72 L0,72 Z" fill="#F3FAFF" />
            <path d="M0,46 C480,86 960,16 1440,50" fill="none" stroke="rgba(219,39,119,0.12)" strokeWidth="1.5" />
          </svg>
        </div>
      </section>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 space-y-14" style={{ paddingTop: 32 }}>

        {/* Category pills */}
        <Reveal>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ key, emoji }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[14px] border-[2.5px] text-[13px] font-bold font-['Nunito'] transition-all duration-150 ${
                  activeCategory === key
                    ? "border-[#DB2777] bg-[#DB2777] text-white shadow-[3px_3px_0_0_#0F172A] -translate-y-0.5"
                    : "border-[#0F172A]/20 bg-white text-[#0F172A]/65 hover:-translate-y-0.5 hover:border-[#DB2777]/50"
                }`}
              >
                <span>{emoji}</span> {key}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Hot deals */}
        {!isLoading && featured.length > 0 && (
          <Reveal>
            <section className="space-y-4">
              <SectionHeader icon={Flame} label="Hot Right Now" iconBg="#FED7AA" iconColor="#C2410C" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {featured.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3), ease: [0.23, 1, 0.32, 1] }}>
                      <DealCard deal={d} index={i} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </Reveal>
        )}

        {/* All deals */}
        <Reveal delay={100}>
          <section className="space-y-4">
            {featured.length > 0 && rest.length > 0 && (
              <SectionHeader icon={Tag} label="All Deals" iconBg="#FCE7F3" iconColor="#DB2777" />
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <DealSkeleton key={i} />)}
              </div>
            ) : deals.length === 0 ? (
              <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-16 text-center space-y-3">
                <div className="text-6xl">🎁</div>
                <p className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]/45`}>
                  {search ? "No deals match your search" : "Deals coming soon!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {rest.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3), ease: [0.23, 1, 0.32, 1] }}>
                      <DealCard deal={d} index={i + featured.length} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
