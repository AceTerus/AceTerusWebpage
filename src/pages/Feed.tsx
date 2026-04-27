import { useState, useEffect, useRef } from "react";
import { SignInGate } from "@/components/SignInGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Brain, BookOpen, Scan, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection } from "@/components/CommentSection";
import { PostUpload } from "@/components/PostUpload";
import { TodayGoalBanner } from "@/components/TodayGoalBanner";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { CommentPreview } from "@/components/CommentPreview";

/* ── brand ────────────────────────────────────────────────────────────────── */
const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", indigoSoft: "#D6D4FF",
  cloud: "#F3FAFF", sun: "#FFD65C", pop: "#FF7A59",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden";
const SIDE_CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white p-5";
const SECTION_LABEL = `${DISPLAY} font-extrabold text-xs uppercase tracking-widest mb-3`;

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags?: string[];
  profiles: { username: string; avatar_url: string };
  images?: { id: string; file_url: string }[];
}

interface SearchProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
}

export const Feed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Feed – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchProfile[]>([]);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) { fetchFeed(); fetchSuggestedUsers(); }
  }, [user]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const gap = 16;
    // virtualTop = the sidebar's current distance (px) from the viewport top.
    // It starts at the element's natural rendered position, then drifts with
    // each scroll tick — scroll down shrinks it (sidebar moves up), scroll up
    // grows it (sidebar moves down). Clamping to the two edges creates the
    // "trapped" effect on both sides.
    let virtualTop = sidebar.getBoundingClientRect().top;
    let lastScrollY = window.scrollY;

    sidebar.style.top = `${virtualTop}px`;

    const onScroll = () => {
      const s = sidebarRef.current;
      if (!s) return;

      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      const viewportH = window.innerHeight;
      const sidebarH = s.offsetHeight;

      virtualTop -= delta;                                        // follow scroll direction
      virtualTop = Math.max(virtualTop, gap);                     // top edge trap
      virtualTop = Math.min(virtualTop, viewportH - sidebarH - gap); // bottom edge trap

      s.style.top = `${virtualTop}px`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchFeed = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: followedUsers } = await supabase
        .from("follows").select("followed_id").eq("follower_id", user.id);
      const followedIds = followedUsers?.map((f) => f.followed_id) || [];

      const { data: postsData, error: postsError } = await supabase
        .from("posts").select("*").in("user_id", followedIds)
        .order("created_at", { ascending: false }).limit(30);
      if (postsError) throw postsError;

      const postsArray = postsData || [];
      const postUserIds = [...new Set(postsArray.map((p) => p.user_id))];
      const { data: profilesData } = postUserIds.length
        ? await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", postUserIds)
        : { data: [] };
      const profilesMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

      const postIds = postsArray.map((p) => p.id);
      const imagesByPost = new Map<string, { id: string; file_url: string }[]>();
      if (postIds.length > 0) {
        const { data: imagesData } = await supabase
          .from("post_images").select("id, post_id, file_url, position")
          .in("post_id", postIds).order("position", { ascending: true });
        (imagesData || []).forEach((img: any) => {
          const arr = imagesByPost.get(img.post_id) || [];
          arr.push({ id: img.id, file_url: img.file_url });
          imagesByPost.set(img.post_id, arr);
        });
      }

      setPosts(postsArray.map((post: any) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || { username: "Anonymous", avatar_url: "" },
        images: imagesByPost.get(post.id) || [],
      })));
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast({ title: "Error", description: "Failed to load feed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;
    try {
      const { data: followedUsers } = await supabase
        .from("follows").select("followed_id").eq("follower_id", user.id);
      const followedIds = followedUsers?.map((f) => f.followed_id) || [];
      followedIds.push(user.id);
      const { data, error } = await supabase
        .from("profiles").select("*")
        .not("user_id", "in", `(${followedIds.join(",")})`)
        .order("followers_count", { ascending: false }).limit(3);
      if (error) throw error;
      setSuggestedUsers(data || []);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles").select("*").ilike("username", `%${query}%`).limit(5);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchUsers(value);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  const openLightbox = (postId: string, index: number) => { setLightboxPostId(postId); setLightboxIndex(index); };
  const closeLightbox = () => setLightboxPostId(null);
  const showPrev = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => (prev === 0 ? post.images!.length - 1 : prev - 1));
  };
  const showNext = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => (prev === post.images!.length - 1 ? 0 : prev + 1));
  };
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 50) showPrev(); else if (diff < -50) showNext();
    setTouchStartX(null);
  };

  if (!user) return <SignInGate message="Please sign in to view your feed." />;

  const currentLightboxPost = lightboxPostId ? posts.find((p) => p.id === lightboxPostId) : null;
  const currentLightboxImage = currentLightboxPost?.images?.[lightboxIndex];

  const exploreLinks = [
    { to: "/quiz",        Icon: Brain,   label: "Quiz Arena",       color: C.blue   },
    { to: "/materials",   Icon: BookOpen,label: "Study Materials",  color: C.cyan   },
    { to: "/ar-scanner",  Icon: Scan,    label: "AR Scanner",       color: C.pop    },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 lg:grid lg:grid-cols-[1fr_292px] lg:gap-6 lg:items-start">

        {/* ── Left column ── */}
        <div className="w-full min-w-0">

          {/* Search */}
          <div className="mb-4 relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.indigo }} />
              <input
                placeholder="Search people…"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className={`w-full pl-10 ${searchQuery ? "pr-11" : "pr-4"} py-2.5 text-sm font-semibold border-[2.5px] border-[#0F172A] rounded-full shadow-[2px_2px_0_0_#0F172A] bg-white outline-none focus:shadow-[3px_3px_0_0_#0F172A] transition-shadow placeholder:text-slate-400`}
              />
              {searchQuery && (
                <button
                  onClick={handleSearchSubmit}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110"
                  style={{ background: C.indigo }}
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className={`${CARD} absolute z-20 w-full mt-2 p-3 space-y-2`}>
                {isSearching ? (
                  <p className="text-sm font-semibold text-slate-400 py-2 text-center">Searching…</p>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between gap-3">
                        <Link to={`/profile/${profile.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0 border-[2px] border-[#0F172A]">
                            <AvatarImage src={profile.avatar_url} className="object-cover" />
                            <AvatarFallback className={`${DISPLAY} font-extrabold text-xs`} style={{ background: C.cyan }}>
                              {profile.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className={`${DISPLAY} font-extrabold text-sm truncate`}>{profile.username}</p>
                            <p className="text-xs font-semibold text-slate-400">{profile.followers_count} followers</p>
                          </div>
                        </Link>
                        <FollowButton targetUserId={profile.user_id} />
                      </div>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full text-center text-xs font-extrabold font-['Baloo_2'] pt-1 pb-0.5 border-t border-[#0F172A]/10 hover:underline"
                      style={{ color: C.indigo }}
                    >
                      See all results for "{searchQuery}" →
                    </button>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-slate-400 py-2 text-center">No users found</p>
                )}
              </div>
            )}
          </div>

          {/* Mobile: goal banner */}
          <div className="lg:hidden mb-4">
            <TodayGoalBanner />
          </div>

          {/* Suggested strip — mobile, when feed is empty */}
          {!isLoading && suggestedUsers.length > 0 && posts.length === 0 && (
            <div className={`${SIDE_CARD} mb-5`}>
              <p className={`${SECTION_LABEL}`} style={{ color: C.indigo }}>Suggested for you</p>
              <div className="space-y-3">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <Link to={`/profile/${u.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0 border-[2px] border-[#0F172A]">
                        <AvatarImage src={u.avatar_url} className="object-cover" />
                        <AvatarFallback className={`${DISPLAY} font-extrabold text-xs`} style={{ background: C.cyan }}>
                          {u.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={`${DISPLAY} font-extrabold text-sm truncate`}>{u.username}</p>
                        <p className="text-xs font-semibold text-slate-400">{u.followers_count} followers</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post creation */}
          <div className="mb-5">
            <PostUpload onPostCreated={fetchFeed} />
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={CARD}>
                  <div className="flex items-center gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className={`${SIDE_CARD} text-center py-12`}>
              <div
                className="w-16 h-16 rounded-[20px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center mx-auto mb-4"
                style={{ background: C.skySoft }}
              >
                <Users className="w-7 h-7" style={{ color: C.indigo }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>Nothing here yet</p>
              <p className="text-sm font-semibold text-slate-400 mt-1">Follow some users to see their posts here.</p>
              <Link to="/discover">
                <button
                  className="mt-4 inline-flex items-center gap-2 font-extrabold font-['Baloo_2'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer"
                  style={{ background: C.indigo }}
                >
                  Discover people
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const hasGalleryImages = !!(post.images && post.images.length);
                const gallery = (post.images?.map((img) => img.file_url) ?? []).concat(
                  !hasGalleryImages && post.image_url ? [post.image_url] : []
                );

                return (
                  <article key={post.id} className={CARD}>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Link to={`/profile/${post.user_id}`} className="flex-shrink-0">
                        <Avatar className="h-10 w-10 border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
                          <AvatarImage src={post.profiles?.avatar_url} className="object-cover" />
                          <AvatarFallback
                            className={`${DISPLAY} font-extrabold text-sm`}
                            style={{ background: C.cyan, color: C.ink }}
                          >
                            {post.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${post.user_id}`}
                          className={`${DISPLAY} font-extrabold text-[15px] leading-tight hover:underline block truncate`}
                        >
                          {post.profiles?.username || "Anonymous"}
                        </Link>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Images — edge-to-edge */}
                    {gallery.length > 0 && (
                      <PostImageCarousel
                        images={gallery}
                        onImageClick={hasGalleryImages ? (idx) => openLightbox(post.id, idx) : undefined}
                      />
                    )}

                    {/* Action bar */}
                    <div className="flex items-start gap-1 px-3 pt-2 pb-1">
                      <LikeButton
                        postId={post.id}
                        likesCount={post.likes_count}
                        onLikeChange={(newCount) =>
                          setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes_count: newCount } : p))
                        }
                      />
                      <CommentSection
                        mode="trigger"
                        postId={post.id}
                        commentsCount={post.comments_count}
                        open={!!openComments[post.id]}
                        onOpenChange={(v) => setOpenComments((prev) => ({ ...prev, [post.id]: v }))}
                        onCommentChange={(newCount) =>
                          setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: newCount } : p))
                        }
                      />
                    </div>

                    {/* Caption */}
                    {post.content && (
                      <p className="px-4 pb-2 text-sm leading-relaxed">
                        <Link to={`/profile/${post.user_id}`} className={`${DISPLAY} font-extrabold mr-1.5 hover:underline`}>
                          {post.profiles?.username || "Anonymous"}
                        </Link>
                        {post.content}
                      </p>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-x-2 gap-y-1">
                        {post.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs font-extrabold font-['Baloo_2'] px-2 py-0.5 rounded-full border-[1.5px] border-[#0F172A]"
                            style={{ background: C.indigoSoft, color: C.indigo }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comment preview (collapsed) or full panel (expanded) — both below caption */}
                    {openComments[post.id] ? (
                      <CommentSection
                        mode="panel"
                        postId={post.id}
                        commentsCount={post.comments_count}
                        open={true}
                        onOpenChange={(v) => setOpenComments((prev) => ({ ...prev, [post.id]: v }))}
                        onCommentChange={(newCount) =>
                          setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: newCount } : p))
                        }
                      />
                    ) : (
                      <CommentPreview
                        postId={post.id}
                        commentsCount={post.comments_count}
                        onViewAll={() => setOpenComments((prev) => ({ ...prev, [post.id]: true }))}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right sidebar (desktop only) ── */}
        <aside className="hidden lg:block self-stretch">
          <div ref={sidebarRef} className="sticky flex flex-col gap-4">

          {/* Today's goal — top of sidebar */}
          <TodayGoalBanner />

          {/* Suggested people */}
          {suggestedUsers.length > 0 && (
            <div className={SIDE_CARD}>
              <p className={SECTION_LABEL} style={{ color: C.indigo }}>Suggested for you</p>
              <div className="space-y-4">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <Link to={`/profile/${u.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 flex-shrink-0 border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
                        <AvatarImage src={u.avatar_url} className="object-cover" />
                        <AvatarFallback
                          className={`${DISPLAY} font-extrabold text-xs`}
                          style={{ background: C.cyan, color: C.ink }}
                        >
                          {u.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={`${DISPLAY} font-extrabold text-sm truncate`}>{u.username}</p>
                        <p className="text-xs font-semibold text-slate-400">{u.followers_count} followers</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explore links */}
          <div className={SIDE_CARD}>
            <p className={SECTION_LABEL} style={{ color: C.indigo }}>Explore</p>
            <div className="space-y-2">
              {exploreLinks.map(({ to, Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] border-[2px] border-transparent hover:border-[#0F172A] hover:shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all group"
                >
                  <div
                    className="w-7 h-7 rounded-[10px] border-[1.5px] border-[#0F172A] flex items-center justify-center shrink-0"
                    style={{ background: color }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className={`${DISPLAY} font-extrabold text-sm group-hover:text-[#2F7CFF] transition-colors`}>
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen lightbox */}
      {currentLightboxPost && currentLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >✕</button>
          <button
            type="button"
            className="absolute left-4 text-white/80 hover:text-white text-4xl leading-none z-10"
            onClick={showPrev}
            aria-label="Previous"
          >‹</button>
          <button
            type="button"
            className="absolute right-4 text-white/80 hover:text-white text-4xl leading-none z-10"
            onClick={showNext}
            aria-label="Next"
          >›</button>
          <img
            src={currentLightboxImage.file_url}
            alt="Full size"
            className="max-w-full max-h-[92vh] object-contain select-none"
            draggable={false}
          />
          {currentLightboxPost.images && currentLightboxPost.images.length > 1 && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5">
              {currentLightboxPost.images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full bg-white transition-all duration-300 ${
                    i === lightboxIndex ? "w-5 opacity-100" : "w-1.5 opacity-40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
