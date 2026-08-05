import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/ImageCropper";
import { SchoolPicker } from "@/components/SchoolPicker";
import type { SchoolResult } from "@/components/SchoolPicker";
import {
  Camera, User, BookOpen, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, Sparkles, Users, Brain, Bot, Flame,
  GraduationCap,
} from "lucide-react";
import Logo from "@/assets/logo.webp";

const C = {
  blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A",
  cyan: "#3BD6F5", cloud: "#F3FAFF", peach: "#FF7A59",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const INPUT = "w-full border-[2.5px] border-[#0F172A] rounded-[14px] px-4 py-3 font-semibold bg-white focus:outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.15)] transition-all placeholder:text-slate-400 text-sm";

const PROFILE_STEPS = [
  { icon: User,     label: "Your Name"   },
  { icon: Camera,   label: "Your Photo"  },
  { icon: BookOpen, label: "Your School" },
];

// ── Education picker (mirrors Profile.tsx patterns) ───────────────────────
type EducationLevel = 'primary' | 'secondary' | 'preuni' | 'diploma' | 'degree' | 'postgrad';

const EDUCATION_LEVELS: { value: EducationLevel; label: string; sub: string }[] = [
  { value: 'primary',   label: 'Primary',    sub: 'Std 1–6' },
  { value: 'secondary', label: 'Secondary',  sub: 'Form 1–5' },
  { value: 'preuni',    label: 'Pre-U',      sub: 'Form 6 / Foundation' },
  { value: 'diploma',   label: 'Diploma',    sub: 'Year 1–3' },
  { value: 'degree',    label: 'Degree',     sub: 'Year 1–5' },
  { value: 'postgrad',  label: 'Postgrad',   sub: "Master's / PhD" },
];

const YEAR_OPTIONS: Record<EducationLevel, string[]> = {
  primary:   ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6'],
  secondary: ['Form 1','Form 2','Form 3','Form 4','Form 5'],
  preuni:    ['Form 6 (Lower)','Form 6 (Upper)','Foundation','Matrikulasi'],
  diploma:   ['Diploma Year 1','Diploma Year 2','Diploma Year 3'],
  degree:    ['Degree Year 1','Degree Year 2','Degree Year 3','Degree Year 4','Degree Year 5'],
  postgrad:  ["Master's",'PhD'],
};

const YEAR_PILL_LABEL: Record<EducationLevel, (g: string) => string> = {
  primary:   g => g.replace('Standard ', 'Std '),
  secondary: g => g,
  preuni:    g => g.replace('Form 6 (Lower)', 'F6 Lower').replace('Form 6 (Upper)', 'F6 Upper'),
  diploma:   g => g.replace('Diploma ', ''),
  degree:    g => g.replace('Degree ', ''),
  postgrad:  g => g,
};

function schoolDBLevel(grade: string): string | undefined {
  if (!grade) return undefined;
  if (grade.startsWith('Standard')) return 'primary';
  if (grade.startsWith('Form')) return 'secondary';
  return 'tertiary';
}

function schoolTypeFilter(grade: string): string[] | undefined {
  if (!grade) return undefined;
  if (grade.startsWith('Standard'))
    return ['SK','SJK(C)','SJK(T)','Sekolah Swasta','Sekolah Antarabangsa'];
  if (grade === 'Form 6 (Lower)' || grade === 'Form 6 (Upper)')
    return ['SMK','SBP','MRSM','Sekolah Swasta','Lain-lain'];
  if (grade.startsWith('Form'))
    return ['SMK','SMJK','SBP','MRSM','SAM','SABK','Sekolah Swasta','Sekolah Antarabangsa','Lain-lain'];
  if (grade === 'Foundation' || grade === 'Matrikulasi')
    return ['Universiti Awam','Universiti Swasta','Kolej Matrikulasi'];
  return ['Universiti Awam','Universiti Swasta','Politeknik','Kolej Komuniti','Kolej Swasta'];
}

function streamOptions(grade: string): string[] {
  if (!grade) return [];
  if (grade.startsWith('Standard') || ['Form 1','Form 2','Form 3'].includes(grade)) return [];
  if (grade === 'Form 4' || grade === 'Form 5')
    return ['Science','Arts','Commerce','Technical','Vocational','Agama (Religious)'];
  if (grade.startsWith('Form 6'))
    return ['Science (Sains)','Arts (Sastera)','Accounting (Perakaunan)'];
  if (grade === 'Foundation' || grade === 'Matrikulasi')
    return ['Sciences','Social Science','Engineering','Business'];
  return ['Engineering','Computer Science','Business','Medicine','Law','Education','Architecture','Science','Arts & Humanities'];
}

// ── Tour cards ────────────────────────────────────────────────────────────
const TOUR = [
  {
    Icon: Users,
    tag: "Social Feed",
    title: "Post & vibe with your squad",
    body: "Share notes, wins, or questions. Like, comment, and follow other students studying alongside you.",
    tint: C.cyan,
    tintSoft: "#DDF3FF",
  },
  {
    Icon: Brain,
    tag: "AI Quiz Gen",
    title: "Turn notes into a quiz — instantly",
    body: "Drop in text or a PDF and get instant AI-generated questions. Objective quizzes grade themselves.",
    tint: C.blue,
    tintSoft: "#DDF3FF",
  },
  {
    Icon: Bot,
    tag: "Mascot Tutor",
    title: "Chat with your AI mascot",
    body: "Stuck on a topic? Ask your mascot anything and get explanations that actually click.",
    tint: C.indigo,
    tintSoft: "#D6D4FF",
  },
  {
    Icon: Flame,
    tag: "Streaks · Coins · Raids",
    title: "Level up every day",
    body: "Build daily streaks, earn ACE Coins, and team up on Boss Raids to test your knowledge together.",
    tint: C.peach,
    tintSoft: "#FFE4E6",
  },
] as const;

// ── Motion presets ────────────────────────────────────────────────────────
const EASE = [0.25, 0.8, 0.3, 1] as const;
const CARD_T = { duration: 0.24, ease: EASE };
const slideVariants = {
  initial: (d: number) => ({ opacity: 0, x: d * 40 }),
  animate: { opacity: 1, x: 0 },
  exit:    (d: number) => ({ opacity: 0, x: -d * 40 }),
};

export default function Onboarding() {
  const { user, isNewUser, setIsNewUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase]     = useState<'profile' | 'tour' | 'done'>('profile');
  const [step, setStep]       = useState(0);
  const [tourIdx, setTourIdx] = useState(0);
  const [dir, setDir]         = useState(1);
  const [saving, setSaving]   = useState(false);

  // Step 0 — identity
  const [username, setUsername]   = useState("");
  const [bio, setBio]             = useState("");
  const [isTeacher, setIsTeacher] = useState(false);

  // Step 1 — avatar
  const [avatarBlob, setAvatarBlob]       = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — school + education
  const [school, setSchool]     = useState<SchoolResult | null>(null);
  const [eduLevel, setEduLevel] = useState<EducationLevel | ''>('');
  const [grade, setGrade]       = useState('');
  const [curricular, setCurricular] = useState('');

  const canNextProfile = [
    username.trim().length >= 2,
    true, // photo optional
    true, // school + education fully optional
  ][step];

  const streams = streamOptions(grade);
  const schoolTypes = schoolTypeFilter(grade);
  const schoolLevel = schoolDBLevel(grade);

  const handleLevelChange = (lvl: EducationLevel) => {
    if (eduLevel !== lvl) {
      setEduLevel(lvl);
      setGrade('');
      setCurricular('');
      setSchool(null); // school filters depend on level — clear stale pick
    }
  };
  const handleGradeChange = (g: string) => {
    setGrade(g);
    setCurricular('');
  };

  const persist = async (): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      // Upload avatar if picked
      let avatarUrl: string | undefined;
      if (avatarBlob) {
        const path = `${user.id}/avatar_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("profile-images")
          .upload(path, avatarBlob, { upsert: true, contentType: "image/jpeg" });
        if (!upErr) {
          avatarUrl = supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
        }
      }

      // Update profile
      const { error: profileErr } = await (supabase as any).from("profiles").update({
        username: username.trim(),
        bio: bio.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }).eq("user_id", user.id);
      if (profileErr) throw profileErr;

      // Verify the write actually persisted before continuing
      const { data: verify } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      if (!(verify as any)?.username) {
        throw new Error("Profile update did not persist — please try again.");
      }

      // Save school + education if anything was provided
      // Uses insert (not upsert) — the multi-entry migration dropped the user_id UNIQUE constraint.
      if (school || grade || curricular) {
        await (supabase as any).from("student_schools").insert({
          user_id: user.id,
          school_id: school?.id ?? null,
          school_name: school?.name ?? null,
          school_type: school?.type ?? null,
          school_location: school
            ? [school.district, school.state].filter(Boolean).join(", ")
            : null,
          grade: grade || null,
          curricular: curricular || null,
          class_name: null,
          is_current: true,
        });
      }
      return true;
    } catch (e: any) {
      console.error("Onboarding error:", e);
      toast({
        title: "Something went wrong",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const finalize = () => {
    setIsNewUser(false);
    localStorage.setItem('ace_onboarding_done', '1');
    toast({ title: "Welcome to AceTerus! 🎉", description: "Your profile is all set." });
    navigate("/");
  };

  const nextStep = async () => {
    setDir(1);
    if (step < PROFILE_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      const ok = await persist();
      if (ok) {
        setPhase('tour');
        setTourIdx(0);
      }
    }
  };
  const prevStep = () => { setDir(-1); if (step > 0) setStep(s => s - 1); };

  const nextTour = () => {
    setDir(1);
    if (tourIdx < TOUR.length - 1) {
      setTourIdx(i => i + 1);
    } else {
      setPhase('done');
      window.setTimeout(finalize, 900);
    }
  };
  const prevTour = () => { setDir(-1); if (tourIdx > 0) setTourIdx(i => i - 1); };

  const skipTour = () => {
    setPhase('done');
    window.setTimeout(finalize, 700);
  };

  const skipAll = () => {
    localStorage.setItem('ace_onboarding_done', '1');
    setIsNewUser(false);
    navigate("/", { replace: true });
  };

  // Don't show for existing users who navigated here directly.
  // Allow the 'done' bounce moment even after isNewUser flips.
  useEffect(() => {
    if (!isNewUser && !saving && phase !== 'done') {
      navigate("/", { replace: true });
    }
  }, [isNewUser, saving, phase, navigate]);

  if (!isNewUser && !saving && phase !== 'done') return null;

  const activeKey =
    phase === 'profile' ? `profile-${step}` :
    phase === 'tour'    ? `tour-${tourIdx}` :
    'done';

  const isLastTour = tourIdx === TOUR.length - 1;

  return (
    <>
      {/* Avatar cropper overlay */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          aspect={1}
          title="Crop Profile Photo"
          onConfirm={(blob, preview) => {
            setAvatarBlob(blob);
            setAvatarPreview(preview);
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 py-12 font-['Nunito']"
        style={{
          backgroundColor: C.cloud,
          backgroundImage: `
            radial-gradient(900px 600px at 90% -10%, rgba(59,214,245,.4), transparent 60%),
            radial-gradient(700px 500px at -5% 20%,  rgba(47,124,255,.3), transparent 60%)
          `,
        }}
      >
        <div className="w-full max-w-md flex flex-col gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 justify-center">
            <img src={Logo} alt="AceTerus" className="w-10 h-10 rounded-xl border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]" />
            <span className={`${DISPLAY} font-extrabold text-xl`}>AceTerus</span>
          </div>

          {/* Heading (phase-aware) */}
          <div className="text-center min-h-[64px]">
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'profile' && (
                <motion.div
                  key="h-profile"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <h1 className={`${DISPLAY} font-extrabold text-3xl`}>Set up your profile</h1>
                  <p className="text-slate-500 font-medium mt-1 text-sm">Takes less than a minute ⚡</p>
                </motion.div>
              )}
              {phase === 'tour' && (
                <motion.div
                  key="h-tour"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <h1 className={`${DISPLAY} font-extrabold text-3xl`}>Meet AceTerus</h1>
                  <p className="text-slate-500 font-medium mt-1 text-sm">A quick peek at what you can do 👀</p>
                </motion.div>
              )}
              {phase === 'done' && (
                <motion.div
                  key="h-done"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <h1 className={`${DISPLAY} font-extrabold text-3xl`}>You're all set!</h1>
                  <p className="text-slate-500 font-medium mt-1 text-sm">Time to explore ✨</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress indicator */}
          <div className="min-h-[36px]">
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'profile' && (
                <motion.div
                  key="pills"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center gap-2"
                >
                  {PROFILE_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const done    = i < step;
                    const current = i === step;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <motion.div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] text-xs font-extrabold"
                          initial={false}
                          animate={{
                            backgroundColor: done ? C.indigo : current ? C.blue : "#ffffff",
                            color: done || current ? "#ffffff" : "#64748b",
                            boxShadow: current ? `3px 3px 0 0 ${C.ink}` : `0px 0px 0 0 ${C.ink}00`,
                            scale: current ? 1.05 : 1,
                          }}
                          transition={{ duration: 0.22, ease: EASE }}
                          style={{ borderColor: C.ink }}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {done ? (
                              <motion.span
                                key="check"
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.4, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                                className="inline-flex"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </motion.span>
                            ) : (
                              <motion.span
                                key="icon"
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.4, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="inline-flex"
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                          <span className="hidden sm:inline">{s.label}</span>
                        </motion.div>
                        {i < PROFILE_STEPS.length - 1 && (
                          <div className="w-6 h-0.5 rounded-full bg-slate-300 relative overflow-hidden">
                            <motion.div
                              className="absolute inset-0 origin-left"
                              initial={false}
                              animate={{ scaleX: i < step ? 1 : 0 }}
                              transition={{ duration: 0.28, ease: EASE }}
                              style={{ background: C.indigo }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
              {phase === 'tour' && (
                <motion.div
                  key="dots"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-center gap-2"
                >
                  {TOUR.map((_, i) => {
                    const active = i === tourIdx;
                    const done   = i < tourIdx;
                    return (
                      <motion.div
                        key={i}
                        className="h-2 rounded-full border-[1.5px]"
                        initial={false}
                        animate={{
                          width: active ? 28 : 10,
                          backgroundColor: done ? C.indigo : active ? C.blue : "#ffffff",
                        }}
                        transition={{ duration: 0.24, ease: EASE }}
                        style={{ borderColor: C.ink }}
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card */}
          <motion.div
            layout
            transition={{ duration: 0.22, ease: EASE }}
            className="border-[3px] border-[#0F172A] rounded-[28px] shadow-[8px_8px_0_0_#0F172A] bg-white p-7 flex flex-col gap-5 overflow-hidden"
          >
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={activeKey}
                custom={dir}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={CARD_T}
                className="flex flex-col gap-5"
              >
                {/* ── Profile Step 0: Username + Bio + Role ── */}
                {phase === 'profile' && step === 0 && (
                  <>
                    <div>
                      <h2 className={`${DISPLAY} font-extrabold text-xl mb-1`}>What should we call you?</h2>
                      <p className="text-slate-500 text-sm font-medium">Pick a username — this is how your squad will find you.</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-extrabold text-sm">Username <span className="text-red-400">*</span></label>
                      <input
                        className={INPUT}
                        placeholder="e.g. aceStudent123"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        maxLength={30}
                        autoFocus
                      />
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Min 2 characters, no spaces</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-extrabold text-sm">Bio <span className="text-slate-400 font-medium">(optional)</span></label>
                      <textarea
                        className={`${INPUT} resize-none`}
                        placeholder="Tell your squad a little about yourself…"
                        rows={3}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        maxLength={160}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-extrabold text-sm">I am a…</label>
                      <div className="flex gap-2 p-1 rounded-full border-[2.5px] border-[#0F172A] bg-[#F3FAFF]">
                        {([false, true] as const).map((val) => (
                          <motion.button
                            key={String(val)}
                            type="button"
                            onClick={() => setIsTeacher(val)}
                            whileTap={{ scale: 0.96 }}
                            className={`${DISPLAY} flex-1 py-2.5 rounded-full font-extrabold text-sm transition-colors duration-200`}
                            style={isTeacher === val ? {
                              background: val ? C.indigo : C.blue,
                              color: "#fff",
                              boxShadow: `3px 3px 0 0 ${C.ink}`,
                            } : {}}
                          >
                            {val ? "👨‍🏫 Teacher" : "🎓 Student"}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Profile Step 1: Avatar ── */}
                {phase === 'profile' && step === 1 && (
                  <>
                    <div>
                      <h2 className={`${DISPLAY} font-extrabold text-xl mb-1`}>Add a profile photo</h2>
                      <p className="text-slate-500 text-sm font-medium">Show your squad who you are. You can change this anytime.</p>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <motion.button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="relative group"
                      >
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            className="w-32 h-32 rounded-full object-cover border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A]"
                          />
                        ) : (
                          <div
                            className="w-32 h-32 rounded-full border-[3px] border-dashed border-[#0F172A] flex flex-col items-center justify-center gap-2 transition-colors group-hover:bg-slate-50"
                            style={{ background: "#F8FAFC" }}
                          >
                            <Camera className="w-8 h-8 text-slate-300" />
                            <span className="text-[11px] font-bold text-slate-400">Tap to upload</span>
                          </div>
                        )}
                        <div
                          className="absolute bottom-1 right-1 w-8 h-8 rounded-full border-[2px] border-[#0F172A] flex items-center justify-center shadow-[2px_2px_0_0_#0F172A]"
                          style={{ background: C.blue }}
                        >
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </motion.button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setCropSrc(URL.createObjectURL(f)); e.target.value = ""; }
                        }}
                      />
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="text-sm font-extrabold underline"
                          style={{ color: C.blue }}
                        >
                          Change photo
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* ── Profile Step 2: School + Education ── */}
                {phase === 'profile' && step === 2 && (
                  <>
                    <div>
                      <h2 className={`${DISPLAY} font-extrabold text-xl mb-1`}>Where are you studying?</h2>
                      <p className="text-slate-500 text-sm font-medium">All optional — helps us personalise your feed. Skip anything you'd rather add later.</p>
                    </div>

                    {/* Education level */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-extrabold text-sm flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" style={{ color: C.indigo }} />
                        Education level
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {EDUCATION_LEVELS.map((lvl) => {
                          const active = eduLevel === lvl.value;
                          return (
                            <motion.button
                              key={lvl.value}
                              type="button"
                              onClick={() => handleLevelChange(lvl.value)}
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.12 }}
                              className={`${DISPLAY} rounded-[12px] border-[2px] border-[#0F172A] px-2 py-2 text-[11px] font-extrabold text-center transition-colors`}
                              style={active ? {
                                background: C.blue,
                                color: "#fff",
                                boxShadow: `2px 2px 0 0 ${C.ink}`,
                              } : { background: "#fff", color: C.ink }}
                            >
                              <div className="leading-tight">{lvl.label}</div>
                              <div className={`text-[9px] font-bold mt-0.5 ${active ? 'text-white/80' : 'text-slate-400'}`}>{lvl.sub}</div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Year / grade */}
                    <AnimatePresence initial={false}>
                      {eduLevel && (
                        <motion.div
                          key="year-block"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: EASE }}
                          className="flex flex-col gap-1.5 overflow-hidden"
                        >
                          <label className="font-extrabold text-sm">Year / grade <span className="text-slate-400 font-medium">(optional)</span></label>
                          <div className="flex flex-wrap gap-1.5">
                            {YEAR_OPTIONS[eduLevel].map((y) => {
                              const active = grade === y;
                              return (
                                <motion.button
                                  key={y}
                                  type="button"
                                  onClick={() => handleGradeChange(y)}
                                  whileTap={{ scale: 0.94 }}
                                  transition={{ duration: 0.12 }}
                                  className={`${DISPLAY} px-3 py-1.5 rounded-full border-[2px] border-[#0F172A] text-xs font-extrabold transition-colors`}
                                  style={active ? {
                                    background: C.indigo,
                                    color: "#fff",
                                    boxShadow: `2px 2px 0 0 ${C.ink}`,
                                  } : { background: "#fff" }}
                                >
                                  {YEAR_PILL_LABEL[eduLevel](y)}
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Stream / curriculum */}
                    <AnimatePresence initial={false}>
                      {streams.length > 0 && (
                        <motion.div
                          key="stream-block"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: EASE }}
                          className="flex flex-col gap-1.5 overflow-hidden"
                        >
                          <label className="font-extrabold text-sm">Stream / curriculum <span className="text-slate-400 font-medium">(optional)</span></label>
                          <select
                            className={INPUT}
                            value={curricular}
                            onChange={(e) => setCurricular(e.target.value)}
                          >
                            <option value="">Select…</option>
                            {streams.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* School picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-extrabold text-sm">School <span className="text-slate-400 font-medium">(optional)</span></label>
                      <SchoolPicker
                        value={school}
                        onChange={setSchool}
                        filterLevel={schoolLevel}
                        filterTypes={schoolTypes}
                      />
                    </div>
                  </>
                )}

                {/* ── Tour cards ── */}
                {phase === 'tour' && (() => {
                  const card = TOUR[tourIdx];
                  const Icon = card.Icon;
                  return (
                    <div className="flex flex-col items-center text-center gap-4 min-h-[260px] justify-center py-2">
                      <motion.div
                        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 16, delay: 0.05 }}
                        className="w-20 h-20 rounded-[22px] border-[2.5px] border-[#0F172A] flex items-center justify-center shadow-[4px_4px_0_0_#0F172A]"
                        style={{ background: card.tintSoft }}
                      >
                        <Icon className="w-10 h-10" style={{ color: card.tint }} strokeWidth={2.4} />
                      </motion.div>
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className={`${DISPLAY} inline-block px-3 py-0.5 rounded-full border-[2px] border-[#0F172A] text-[11px] font-extrabold`}
                        style={{ background: card.tintSoft, color: card.tint }}
                      >
                        {card.tag}
                      </motion.span>
                      <motion.h2
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: 0.12 }}
                        className={`${DISPLAY} font-extrabold text-2xl leading-tight`}
                      >
                        {card.title}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: 0.16 }}
                        className="text-slate-500 font-semibold text-sm leading-snug max-w-[300px]"
                      >
                        {card.body}
                      </motion.p>
                    </div>
                  );
                })()}

                {/* ── Done: bounce checkmark ── */}
                {phase === 'done' && (
                  <div className="flex flex-col items-center text-center gap-4 min-h-[220px] justify-center py-4">
                    <motion.div
                      initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 12 }}
                      className="w-24 h-24 rounded-full border-[3px] border-[#0F172A] flex items-center justify-center shadow-[5px_5px_0_0_#0F172A]"
                      style={{ background: C.cyan }}
                    >
                      <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.6} />
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: 0.15 }}
                      className={`${DISPLAY} font-extrabold text-lg`}
                    >
                      Let's ace it together 🎉
                    </motion.p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation (hide during 'done') */}
            {phase !== 'done' && (
              <div className="flex items-center gap-3 pt-1">
                {phase === 'profile' && step > 0 && (
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className={`${DISPLAY} flex items-center gap-1.5 px-4 py-2.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-sm bg-white shadow-[3px_3px_0_0_#0F172A]`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </motion.button>
                )}
                {phase === 'tour' && tourIdx > 0 && (
                  <motion.button
                    type="button"
                    onClick={prevTour}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className={`${DISPLAY} flex items-center gap-1.5 px-4 py-2.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-sm bg-white shadow-[3px_3px_0_0_#0F172A]`}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  onClick={phase === 'profile' ? nextStep : nextTour}
                  disabled={(phase === 'profile' && (!canNextProfile || saving))}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className={`${DISPLAY} flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-sm text-white shadow-[4px_4px_0_0_#0F172A] disabled:opacity-50 disabled:pointer-events-none`}
                  style={{
                    background:
                      phase === 'tour' && isLastTour ? C.indigo :
                      phase === 'profile' && step === PROFILE_STEPS.length - 1 ? C.indigo :
                      C.blue,
                  }}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : phase === 'tour' && isLastTour ? (
                    <><Sparkles className="w-4 h-4" /> Let's go!</>
                  ) : (
                    <>Next <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Skip — always visible except during the final bounce */}
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'profile' && (
              <motion.button
                key="skip-all"
                type="button"
                onClick={skipAll}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip for now →
              </motion.button>
            )}
            {phase === 'tour' && (
              <motion.button
                key="skip-tour"
                type="button"
                onClick={skipTour}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip tour →
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
