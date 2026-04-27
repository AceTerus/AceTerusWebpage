import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/FollowButton';
import { Search, Users, Compass } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = 'border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

export const Discover = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    document.title = "Discover Quizzes – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(20);
      if (error) { console.error('Error fetching profiles:', error); return; }
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 pt-8 pb-20 lg:pb-8 max-w-4xl">

        {/* ── Header ── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center shrink-0"
              style={{ background: C.indigo }}
            >
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-3xl leading-tight`}>Discover People</h1>
              <p className="text-sm font-semibold text-slate-400">Find and follow new classmates</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.indigo }} />
            <input
              placeholder="Search by name or bio…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 text-sm font-semibold border-[2.5px] border-[#0F172A] rounded-full shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400`}
            />
          </div>
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={CARD}>
                <Skeleton className="h-[88px] w-full rounded-none" />
                <div className="pt-8 px-4 pb-4 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-2.5 w-full mt-2" />
                  <Skeleton className="h-2.5 w-3/4" />
                  <Skeleton className="h-8 w-24 mt-3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className={`${CARD} py-16 flex flex-col items-center gap-3 text-center px-6`}>
            <div
              className="w-14 h-14 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.skySoft }}
            >
              <Users className="w-6 h-6" style={{ color: C.indigo }} />
            </div>
            <p className={`${DISPLAY} font-extrabold text-lg`}>
              {searchQuery ? 'No users found' : 'No users yet'}
            </p>
            <p className="text-sm font-semibold text-slate-400">
              {searchQuery ? `No results for "${searchQuery}"` : 'Check back later!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`${CARD} cursor-pointer hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] transition-all`}
                onClick={() => navigate(`/profile/${profile.user_id}`)}
              >
                {/* Cover photo / banner */}
                <div className="relative h-[88px] w-full shrink-0">
                  {profile.cover_url ? (
                    <img
                      src={profile.cover_url}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})` }}
                    />
                  )}
                  {/* dark scrim so avatar border reads cleanly */}
                  <div className="absolute inset-0 bg-black/20" />

                  {/* Avatar overlapping the bottom edge */}
                  <div className="absolute -bottom-6 left-4">
                    <Avatar className="h-12 w-12 border-[2.5px] border-white shadow-[2px_2px_0_0_#0F172A]">
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback
                        className={`${DISPLAY} font-extrabold text-base`}
                        style={{ background: C.cyan, color: C.ink }}
                      >
                        {profile.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Content below banner */}
                <div className="pt-8 px-4 pb-4">
                  {/* Name + stats */}
                  <p className={`${DISPLAY} font-extrabold text-[15px] leading-tight truncate`}>
                    {profile.username || 'Anonymous User'}
                  </p>
                  <div className="flex gap-3 mt-0.5 mb-3">
                    <span className="text-xs font-semibold text-slate-400">
                      {profile.followers_count} followers
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {profile.following_count} following
                    </span>
                  </div>

                  {/* Bio */}
                  {profile.bio ? (
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 min-h-[2.5rem]">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-300 font-medium italic mb-4 min-h-[2.5rem]">
                      No bio yet
                    </p>
                  )}

                  {/* Follow button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton targetUserId={profile.user_id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
