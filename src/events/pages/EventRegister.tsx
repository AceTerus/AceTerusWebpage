import { useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Loader2, CheckCircle2, Clock, XCircle,
  Upload, X, FileText, LogIn, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const LABEL = "block text-[13px] font-bold font-['Nunito'] text-[#0F172A]/65 mb-1.5";
const INPUT = "w-full px-4 py-3 border-[2.5px] border-[#0F172A]/20 rounded-[14px] font-['Nunito'] text-[14px] outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.12)] transition-all placeholder:text-[#0F172A]/25 bg-white";
const BTN_PRIMARY = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[15px] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
const BTN_GHOST = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] active:translate-y-0 transition-all font-['Nunito'] text-[14px] text-[#0F172A]";

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  competition: { emoji: "🏆", color: "#2E2BE5", bg: "#D6D4FF" },
  hackathon:   { emoji: "💻", color: "#2F7CFF", bg: "#DDF3FF" },
  workshop:    { emoji: "🛠️", color: "#0891B2", bg: "#E0FAFF" },
  talk:        { emoji: "🎤", color: "#059669", bg: "#D1FAE5" },
  internship:  { emoji: "💼", color: "#D97706", bg: "#FEF3C7" },
  deal:        { emoji: "🎁", color: "#DB2777", bg: "#FCE7F3" },
};

