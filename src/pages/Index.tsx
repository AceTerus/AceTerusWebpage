import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight, Rocket, Eye, Zap, Sparkles, Star, Flame, CheckCircle2, Trophy,
  Brain, Users, FileText, Play, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "../assets/logo.webp";

/* ── brand colours ─────────────────────────────────────────────────────── */
const C = {
  cyan:       "#3BD6F5",
  blue:       "#2F7CFF",
  indigo:     "#2E2BE5",
  ink:        "#0F172A",
  skySoft:    "#DDF3FF",
  blueSoft:   "#C8DEFF",
  indigoSoft: "#D6D4FF",
  cloud:      "#F3FAFF",
  sun:        "#FFD65C",
  pop:        "#FF7A59",
};

/* ── shared style snippets ──────────────────────────────────────────────── */
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const STICKER =
  "border-[3px] border-[#0F172A] rounded-[28px] shadow-[4px_4px_0_0_#0F172A] bg-white transition-all duration-200 ease-out hover:-translate-y-2 hover:shadow-[7px_8px_0_0_#0F172A]";
const STICKER_SM =
  "border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[4px_4px_0_0_#0F172A] bg-white transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[6px_8px_0_0_#0F172A]";
const PILL =
  "border-[2.5px] border-[#0F172A] rounded-full shadow-[3px_3px_0_0_#0F172A] bg-white";
const BTN =
  "inline-flex items-center gap-2.5 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A]";
const TAG =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-xs transition-transform duration-150 hover:scale-105 hover:-translate-y-0.5";

const tiltL: React.CSSProperties = { transform: "rotate(-2.5deg)" };
const tiltR: React.CSSProperties = { transform: "rotate(2.5deg)" };

function IconBlob({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      className="relative w-16 h-16 rounded-[22px] border-[3px] border-[#0F172A] flex items-center justify-center shadow-[4px_4px_0_0_#0F172A] transition-all duration-200 hover:scale-110 hover:rotate-6 hover:shadow-[4px_4px_0_0_#0F172A]"
      style={{ background: bg }}
    >
      <span
        aria-hidden
        className="absolute top-2 left-2.5 w-4 h-2.5 rounded-[10px] bg-white/70"
        style={{ transform: "rotate(-18deg)" }}
      />
      {children}
    </div>
  );
}

/* ── Curator.io Instagram feed ───────────────────────────────────────────── */
// 1. Sign up free at curator.io
// 2. Add Instagram @aceterus as a source → create & publish a feed
// 3. From the embed code, copy your feed ID (looks like: abc12345-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
// 4. Replace "YOUR_FEED_ID" below with that ID
const CURATOR_FEED_ID = "fc3ca777-fd52-4b62-b798-ec7325cb1eb9";

function CuratorFeed({ feedId }: { feedId: string }) {
  React.useEffect(() => {
    if (feedId === "YOUR_FEED_ID") return;
    if (document.getElementById("curator-script")) return;
    const s = document.createElement("script");
    s.id = "curator-script";
    s.src = `https://cdn.curator.io/published/${feedId}.js`;
    s.async = true;
    document.body.appendChild(s);
  }, [feedId]);

  if (feedId === "YOUR_FEED_ID") {
    return (
      <div className="rounded-[28px] border-[3px] border-dashed border-[#0F172A]/25 bg-white/70 p-12 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-[18px] border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] flex items-center justify-center"
          style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}>
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </div>
        <div>
          <p className={`${DISPLAY} font-extrabold text-xl`}>Connect @aceterus on Curator.io</p>
          <p className="font-medium text-slate-500 mt-1 max-w-xs mx-auto text-sm leading-relaxed">
            Sign up free at <a href="https://curator.io" target="_blank" rel="noopener noreferrer" className="text-[#2F7CFF] underline font-bold">curator.io</a>, add Instagram as a source, publish a feed, then paste your Feed ID into <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs font-mono">CURATOR_FEED_ID</code> in Index.tsx.
          </p>
        </div>
        <a href="https://curator.io" target="_blank" rel="noopener noreferrer"
          className={`${BTN} text-white !py-2 !px-5 !text-sm`} style={{ background: C.indigo }}>
          Set up Curator.io <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <>
      <style>{`
        #curator-feed-default-feed-layout .crt-post { border-radius: 22px !important; border: 3px solid #0F172A !important; box-shadow: 5px 5px 0 0 #0F172A !important; overflow: hidden !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
        #curator-feed-default-feed-layout .crt-post:hover { transform: translateY(-6px) !important; box-shadow: 6px 7px 0 0 #0F172A !important; }
        #curator-feed-default-feed-layout .crt-logo { font-family: 'Nunito', sans-serif !important; font-weight: 700 !important; }
      `}</style>
      <div id="curator-feed-default-feed-layout">
        <a href="https://curator.io" target="_blank" rel="noopener noreferrer" className="crt-logo crt-tag">Powered by Curator.io</a>
      </div>
    </>
  );
}

