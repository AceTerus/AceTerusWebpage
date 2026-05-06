import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Sparkles, Calendar, MapPin, Trophy, Code2,
  Mic, Briefcase, BookOpen, Tag, Coins, Zap, Star,
  ArrowRight, Filter, LayoutDashboard,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast, differenceInDays } from "date-fns";

/* ── AceTerus palette ────────────────────────────────────────────────── */
const C = {
  bg:     "#F3FAFF",
  cyan:   "#3BD6F5",
  blue:   "#2F7CFF",
  indigo: "#2E2BE5",
  gold:   "#FFD65C",
  pop:    "#FF7A59",
  ink:    "#0F172A",
};

/* ── Type config (light-mode AceTerus) ──────────────────────────────── */
type TCfg = { label:string; emoji:string; color:string; bg:string; border:string; gradient:string; icon:React.ComponentType<any> };
const TC: Record<string,TCfg> = {
  competition: { label:"Competition", emoji:"🏆", color:"#2E2BE5", bg:"#D6D4FF", border:"#2E2BE5", gradient:"from-[#2E2BE5] to-[#7C3AED]", icon:Trophy    },
  hackathon:   { label:"Hackathon",   emoji:"💻", color:"#2F7CFF", bg:"#DDF3FF", border:"#2F7CFF", gradient:"from-[#2F7CFF] to-[#3BD6F5]", icon:Code2     },
  workshop:    { label:"Workshop",    emoji:"🛠️", color:"#0891B2", bg:"#E0FAFF", border:"#3BD6F5", gradient:"from-[#3BD6F5] to-[#0891B2]", icon:BookOpen  },
  talk:        { label:"Talk",        emoji:"🎤", color:"#059669", bg:"#D1FAE5", border:"#059669", gradient:"from-[#059669] to-[#34D399]", icon:Mic       },
  internship:  { label:"Internship",  emoji:"💼", color:"#D97706", bg:"#FEF3C7", border:"#D97706", gradient:"from-[#F59E0B] to-[#D97706]", icon:Briefcase },
  deal:        { label:"Deal",        emoji:"🎁", color:"#DB2777", bg:"#FCE7F3", border:"#DB2777", gradient:"from-[#DB2777] to-[#F472B6]", icon:Tag       },
};

interface Event {
  id:string; title:string; description:string|null; type:string;
  location:string|null; start_date:string|null; end_date:string|null;
  image_url:string|null; is_sponsored:boolean; is_featured:boolean;
  ace_coins_reward:number; registration_url:string|null;
  event_organizers: { name:string; logo_url:string|null; verified:boolean }|null;
}
const TAB_TYPES = { all:null, events:["competition","hackathon","workshop","talk"], internships:["internship"], deals:["deal"] };
type Tab = keyof typeof TAB_TYPES;
const TABS = [
  { key:"all",         label:"All",         icon:"✦" },
  { key:"events",      label:"Events",      icon:"🎯" },
  { key:"internships", label:"Internships", icon:"💼" },
  { key:"deals",       label:"Deals",       icon:"🎁" },
] as const;

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ── Custom cursor ───────────────────────────────────────────────────── */
const CustomCursor = () => {
  const ring = useRef<HTMLDivElement>(null);
  const dot  = useRef<HTMLDivElement>(null);
  const pos  = useRef({ x:-200, y:-200, tx:-200, ty:-200 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf: number;
    const onMove = (e: MouseEvent) => {
      pos.current.tx = e.clientX; pos.current.ty = e.clientY;
      if (!show) setShow(true);
      if (dot.current) { dot.current.style.left=`${e.clientX}px`; dot.current.style.top=`${e.clientY}px`; }
    };
    const onOver = (e: MouseEvent) => {
      const hit = (e.target as HTMLElement).closest("a,button,[role='button']");
      if (ring.current) {
        ring.current.style.transform = `translate(-50%,-50%) scale(${hit?1.9:1})`;
        ring.current.style.borderColor = hit ? C.blue : "rgba(47,124,255,0.45)";
        ring.current.style.background  = hit ? "rgba(47,124,255,0.08)" : "transparent";
      }
    };
    const tick = () => {
      pos.current.x += (pos.current.tx - pos.current.x) * 0.11;
      pos.current.y += (pos.current.ty - pos.current.y) * 0.11;
      if (ring.current) { ring.current.style.left=`${pos.current.x}px`; ring.current.style.top=`${pos.current.y}px`; }
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
        style={{ width:36,height:36,border:"1.5px solid rgba(47,124,255,0.45)",left:-200,top:-200,transform:"translate(-50%,-50%)",transition:"transform 0.3s cubic-bezier(0.23,1,0.32,1),border-color 0.2s,background 0.2s" }} />
      <div ref={dot}  className="fixed z-[9999] pointer-events-none rounded-full"
        style={{ width:5,height:5,background:C.blue,left:-200,top:-200,transform:"translate(-50%,-50%)",boxShadow:`0 0 8px 3px rgba(47,124,255,0.5)` }} />
    </>
  );
};

/* ── Rotating word ───────────────────────────────────────────────────── */
const WORDS = ["Compete","Build","Intern","Explore","Level Up"];
const RotatingWord = () => {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setOut(true); setTimeout(() => { setIdx(i=>(i+1)%WORDS.length); setOut(false); }, 360); }, 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display:"inline-block", color:C.cyan, opacity:out?0:1, transform:out?"translateY(-18px) skewX(-3deg)":"translateY(0) skewX(0)", transition:"all 0.36s cubic-bezier(0.23,1,0.32,1)", textShadow:"0 0 40px rgba(59,214,245,0.6),0 0 90px rgba(59,214,245,0.2)" }}>
      {WORDS[idx]}
    </span>
  );
};

