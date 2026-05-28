import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useMascot } from '@/context/MascotContext';
import { useStreak } from '@/hooks/useStreak';
const mascotGif = '/mascot1.gif';

/**
 * Ace — the AceTerus star mascot companion.
 * Floats freely at the bottom-right with no circular frame,
 * Duolingo-style animations and a speech bubble.
 */
const MascotCompanion = () => {
  const { currentMessage, mood, isMinimized, dismissMessage, toggleMinimized, openChat } = useMascot();
  const { streak } = useStreak();
  const [entered, setEntered] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  // Key trick: re-mount speech bubble on each new message so bubble-pop replays
  const [bubbleKey, setBubbleKey] = useState(0);

  // Entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Replay bubble entrance animation on each new message
  useEffect(() => {
    if (currentMessage) setBubbleKey((k) => k + 1);
  }, [currentMessage]);

  const handleMouseEnter = () => {
    if (mood === 'idle' || mood === 'happy') setIsWiggling(true);
  };

  const animClass =
    mood === 'celebrating' ? 'mascot-celebrate' :
    isWiggling             ? 'mascot-wiggle'    :
    mood === 'urgent'      ? 'mascot-urgent'    :
                             'mascot-float';

  // ── Minimized state ──────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <button
        onClick={toggleMinimized}
        aria-label="Expand Ace"
        className="fixed bottom-24 right-4 z-50 lg:bottom-6 lg:right-6 mascot-float flex items-center justify-center focus:outline-none"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="text-5xl drop-shadow-lg select-none">⭐</span>
        {currentMessage && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-md animate-pulse">
            !
          </span>
        )}
      </button>
    );
  }

  // ── Full mascot ──────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed bottom-24 right-3 z-50 flex flex-col items-center gap-2 lg:bottom-6 lg:right-5 ${entered ? 'mascot-entrance' : 'opacity-0'}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Speech bubble */}
      {currentMessage && (
        <div
          key={bubbleKey}
          className="bubble-pop relative w-[220px] rounded-3xl bg-white px-5 py-4 shadow-2xl"
          style={{
            pointerEvents: 'auto',
            border: '2.5px solid #e5e7eb',
          }}
        >
          {/* Mood accent bar */}
          <div
            className={`absolute top-0 left-6 right-6 h-1 rounded-full ${
              mood === 'celebrating' ? 'bg-yellow-400' :
              mood === 'urgent'      ? 'bg-red-400'    :
                                       'bg-blue-400'
            }`}
          />

          <p className="mt-1 text-[13px] font-semibold leading-snug text-gray-800">
            {currentMessage}
          </p>

          <button
            onClick={dismissMessage}
            className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 shadow hover:bg-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <X size={11} />
          </button>

          {/* Tail pointing down toward mascot */}
          <div className="absolute -bottom-[11px] left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[11px] border-t-gray-200" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-white -mt-[10px]" />
          </div>
        </div>
      )}

      {/* Mascot character */}
      <div
        className={`relative select-none cursor-pointer ${animClass}`}
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={handleMouseEnter}
        onAnimationEnd={() => {
          if (isWiggling) setIsWiggling(false);
        }}
        onClick={openChat}
        title="Chat with Ace"
      >
        {/* Minimize button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMinimized(); }}
          className="absolute -top-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 shadow hover:bg-gray-300 transition-colors"
          aria-label="Minimize Ace"
        >
          <X size={11} />
        </button>

        <img
          src={mascotGif}
          alt="Ace mascot"
          className="w-48 h-auto drop-shadow-xl"
          style={{
            filter:
              mood === 'celebrating' ? 'brightness(1.12) saturate(1.4)' :
              mood === 'urgent'      ? 'saturate(1.2)'                  :
                                       undefined,
          }}
        />

        {/* Subtle ground shadow */}
        <div className="mx-auto mt-1 h-3 w-20 rounded-full bg-black/10 blur-sm" />
      </div>
    </div>
  );
};

export default MascotCompanion;