/* ── scroll reveal ──────────────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  from = "bottom",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  from?: "bottom" | "left" | "right";
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`;
          el.classList.add("atl-revealed");
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`atl-reveal atl-reveal-${from} ${className}`}>
      {children}
    </div>
  );
}

/* ── smooth anchor scroll ───────────────────────────────────────────────── */
function useSmoothAnchor() {
  React.useEffect(() => {
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const start = window.scrollY;
      const end = el.getBoundingClientRect().top + window.scrollY - 80;
      const duration = 1400;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        window.scrollTo(0, start + (end - start) * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
}

/* ── page component ─────────────────────────────────────────────────────── */
const Index = () => {
  const { user, isLoading } = useAuth();
  const [videoError, setVideoError] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  useSmoothAnchor();

  React.useEffect(() => {
    const load = () => setVideoSrc("/videos/PromotionalEdit.mp4");
    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
    return () => window.removeEventListener("load", load);
  }, []);
  React.useEffect(() => {
    document.title = "AceTerus – Free AI Tutor & SPM Quiz Platform for Malaysian Students";
  }, []);

  if (isLoading) return null;
  if (user) return <Navigate to="/feed" replace />;

  return (
    <div
      className="font-['Nunito'] relative text-[#0F172A] min-h-screen"
      style={{
        backgroundImage: `
          radial-gradient(1200px 600px at 85% -10%, rgba(59,214,245,.55), transparent 60%),
          radial-gradient(900px 500px at -5% 10%,  rgba(47,124,255,.45), transparent 60%),
          radial-gradient(800px 600px at 50% 100%, rgba(46,43,229,.30),  transparent 60%)
        `,
        backgroundColor: C.cloud,
      }}
    >
      {/* grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* animation keyframes */}
      <style>{`
        @keyframes atl-float  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-10px)} }
        @keyframes atl-wobble { 0%,100%{transform:rotate(-3deg)}  50%{transform:rotate(3deg)}      }
        .atl-float  { animation: atl-float  4s   ease-in-out infinite;      }
        .atl-float2 { animation: atl-float  5s   ease-in-out infinite .6s;  }
        .atl-float3 { animation: atl-float  3.5s ease-in-out infinite 1.2s; }
        .atl-wobble { animation: atl-wobble 6s   ease-in-out infinite;      }
        .atl-underline { position:relative; display:inline-block; }
        .atl-underline::after {
          content:''; position:absolute; left:-4px; right:-4px; bottom:2px;
          height:14px; z-index:-1; background:${C.cyan}; border-radius:8px;
          transform:rotate(-1.5deg);
        }
        .atl-dots {
          background-image: radial-gradient(${C.blue} 2px, transparent 2px);
          background-size: 20px 20px;
        }
        .atl-nav-link {
          display: inline-block;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), color 0.15s;
        }
        .atl-nav-link:hover { transform: translateY(-3px); }
        .atl-logo:hover { transform: rotate(8deg) scale(1.12); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .atl-logo { transition: transform 0.2s ease; }
        .atl-pill-hover {
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
        }
        .atl-pill-hover:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 7px 9px 0 0 rgba(255,255,255,0.3);
        }
        .atl-mascot-wrap { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .atl-mascot-wrap:hover { transform: scale(1.06); }
        .atl-stat-item { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .atl-stat-item:hover { transform: scale(1.1) translateY(-4px); }

        @keyframes atl-hero-in {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .atl-hero-in { animation: atl-hero-in 0.75s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes atl-pop-in {
          0%   { opacity: 0; transform: scale(0.7) rotate(-4deg); }
          70%  { transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .atl-pop-in { animation: atl-pop-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }

        @keyframes atl-pulse-glow {
          0%,100% { box-shadow: 4px 4px 0 0 #0F172A, 0 0 0 0 rgba(47,124,255,0); }
          50%      { box-shadow: 4px 4px 0 0 #0F172A, 0 0 18px 6px rgba(47,124,255,0.4); }
        }
        .atl-cta-btn { animation: atl-pulse-glow 2.8s ease-in-out infinite; }

        .atl-reveal { opacity: 0; }
        .atl-reveal-bottom { transform: translateY(40px); }
        .atl-reveal-left   { transform: translateX(-40px); }
        .atl-reveal-right  { transform: translateX(40px); }
        .atl-revealed {
          animation: atl-fade-in 0.65s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes atl-fade-in {
          to { opacity: 1; transform: translate(0,0); }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      {/* ── HERO (nav lives inside so it floats over the video) ──────────── */}
      <section className="relative px-5 pt-6 pb-24">
        {/* background video */}
        {!videoError ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3BD6F5] via-[#2F7CFF] to-[#2E2BE5]" />
        )}
        {/* video overlay — keeps text readable over the video */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />

        {/* ── NAV ── floats over the hero video */}
        <header className="relative z-30 mb-10">
          <div className={`${PILL} max-w-6xl mx-auto flex items-center justify-between px-5 py-2`}>
            <Link to="/" className="flex items-center gap-2">
              <img src={Logo} alt="AceTerus" className="w-10 h-10 rounded-xl atl-logo" />
              <span className={`${DISPLAY} font-extrabold text-xl`}>AceTerus</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 font-bold text-sm">
              <a href="#play"    className="atl-nav-link hover:text-[#2F7CFF]">Play</a>
              <a href="#learn"   className="atl-nav-link hover:text-[#2F7CFF]">Learn</a>
              <a href="#squad"   className="atl-nav-link hover:text-[#2F7CFF]">Squad</a>
              <a href="#rewards" className="atl-nav-link hover:text-[#2F7CFF]">Rewards</a>
            </nav>
            <Link to="/auth">
              <button className={`${BTN} !py-2 !px-4 !text-sm text-white`} style={{ background: C.blue }}>
                Jump in <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </header>

        {/* floating clouds */}
        <div className="absolute atl-float2 bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]"
          style={{ top: 180, right: "8%", width: 90, height: 40 }} />
        <div className="absolute atl-float3 bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]"
          style={{ bottom: 100, left: "45%", width: 70, height: 32 }} />
        {/* sparkle decorations */}
        <Sparkles className="absolute atl-float"  style={{ top: 140, left: "10%",  color: C.cyan,   width: 28, height: 28 }} />
        <Star     className="absolute atl-float2" style={{ top: 70,  right: "14%", color: C.indigo, fill: C.indigo, width: 30, height: 30 }} />
        <Zap      className="absolute atl-float3" style={{ bottom: 50, left: "20%", color: C.sun, fill: C.sun, width: 28, height: 28 }} />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative">
          {/* left: copy */}
          <div>
            <span className={`${TAG} atl-hero-in`} style={{ background: C.cyan, animationDelay: "100ms" }}>
              <Zap className="w-3.5 h-3.5" /> Malaysia's #1 study sidekick
            </span>
            <h1
              className={`${DISPLAY} font-extrabold mt-5 leading-[0.95] atl-hero-in`}
              style={{ fontSize: "clamp(44px,7vw,96px)", animationDelay: "220ms" }}
            >
              Learn stuff.<br />
              <span className="atl-underline">Ace quizzes.</span><br />
              <span style={{ color: C.blue }}>Have Fun</span><br />
              doing it!
            </h1>
            <p className="mt-6 text-lg md:text-xl max-w-xl font-medium atl-hero-in" style={{ animationDelay: "380ms" }}>
              AceTerus turns studying into a game you actually want to play. Quizzes, streaks, squads, and an AI companion — all in one platform. Built for Malaysian students, powered by AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 atl-hero-in" style={{ animationDelay: "500ms" }}>
              <button 
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} 
                className={`${BTN} bg-white text-[#0F172A] atl-cta-btn flex items-center justify-center gap-2`}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" loading="lazy" />
                Continue with Google
              </button>
              <Link to="/auth">
                <button className={`${BTN} text-white`} style={{ background: C.blue }}>
                  Email Sign Up <Rocket className="w-5 h-5" />
                </button>
              </Link>
              <a href="#play" className="hidden sm:inline-block">
                <button className={`${BTN} bg-white`}>
                  Peek <Eye className="w-5 h-5" />
                </button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3 atl-hero-in" style={{ animationDelay: "620ms" }}>
              <div className="flex -space-x-2">
                {[C.cyan, C.blue, C.indigo, C.sun].map((c, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-[3px] border-[#0F172A] atl-pop-in" style={{ background: c, animationDelay: `${680 + i * 80}ms` }} />
                ))}
              </div>
              <p className="font-bold text-sm">Join students already levelling up today</p>
            </div>
          </div>

          {/* right: mascot cluster */}
          <div className="relative h-[520px] atl-mascot-wrap atl-hero-in" style={{ animationDelay: "300ms" }}>
            {/* wobbling circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-[380px] h-[380px] rounded-full atl-wobble border-[4px] border-[#0F172A] shadow-[10px_10px_0_0_#0F172A]"
                style={{ background: C.blue }}
              />
            </div>
            {/* Ace mascot SVG */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 260 260" className="w-[280px] h-[280px] atl-float">
                <g stroke="#0F172A" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx={130} cy={140} rx={100} ry={95} fill={C.cyan} />
                  <ellipse cx={95}  cy={105} rx={24}  ry={14} fill={C.skySoft} stroke="none" opacity={0.7} />
                  <circle cx={95}  cy={130} r={13}  fill="#0F172A" />
                  <circle cx={165} cy={130} r={13}  fill="#0F172A" />
                  <circle cx={100} cy={125} r={3.5} fill="#fff" stroke="none" />
                  <circle cx={170} cy={125} r={3.5} fill="#fff" stroke="none" />
                  <path d="M95 170 Q130 200 165 170" fill="none" />
                  <ellipse cx={70}  cy={160} rx={14} ry={8} fill={C.pop} opacity={0.85} />
                  <ellipse cx={190} cy={160} rx={14} ry={8} fill={C.pop} opacity={0.85} />
                  <path d="M78 72 Q130 20 182 72 Q182 80 78 80 Z" fill={C.indigo} />
                  <circle cx={130} cy={38} r={7} fill={C.sun} />
                </g>
              </svg>
            </div>
            {/* floating mini-cards */}
            <div className={`${STICKER_SM} absolute top-2 left-2 p-3 w-44 atl-float`} style={{ ...tiltL, background: C.cyan }}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-[14px] border-[2px] border-[#0F172A] bg-white flex items-center justify-center shadow-[3px_3px_0_0_#0F172A]">
                  <Flame className="w-5 h-5" style={{ color: C.pop }} />
                </div>
                <div>
                  <div className={`${DISPLAY} font-extrabold text-lg leading-none`}>12 day</div>
                  <div className="text-[10px] font-bold">streak 🔥</div>
                </div>
              </div>
            </div>
            <div className={`${STICKER_SM} absolute bottom-4 right-0 p-3 w-52 atl-float2`} style={tiltR}>
              <div className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: C.blue }}>Quiz · Biology</div>
              <div className="font-bold text-sm leading-snug">What powers the mitochondria?</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[10px] font-bold" style={{ color: C.indigo }}>+50 XP</div>
                <CheckCircle2 className="w-5 h-5" style={{ color: C.blue }} />
              </div>
            </div>
            <div className={`${STICKER_SM} absolute top-28 right-2 p-2.5 w-36 atl-float3 text-white`} style={{ ...tiltR, background: C.indigo }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: C.sun }} />
                <div className={`${DISPLAY} font-extrabold text-xs`}>Top 3 this week!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS STRIP ─────────────────────────────────────────────── */}
      <section className="py-10 border-y-[3px] border-[#0F172A] overflow-hidden" style={{ background: C.indigo }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-wrap justify-center gap-4">
            {([
              { Icon: Flame,    label: "Daily Streaks",  sub: "keep the fire alive",    bg: C.cyan,       text: C.ink,  shadow: "rgba(0,0,0,0.25)" },
              { Icon: Brain,    label: "AI Tutor",        sub: "your smartest study pal", bg: "#fff",       text: C.ink,  shadow: "rgba(0,0,0,0.25)" },
              { Icon: Users,    label: "Squad Mode",      sub: "no one studies alone",   bg: C.blue,       text: "#fff", shadow: "rgba(0,0,0,0.25)" },
              { Icon: Trophy,   label: "Leaderboards",   sub: "flex on your classmates", bg: C.sun,        text: C.ink,  shadow: "rgba(0,0,0,0.25)" },
              { Icon: Sparkles, label: "Smart Quizzes",  sub: "adaptive to your level",  bg: C.pop,        text: "#fff", shadow: "rgba(0,0,0,0.25)" },
            ] as { Icon: React.ElementType; label: string; sub: string; bg: string; text: string; shadow: string }[]).map(({ Icon, label, sub, bg, text }, i) => (
              <Reveal key={label} delay={i * 80} from="bottom">
                <div
                  className="atl-pill-hover flex items-center gap-3 px-5 py-3.5 rounded-[20px] border-[3px] border-[#0F172A] shadow-[5px_5px_0_0_rgba(255,255,255,0.25)]"
                  style={{ background: bg, color: text }}
                >
                  <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" style={{ color: text }} />
                  </div>
                  <div>
                    <div className={`${DISPLAY} font-extrabold text-sm leading-none`}>{label}</div>
                    <div className="text-[10px] font-bold opacity-75 mt-0.5">{sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ─────────────────────────────────────────────────── */}
      <section id="play" className="px-5 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal from="bottom">
            <div className="text-center mb-14">
              <span className={TAG} style={{ background: C.cyan }}>What's inside</span>
              <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
                Your new favourite<br />study kit 🎒
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              { t: "Brainy quizzes",    d: "Bite-sized quizzes across every subject that feel like mini-games. Make your own or grab ones from the community.",               Icon: Brain,    cardBg: C.cyan,       blob: C.blue,   iconColor: "#fff",  tilt: tiltL },
              { t: "Streaks that stick",d: "Show up, earn XP, keep your flame alive. Miss a day and Ace will absolutely guilt-trip you (lovingly).",                         Icon: Flame,    cardBg: C.blueSoft,   blob: C.indigo, iconColor: "#fff"             },
              { t: "AI study buddy",    d: "Stuck on a topic? Ace breaks it down, suggests study plans, and gives you real-time feedback — like your coolest tutor.",        Icon: Sparkles, cardBg: C.indigo,     blob: C.cyan,   iconColor: C.ink,   tilt: tiltR, text: "#fff" },
              { t: "Squad up",          d: "Pull your friends in. Study sessions, shared notes, group challenges. It's more fun when nobody falls behind alone.",            Icon: Users,    cardBg: C.skySoft,    blob: C.sun,    iconColor: C.ink,   tilt: tiltR },
              { t: "Drop your notes",   d: "Upload notes, get an AI-generated quiz. Centralise all your study materials in one place — zero tab-switching required.",        Icon: FileText, cardBg: C.indigoSoft, blob: C.blue,   iconColor: "#fff"             },
              { t: "Real rewards",      d: "Climb the leaderboard, collect badges, and unlock achievements. Motivation built right into the platform.",                      Icon: Trophy,   cardBg: C.blue,       blob: C.sun,    iconColor: C.ink,   tilt: tiltL, text: "#fff" },
            ] as { t: string; d: string; Icon: React.ElementType; cardBg: string; blob: string; iconColor: string; text?: string; tilt?: React.CSSProperties }[]).map(({ t, d, Icon, cardBg, blob, iconColor, text, tilt }, i) => (
              <Reveal key={t} delay={i * 100} from={i % 3 === 0 ? "left" : i % 3 === 2 ? "right" : "bottom"}>
                <div className={`${STICKER} p-6 h-full`} style={{ background: cardBg, color: text ?? C.ink, ...(tilt ?? {}) }}>
                  <IconBlob bg={blob}>
                    <Icon className="w-[30px] h-[30px]" strokeWidth={2.5} style={{ color: iconColor }} />
                  </IconBlob>
                  <h3 className={`${DISPLAY} font-extrabold text-2xl mt-4`}>{t}</h3>
                  <p className="mt-2 font-medium">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="learn" className="px-5 py-24 relative border-y-[3px] border-[#0F172A]" style={{ background: C.skySoft }}>
        <div className="absolute top-8 right-8 atl-dots w-28 h-28 opacity-60" />
        <div className="absolute bottom-8 left-8 atl-dots w-24 h-24 opacity-60" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className={`${TAG} text-white`} style={{ background: C.blue }}>3 easy steps</span>
            <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
              How it works ✨
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {([
              { n: "1", c: C.cyan,   t: "Sign up free",      d: "Takes 30 seconds. No cards, no catches — just immediate access to your dashboard.", tilt: tiltL },
              { n: "2", c: C.blue,   t: "Pick your subjects", d: "Set your subjects, pace, and goals. Ace tailors quizzes and study plans just for you." },
              { n: "3", c: C.indigo, t: "Start acing it",     d: "Play daily, crush streaks, collaborate with your squad, and flex on the leaderboard.", tilt: tiltR },
            ] as { n: string; c: string; t: string; d: string; tilt?: React.CSSProperties }[]).map(({ n, c, t, d, tilt }, i) => (
              <Reveal key={n} delay={i * 120} from={i === 0 ? "left" : i === 2 ? "right" : "bottom"}>
                <div className={`${STICKER} p-6 text-center`} style={tilt}>
                  <div className={`${DISPLAY} font-extrabold text-7xl`} style={{ color: c, WebkitTextStroke: `3px ${C.ink}` }}>{n}</div>
                  <h3 className={`${DISPLAY} font-extrabold text-2xl`}>{t}</h3>
                  <p className="font-medium mt-2">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="squad" className="px-5 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal from="bottom">
            <div className="text-center mb-14">
              <span className={TAG} style={{ background: C.cyan }}>Real students</span>
              <h2 className={`${DISPLAY} font-extrabold mt-4 leading-none`} style={{ fontSize: "clamp(36px,5vw,64px)" }}>
                The squad loves it 💙
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {([
              { q: "Very clean and well designed interface thats not too distracting like some other study apps/websites ive used, keeps me focused when im doing quizzes!", n: "anonymous",  r: "Form 3 Student, Sekolah Seri Puteri",    bg: "#fff",   starColor: C.blue,   avBg: C.cyan,   tilt: tiltL },
              { q: "The streak system is evil in the best way. I literally cannot miss a day.",              n: "Dhiren", r: "Secondary School, Bangi", bg: C.cyan,   starColor: C.indigo, avBg: C.indigo             },
              { q: "Comel gilaaaaa, macam main Game! I will definitely use this kalau go back in time waktu tengah study SPM.",    n: "Yasmin Hanani",    r: "Undergraduate, UKM Bangi",        bg: C.indigo, starColor: C.sun,    avBg: C.sun,    tilt: tiltR, text: "#fff" },
            ] as { q: string; n: string; r: string; bg: string; starColor: string; avBg: string; tilt?: React.CSSProperties; text?: string }[]).map((x, i) => (
              <Reveal key={i} delay={i * 110} from={i === 0 ? "left" : i === 2 ? "right" : "bottom"}>
              <div className={`${STICKER} p-6`} style={{ background: x.bg, color: x.text ?? C.ink, ...(x.tilt ?? {}) }}>
                <div className="flex items-center gap-1 text-xl" style={{ color: x.starColor }}>★★★★★</div>
                <p className="mt-3 font-medium text-lg">"{x.q}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border-[3px] border-[#0F172A]" style={{ background: x.avBg }} />
                  <div>
                    <div className={`${DISPLAY} font-extrabold`}>{x.n}</div>
                    <div className="text-xs font-bold opacity-70">{x.r}</div>
                  </div>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      <section id="rewards" className="px-5 py-16">
        <div className={`${STICKER} max-w-6xl mx-auto p-10 grid md:grid-cols-4 gap-6 text-center text-white`} style={{ background: C.blue }}>
          {([
            { n: "Unified",      l: "all subjects, one platform"  },
            { n: "Personalised", l: "adaptive AI study plans"     },
            { n: "Gamified",     l: "streaks, XP & challenges"    },
            { n: "4.9★",         l: "avg student rating"          },
          ] as const).map((s, i) => (
            <Reveal key={s.n} delay={i * 90} from="bottom">
              <div className="atl-stat-item">
                <div className={`${DISPLAY} font-extrabold text-4xl`}>{s.n}</div>
                <div className="font-bold text-sm mt-1">{s.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── INSTAGRAM ────────────────────────────────────────────────────── */}
      <section className="px-5 py-24 border-y-[3px] border-[#0F172A]" style={{ background: C.skySoft }}>
        <div className="max-w-6xl mx-auto">
          {/* header row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              {/* Instagram gradient blob */}
              <div
                className="w-14 h-14 rounded-[18px] border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <div className={`${DISPLAY} font-extrabold text-2xl leading-none`}>@aceterus</div>
                <div className="font-medium text-slate-500 mt-1">Study tips, wins & good vibes ✨</div>
              </div>
            </div>
            <a href="https://instagram.com/aceterus" target="_blank" rel="noopener noreferrer">
              <button className={`${BTN} text-white`} style={{ background: "linear-gradient(135deg,#dc2743,#bc1888)" }}>
                Follow us <ExternalLink className="w-4 h-4" />
              </button>
            </a>
          </div>

          <CuratorFeed feedId={CURATOR_FEED_ID} />

          <p className="text-center font-bold text-slate-500 mt-8">
            Follow us for daily study tips, student wins, and behind-the-scenes updates →{" "}
            <a href="https://instagram.com/aceterus" target="_blank" rel="noopener noreferrer"
              className="text-[#bc1888] hover:underline">@aceterus</a>
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-5 py-24">
        <Reveal from="bottom">
        <div
          className={`${STICKER} max-w-4xl mx-auto p-12 text-center relative overflow-hidden text-white`}
          style={{ background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 55%, ${C.indigo} 100%)` }}
        >
          <Star     className="absolute atl-float"  style={{ top: 20,    left:  30,  color: C.sun, fill: C.sun, width: 36, height: 36 }} />
          <Sparkles className="absolute atl-float2" style={{ bottom: 20, right: 30,  color: "#fff", width: 36, height: 36 }} />
          <Star     className="absolute atl-float3" style={{ bottom: 40, left:  60,  color: "#fff", fill: "#fff", width: 20, height: 20, opacity: 0.5 }} />
          <Sparkles className="absolute atl-float"  style={{ top: 40,   right: 80,  color: C.sun,  width: 22, height: 22, opacity: 0.6 }} />
          <h2 className={`${DISPLAY} font-extrabold leading-none`} style={{ fontSize: "clamp(36px,6vw,72px)" }}>
            Ready to ace it?
          </h2>
          <p className="mt-4 font-bold text-lg md:text-xl max-w-xl mx-auto">
            Malaysia's all-in-one academic ecosystem — gamified learning, AI personalisation, and a real study community. Free to join.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/auth">
              <button className={`${BTN} bg-white text-[#0F172A]`}>Let's go! <Rocket className="w-5 h-5" /></button>
            </Link>
            <Link to="/auth">
              <button className={`${BTN} text-white`} style={{ background: C.ink }}>Create free account <Play className="w-5 h-5" /></button>
            </Link>
          </div>
        </div>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="px-5 py-10">
        <div className={`${PILL} max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <img src={Logo} className="w-8 h-8 rounded-lg" alt="AceTerus" loading="lazy" />
            <span className={`${DISPLAY} font-extrabold`}>AceTerus</span>
          </div>
          <div className="flex gap-5 font-bold text-sm">
            <a href="#play"  className="hover:text-[#2F7CFF] transition-colors">Features</a>
            <a href="#learn" className="hover:text-[#2F7CFF] transition-colors">How it works</a>
            <a href="#squad" className="hover:text-[#2F7CFF] transition-colors">Community</a>
            <Link to="/auth" className="hover:text-[#2F7CFF] transition-colors">Sign up</Link>
          </div>
          <div className="font-bold text-xs opacity-70">Made with 💙 for Malaysian students.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
