import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * On mount, checks if any approved event registrations start within 7 days.
 * Inserts an event_reminder notification once per event (idempotent check).
 */
export const useEventReminders = () => {
  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const now    = new Date();
      const in7    = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);
      const in8    = new Date(now.getTime() + 8  * 24 * 60 * 60 * 1000);

      // Find approved registrations where event starts in the next 7-8 day window
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("event_id, events(id, title, start_date)")
        .eq("user_id", uid)
        .eq("status", "approved");

      if (!regs?.length) return;

      const upcoming = (regs as any[]).filter(r => {
        const sd = r.events?.start_date;
        if (!sd) return false;
        const d = new Date(sd);
        return d >= in7 && d <= in8; // within the 7-day window
      });

      if (!upcoming.length) return;

      // Check which events already have a reminder notification sent
      const eventIds = upcoming.map(r => r.event_id);
      const { data: existing } = await supabase
        .from("notifications")
        .select("metadata")
        .eq("user_id", uid)
        .eq("type", "event_reminder")
        .in("metadata->>event_id", eventIds);

      const alreadySent = new Set((existing ?? []).map((n: any) => n.metadata?.event_id));

      const toInsert = upcoming
        .filter(r => !alreadySent.has(r.event_id))
        .map(r => ({
          user_id:  uid,
          actor_id: uid,
          type:     "event_reminder",
          metadata: {
            event_id:    r.event_id,
            event_title: r.events?.title ?? "",
            start_date:  r.events?.start_date ?? "",
          },
        }));

      if (toInsert.length) {
        await supabase.from("notifications").insert(toInsert);
      }
    };

    run();
  }, []);
};
