import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Calendar, MapPin, Users, CheckCircle2,
  Clock, XCircle, Building2, BadgeCheck, Send, LogIn, Rocket, ExternalLink,
  ImagePlus, Loader2, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCropper } from "@/components/ImageCropper";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const LABEL = "block text-[13px] font-bold font-['Nunito'] text-[#0F172A]/65 mb-1.5";
const INPUT = "w-full px-4 py-3 border-[2.5px] border-[#0F172A]/20 rounded-[14px] font-['Nunito'] text-[14px] outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.12)] transition-all placeholder:text-[#0F172A]/25 bg-white";
const BTN_PRIMARY = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[14px] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
const BTN_GHOST = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[14px] text-[#0F172A]";

const STATUS = {
  pending:   { label: "Under Review", icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50   border-amber-200",    dot: "bg-amber-400" },
  published: { label: "Live 🎉",       icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200",  dot: "bg-emerald-400" },
  rejected:  { label: "Rejected",      icon: XCircle,      color: "text-red-600",     bg: "bg-red-50     border-red-200",      dot: "bg-red-400" },
};

const TYPE_OPTS = [
  { value: "competition", label: "🏆 Competition" },
  { value: "hackathon",   label: "💻 Hackathon"   },
  { value: "workshop",    label: "🛠️ Workshop"    },
  { value: "talk",        label: "🎤 Talk / Seminar" },
  { value: "internship",  label: "💼 Internship"  },
  { value: "deal",        label: "🎁 Deal"        },
];

const ORG_TYPES = [
  { value: "university",   label: "🏫 University"    },
  { value: "company",      label: "🏢 Company"       },
  { value: "brand",        label: "✨ Brand"         },
  { value: "student_body", label: "👥 Student Body"  },
];

const EMPTY_EVENT = { title: "", description: "", type: "hackathon", location: "", start_date: "", end_date: "", registration_url: "", image_url: "", ace_coins_reward: 0 };
const EMPTY_ORG = { name: "", type: "company" };

/* ── Step indicator ─────────────────────────────────────────────────── */
const Step = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`w-8 h-8 rounded-full border-[2.5px] flex items-center justify-center text-[13px] font-extrabold font-['Nunito'] transition-all ${
      done    ? "border-[#059669] bg-[#059669] text-white" :
      active  ? "border-[#2F7CFF] bg-[#2F7CFF] text-white shadow-[0_0_0_3px_rgba(47,124,255,0.2)]" :
                "border-[#0F172A]/20 bg-white text-[#0F172A]/40"
    }`}>
      {done ? "✓" : n}
    </div>
    <span className={`text-[13px] font-bold font-['Nunito'] hidden sm:block ${active ? "text-[#2F7CFF]" : done ? "text-[#059669]" : "text-[#0F172A]/40"}`}>{label}</span>
  </div>
);

export default function OrganiserDashboard() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [orgForm, setOrgForm] = useState(EMPTY_ORG);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setBannerUploading(true);
    try {
      const path = `${user.id}/event-banners/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("profile-images").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
      setEventForm((f) => ({ ...f, image_url: data.publicUrl }));
      setBannerPreview(data.publicUrl);
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBannerUploading(false);
      setCropSrc(null);
    }
  };

  useEffect(() => { document.title = "Organiser Dashboard – AceTerus Events"; }, []);

  const { data: myOrg, isLoading: orgLoading } = useQuery({
    queryKey: ["my-organizer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_organizers").select("*").eq("owner_user_id", user!.id).maybeSingle();
      return data as { id: string; name: string; type: string; logo_url: string | null; verified: boolean } | null;
    },
  });

  const { data: myEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, type, location, start_date, status, created_at").eq("submitter_user_id", user!.id).order("created_at", { ascending: false });
      if (!data) return [];
      const counts = await Promise.all(data.map(async (e) => {
        const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", e.id);
        return { ...e, registration_count: count ?? 0 };
      }));
      return counts;
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      if (!orgForm.name.trim()) throw new Error("Organisation name is required");
      const { error } = await supabase.from("event_organizers").insert({ name: orgForm.name.trim(), type: orgForm.type, owner_user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("🎉 Organisation registered! We'll verify you soon.");
      setStep(2);
      setOrgForm(EMPTY_ORG);
      qc.invalidateQueries({ queryKey: ["my-organizer", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventForm.title.trim()) throw new Error("Event title is required");
      const { error } = await supabase.from("events").insert({
        ...eventForm, title: eventForm.title.trim(),
        description: eventForm.description || null, location: eventForm.location || null,
        start_date: eventForm.start_date || null, end_date: eventForm.end_date || null,
        registration_url: eventForm.registration_url || null, image_url: eventForm.image_url || null,
        organizer_id: myOrg?.id ?? null, submitter_user_id: user!.id, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("🚀 Event submitted for review! Usually within 24 hours.");
      setShowEventForm(false);
      setEventForm(EMPTY_EVENT);
      setBannerPreview(null);
      qc.invalidateQueries({ queryKey: ["my-events", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });


  // Derive step
  useEffect(() => {
    if (!orgLoading) setStep(myOrg ? 2 : 1);
  }, [myOrg, orgLoading]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🏢</div>
          <h2 className={`${DISPLAY} font-extrabold text-[26px] text-[#0F172A]`}>Organiser Dashboard</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[15px]">Publish events, track registrations, and grow your community.</p>
          <a href="https://aceterus.com/auth" className={BTN_PRIMARY + " w-full"}>
            <LogIn className="w-4 h-4" /> Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2F7CFF] border-b-[2.5px] border-[#0F172A] py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[#3BD6F5] font-bold font-['Nunito'] text-[13px] uppercase tracking-wider mb-1">Organiser Dashboard</p>
              <h1 className={`${DISPLAY} font-extrabold text-[36px] text-white`}>Publish Your Event 🚀</h1>
              <p className="text-white/60 font-['Nunito'] text-[14px] mt-1">Reach thousands of Malaysian students in two easy steps.</p>
            </div>
            {myOrg && (
              <button
                onClick={() => setShowEventForm(true)}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-white bg-white text-[#2F7CFF] font-bold font-['Nunito'] shadow-[3px_3px_0_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(255,255,255,0.35)] transition-all"
              >
                <Plus className="w-4 h-4" /> Submit Event
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <Step n={1} label="Register Organisation" active={step === 1} done={step > 1} />
            <div className="flex-1 h-0.5 bg-white/20 rounded-full" />
            <Step n={2} label="Submit Events"         active={step === 2} done={false} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Step 1: Org registration */}
        {orgLoading ? (
          <Skeleton className="h-28 w-full rounded-[20px]" />
        ) : myOrg ? (
          /* Org card */
          <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`${DISPLAY} font-bold text-[20px] text-[#0F172A]`}>{myOrg.name}</span>
                {myOrg.verified && <BadgeCheck className="w-5 h-5 text-[#2F7CFF]" />}
              </div>
              <span className="text-[13px] font-['Nunito'] text-[#0F172A]/50 capitalize">
                {ORG_TYPES.find(o => o.value === myOrg.type)?.label ?? myOrg.type} · {myOrg.verified ? "✅ Verified" : "⏳ Pending verification"}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#D1FAE5] border-[2px] border-[#059669]/20 text-[12px] font-extrabold text-[#059669] font-['Nunito']">
              ✓ Set Up
            </div>
          </div>
        ) : (
          /* Registration form */
          <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
            <div className="p-5 border-b-[2px] border-[#0F172A]/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#2F7CFF] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
                <span className="text-white font-extrabold text-[13px]">1</span>
              </div>
              <div>
                <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>Register your Organisation</h3>
                <p className="text-[13px] font-['Nunito'] text-[#0F172A]/50">Get a verified badge on all your events.</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Organisation Name *</label>
                  <input className={INPUT} placeholder="e.g. UKM Computer Science Society" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORG_TYPES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOrgForm({ ...orgForm, type: value })}
                        className={`px-3 py-2.5 rounded-[12px] border-[2px] text-[13px] font-bold font-['Nunito'] text-left transition-all ${orgForm.type === value ? "border-[#2F7CFF] bg-[#DDF3FF] text-[#2F7CFF] shadow-[2px_2px_0_0_#2F7CFF]" : "border-[#0F172A]/15 bg-white text-[#0F172A]/60 hover:border-[#0F172A]/35"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => createOrgMutation.mutate()} disabled={createOrgMutation.isPending} className={BTN_PRIMARY}>
                {createOrgMutation.isPending ? "Registering…" : <><Send className="w-4 h-4" /> Register Organisation</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Event form */}
        {showEventForm && myOrg && (
          <div className="border-[2.5px] border-[#2F7CFF] rounded-[20px] shadow-[4px_4px_0_0_#2F7CFF] bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[#2F7CFF] to-[#2E2BE5] p-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 border-[2px] border-white/30 flex items-center justify-center">
                <span className="text-white font-extrabold text-[13px]">2</span>
              </div>
              <div className="flex-1">
                <h3 className={`${DISPLAY} font-bold text-[18px] text-white`}>Submit a New Event</h3>
                <p className="text-white/65 text-[13px] font-['Nunito']">Goes live after review — usually within 24 hours.</p>
              </div>
              <button onClick={() => setShowEventForm(false)} className="text-white/60 hover:text-white text-[20px] leading-none transition-colors">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Event type selector */}
              <div>
                <label className={LABEL}>Event Type *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TYPE_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, type: value })}
                      className={`px-2 py-2.5 rounded-[12px] border-[2px] text-[12px] font-bold font-['Nunito'] text-center transition-all ${eventForm.type === value ? "border-[#2F7CFF] bg-[#DDF3FF] text-[#2F7CFF] shadow-[2px_2px_0_0_#2F7CFF] -translate-y-0.5" : "border-[#0F172A]/15 bg-white text-[#0F172A]/55 hover:border-[#0F172A]/35"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Event Title *</label>
                  <input className={INPUT} placeholder="e.g. National Hackathon 2026" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Location</label>
                  <input className={INPUT} placeholder="KLCC / Online" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>ACE Coins Reward</label>
                  <input type="number" min={0} max={10000} className={INPUT} value={eventForm.ace_coins_reward} onChange={(e) => setEventForm({ ...eventForm, ace_coins_reward: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={LABEL}>Start Date</label>
                  <input type="datetime-local" className={INPUT} value={eventForm.start_date} onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>End Date</label>
                  <input type="datetime-local" className={INPUT} value={eventForm.end_date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Description</label>
                  <textarea className={INPUT + " resize-none h-28"} placeholder="Describe your event, prizes, eligibility, etc." value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Registration URL</label>
                  <input className={INPUT} placeholder="https://…" value={eventForm.registration_url} onChange={(e) => setEventForm({ ...eventForm, registration_url: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Event Banner</label>
                  {bannerPreview ? (
                    <div className="relative rounded-[14px] overflow-hidden border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] group">
                      <img src={bannerPreview} alt="Banner preview" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-[2px] border-[#0F172A] text-[12px] font-bold font-['Nunito'] cursor-pointer shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 transition-all">
                          <ImagePlus className="w-3.5 h-3.5" /> Change
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleBannerFile} />
                        </label>
                        <button type="button" onClick={() => { setBannerPreview(null); setEventForm((f) => ({ ...f, image_url: "" })); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 border-[2px] border-white text-white text-[12px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all">
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer ${bannerUploading ? "opacity-60 pointer-events-none" : ""}`}>
                      {bannerUploading
                        ? <Loader2 className="w-6 h-6 text-[#2F7CFF] animate-spin" />
                        : <ImagePlus className="w-7 h-7 text-[#0F172A]/30" />
                      }
                      <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">
                        {bannerUploading ? "Uploading…" : "Click to upload PNG / JPG"}
                      </span>
                      <span className="text-[11px] font-['Nunito'] text-[#0F172A]/30">Recommended: 1200 × 630 px (16:9)</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleBannerFile} disabled={bannerUploading} />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => submitEventMutation.mutate()} disabled={submitEventMutation.isPending} className={BTN_PRIMARY}>
                  {submitEventMutation.isPending ? "Submitting…" : <><Rocket className="w-4 h-4" /> Submit for Review</>}
                </button>
                <button onClick={() => { setShowEventForm(false); setBannerPreview(null); setEventForm(EMPTY_EVENT); }} className={BTN_GHOST}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin shortcut */}
        {isAdmin && (
          <a
            href="https://admin.aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 border-[2.5px] border-[#2E2BE5] rounded-[20px] shadow-[4px_4px_0_0_#2E2BE5] bg-gradient-to-r from-[#2E2BE5]/5 to-[#7C3AED]/5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#2E2BE5] transition-all group"
          >
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#2E2BE5] to-[#7C3AED] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`${DISPLAY} font-bold text-[16px] text-[#0F172A]`}>Admin Tools</p>
              <p className="text-[13px] font-['Nunito'] text-[#0F172A]/50">Verify organisers &amp; review event submissions at admin.aceterus.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#2E2BE5] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}

        {/* My events */}
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
          <div className="p-5 border-b-[2px] border-[#0F172A]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>My Submitted Events</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[#DDF3FF] border-[2px] border-[#2F7CFF]/20 text-[12px] font-extrabold text-[#2F7CFF] font-['Nunito']">
                {myEvents.length} total
              </span>
              {myOrg && (
                <button onClick={() => setShowEventForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#0F172A] text-white text-[13px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_rgba(15,23,42,0.3)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(15,23,42,0.4)] transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          </div>

          {eventsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-[14px]" />)}
            </div>
          ) : myEvents.length === 0 ? (
            <div className="p-14 text-center space-y-3">
              <div className="text-5xl">📭</div>
              <p className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]/40`}>No events submitted yet</p>
              {myOrg ? (
                <button onClick={() => setShowEventForm(true)} className={BTN_PRIMARY + " mx-auto"}>
                  <Plus className="w-4 h-4" /> Submit Your First Event
                </button>
              ) : (
                <p className="text-[14px] font-['Nunito'] text-[#0F172A]/40">Register your organisation above first.</p>
              )}
            </div>
          ) : (
            <div className="divide-y-[2px] divide-[#0F172A]/07">
              {myEvents.map((ev: any) => {
                const st = STATUS[ev.status as keyof typeof STATUS] ?? STATUS.pending;
                const StIcon = st.icon;
                return (
                  <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[#F3FAFF] transition-colors group">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                        <h4 className={`${DISPLAY} font-bold text-[16px] text-[#0F172A]`}>{ev.title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[12px] font-['Nunito'] text-[#0F172A]/50 pl-4">
                        <span className="capitalize font-semibold">{ev.type}</span>
                        {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                        {ev.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(ev.start_date), "d MMM yyyy")}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(ev as any).registration_count ?? 0} registered</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] text-[12px] font-extrabold font-['Nunito'] ${st.bg} ${st.color}`}>
                      <StIcon className="w-3.5 h-3.5" />
                      {st.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Banner cropper */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          aspect={16 / 9}
          title="Crop Event Banner"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
