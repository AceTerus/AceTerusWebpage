import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Calendar, Tag, ArrowLeft, LogIn, LogOut, LayoutDashboard, User, ChevronDown, Ticket, X, Loader2, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { EventNotificationsBell } from "./EventNotificationsBell";
import Logo from "@/assets/logo.webp";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const C = { ink: "#0F172A", blue: "#2F7CFF", sky: "#DDF3FF", amber: "#F59E0B" };

/* ── Coins Panel ─────────────────────────────────────────────────────────── */
const CoinsPanel = ({
  panelRef, pos, userId, aceCoins, onClose, onCoinsUpdate,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  pos: { top: number; left: number };
  userId: string;
  aceCoins: number;
  onClose: () => void;
  onCoinsUpdate: (coins: number) => void;
}) => {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const { data: txns = [], isLoading: txnLoading } = useQuery({
    queryKey: ["coin-transactions", userId],
    queryFn: async () => {
      const { data } = await supabase.from("coin_transactions")
        .select("id, amount, description, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as { id: string; amount: number; description: string; type: string; created_at: string }[];
    },
  });

  const redeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_reward_code", {
        p_code: code.trim(),
        p_user_id: userId,
      });
      if (error) throw error;
      if (!data.ok) {
        toast.error(data.error ?? "Redemption failed.");
      } else {
        toast.success(`+${data.coins} ACE Coins added!`);
        setCode("");
        onCoinsUpdate(aceCoins + data.coins);
        qc.invalidateQueries({ queryKey: ["coin-transactions", userId] });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Redemption failed.");
    } finally {
      setRedeeming(false);
    }
  };

  const panelW = 340;
  const panelH = Math.min(560, window.innerHeight - 32);

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[60] flex flex-col border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: panelW, maxHeight: panelH }}
    >
      {/* Gradient bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: "linear-gradient(90deg, #F59E0B, #FDE68A, #F59E0B)" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2px] border-[#0F172A]/10 shrink-0 bg-amber-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] bg-amber-100 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-extrabold font-['Baloo_2'] text-[15px] leading-tight text-[#0F172A]">ACE Coins</p>
            <p className="font-['Nunito'] text-[11px] text-amber-600 font-bold">{aceCoins.toLocaleString()} coins</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#0F172A]/08 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-[#0F172A]/50" />
        </button>
      </div>

      {/* Redemption input */}
      <div className="px-4 py-3 border-b-[2px] border-[#0F172A]/10 shrink-0 space-y-2">
        <p className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/50 uppercase tracking-wider">Enter Reward Code</p>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] font-bold text-[14px] tracking-widest uppercase outline-none focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] transition-all placeholder:tracking-normal placeholder:font-normal placeholder:uppercase"
            placeholder="XXXX-XXXX"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter") redeem(); }}
          />
          <button
            onClick={redeem}
            disabled={redeeming || !code.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] border-[2.5px] border-[#0F172A] bg-amber-400 text-[#0F172A] text-[13px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 shrink-0"
          >
            {redeeming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {redeeming ? "…" : "Claim"}
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2.5 border-b border-[#0F172A]/07 shrink-0">
          <p className="text-[11px] font-bold font-['Nunito'] text-[#0F172A]/45 uppercase tracking-wider">Transaction History</p>
        </div>
        {txnLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : txns.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-2">🪙</div>
            <p className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]/35">No transactions yet</p>
          </div>
        ) : (
          <div>
            {txns.map(txn => {
              const isIncome = txn.amount > 0;
              return (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#0F172A]/05 hover:bg-amber-50/40 transition-colors">
                  <div className={`w-7 h-7 rounded-[8px] border-[1.5px] flex items-center justify-center shrink-0 ${isIncome ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    {isIncome
                      ? <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                      : <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Nunito'] text-[13px] font-bold text-[#0F172A] truncate leading-tight">{txn.description}</p>
                    <p className="font-['Nunito'] text-[10px] text-[#0F172A]/40">
                      {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`font-['Baloo_2'] font-extrabold text-[14px] shrink-0 ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                    {isIncome ? "+" : ""}{txn.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/* ── Navbar ──────────────────────────────────────────────────────────────── */
export const EventsNavbar = () => {
  const { user, aceCoins, setAceCoins, signOut } = useAuth();
  const location = useLocation();
  const [avatar,   setAvatar]   = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [coinsOpen, setCoinsOpen] = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const coinsBtnRef = useRef<HTMLButtonElement>(null);
  const coinsPanelRef = useRef<HTMLDivElement>(null);
  const [coinsPos, setCoinsPos] = useState<{ top: number; left: number } | null>(null);

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

  // Close coins panel on outside click
  useEffect(() => {
    if (!coinsOpen) return;
    const handler = (e: MouseEvent) => {
      if (coinsBtnRef.current?.contains(e.target as Node) || coinsPanelRef.current?.contains(e.target as Node)) return;
      setCoinsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [coinsOpen]);

  // Update coins panel position on scroll/resize
  useEffect(() => {
    if (!coinsOpen) return;
    const update = () => {
      if (!coinsBtnRef.current) return;
      const r = coinsBtnRef.current.getBoundingClientRect();
      const panelW = 340;
      const panelH = Math.min(560, window.innerHeight - 32);
      const left = r.right + 10 + panelW > window.innerWidth ? r.left - panelW - 10 : r.right + 10;
      setCoinsPos({ top: Math.min(r.top, window.innerHeight - panelH - 16), left });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [coinsOpen]);

  const openCoinsPanel = () => {
    if (!coinsBtnRef.current) return;
    const r = coinsBtnRef.current.getBoundingClientRect();
    const panelW = 340;
    const panelH = Math.min(560, window.innerHeight - 32);
    const left = r.right + 10 + panelW > window.innerWidth ? r.left - panelW - 10 : r.right + 10;
    setCoinsPos({ top: Math.min(r.top, window.innerHeight - panelH - 16), left });
    setCoinsOpen(o => !o);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatar(data.avatar_url); });
  }, [user]);

  const navItems = [
    { href: "/",          label: "Discover",  icon: Calendar },
    { href: "/deals",     label: "Deals",     icon: Tag      },
    { href: "/my-events", label: "My Events", icon: Ticket, authOnly: true },
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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ href, label, icon: Icon, authOnly }) => {
            if (authOnly && !user) return null;
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

          {/* ACE Coins — clickable button */}
          {user && (
            <button
              ref={coinsBtnRef}
              onClick={openCoinsPanel}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] transition-all duration-150 ${coinsOpen ? "border-amber-400 bg-amber-100 shadow-[2px_2px_0_0_#D97706]" : "border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100 shadow-[2px_2px_0_0_rgba(15,23,42,0.06)]"}`}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-['Baloo_2'] font-bold text-[14px] text-amber-700">{aceCoins.toLocaleString()}</span>
            </button>
          )}

          {/* Coins panel */}
          {user && coinsOpen && coinsPos && (
            <CoinsPanel
              panelRef={coinsPanelRef}
              pos={coinsPos}
              userId={user.id}
              aceCoins={aceCoins}
              onClose={() => setCoinsOpen(false)}
              onCoinsUpdate={(coins) => setAceCoins(coins)}
            />
          )}

          {/* Notifications bell */}
          {user && <EventNotificationsBell />}

          {/* Back to main app */}
          <a href="https://aceterus.com"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold font-['Nunito'] border-[2px] border-[#0F172A]/15 bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(15,23,42,0.1)] transition-all duration-150"
            style={{ color:"rgba(15,23,42,0.65)" }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to AceTerus</span>
          </a>

          {/* Organiser */}
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
                    <div className="px-4 py-3" style={{ borderBottom:"1.5px solid rgba(15,23,42,0.08)", background:"#F3FAFF" }}>
                      <p className="font-['Baloo_2'] font-bold text-[14px] text-[#0F172A] truncate">{displayName}</p>
                      <p className="font-['Nunito'] text-[12px] text-[#0F172A]/45 truncate">{user.email}</p>
                    </div>

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
        {navItems.map(({ href, label, icon: Icon, authOnly }) => {
          if (authOnly && !user) return null;
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
