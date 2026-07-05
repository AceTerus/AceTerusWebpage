import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type:
    | "follow"
    | "like"
    | "comment"
    | "material_like"
    | "material_comment"
    | "quiz_published"
    | "streak_milestone"
    | "streak_broken"
    | "goal_reminder";
  post_id: string | null;
  upload_id: string | null;
  quiz_category_id: string | null;
  metadata: Record<string, any> | null;
  read: boolean;
  created_at: string;
  actor?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  isLoading: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session) setNotifications([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadNotifications = useCallback(async (uid: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, post_id, upload_id, quiz_category_id, metadata, read, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    // Fetch actor profiles in one query
    const actorIds = [...new Set(data.map((n: any) => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", actorIds);

    const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
    });

    setNotifications(
      data.map((n: any) => ({
        ...n,
        actor: profileMap[n.actor_id] ?? null,
      }))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadNotifications(userId);
  }, [userId, loadNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotif: any = payload.new;
          if (!newNotif) return;

          // Fetch the actor profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .eq("user_id", newNotif.actor_id)
            .maybeSingle();

          const enriched: Notification = {
            ...newNotif,
            actor: profile ? { username: profile.username, avatar_url: profile.avatar_url } : null,
          };

          setNotifications((prev) => [enriched, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, isLoading }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};
