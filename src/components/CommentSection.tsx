import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const C = {
  ink: "#0F172A", blue: "#2F7CFF", cyan: "#3BD6F5",
  skySoft: "#DDF3FF", pop: "#FF7A59",
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string };
}

interface CommentSectionProps {
  postId: string;
  commentsCount: number;
  onCommentChange: (newCount: number) => void;
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * "trigger" — renders only the comment button (no panel).
   * "panel"   — renders only the expanded panel (no button).
   * omitted   — renders both together (legacy / self-contained use).
   */
  mode?: "trigger" | "panel";
}

function formatDate(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

export const CommentSection = ({
  postId,
  commentsCount,
  onCommentChange,
  open: controlledOpen,
  onOpenChange,
  mode,
}: CommentSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments]     = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [myAvatar, setMyAvatar]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setMyAvatar(data.avatar_url); });
  }, [user?.id]);

  const open    = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => onOpenChange ? onOpenChange(v) : setInternalOpen(v);

  useEffect(() => { if (open) fetchComments(); }, [open, postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments").select("id, content, created_at, user_id").eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const uids = [...new Set((data || []).map((c: any) => c.user_id))];
      const { data: profiles } = uids.length
        ? await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", uids)
        : { data: [] };
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setComments((data || []).map((c: any) => ({
        ...c,
        profiles: map.get(c.user_id) ?? { username: "Anonymous", avatar_url: "" },
      })));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (!newComment.trim()) return;
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId, user_id: user.id, content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      onCommentChange(commentsCount + 1);
      fetchComments();
    } catch {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== id));
      onCommentChange(Math.max(0, commentsCount - 1));
    } catch {
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  /* ── Trigger button ── */
  const trigger = (
    <button
      onClick={() => setOpen(!open)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-[#2F7CFF] transition-colors"
    >
      <MessageCircle className={`w-5 h-5 ${open ? "fill-[#DDF3FF] stroke-[#2F7CFF]" : ""}`} />
      <span className="text-sm font-semibold">{commentsCount}</span>
    </button>
  );

  /* ── Expanded panel ── */
  const panel = open ? (
    <div className="px-4 pb-4 space-y-3">
      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0 border-[2px] border-[#0F172A]">
          <AvatarImage src={myAvatar ?? user?.user_metadata?.avatar_url} className="object-cover" />
          <AvatarFallback className="text-xs font-bold" style={{ background: C.skySoft, color: C.blue }}>
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-2 border-[2px] border-[#0F172A] rounded-full px-3 py-1.5 shadow-[2px_2px_0_0_#0F172A] bg-white focus-within:shadow-[3px_3px_0_0_#0F172A] transition-shadow">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 text-sm font-medium bg-transparent outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="shrink-0 disabled:opacity-30 transition-opacity"
          >
            <Send className="w-4 h-4" style={{ color: C.blue }} />
          </button>
        </div>
      </form>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2 ml-3 pl-3 border-l-[2.5px] border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Loading…</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs font-semibold text-slate-400 ml-3 pl-3 border-l-[2.5px] border-slate-200 py-1">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="ml-3 pl-3 border-l-[2.5px] border-slate-200 space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Link to={`/profile/${c.user_id}`} className="shrink-0 mt-0.5">
                <Avatar className="h-6 w-6 border-[1.5px] border-[#0F172A]">
                  <AvatarImage src={c.profiles.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-[10px] font-bold" style={{ background: C.skySoft, color: C.blue }}>
                    {c.profiles.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <Link to={`/profile/${c.user_id}`} className="font-extrabold font-['Baloo_2'] mr-1.5 hover:underline text-[#0F172A]">
                    {c.profiles.username}
                  </Link>
                  <span className="text-slate-700">{c.content}</span>
                </p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{formatDate(c.created_at)} ago</p>
              </div>
              {user && c.user_id === user.id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 transition-colors" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  /* ── Render modes ── */
  if (mode === "trigger") return trigger;
  if (mode === "panel")   return panel;
  return <div>{trigger}{panel}</div>;
};
