import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const checkReminders = async (userId: string) => {
  const now = new Date().toISOString();
  const { data: dueGoals, error } = await supabase
    .from("goals")
    .select("id, text, date, priority")
    .eq("user_id", userId)
    .eq("reminder_sent", false)
    .not("reminder_at", "is", null)
    .lte("reminder_at", now);

  if (error || !dueGoals || dueGoals.length === 0) return;

  for (const goal of dueGoals) {
    await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: userId,
      type: "goal_reminder",
      goal_id: goal.id,
      metadata: { text: goal.text, date: goal.date, priority: goal.priority },
    });
    await supabase.from("goals").update({ reminder_sent: true }).eq("id", goal.id);
  }
};

// Fire any due reminders, then set a precise timeout for the next upcoming one.
// Goes completely silent when there are no future reminders — no polling.
export const useGoalReminders = () => {
  const { user } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const scheduleNext = async () => {
      await checkReminders(userId);

      const { data } = await supabase
        .from("goals")
        .select("reminder_at")
        .eq("user_id", userId)
        .eq("reminder_sent", false)
        .not("reminder_at", "is", null)
        .gt("reminder_at", new Date().toISOString())
        .order("reminder_at", { ascending: true })
        .limit(1);

      const next = data?.[0]?.reminder_at;
      if (next) {
        const delay = Math.max(0, new Date(next).getTime() - Date.now()) + 1000;
        timeoutRef.current = setTimeout(scheduleNext, delay);
      }
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]);
};
