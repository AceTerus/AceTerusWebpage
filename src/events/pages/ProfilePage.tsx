import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Coins, Flame, School, ExternalLink, User, LogIn, Edit, Trophy, Calendar, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface Profile { username: string | null; avatar_url: string | null; cover_url: string | null; bio: string | null; ace_coins: number }
interface School { id: string; schools: { name: string; type: string; level: string; state: string } | null; start_year: number | null; end_year: number | null; is_current: boolean }
interface StreakData { current_streak: number; longest_streak: number }

/* ── Animated counter ──────────────────────────────────────────────── */
const AnimatedNumber = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const duration = 1000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setVal(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <>{val.toLocaleString()}{suffix}</>;
};

/* ── Stat card ─────────────────────────────────────────────────────── */
const StatCard = ({ emoji, label, value, gradient }: { emoji: string; label: string; value: number; gradient: string }) => (
  <div className={`border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] overflow-hidden hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#0F172A] transition-all duration-200`}>
    <div className="p-5 text-center space-y-1" style={{ background: gradient }}>
      <div className="text-3xl">{emoji}</div>
      <p className={`${DISPLAY} font-extrabold text-[32px] text-white leading-none`}>
        <AnimatedNumber target={value} />
      </p>
      <p className="text-[11px] font-bold text-white/70 font-['Nunito'] uppercase tracking-widest">{label}</p>
    </div>
  </div>
);

/* ── Achievement badge ─────────────────────────────────────────────── */
const Badge = ({ emoji, label, unlocked }: { emoji: string; label: string; unlocked: boolean }) => (
  <div className={`flex flex-col items-center gap-1.5 p-3 rounded-[16px] border-[2px] transition-all ${unlocked ? "border-[#0F172A] bg-white shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5" : "border-[#0F172A]/15 bg-[#0F172A]/04 opacity-40"}`}>
    <span className={`text-2xl ${!unlocked && "grayscale"}`}>{emoji}</span>
    <p className="text-[10px] font-bold font-['Nunito'] text-[#0F172A]/60 uppercase tracking-wider text-center leading-tight">{label}</p>
  </div>
);

