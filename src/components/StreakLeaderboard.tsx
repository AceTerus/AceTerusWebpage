import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchMutualFollowIds } from "@/hooks/useMutualFollow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flame, Trophy, Lock } from "lucide-react";

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
  pop: '#FF7A59', sun: '#FFD65C', mintSoft: '#D1FAE5',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

const TROPHY_STYLES = {
  gold:   { bg: '#FEF9C3', border: '#F59E0B', color: '#B45309', label: '1st' },
  silver: { bg: '#F1F5F9', border: '#94A3B8', color: '#475569', label: '2nd' },
  bronze: { bg: '#FFF4ED', border: '#F97316', color: '#C2410C', label: '3rd' },
} as const;

type TrophyKey = keyof typeof TROPHY_STYLES;

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  streak: number;
}

function PodiumCard({ entry, trophy, center, canClick, isMe }: {
  entry: LeaderboardEntry; trophy: TrophyKey; center: boolean; canClick: boolean; isMe: boolean;
}) {
  const t = TROPHY_STYLES[trophy];
  const avatarSize = center ? "h-16 w-16 sm:h-24 sm:w-24" : "h-12 w-12 sm:h-16 sm:w-16";
  const cardWidth = center ? "flex-1 max-w-[160px]" : "flex-1 max-w-[120px]";
  const marginTop = center ? "" : "mt-5 sm:mt-8";

  const inner = (
    <div className={`flex flex-col items-center gap-2 ${cardWidth} ${marginTop} min-w-0`}>
      {/* Avatar */}
      <Avatar className={`${avatarSize} border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]`}>
        <AvatarImage src={entry.avatar_url || undefined} className="object-cover" />
        <AvatarFallback className={`${DISPLAY} font-extrabold ${center ? 'text-2xl' : 'text-lg'}`} style={{ background: C.cyan, color: C.ink }}>
          {entry.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <p className={`${DISPLAY} font-extrabold text-center leading-tight w-full truncate ${center ? 'text-sm' : 'text-xs'}`}>
        {entry.username || 'Anonymous'}
        {isMe && <span className="text-[10px] font-semibold text-slate-400 ml-1">(you)</span>}
      </p>

      {/* Stats box */}
      <div
        className="w-full rounded-[14px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex flex-col items-center gap-1.5 py-3 px-2"
        style={{ background: t.bg, borderColor: t.border }}
      >
        {/* Trophy badge */}
        <div
          className="rounded-[10px] border-[2px] flex items-center justify-center font-extrabold text-xs px-2 py-0.5"
          style={{ background: t.bg, borderColor: t.border, color: t.color }}
        >
          <Trophy className="w-3 h-3 mr-1" /> {t.label}
        </div>

        {/* Streak */}
        <div className={`${DISPLAY} font-extrabold flex items-center gap-1 ${center ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`} style={{ color: C.pop }}>
          <Flame className={`${center ? 'w-5 h-5' : 'w-4 h-4'}`} /> {entry.streak}
        </div>
        <p className="text-[10px] font-semibold text-slate-500">day streak</p>

        {!canClick && !isMe && (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 text-center leading-tight mt-0.5">
            <Lock className="w-2.5 h-2.5" /> Follow each other
          </div>
        )}
      </div>
    </div>
  );

  return canClick ? (
    <Link to={isMe ? "/profile" : `/profile/${entry.user_id}`} className="no-underline min-w-0">
      {inner}
    </Link>
  ) : inner;
}

interface Props {
  currentUserId?: string;
  currentStreak: number;
}

export function StreakLeaderboard({ currentUserId, currentStreak }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      const [{ data }, mutuals] = await Promise.all([
        supabase.from("profiles").select("user_id, username, avatar_url, streak").order("streak", { ascending: false }).limit(10),
        fetchMutualFollowIds(currentUserId),
      ]);
      setEntries(data ?? []);
      setMutualIds(new Set(mutuals));
      setLoading(false);
    };
    load();
  }, [currentUserId]);

  if (loading || entries.length === 0) return null;

  const canClick = (uid: string) => uid === currentUserId || mutualIds.has(uid);
  const [gold, silver, bronze] = entries;
  const podium = [silver, gold, bronze].filter(Boolean) as LeaderboardEntry[];
  const podiumTrophy = (e: LeaderboardEntry): TrophyKey => {
    if (e.user_id === gold?.user_id) return "gold";
    if (e.user_id === silver?.user_id) return "silver";
    return "bronze";
  };
  const rest = entries.slice(3);

  return (
    <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b-[2.5px] border-[#0F172A]" style={{ background: C.indigoSoft }}>
        <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigo }}>
          <Flame className="w-4 h-4 text-white" />
        </div>
        <p className={`${DISPLAY} font-extrabold text-lg`}>Streak Leaderboard</p>
      </div>

      <div className="p-5">
        {/* Podium */}
        <div className="flex justify-center items-end gap-2 sm:gap-3 mb-5 w-full">
          {podium.map((entry) => (
            <PodiumCard
              key={entry.user_id}
              entry={entry}
              trophy={podiumTrophy(entry)}
              center={podiumTrophy(entry) === "gold"}
              canClick={canClick(entry.user_id)}
              isMe={entry.user_id === currentUserId}
            />
          ))}
        </div>

        {/* Your streak pill */}
        <div
          className="flex items-center justify-center gap-2 rounded-full border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] py-2.5 px-4 mb-4"
          style={{ background: C.skySoft }}
        >
          <Flame className="w-4 h-4" style={{ color: C.pop }} />
          <p className={`${DISPLAY} font-extrabold text-sm`}>
            Your streak: <span style={{ color: C.pop }}>{currentStreak}</span> day{currentStreak !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Ranks 4+ */}
        {rest.length > 0 && (
          <>
            <div className="grid grid-cols-[36px_1fr_60px] px-2 pb-2 border-b-[2px] border-[#0F172A]/10 mb-2">
              {['Rank', 'User', 'Streak'].map((h, i) => (
                <span key={h} className={`text-[10px] font-extrabold uppercase tracking-wide text-slate-400 ${i === 2 ? 'text-center' : ''}`}>{h}</span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {rest.map((entry, i) => {
                const rank = i + 4;
                const clickable = canClick(entry.user_id);
                const isMe = entry.user_id === currentUserId;

                const row = (
                  <div
                    className={`grid grid-cols-[36px_1fr_60px] items-center px-3 py-2.5 rounded-[12px] border-[2px] transition-all ${
                      isMe
                        ? 'border-[#2E2BE5]/40 shadow-[1px_1px_0_0_#2E2BE5]'
                        : 'border-[#0F172A]/10 hover:border-[#0F172A]/30'
                    } ${clickable ? 'cursor-pointer' : ''}`}
                    style={{ background: isMe ? C.indigoSoft : '#F8FAFF' }}
                  >
                    <span className={`${DISPLAY} font-extrabold text-sm text-slate-500`}>{rank}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A] flex-shrink-0">
                        <AvatarImage src={entry.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className={`${DISPLAY} font-extrabold text-xs`} style={{ background: C.cyan, color: C.ink }}>
                          {entry.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={`${DISPLAY} font-extrabold text-sm truncate`}>
                          {entry.username || 'Anonymous'}
                          {isMe && <span className="text-[10px] font-semibold text-slate-400 ml-1">(you)</span>}
                        </p>
                        {!clickable && !isMe && (
                          <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Follow each other
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`${DISPLAY} font-extrabold text-sm flex items-center justify-center gap-1`} style={{ color: C.pop }}>
                      <Flame className="w-3.5 h-3.5" /> {entry.streak}
                    </div>
                  </div>
                );

                return clickable ? (
                  <Link key={entry.user_id} to={isMe ? "/profile" : `/profile/${entry.user_id}`} className="no-underline">
                    {row}
                  </Link>
                ) : (
                  <div key={entry.user_id}>{row}</div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
