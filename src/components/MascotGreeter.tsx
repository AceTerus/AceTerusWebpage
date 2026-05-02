import { useEffect, useRef } from 'react';
import { useMascot } from '@/context/MascotContext';
import { useStreak } from '@/hooks/useStreak';
import { useAuth } from '@/hooks/useAuth';

/**
 * Invisible component mounted alongside MascotCompanion.
 * Fires context-aware greeting messages when the user loads the app.
 */
const MascotGreeter = () => {
  const { user } = useAuth();
  const { streak, lastQuizDate, isLoading } = useStreak();
  const { pushMessage } = useMascot();
  const greeted = useRef(false);

  useEffect(() => {
    if (!user || isLoading || greeted.current) return;
    greeted.current = true;

    const todayISO = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const today = todayISO();
    const hour = new Date().getHours();
    const quizzedToday = lastQuizDate === today;

    // Time-of-day greeting
    const timeGreeting =
      hour < 12 ? 'Good morning! ☀️' :
      hour < 17 ? 'Hey there! 👋' :
                  'Good evening! 🌙';

    // Small delay so the app has settled
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runGreeting = async () => {
      await delay(1500);

      if (streak === 0) {
        pushMessage(
          `${timeGreeting} I'm Ace, your study companion! Start a quiz today to kick off your streak! ⭐`,
          'normal',
          'happy'
        );
      } else if (quizzedToday) {
        pushMessage(
          `${timeGreeting} You're on a ${streak}-day streak — keep shining! ⭐`,
          'normal',
          'happy'
        );
      } else {
        // Hasn't quizzed today yet
        if (hour >= 20) {
          // Evening warning
          pushMessage(
            `Hey! The day is almost over — don't break your ${streak}-day streak! Quick quiz now? 🔥`,
            'high',
            'urgent'
          );
        } else {
          pushMessage(
            `${timeGreeting} You're on a ${streak}-day streak. Don't forget to quiz today to keep it going! 🔥`,
            'normal',
            'urgent'
          );
        }
      }
    };

    runGreeting();
  }, [user, isLoading, streak, lastQuizDate, pushMessage]);

  return null;
};

export default MascotGreeter;
