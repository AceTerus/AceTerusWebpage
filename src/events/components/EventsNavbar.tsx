import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Calendar, Tag, ArrowLeft, LogIn, LogOut, LayoutDashboard, User, ChevronDown } from "lucide-react";
import Logo from "@/assets/logo.webp";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export const EventsNavbar = () => {
  const { user, aceCoins, signOut } = useAuth();
  const location = useLocation();
  const [avatar,   setAvatar]   = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatar(data.avatar_url); });
  }, [user]);

  const navItems = [
    { href: "/",      label: "Discover", icon: Calendar },
    { href: "/deals", label: "Deals",    icon: Tag      },
  ];

  const avatarSrc  = avatar || user?.user_metadata?.avatar_url;
  const initials   = (user?.email?.[0] ?? "U").toUpperCase();
  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Student";

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background:     scrolled ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderBottom:   scrolled ? "2px solid rgba(15,23,42,0.1)" : "2px solid rgba(15,23,42,0.06)",
        boxShadow:      scrolled ? "0 2px 0 0 rgba(15,23,42,0.04), 0 4px 20px rgba(15,23,42,0.06)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <img src={Logo} alt="AceTerus"
            className="w-9 h-9 object-contain rounded-xl border-[2px] border-[#0F172A]/12 shadow-[2px_2px_0_0_rgba(15,23,42,0.08)] group-hover:-translate-y-0.5 transition-transform duration-150" />
          <div className="hidden sm:block">
            <p className="font-['Baloo_2'] font-extrabold text-[16px] leading-none text-[#0F172A]">AceTerus</p>
            <p className="font-['Baloo_2'] font-bold text-[10px] leading-none tracking-[0.17em] uppercase text-[#2F7CFF]">Events</p>
          </div>
        </Link>

        {/* Nav: Discover + Deals */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} to={href}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold font-['Nunito'] transition-all duration-150"
                style={{
                  background: active ? "#2F7CFF" : "transparent",
                  border:     active ? "2.5px solid #0F172A" : "2.5px solid transparent",
                  color:      active ? "white" : "rgba(15,23,42,0.6)",
                  boxShadow:  active ? "2px 2px 0 0 #0F172A" : "none",
                  transform:  active ? "translateY(-1px)" : "translateY(0)",
                }}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* ACE Coins */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-amber-200 bg-amber-50 shadow-[2px_2px_0_0_rgba(15,23,42,0.06)]">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-['Baloo_2'] font-bold text-[14px] text-amber-700">{aceCoins.toLocaleString()}</span>
            </div>
          )}

          {/* Back to main app */}
          <a href="https://aceterus.com"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold font-['Nunito'] border-[2px] border-[#0F172A]/15 bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(15,23,42,0.1)] transition-all duration-150"
            style={{ color:"rgba(15,23,42,0.65)" }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to AceTerus</span>
          </a>

          {/* Organiser — rightmost primary action */}
          <Link to="/organiser"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold font-['Nunito'] border-[2.5px] border-[#0F172A] bg-white transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A]"
            style={{ color:"#0F172A", boxShadow:"2px 2px 0 0 #0F172A" }}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Organise</span>
          </Link>

          {/* Auth */}
          {user ? (
            <div ref={dropRef} className="relative">
              <button
                onClick={() => setDropOpen(o => !o)}
                className="flex items-center gap-1.5 rounded-xl transition-all duration-150 hover:-translate-y-0.5 group"
              >
                <Avatar className="h-9 w-9 border-[2.5px] border-[#0F172A]/20 group-hover:border-[#2F7CFF] transition-colors shadow-[2px_2px_0_0_rgba(15,23,42,0.08)]">
                  <AvatarImage src={avatarSrc} className="object-cover" />
                  <AvatarFallback className="bg-[#DDF3FF] text-[#2F7CFF] font-bold text-sm">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 text-[#0F172A]/50" style={{ transform:dropOpen?"rotate(180deg)":"rotate(0deg)" }} />
              </button>

              <AnimatePresence>
                {dropOpen && (
                  <motion.div
                    initial={{ opacity:0, y:-8, scale:0.96 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:-8, scale:0.96 }}
                    transition={{ duration:0.18, ease:[0.23,1,0.32,1] }}
                    className="absolute right-0 mt-2 w-56 z-50 overflow-hidden"
                    style={{ background:"white", border:"2.5px solid #0F172A", borderRadius:16, boxShadow:"4px 4px 0 0 #0F172A" }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom:"1.5px solid rgba(15,23,42,0.08)", background:"#F3FAFF" }}>
                      <p className="font-['Baloo_2'] font-bold text-[14px] text-[#0F172A] truncate">{displayName}</p>
                      <p className="font-['Nunito'] text-[12px] text-[#0F172A]/45 truncate">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="p-2 space-y-0.5">
                      <Link to="/profile" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-['Nunito'] font-bold text-[14px] text-[#0F172A] hover:bg-[#F3FAFF] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-[#DDF3FF] border-[1.5px] border-[#2F7CFF]/25 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-[#2F7CFF]" />
                        </div>
                        My Profile
                      </Link>
                      <button onClick={() => { signOut(); setDropOpen(false); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-['Nunito'] font-bold text-[14px] text-red-500 hover:bg-red-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-red-50 border-[1.5px] border-red-200 flex items-center justify-center shrink-0">
                          <LogOut className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <a href="https://aceterus.com/auth"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-['Nunito'] border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all duration-150"
              style={{ fontWeight:800 }}>
              <LogIn className="w-4 h-4" />Sign In
            </a>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} to={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold font-['Nunito'] transition-all duration-150"
              style={{ background:active?"#2F7CFF":"transparent", border:active?"2px solid #0F172A":"2px solid transparent", color:active?"white":"rgba(15,23,42,0.55)", boxShadow:active?"2px 2px 0 0 #0F172A":"none" }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </Link>
          );
        })}
        <Link to="/organiser"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold font-['Nunito'] border-[2px] border-[#0F172A]/20 text-[#0F172A]/55 ml-auto transition-all duration-150">
          <LayoutDashboard className="w-3.5 h-3.5" /> Organise
        </Link>
      </nav>
    </header>
  );
};
