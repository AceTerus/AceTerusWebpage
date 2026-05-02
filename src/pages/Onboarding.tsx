import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper, getCroppedBlob } from "@/components/ImageCropper";
import { SchoolPicker } from "@/components/SchoolPicker";
import type { SchoolResult } from "@/components/SchoolPicker";
import {
  Camera, User, BookOpen, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, Sparkles,
} from "lucide-react";
import Logo from "@/assets/logo.webp";

const C = {
  blue: "#2F7CFF", indigo: "#2E2BE5", ink: "#0F172A",
  cyan: "#3BD6F5", cloud: "#F3FAFF",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const INPUT = "w-full border-[2.5px] border-[#0F172A] rounded-[14px] px-4 py-3 font-semibold bg-white focus:outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.15)] transition-all placeholder:text-slate-400 text-sm";

const STEPS = [
  { icon: User,     label: "Your Name"   },
  { icon: Camera,   label: "Your Photo"  },
  { icon: BookOpen, label: "Your School" },
];

export default function Onboarding() {
  const { user, isNewUser, setIsNewUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — identity
  const [username, setUsername] = useState("");
  const [bio, setBio]           = useState("");

  // Step 1 — avatar
  const [avatarBlob, setAvatarBlob]       = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — school
  const [school, setSchool] = useState<SchoolResult | null>(null);

  const canNext = [
    username.trim().length >= 2,
    true, // photo is optional
    true, // school is optional
  ][step];

  const handleFinish = async () => {
    if (!user) return;
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
      await (supabase as any).from("profiles").update({
        username: username.trim(),
        bio: bio.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }).eq("user_id", user.id);

      // Save school if chosen
      if (school) {
        await (supabase as any).from("student_schools").upsert({
          user_id: user.id,
          school_name: school.name,
          grade: "",
          curricular: "",
          school_type: school.type,
          school_location: [school.district, school.state].filter(Boolean).join(", "),
          class_name: "",
        }, { onConflict: "user_id" });
      }

      setIsNewUser(false);
      toast({ title: "Welcome to AceTerus! 🎉", description: "Your profile is all set." });
      navigate("/");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  // Don't show for existing users who navigated here directly
  if (!isNewUser && !saving) {
    navigate("/");
    return null;
  }

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

          {/* Heading */}
          <div className="text-center">
            <h1 className={`${DISPLAY} font-extrabold text-3xl`}>Set up your profile</h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">Takes less than a minute ⚡</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done    = i < step;
              const current = i === step;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] text-xs font-extrabold transition-all"
                    style={{
                      borderColor: C.ink,
                      background: done ? C.indigo : current ? C.blue : "#fff",
                      color:      done || current ? "#fff" : "#64748b",
                      boxShadow:  current ? `3px 3px 0 0 ${C.ink}` : "none",
                    }}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-6 h-0.5 rounded-full" style={{ background: i < step ? C.indigo : "#cbd5e1" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="border-[3px] border-[#0F172A] rounded-[28px] shadow-[8px_8px_0_0_#0F172A] bg-white p-7 flex flex-col gap-5">

            {/* ── Step 0: Username + Bio ── */}
            {step === 0 && (
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
              </>
            )}

            {/* ── Step 1: Avatar ── */}
            {step === 1 && (
              <>
                <div>
                  <h2 className={`${DISPLAY} font-extrabold text-xl mb-1`}>Add a profile photo</h2>
                  <p className="text-slate-500 text-sm font-medium">Show your squad who you are. You can change this anytime.</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
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
                  </button>
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

            {/* ── Step 2: School ── */}
            {step === 2 && (
              <>
                <div>
                  <h2 className={`${DISPLAY} font-extrabold text-xl mb-1`}>Which school are you from?</h2>
                  <p className="text-slate-500 text-sm font-medium">Help us personalise your experience. You can skip this.</p>
                </div>
                <SchoolPicker value={school} onChange={setSchool} />
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className={`${DISPLAY} flex items-center gap-1.5 px-4 py-2.5 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-sm bg-white shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 transition-all`}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canNext || saving}
                className={`${DISPLAY} flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-[2.5px] border-[#0F172A] font-extrabold text-sm text-white shadow-[4px_4px_0_0_#0F172A] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none`}
                style={{ background: step === STEPS.length - 1 ? C.indigo : C.blue }}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : step === STEPS.length - 1 ? (
                  <><Sparkles className="w-4 h-4" /> Let's go!</>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={() => { setIsNewUser(false); navigate("/"); }}
            className="text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </>
  );
}
