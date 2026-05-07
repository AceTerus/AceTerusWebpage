import {
  createContext, ReactNode, useCallback,
  useContext, useEffect, useMemo, useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  metadata: Record<string, any> | null;
  read: boolean;
  created_at: string;
  actor?: { username: string | null; avatar_url: string | null };
}

interface Ctx {
  notifications: EventNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isLoading: boolean;
}

const EventNotificationsContext = createContext<Ctx | undefined>(undefined);

export const EventNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<EventNotification[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [userId, setUserId]               = useState<string | null>(null);

  // Track auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
      if (!s) setNotifications([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(async (uid: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!data) { setIsLoading(false); return; }

    // Enrich with actor profiles
    const actorIds = [...new Set(data.map((n: any) => n.actor_id).filter(Boolean))];
    const { data: profiles } = actorIds.length
      ? await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", actorIds)
      : { data: [] };
    const pm: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { pm[p.user_id] = p; });

    setNotifications(data.map((n: any) => ({ ...n, actor: pm[n.actor_id] ?? null })));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  // Real-time new notifications
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`events-notifs-${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        const n: any = payload.new;
        if (!n) return;
        const { data: profile } = await supabase
          .from("profiles").select("user_id, username, avatar_url")
          .eq("user_id", n.actor_id).maybeSingle();
        setNotifications(prev => [{ ...n, actor: profile ?? null }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true })
      .eq("user_id", userId).eq("read", false);
  }, [userId]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  return (
    <EventNotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, isLoading }}>
      {children}
    </EventNotificationsContext.Provider>
  );
};

export const useEventNotifications = () => {
  const ctx = useContext(EventNotificationsContext);
  if (!ctx) throw new Error("useEventNotifications must be inside EventNotificationsProvider");
  return ctx;
};
