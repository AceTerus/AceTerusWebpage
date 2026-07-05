import { createContext, useContext, useEffect, useState } from "react";

export const WORK_SECS  = 25 * 60;
export const BREAK_SECS =  5 * 60;

const STORAGE_KEY = "ace-pomodoro-state";

interface Persisted {
  mode:      "work" | "break";
  secs:      number;
  active:    boolean;
  done:      boolean;
  sessions:  number;
  visible:   boolean;
  savedAt:   number; // Date.now() when state was last written
}

function loadState(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p: Persisted = JSON.parse(raw);
    // If timer was running, subtract elapsed seconds since last save
    if (p.active && p.savedAt) {
      const elapsed = Math.floor((Date.now() - p.savedAt) / 1000);
      p.secs = Math.max(0, p.secs - elapsed);
      if (p.secs === 0) { p.active = false; p.done = true; }
    }
    return p;
  } catch {
    return {};
  }
}

interface PomodoroCtx {
  mode:     "work" | "break";
  secs:     number;
  active:   boolean;
  done:     boolean;
  sessions: number;
  visible:  boolean;
  toggle:        () => void;
  reset:         () => void;
  switchMode:    () => void;
  setModeManual: (m: "work" | "break") => void;
  dismiss:       () => void;
}

const Ctx = createContext<PomodoroCtx | null>(null);

export const PomodoroProvider = ({ children }: { children: React.ReactNode }) => {
  const saved = loadState();

  const [mode,     setMode]     = useState<"work" | "break">(saved.mode     ?? "work");
  const [secs,     setSecs]     = useState<number>          (saved.secs     ?? WORK_SECS);
  const [active,   setActive]   = useState<boolean>         (saved.active   ?? false);
  const [done,     setDone]     = useState<boolean>         (saved.done     ?? false);
  const [sessions, setSessions] = useState<number>          (saved.sessions ?? 0);
  const [visible,  setVisible]  = useState<boolean>         (saved.visible  ?? false);

  // Persist to localStorage; debounce tick-writes (10s) but flush immediately on state changes
  useEffect(() => {
    const delay = active ? 10000 : 0;
    const id = setTimeout(() => {
      const p: Persisted = { mode, secs, active, done, sessions, visible, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }, delay);
    return () => clearTimeout(id);
  }, [mode, secs, active, done, sessions, visible]);

  // Tick
  useEffect(() => {
    if (!active || secs <= 0) return;
    const id = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [active, secs]);

  // Auto-stop when hits 0
  useEffect(() => {
    if (secs === 0 && active) { setActive(false); setDone(true); }
  }, [secs, active]);

  const toggle = () => {
    if (!active) setVisible(true);
    setActive(a => !a);
    setDone(false);
  };

  const reset = () => {
    setSecs(mode === "work" ? WORK_SECS : BREAK_SECS);
    setActive(false);
    setDone(false);
  };

  const switchMode = () => {
    const next = mode === "work" ? "break" : "work";
    if (mode === "work") setSessions(s => s + 1);
    setMode(next);
    setSecs(next === "work" ? WORK_SECS : BREAK_SECS);
    setActive(false);
    setDone(false);
  };

  const setModeManual = (m: "work" | "break") => {
    if (active) return;
    setMode(m);
    setSecs(m === "work" ? WORK_SECS : BREAK_SECS);
    setDone(false);
  };

  const dismiss = () => {
    setActive(false);
    setDone(false);
    setSecs(mode === "work" ? WORK_SECS : BREAK_SECS);
    setVisible(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Ctx.Provider value={{ mode, secs, active, done, sessions, visible, toggle, reset, switchMode, setModeManual, dismiss }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePomodoro = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
};