/* ── Floating hero sticker ───────────────────────────────────────────── */
const FloatingSticker = ({ emoji, label, color, bg, border, style }: { emoji:string; label:string; color:string; bg:string; border:string; style:React.CSSProperties }) => (
  <div className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] pointer-events-none select-none font-['Nunito'] font-extrabold text-[13px]"
    style={{ background:bg, border:`2px solid ${border}40`, color, boxShadow:`2px 2px 0 0 rgba(15,23,42,0.15)`, ...style }}>
    <span>{emoji}</span><span>{label}</span>
  </div>
);

/* ── Countdown badge ─────────────────────────────────────────────────── */
const CountdownBadge = ({ date }: { date:string }) => {
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return null;
  return (
    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg border-[2px] border-white text-white text-[11px] font-extrabold font-['Nunito']"
      style={{ background:days===0?"#EF4444":days<=7?"#F97316":"rgba(0,0,0,0.55)", boxShadow:"2px 2px 0 0 rgba(15,23,42,0.15)", animation:days===0?"pulse 1.5s infinite":undefined }}>
      {days===0?"TODAY":`${days}d left`}
    </span>
  );
};

/* ── Event Card ──────────────────────────────────────────────────────── */
const EventCard = ({ event, featured=false }: { event:Event; featured?:boolean }) => {
  const cfg = TC[event.type] ?? TC.talk;
  const expired = event.end_date ? isPast(new Date(event.end_date)) : false;
  const cardRef = useRef<HTMLAnchorElement>(null);

  const tilt = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    cardRef.current.style.transform  = `perspective(1000px) rotateY(${x*6}deg) rotateX(${-y*6}deg) translateY(-6px)`;
    cardRef.current.style.transition = "transform 0.07s ease";
    cardRef.current.style.boxShadow  = "6px 6px 0 0 #0F172A";
  };
  const untilt = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform  = "perspective(1000px) rotateY(0) rotateX(0) translateY(0)";
    cardRef.current.style.transition = "all 0.55s cubic-bezier(0.23,1,0.32,1)";
    cardRef.current.style.boxShadow  = "4px 4px 0 0 #0F172A";
  };

  return (
    <Link ref={cardRef} to={`/event/${event.id}`} onMouseMove={tilt} onMouseLeave={untilt}
      className="group block overflow-hidden"
      style={{ background:"white", border:"2.5px solid #0F172A", borderRadius:20, boxShadow:"4px 4px 0 0 #0F172A", transformStyle:"preserve-3d", transition:"all 0.2s cubic-bezier(0.23,1,0.32,1)" }}>

      <div className="relative overflow-hidden" style={{ height:featured?178:140 }}>
        {event.image_url ? (
          <>
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105" style={{ transition:"transform 0.5s cubic-bezier(0.23,1,0.32,1)" }} />
            <div className="absolute inset-0" style={{ background:"linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 55%)" }} />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center relative`}>
            <span className="text-6xl select-none opacity-25 group-hover:scale-110 group-hover:opacity-35" style={{ transition:"all 0.5s cubic-bezier(0.23,1,0.32,1)" }}>{cfg.emoji}</span>
            <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage:NOISE, backgroundSize:"100px 100px" }} />
          </div>
        )}

        {/* Type badge */}
        <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold font-['Nunito']"
          style={{ background:cfg.bg, border:`2px solid ${cfg.border}`, color:cfg.color, boxShadow:"2px 2px 0 0 rgba(15,23,42,0.15)" }}>
          {cfg.emoji} {cfg.label}
        </span>

        {event.is_sponsored && (
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg border-[2px] border-[#0F172A] text-[11px] font-extrabold font-['Nunito'] text-[#0F172A]"
            style={{ background:"#FFD65C", boxShadow:"2px 2px 0 0 rgba(15,23,42,0.2)" }}>⭐ SPONSORED</span>
        )}
        {event.start_date && !expired && <CountdownBadge date={event.start_date} />}
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-['Baloo_2'] font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[#2F7CFF] transition-colors" style={{ color:C.ink }}>{event.title}</h3>
        <div className="space-y-1.5 font-['Nunito'] text-[12px]" style={{ color:"rgba(15,23,42,0.52)" }}>
          {event.location && (
            <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" style={{ color:cfg.color }} /><span className="truncate">{event.location}</span></div>
          )}
          {event.start_date && (
            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 shrink-0" style={{ color:cfg.color }} />
              {expired ? <span className="text-red-400 font-bold">Ended</span> : <span>{format(new Date(event.start_date),"d MMM yyyy")}</span>}
            </div>
          )}
        </div>
        {event.ace_coins_reward > 0 && (
          <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-xl border-[1.5px] border-amber-200 bg-amber-50">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-extrabold font-['Nunito'] text-amber-600">+{event.ace_coins_reward} ACE Coins</span>
          </div>
        )}
      </div>
    </Link>
  );
};

/* ── Card skeleton ───────────────────────────────────────────────────── */
const CardSkeleton = ({ tall=false }: { tall?:boolean }) => (
  <div className="overflow-hidden border-[2.5px] border-[#0F172A]/12 rounded-[20px] bg-white">
    <Skeleton className={`w-full rounded-none ${tall?"h-44":"h-[140px]"}`} />
    <div className="p-4 space-y-2">
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-3 w-2/3 rounded-lg" />
    </div>
  </div>
);

/* ── Marquee ─────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  { text:"National Coding Challenge", type:"competition" },
  { text:"Google Summer Internship",  type:"internship"  },
  { text:"UI/UX Workshop by MDEC",    type:"workshop"    },
  { text:"TEDx UM 2026",              type:"talk"        },
  { text:"50% off Notion Pro",        type:"deal"        },
  { text:"Hack Malaysia 2026",        type:"hackathon"   },
  { text:"Petronas STEM Competition", type:"competition" },
];
const Marquee = () => (
  <div className="overflow-hidden border-y-[2.5px] border-[#0F172A] bg-[#2F7CFF] py-2 relative">
    <div className="flex gap-10 whitespace-nowrap" style={{ animation:"marqueeRoll 22s linear infinite" }}>
      {[...MARQUEE_ITEMS,...MARQUEE_ITEMS,...MARQUEE_ITEMS].map((item,i) => {
        const c = TC[item.type] ?? TC.talk;
        return (
          <span key={i} className="flex items-center gap-2 shrink-0 font-['Nunito'] font-bold text-[13px] text-white">
            <span className="opacity-90">{c.emoji}</span>{item.text}
            <span className="text-white/30 mx-1">·</span>
          </span>
        );
      })}
    </div>
  </div>
);

/* ── Scroll reveal ───────────────────────────────────────────────────── */
const Reveal = ({ children, delay=0, className="" }: { children:React.ReactNode; delay?:number; className?:string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-60px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity:0, y:24 }}
      animate={inView ? { opacity:1, y:0 } : { opacity:0, y:24 }}
      transition={{ duration:0.65, delay:delay/1000, ease:[0.23,1,0.32,1] }}>
      {children}
    </motion.div>
  );
};

/* ── Section header ──────────────────────────────────────────────────── */
const SectionHeader = ({ icon:Icon, label, iconBg, iconColor }: { icon:React.ComponentType<any>; label:string; iconBg:string; iconColor:string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl border-[2.5px] border-[#0F172A] flex items-center justify-center" style={{ background:iconBg, boxShadow:"2px 2px 0 0 #0F172A" }}>
      <Icon className="w-4 h-4" style={{ color:iconColor }} />
    </div>
    <h2 className="font-['Baloo_2'] font-extrabold text-[22px]" style={{ color:C.ink }}>{label}</h2>
  </div>
);

/* ── Main ────────────────────────────────────────────────────────────── */
export default function DiscoveryFeed() {
  const { user, session } = useAuth();
  const [tab, setTab]             = useState<Tab>("all");
  const [search, setSearch]       = useState("");
  const [focused, setFocused]     = useState(false);
  const [campusFilter, setCampus] = useState<string|null>(null);
  const [aiRecs, setAiRecs]       = useState<{ recommended_event_ids:string[]; reason:string }|null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { document.title = "Discover – AceTerus Events"; }, []);

  const { data: events=[], isLoading } = useQuery({
    queryKey: ["events", tab, search],
    queryFn: async () => {
      let q = supabase.from("events").select("*, event_organizers(name,logo_url,verified)")
        .eq("status","published")
        .order("is_sponsored",{ ascending:false })
        .order("is_featured",{ ascending:false })
        .order("start_date",{ ascending:true });
      const types = TAB_TYPES[tab];
      if (types) q = q.in("type", types);
      if (search.trim()) q = q.ilike("title",`%${search.trim()}%`);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });

  const { data: campuses=[] } = useQuery({
    queryKey: ["user-campuses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("student_schools").select("schools(name)").eq("user_id",user!.id).eq("is_current",true).limit(3);
      return (data ?? []).map((r:any) => r.schools?.name).filter(Boolean) as string[];
    },
  });

  useEffect(() => {
    if (!user || !session) return;
    setAiLoading(true);
    supabase.functions.invoke("event-matcher", { headers:{ Authorization:`Bearer ${session.access_token}` } })
      .then(({ data, error }) => { if (!error && data?.recommended_event_ids?.length) setAiRecs(data); })
      .finally(() => setAiLoading(false));
  }, [user, session]);

  const featured  = events.filter(e => e.is_featured || e.is_sponsored).slice(0,4);
  const regular   = events.filter(e => !(e.is_featured || e.is_sponsored));
  const aiMatched = aiRecs ? events.filter(e => aiRecs.recommended_event_ids.includes(e.id)).slice(0,5) : [];
  const filtered  = campusFilter ? regular.filter(e => e.location?.toLowerCase().includes(campusFilter.toLowerCase())) : regular;

  const counts = {
    events:      events.filter(e => ["competition","hackathon","workshop","talk"].includes(e.type)).length,
    internships: events.filter(e => e.type==="internship").length,
    deals:       events.filter(e => e.type==="deal").length,
  };

  return (
    <div style={{ background:C.bg, minHeight:"100vh" }}>
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
        body { cursor:none; }
        @media (pointer:coarse) { body { cursor:auto; } }
        ::-webkit-scrollbar { width:0; height:0; }
      `}</style>

      {/* Marquee */}
      <Marquee />

      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center"
        style={{ minHeight:"88vh", padding:"80px 24px 0", background:"linear-gradient(145deg,#0A0F1E 0%,#0D1A3A 45%,#1A1050 100%)" }}>

        {/* Blobs */}
        <div className="absolute pointer-events-none" style={{ width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,#3BD6F5,transparent 65%)",top:-220,left:-240,opacity:0.16,filter:"blur(80px)",animation:"blob1 14s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width:580,height:580,borderRadius:"50%",background:"radial-gradient(circle,#2E2BE5,transparent 65%)",bottom:-80,right:-150,opacity:0.16,filter:"blur(80px)",animation:"blob2 17s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width:460,height:460,borderRadius:"50%",background:"radial-gradient(circle,#2F7CFF,transparent 65%)",top:"50%",left:"50%",transform:"translate(-50%,-50%)",opacity:0.09,filter:"blur(90px)",animation:"blob3 12s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#FFD65C,transparent 65%)",top:"14%",right:"16%",opacity:0.11,filter:"blur(60px)",animation:"blob4 10s ease-in-out infinite" }} />
        <div className="absolute pointer-events-none" style={{ width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,#FF7A59,transparent 65%)",bottom:"24%",left:"10%",opacity:0.08,filter:"blur(50px)",animation:"floatC 9s ease-in-out infinite" }} />

        {/* Grid + noise */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize:"66px 66px" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage:NOISE, backgroundSize:"200px 200px" }} />

        {/* Dot accents */}
        <div className="absolute top-8 left-8 hidden lg:block pointer-events-none opacity-25"
          style={{ width:80,height:80, backgroundImage:"radial-gradient(circle,rgba(59,214,245,0.9) 1.5px,transparent 1.5px)", backgroundSize:"14px 14px" }} />
        <div className="absolute bottom-20 right-10 hidden lg:block pointer-events-none opacity-18"
          style={{ width:72,height:72, backgroundImage:"radial-gradient(circle,rgba(255,213,92,0.9) 1.5px,transparent 1.5px)", backgroundSize:"13px 13px" }} />

        {/* Floating sticker badges */}
        <FloatingSticker emoji="🏆" label="Competition" color={TC.competition.color} bg={TC.competition.bg} border={TC.competition.border} style={{ top:"13%",  left:"4%",    animation:"floatA 7s ease-in-out infinite",       opacity:0.75 }} />
        <FloatingSticker emoji="💻" label="Hackathon"   color={TC.hackathon.color}   bg={TC.hackathon.bg}   border={TC.hackathon.border}   style={{ top:"18%",  right:"5%",   animation:"floatB 8.5s ease-in-out infinite",     opacity:0.68 }} />
        <FloatingSticker emoji="💼" label="Internship"  color={TC.internship.color}  bg={TC.internship.bg}  border={TC.internship.border}  style={{ bottom:"26%",left:"3.5%", animation:"floatC 6.5s ease-in-out infinite",    opacity:0.62 }} />
        <FloatingSticker emoji="🎁" label="Deal"        color={TC.deal.color}        bg={TC.deal.bg}        border={TC.deal.border}        style={{ bottom:"30%",right:"4%",  animation:"floatD 9s ease-in-out infinite",       opacity:0.60 }} />
        <FloatingSticker emoji="🛠️" label="Workshop"   color={TC.workshop.color}    bg={TC.workshop.bg}    border={TC.workshop.border}    style={{ top:"50%",  left:"2%",    animation:"floatB 7.5s ease-in-out infinite 1s", opacity:0.52 }} />
        <FloatingSticker emoji="🎤" label="Talk"        color={TC.talk.color}        bg={TC.talk.bg}        border={TC.talk.border}        style={{ top:"44%",  right:"3%",   animation:"floatA 8s ease-in-out infinite 0.5s", opacity:0.52 }} />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background:"rgba(59,214,245,0.1)", border:"1px solid rgba(59,214,245,0.25)", boxShadow:"0 0 20px rgba(59,214,245,0.1)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color:C.cyan }} />
              <span className="text-[11px] font-bold font-['Nunito'] tracking-[0.2em] uppercase" style={{ color:C.cyan }}>For Malaysian Students</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity:0,y:32 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.8,delay:0.1,ease:[0.23,1,0.32,1] }}
            className="font-['Baloo_2'] font-extrabold tracking-tighter leading-[0.96]"
            style={{ fontSize:"clamp(52px,9.5vw,96px)", color:"rgba(255,255,255,0.94)" }}>
            The place to<br /><RotatingWord />.
          </motion.h1>

          <motion.p initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.65,delay:0.22 }}
            className="font-['Nunito'] text-[17px] max-w-sm mx-auto" style={{ color:"rgba(255,255,255,0.45)", lineHeight:1.65 }}>
            Competitions. Hackathons. Internships. Deals.<br />Everything worth showing up for.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.65,delay:0.3 }} className="max-w-2xl mx-auto w-full">
            <div className="relative rounded-[18px]"
              style={{ boxShadow:focused?`0 0 0 2.5px ${C.cyan},0 0 50px rgba(59,214,245,0.18)`:"0 0 0 1.5px rgba(255,255,255,0.12),0 8px 32px rgba(0,0,0,0.45)", transition:"box-shadow 0.3s ease" }}>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200" style={{ color:focused?C.cyan:"rgba(255,255,255,0.3)" }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
                placeholder="Search events, hackathons, internships…"
                className="w-full pl-14 pr-6 py-4 outline-none font-['Nunito'] text-[15px] rounded-[18px]"
                style={{ background:"rgba(255,255,255,0.07)", backdropFilter:"blur(16px)", color:"rgba(255,255,255,0.88)", caretColor:C.cyan }} />
            </div>
          </motion.div>

          {/* Live stats */}
          {!isLoading && events.length > 0 && (
            <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6,delay:0.42 }} className="flex flex-wrap justify-center gap-3">
              {[
                { emoji:"🎯", count:counts.events,      label:"Events",      color:C.cyan  },
                { emoji:"💼", count:counts.internships, label:"Internships", color:C.gold  },
                { emoji:"🎁", count:counts.deals,       label:"Deals",       color:"#F472B6" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-[16px] font-['Nunito']"
                  style={{ background:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)", border:`1.5px solid ${s.color}25` }}>
                  <span className="text-lg">{s.emoji}</span>
                  <div>
                    <div className="text-[17px] font-extrabold leading-none" style={{ color:s.color }}>{s.count}</div>
                    <div className="text-[11px] font-bold leading-none mt-0.5 text-white/40">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Wave into light */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 72" preserveAspectRatio="none" className="w-full" style={{ height:72 }}>
            <path d="M0,42 C480,82 960,12 1440,46 L1440,72 L0,72 Z" fill={C.bg} />
            <path d="M0,46 C480,86 960,16 1440,50" fill="none" stroke="rgba(59,214,245,0.12)" strokeWidth="1.5" />
          </svg>
        </div>
      </section>

      {/* ─── CONTENT (bright) ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 space-y-14" style={{ paddingTop:32 }}>

        {/* Campus filter */}
        {campuses.length > 0 && (
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[13px] font-bold font-['Nunito']" style={{ color:"rgba(15,23,42,0.45)" }}>
                <Filter className="w-3.5 h-3.5" /> Near your campus:
              </span>
              {[null,...campuses].map(c => (
                <button key={c??"all"} onClick={()=>setCampus(c)}
                  className="px-3 py-1.5 rounded-xl text-[13px] font-bold font-['Nunito'] transition-all duration-150 hover:-translate-y-0.5"
                  style={{ border:campusFilter===c?"2px solid #2F7CFF":"2px solid rgba(15,23,42,0.15)", background:campusFilter===c?"#2F7CFF":"white", color:campusFilter===c?"white":"rgba(15,23,42,0.6)", boxShadow:campusFilter===c?"2px 2px 0 0 #0F172A":"none" }}>
                  {c ?? "🌐 All"}
                </button>
              ))}
            </div>
          </Reveal>
        )}

        {/* Featured */}
        {(isLoading || featured.length > 0) && (
          <Reveal>
            <section className="space-y-5">
              <SectionHeader icon={Star} label="Featured" iconBg="#FFD65C" iconColor={C.ink} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? Array.from({ length:4 }).map((_,i)=><CardSkeleton key={i} tall />) : featured.map(e=><EventCard key={e.id} event={e} featured />)}
              </div>
            </section>
          </Reveal>
        )}

        {/* AI picks */}
        {user && (aiLoading || aiMatched.length > 0) && (
          <Reveal delay={80}>
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <SectionHeader icon={Sparkles} label="Matched for You" iconBg="#D6D4FF" iconColor={C.indigo} />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold font-['Nunito'] tracking-widest border-[2px] border-[#2E2BE5]/30 bg-[#D6D4FF] text-[#2E2BE5]">AI</span>
              </div>
              {aiRecs?.reason && <p className="text-[13px] font-['Nunito'] italic" style={{ color:"rgba(46,43,229,0.7)" }}>{aiRecs.reason}</p>}
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                {aiLoading
                  ? Array.from({ length:4 }).map((_,i)=><div key={i} className="min-w-[220px] shrink-0"><CardSkeleton /></div>)
                  : aiMatched.map(e=><div key={e.id} className="min-w-[220px] max-w-[240px] shrink-0"><EventCard event={e} /></div>)}
              </div>
            </section>
          </Reveal>
        )}

        {/* Browse */}
        <Reveal delay={100}>
          <section className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map(({ key, label, icon }) => {
                const active = tab===key;
                return (
                  <button key={key} onClick={()=>setTab(key as Tab)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-['Nunito'] font-bold text-[14px] whitespace-nowrap transition-all duration-150"
                    style={{ background:active?"#0F172A":"white", border:active?"2.5px solid #0F172A":"2px solid rgba(15,23,42,0.15)", color:active?"white":"rgba(15,23,42,0.6)", boxShadow:active?"3px 3px 0 0 rgba(15,23,42,0.25)":"none", transform:active?"translateY(-1px)":"translateY(0)" }}>
                    <span>{icon}</span>{label}
                  </button>
                );
              })}
            </div>

            {/* Event type sub-filter */}
            {tab==="events" && (
              <div className="flex flex-wrap gap-2">
                {(["competition","hackathon","workshop","talk"] as const).map(t => {
                  const c = TC[t];
                  return (
                    <button key={t}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-['Nunito'] font-bold text-[13px] border-[2px] transition-all duration-150 hover:-translate-y-0.5"
                      style={{ background:c.bg, border:`2px solid ${c.border}30`, color:c.color }}>
                      <span>{c.emoji}</span>{c.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length:8 }).map((_,i)=><CardSkeleton key={i} />)}
              </div>
            ) : filtered.length===0 ? (
              <div className="py-20 text-center space-y-3 rounded-[20px] border-[2.5px] border-[#0F172A]/10 bg-white shadow-[4px_4px_0_0_rgba(15,23,42,0.05)]">
                <div className="text-6xl">🔭</div>
                <p className="font-['Baloo_2'] font-bold text-[20px]" style={{ color:"rgba(15,23,42,0.4)" }}>
                  {search ? "No events match your search" : "Nothing here yet — check back soon!"}
                </p>
                {search && <button onClick={()=>setSearch("")} className="text-[14px] font-bold font-['Nunito'] hover:underline" style={{ color:C.blue }}>Clear search</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <AnimatePresence mode="popLayout">
                  {filtered.map((e,i)=>(
                    <motion.div key={e.id} initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,scale:0.95 }}
                      transition={{ duration:0.45, delay:Math.min(i*0.04,0.3), ease:[0.23,1,0.32,1] }}>
                      <EventCard event={e} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </Reveal>

        {/* Sign-in CTA */}
        {!user && (
          <Reveal delay={80}>
            <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] overflow-hidden">
              <div className="bg-gradient-to-r from-[#2F7CFF] to-[#2E2BE5] p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="text-6xl shrink-0">🚀</div>
                <div className="flex-1">
                  <h3 className="font-['Baloo_2'] font-extrabold text-[24px] text-white">Get AI-matched opportunities</h3>
                  <p className="text-white/70 font-['Nunito'] text-[15px] mt-1">Sign in to unlock personalised picks, register for events, and earn ACE Coins.</p>
                </div>
                <a href="https://aceterus.com/auth"
                  className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl border-[2.5px] border-white bg-white font-bold font-['Nunito'] text-[15px] hover:-translate-y-0.5 transition-all shadow-[3px_3px_0_0_rgba(255,255,255,0.3)]"
                  style={{ color:C.blue }}>
                  Sign In <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </Reveal>
        )}

        {/* Organiser CTA — discreet bottom strip */}
        <Reveal delay={60}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 px-6 py-5 rounded-[20px] border-[2px] border-[#0F172A]/12 bg-white"
            style={{ boxShadow:"3px 3px 0 0 rgba(15,23,42,0.06)" }}>
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="text-3xl shrink-0 hidden sm:block">📣</div>
              <div>
                <p className="font-['Baloo_2'] font-extrabold text-[17px]" style={{ color:C.ink }}>Running an event or internship?</p>
                <p className="font-['Nunito'] text-[13px]" style={{ color:"rgba(15,23,42,0.48)" }}>Get it in front of thousands of Malaysian students.</p>
              </div>
            </div>
            <Link to="/organiser"
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-['Nunito'] font-bold text-[14px] border-[2px] border-[#0F172A] bg-white transition-all duration-150 hover:-translate-y-0.5 whitespace-nowrap"
              style={{ color:C.ink, boxShadow:"2px 2px 0 0 #0F172A" }}>
              <LayoutDashboard className="w-4 h-4" /> Organiser Dashboard
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