export default function ProfilePage() {
  const { user, aceCoins, signOut } = useAuth();

  useEffect(() => { document.title = "Profile – AceTerus Events"; }, []);

  const { data: profile, isLoading } = useQuery<Profile | null>({
    queryKey: ["events-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, avatar_url, cover_url, bio, ace_coins").eq("user_id", user!.id).single();
      return data as Profile | null;
    },
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["events-schools", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("student_schools").select("id, schools(name, type, level, state), start_year, end_year, is_current").eq("user_id", user!.id).order("is_current", { ascending: false });
      return (data ?? []) as School[];
    },
  });

  const { data: streak } = useQuery<StreakData | null>({
    queryKey: ["events-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("streaks").select("current_streak, longest_streak").eq("user_id", user!.id).maybeSingle();
      return data as StreakData | null;
    },
  });

  const { data: regCount = 0 } = useQuery({
    queryKey: ["events-reg-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">👤</div>
          <h2 className={`${DISPLAY} font-extrabold text-[26px] text-[#0F172A]`}>Your Profile</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[15px]">Sign in to track your events, coins, and achievements.</p>
          <a
            href="https://aceterus.com/auth"
            className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold font-['Nunito'] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            <LogIn className="w-4 h-4" /> Sign In to AceTerus
          </a>
        </div>
      </div>
    );
  }

  const displayName = profile?.username || user.email?.split("@")[0] || "Student";
  const avatarSrc = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName[0]?.toUpperCase() || "S";
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;

  const achievements = [
    { emoji: "🎯", label: "First Event",   unlocked: regCount >= 1 },
    { emoji: "🏃", label: "5 Events",      unlocked: regCount >= 5 },
    { emoji: "🔥", label: "7-Day Streak",  unlocked: currentStreak >= 7 },
    { emoji: "💰", label: "1K Coins",      unlocked: aceCoins >= 1000 },
    { emoji: "🏆", label: "10 Events",     unlocked: regCount >= 10 },
    { emoji: "⚡", label: "30-Day Streak", unlocked: currentStreak >= 30 },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Profile hero */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] overflow-hidden">
        {/* Banner */}
        <div className="h-28 relative overflow-hidden">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2F7CFF] via-[#2E2BE5] to-[#7C3AED]">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Avatar overlapping banner */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            {isLoading ? (
              <Skeleton className="w-20 h-20 rounded-[18px]" />
            ) : (
              <Avatar className="w-20 h-20 border-[3px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]" style={{ borderRadius: "18px" }}>
                <AvatarImage src={avatarSrc} className="object-cover" style={{ borderRadius: "14px" }} />
                <AvatarFallback className="bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] text-white font-extrabold text-2xl" style={{ borderRadius: "14px" }}>{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex gap-2 mb-1">
              <a href="https://aceterus.com/profile" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[13px] text-[#0F172A] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all">
                <Edit className="w-3.5 h-3.5" /> Edit
              </a>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-7 w-40 rounded-xl" /><Skeleton className="h-4 w-56 rounded-xl" /></div>
          ) : (
            <div className="space-y-1">
              <h1 className={`${DISPLAY} font-extrabold text-[28px] text-[#0F172A] leading-tight`}>{displayName}</h1>
              {profile?.bio && <p className="text-[14px] font-['Nunito'] text-[#0F172A]/65">{profile.bio}</p>}
              <p className="text-[13px] font-['Nunito'] text-[#0F172A]/40">{user.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard emoji="🪙" label="ACE Coins"      value={aceCoins}       gradient="linear-gradient(135deg, #D97706, #F59E0B)" />
        <StatCard emoji="🔥" label="Day Streak"     value={currentStreak}  gradient="linear-gradient(135deg, #DC2626, #F87171)" />
        <StatCard emoji="🎯" label="Events Joined"  value={regCount}       gradient="linear-gradient(135deg, #2F7CFF, #3BD6F5)" />
        <StatCard emoji="🏆" label="Best Streak"    value={longestStreak}  gradient="linear-gradient(135deg, #2E2BE5, #7C3AED)" />
      </div>

      {/* Achievements */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎖️</span>
          <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>Achievements</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {achievements.map((a) => <Badge key={a.label} {...a} />)}
        </div>
        <p className="text-[12px] font-['Nunito'] text-[#0F172A]/40 text-center">
          {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
        </p>
      </div>

      {/* Schools */}
      {schools.length > 0 && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
          <div className="p-5 border-b-[2px] border-[#0F172A]/10 flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>Education</h3>
          </div>
          <div className="divide-y-[2px] divide-[#0F172A]/07">
            {schools.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-[#F3FAFF] transition-colors">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] border-[2px] border-[#0F172A] flex items-center justify-center shrink-0">
                  <School className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A] truncate">{s.schools?.name ?? "Unknown"}</p>
                  <p className="text-[12px] text-[#0F172A]/45 font-['Nunito'] capitalize">
                    {s.schools?.level} · {s.schools?.state}
                    {s.start_year && ` · ${s.start_year}${s.end_year ? `–${s.end_year}` : s.is_current ? "–Present" : ""}`}
                  </p>
                </div>
                {s.is_current && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#D1FAE5] border-[1.5px] border-[#059669]/20 text-[11px] font-extrabold text-[#059669]">Current</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Go to AceTerus CTA */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] overflow-hidden">
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2E2BE5] p-7 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="text-5xl shrink-0">🚀</div>
          <div className="flex-1">
            <h3 className={`${DISPLAY} font-extrabold text-[20px] text-white`}>Your full journey is on AceTerus</h3>
            <p className="text-white/60 font-['Nunito'] text-[14px] mt-1">AI tutoring, quizzes, streaks, study materials and more.</p>
          </div>
          <a
            href="https://aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-white bg-white text-[#2F7CFF] font-bold font-['Nunito'] shadow-[3px_3px_0_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(255,255,255,0.3)] transition-all whitespace-nowrap"
          >
            Go to AceTerus <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="w-full py-3 rounded-xl border-[2px] border-[#0F172A]/20 bg-white font-semibold font-['Nunito'] text-[14px] text-[#0F172A]/50 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
      >
        Sign Out
      </button>
    </div>
  );
}