const STATUS_UI = {
  pending:  { label: "Under Review",  icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50   border-amber-300",   dot: "bg-amber-400" },
  approved: { label: "Approved ✓",    icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-300", dot: "bg-emerald-400" },
  rejected: { label: "Not Accepted",  icon: XCircle,      color: "text-red-600",     bg: "bg-red-50     border-red-300",     dot: "bg-red-400" },
};

interface FormField {
  id: string; label: string; field_type: string;
  options: string[] | null; is_required: boolean; sort_order: number;
}

export default function EventRegister() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const refId = searchParams.get("ref");
  const { user, setAceCoins } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<string, string>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, { file: File; uploading: boolean; url?: string }>>({});
  const [done, setDone] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-register", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*, event_organizers(name, logo_url, verified)")
        .eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: fields = [], isLoading: fieldsLoading } = useQuery<FormField[]>({
    queryKey: ["event-form-fields", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("event_form_fields")
        .select("*").eq("event_id", id!).order("sort_order");
      return (data ?? []) as FormField[];
    },
  });

  const { data: existingReg, isLoading: regLoading } = useQuery({
    queryKey: ["my-event-reg", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_registrations")
        .select("id, status, submitted_at, rejection_reason")
        .eq("event_id", id!).eq("user_id", user!.id).maybeSingle();
      return data as { id: string; status: string; submitted_at: string; rejection_reason: string | null } | null;
    },
  });

  const uploadFile = async (fieldId: string, file: File): Promise<string> => {
    // Verify auth session is still valid before uploading
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expired — please sign in again");

    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const path = `${session.user.id}/event-registrations/${id}/${fieldId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("profile-images")
      .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (error) throw error;
    return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Not authenticated");

      // Validate required fields
      for (const f of fields) {
        if (!f.is_required) continue;
        if (f.field_type === "file") {
          if (!fileUploads[f.id]?.url && !fileUploads[f.id]?.file) throw new Error(`"${f.label}" is required`);
        } else {
          if (!values[f.id]?.trim()) throw new Error(`"${f.label}" is required`);
        }
      }

      // Upload any pending files
      const resolvedUrls: Record<string, string> = {};
      for (const [fieldId, upload] of Object.entries(fileUploads)) {
        if (upload.file && !upload.url) {
          setFileUploads(p => ({ ...p, [fieldId]: { ...p[fieldId], uploading: true } }));
          try {
            resolvedUrls[fieldId] = await uploadFile(fieldId, upload.file);
            setFileUploads(p => ({ ...p, [fieldId]: { ...p[fieldId], uploading: false, url: resolvedUrls[fieldId] } }));
          } catch (uploadErr: any) {
            setFileUploads(p => ({ ...p, [fieldId]: { ...p[fieldId], uploading: false } }));
            const label = fields.find(f => f.id === fieldId)?.label ?? "file";
            throw new Error(`Upload failed for "${label}": ${uploadErr?.message ?? String(uploadErr)}`);
          }
        } else if (upload.url) {
          resolvedUrls[fieldId] = upload.url;
        }
      }

      const isApproved = !event.requires_approval;

      // Insert registration
      const { data: reg, error: regError } = await supabase
        .from("event_registrations")
        .insert({
          event_id: id!,
          user_id: user.id,
          referrer_id: refId ?? null,
          status: isApproved ? "approved" : "pending",
        })
        .select("id").single();
      if (regError) {
        if (regError.code === "23505") throw new Error("You have already registered for this event.");
        throw regError;
      }

      // Insert responses
      const responses = fields
        .map(f => ({
          registration_id: reg.id,
          field_id: f.id,
          value: f.field_type !== "file" ? (values[f.id] ?? null) : null,
          file_url: resolvedUrls[f.id] ?? null,
        }))
        .filter(r => r.value !== null || r.file_url !== null);

      if (responses.length > 0) {
        const { error: respError } = await supabase.from("event_registration_responses").insert(responses);
        if (respError) throw respError;
      }

      // If auto-approved, credit coins in UI immediately
      if (isApproved && event.ace_coins_reward > 0) {
        setAceCoins((c: number) => c + event.ace_coins_reward);
      }

      return isApproved;
    },
    onSuccess: (isApproved) => {
      setDone(true);
      if (isApproved) toast.success(`🎉 Registered! +${event?.ace_coins_reward ?? 0} ACE Coins earned.`);
      else toast.success("✅ Application submitted! Awaiting organiser review.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isLoading = eventLoading || fieldsLoading || regLoading;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2F7CFF]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🔍</div>
        <p className={`${DISPLAY} font-bold text-[22px] text-[#0F172A]/40`}>Event not found.</p>
        <Link to="/" className={BTN_GHOST + " mx-auto w-fit"}><ArrowLeft className="w-4 h-4" /> Back</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <Link to={`/event/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event
        </Link>
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] bg-white p-10 text-center space-y-4">
          <div className="text-5xl">🔐</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Sign in to Register</h2>
          <p className="font-['Nunito'] text-[#0F172A]/55 text-[14px]">You need an AceTerus account to register for events.</p>
          <a href="https://aceterus.com/auth" className={BTN_PRIMARY + " w-full"}>
            <LogIn className="w-4 h-4" /> Sign In with AceTerus
          </a>
        </div>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.talk;
  const expired = event.end_date ? isPast(new Date(event.end_date)) : false;

  // Already registered
  if (existingReg && !done) {
    const st = STATUS_UI[existingReg.status as keyof typeof STATUS_UI] ?? STATUS_UI.pending;
    const StIcon = st.icon;
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <Link to={`/event/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Event
        </Link>
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] bg-white p-8 text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-[2px] text-[14px] font-extrabold font-['Nunito'] ${st.bg} ${st.color}`}>
            <StIcon className="w-4 h-4" /> {st.label}
          </div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>{event.title}</h2>
          <p className="font-['Nunito'] text-[#0F172A]/55 text-[14px]">
            Submitted {format(new Date(existingReg.submitted_at), "d MMM yyyy, h:mm a")}
          </p>
          {existingReg.status === "rejected" && existingReg.rejection_reason && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-[14px] bg-red-50 border-[2px] border-red-200 text-left">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[13px] font-['Nunito'] text-red-700">{existingReg.rejection_reason}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Link to={`/event/${id}`} className={BTN_GHOST + " flex-1"}><ArrowLeft className="w-4 h-4" /> Event Page</Link>
            <Link to="/my-events" className={BTN_PRIMARY + " flex-1"}>My Events →</Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[5px_5px_0_0_#0F172A] bg-white p-10 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className={`${DISPLAY} font-extrabold text-[28px] text-[#0F172A]`}>
            {event.requires_approval ? "Application Sent!" : "You're Registered!"}
          </h2>
          <p className="font-['Nunito'] text-[#0F172A]/55 text-[15px]">
            {event.requires_approval
              ? "The organiser will review your application and notify you soon."
              : `Welcome aboard! ${event.ace_coins_reward > 0 ? `+${event.ace_coins_reward} ACE Coins have been added to your account.` : ""}`}
          </p>
          <div className="flex gap-3 pt-2">
            <Link to={`/event/${id}`} className={BTN_GHOST + " flex-1"}><ArrowLeft className="w-4 h-4" /> Event Page</Link>
            <Link to="/my-events" className={BTN_PRIMARY + " flex-1"}>View My Events →</Link>
          </div>
        </div>
      </div>
    );
  }

  const isAnyUploading = Object.values(fileUploads).some(u => u.uploading);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link to={`/event/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/50 hover:text-[#0F172A] transition-colors group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Event
      </Link>

      {/* Event header card */}
      <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] overflow-hidden">
        <div className="p-5 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${cfg.bg}, white)` }}>
          <div className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center text-2xl shrink-0" style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider font-['Nunito']" style={{ color: cfg.color }}>
              {event.event_organizers?.name ?? "Event"} · Registration
            </p>
            <h1 className={`${DISPLAY} font-extrabold text-[20px] text-[#0F172A] leading-tight truncate`}>{event.title}</h1>
            {event.start_date && (
              <p className="text-[12px] font-['Nunito'] text-[#0F172A]/50">
                {format(new Date(event.start_date), "d MMM yyyy, h:mm a")}
              </p>
            )}
          </div>
        </div>
        {event.requires_approval && (
          <div className="px-5 py-2.5 bg-amber-50 border-t-[2px] border-amber-200 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[12px] font-bold font-['Nunito'] text-amber-700">This event requires organiser approval. ACE Coins are awarded upon approval.</p>
          </div>
        )}
        {expired && (
          <div className="px-5 py-2.5 bg-red-50 border-t-[2px] border-red-200 flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-[12px] font-bold font-['Nunito'] text-red-600">This event has ended. Registration is closed.</p>
          </div>
        )}
      </div>

      {/* Form */}
      {!expired && (
        <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
          <div className="p-5 border-b-[2px] border-[#0F172A]/10">
            <h2 className={`${DISPLAY} font-bold text-[18px] text-[#0F172A]`}>Registration Form</h2>
            <p className="text-[13px] font-['Nunito'] text-[#0F172A]/50 mt-0.5">Fields marked * are required.</p>
          </div>

          {fields.length === 0 ? (
            <div className="p-8 text-center text-[#0F172A]/40 font-['Nunito'] text-[14px]">
              No form fields configured yet. Check back soon.
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {[...fields].sort((a, b) => a.sort_order - b.sort_order).map(field => (
                <div key={field.id}>
                  <label className={LABEL}>
                    {field.label} {field.is_required && <span className="text-red-500">*</span>}
                  </label>

                  {field.field_type === "textarea" ? (
                    <textarea
                      className={INPUT + " resize-none h-24"}
                      placeholder={field.label}
                      value={values[field.id] ?? ""}
                      onChange={e => setValues(p => ({ ...p, [field.id]: e.target.value }))}
                    />
                  ) : field.field_type === "select" ? (
                    <select
                      className={INPUT}
                      value={values[field.id] ?? ""}
                      onChange={e => setValues(p => ({ ...p, [field.id]: e.target.value }))}
                    >
                      <option value="">Select an option…</option>
                      {(field.options ?? []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.field_type === "file" ? (
                    <div>
                      {fileUploads[field.id]?.file ? (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-[#059669] bg-[#D1FAE5]">
                          <FileText className="w-5 h-5 text-[#059669] shrink-0" />
                          <p className="flex-1 font-bold font-['Nunito'] text-[13px] text-[#059669] truncate">{fileUploads[field.id].file.name}</p>
                          <button type="button" onClick={() => setFileUploads(p => { const n = { ...p }; delete n[field.id]; return n; })} className="text-[#059669]/60 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer">
                          <Upload className="w-5 h-5 text-[#0F172A]/30 shrink-0" />
                          <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">Click to upload file (PDF / image)</span>
                          <input type="file" accept=".pdf,image/*" className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) setFileUploads(p => ({ ...p, [field.id]: { file: f, uploading: false } }));
                              e.target.value = "";
                            }} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <input
                      type={field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : field.field_type === "phone" ? "tel" : "text"}
                      className={INPUT}
                      placeholder={field.label}
                      value={values[field.id] ?? ""}
                      onChange={e => setValues(p => ({ ...p, [field.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || isAnyUploading}
                className={BTN_PRIMARY + " w-full mt-2"}
              >
                {submitMutation.isPending || isAnyUploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  : event.requires_approval ? "Submit Application" : "Complete Registration"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
