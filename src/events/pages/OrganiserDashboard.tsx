import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Calendar, MapPin, Users, CheckCircle2,
  Clock, XCircle, Building2, BadgeCheck, Send, LogIn, Rocket, ExternalLink,
  ImagePlus, Loader2, X, FileUp, Globe, Link2, ArrowLeft, Trash2,
  Settings2, ListChecks, FormInput, Edit3, ChevronDown, ChevronUp,
  UserCheck, UserX, UserMinus, AlertTriangle
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
const BTN_DANGER = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-red-600 bg-red-500 text-white font-bold shadow-[3px_3px_0_0_#991B1B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#991B1B] active:translate-y-0 transition-all font-['Nunito'] text-[14px] disabled:opacity-60 disabled:cursor-not-allowed";

const EVENT_STATUS = {
  pending:   { label: "Under Review", icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50   border-amber-200",   dot: "bg-amber-400" },
  published: { label: "Live 🎉",       icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
  rejected:  { label: "Rejected",      icon: XCircle,      color: "text-red-600",     bg: "bg-red-50     border-red-200",     dot: "bg-red-400" },
};

const REG_STATUS = {
  approved: { label: "Approved", Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  pending:  { label: "Pending",  Icon: Clock,        color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  rejected: { label: "Rejected", Icon: XCircle,      color: "text-red-700",     bg: "bg-red-50 border-red-200" },
} as const;

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

const FIELD_TYPES = [
  { value: "text",     label: "Short Text" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
  { value: "number",   label: "Number" },
  { value: "textarea", label: "Long Text" },
  { value: "select",   label: "Dropdown" },
  { value: "file",     label: "File Upload" },
];

const EMPTY_EVENT = {
  title: "", description: "", type: "hackathon", location: "",
  start_date: "", end_date: "", registration_url: "", image_url: "",
  ace_coins_reward: 0, website_url: "", socmed_url: "", pdf_url: "",
  requires_approval: false,
};
const EMPTY_ORG   = { name: "", type: "company" };
const EMPTY_FIELD = { label: "", field_type: "text", is_required: true, options: "" };

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

  // Submit event state
  const [step, setStep] = useState(1);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [orgForm, setOrgForm] = useState(EMPTY_ORG);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  // Management panel state
  const [managingEventId, setManagingEventId] = useState<string | null>(null);
  const [manageTab, setManageTab] = useState<"participants" | "form" | "edit">("participants");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Participant management
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form builder
  const [newField, setNewField] = useState(EMPTY_FIELD);

  // Edit event
  const [editForm, setEditForm] = useState(EMPTY_EVENT);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [editBannerUploading, setEditBannerUploading] = useState(false);
  const [editPdfName, setEditPdfName] = useState<string | null>(null);
  const [editPdfUploading, setEditPdfUploading] = useState(false);
  const [editCropSrc, setEditCropSrc] = useState<string | null>(null);

  useEffect(() => { document.title = "Organiser Dashboard – AceTerus Events"; }, []);

  // ── Queries ─────────────────────────────────────────────────────────

  const { data: myOrg, isLoading: orgLoading } = useQuery({
    queryKey: ["my-organizer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_organizers").select("*").eq("owner_user_id", user!.id).maybeSingle();
      return data as { id: string; name: string; type: string; logo_url: string | null; verified: boolean } | null;
    },
  });

  const { data: myEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["my-events-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, type, location, start_date, status, created_at, requires_approval").eq("submitter_user_id", user!.id).order("created_at", { ascending: false });
      if (!data) return [];
      const counts = await Promise.all(data.map(async (e) => {
        const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", e.id);
        return { ...e, registration_count: count ?? 0 };
      }));
      return counts;
    },
  });

  const { data: managingEvent } = useQuery({
    queryKey: ["managing-event", managingEventId],
    enabled: !!managingEventId,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", managingEventId!).single();
      return data as any;
    },
  });

  const { data: formFields = [] } = useQuery({
    queryKey: ["event-form-fields", managingEventId],
    enabled: !!managingEventId,
    queryFn: async () => {
      const { data } = await supabase.from("event_form_fields").select("*").eq("event_id", managingEventId!).order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ["event-participants", managingEventId],
    enabled: !!managingEventId && manageTab === "participants",
    queryFn: async () => {
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id, user_id, status, rejection_reason, submitted_at, event_registration_responses(value, file_url, field_id)")
        .eq("event_id", managingEventId!)
        .order("submitted_at", { ascending: false });
      if (!regs?.length) return [];
      const ids = [...new Set(regs.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", ids);
      const pm = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      return regs.map(r => ({ ...r, profile: pm[r.user_id] })) as any[];
    },
  });

  // Populate editForm when managingEvent loads
  useEffect(() => {
    if (managingEvent) {
      setEditForm({
        title: managingEvent.title ?? "",
        description: managingEvent.description ?? "",
        type: managingEvent.type ?? "hackathon",
        location: managingEvent.location ?? "",
        start_date: managingEvent.start_date ? managingEvent.start_date.slice(0, 16) : "",
        end_date: managingEvent.end_date ? managingEvent.end_date.slice(0, 16) : "",
        registration_url: managingEvent.registration_url ?? "",
        image_url: managingEvent.image_url ?? "",
        ace_coins_reward: managingEvent.ace_coins_reward ?? 0,
        website_url: managingEvent.website_url ?? "",
        socmed_url: managingEvent.socmed_url ?? "",
        pdf_url: managingEvent.pdf_url ?? "",
        requires_approval: managingEvent.requires_approval ?? false,
      });
      setEditBannerPreview(managingEvent.image_url ?? null);
      setEditPdfName(managingEvent.pdf_url ? managingEvent.pdf_url.split("/").pop() ?? null : null);
    }
  }, [managingEvent]);

  // ── File handlers ────────────────────────────────────────────────────

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
      setEventForm(f => ({ ...f, image_url: data.publicUrl }));
      setBannerPreview(data.publicUrl);
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBannerUploading(false);
      setCropSrc(null);
    }
  };

  const handlePdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") { toast.error("Please select a PDF file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF must be under 10 MB."); return; }
    setPdfUploading(true);
    try {
      const path = `${user.id}/event-pdfs/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
      setEventForm(f => ({ ...f, pdf_url: data.publicUrl }));
      setPdfName(file.name);
      toast.success("PDF uploaded!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setPdfUploading(false);
      e.target.value = "";
    }
  };

  const handleEditBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setEditCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleEditCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setEditBannerUploading(true);
    try {
      const path = `${user.id}/event-banners/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("profile-images").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
      setEditForm(f => ({ ...f, image_url: data.publicUrl }));
      setEditBannerPreview(data.publicUrl);
      toast.success("Banner updated!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setEditBannerUploading(false);
      setEditCropSrc(null);
    }
  };

  const handleEditPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") { toast.error("Please select a PDF file."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF must be under 10 MB."); return; }
    setEditPdfUploading(true);
    try {
      const path = `${user.id}/event-pdfs/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("profile-images").upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
      setEditForm(f => ({ ...f, pdf_url: data.publicUrl }));
      setEditPdfName(file.name);
      toast.success("PDF updated!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setEditPdfUploading(false);
      e.target.value = "";
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────

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
        website_url: eventForm.website_url || null, socmed_url: eventForm.socmed_url || null,
        pdf_url: eventForm.pdf_url || null, requires_approval: eventForm.requires_approval,
        organizer_id: myOrg?.id ?? null, submitter_user_id: user!.id, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("🚀 Event submitted for review! Usually within 24 hours.");
      setShowEventForm(false);
      setEventForm(EMPTY_EVENT);
      setBannerPreview(null);
      setPdfName(null);
      qc.invalidateQueries({ queryKey: ["my-events-dash", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!editForm.title.trim()) throw new Error("Event title is required");
      const { error } = await supabase.from("events").update({
        title: editForm.title.trim(),
        description: editForm.description || null,
        type: editForm.type,
        location: editForm.location || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        registration_url: editForm.registration_url || null,
        image_url: editForm.image_url || null,
        website_url: editForm.website_url || null,
        socmed_url: editForm.socmed_url || null,
        pdf_url: editForm.pdf_url || null,
        ace_coins_reward: editForm.ace_coins_reward,
        requires_approval: editForm.requires_approval,
      }).eq("id", managingEventId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Event updated!");
      qc.invalidateQueries({ queryKey: ["managing-event", managingEventId] });
      qc.invalidateQueries({ queryKey: ["my-events-dash", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const ev = myEvents.find(e => e.id === eventId) as any;
      // Notify all registered participants
      await supabase.rpc("notify_event_cancelled", {
        p_event_id: eventId,
        p_organizer_id: user!.id,
        p_event_title: ev?.title ?? "",
      });
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted and participants notified.");
      setConfirmDeleteId(null);
      setManagingEventId(null);
      qc.invalidateQueries({ queryKey: ["my-events-dash", user?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addFieldMutation = useMutation({
    mutationFn: async () => {
      if (!newField.label.trim()) throw new Error("Field label is required");
      const maxOrder = formFields.length ? Math.max(...formFields.map((f: any) => f.sort_order)) : -1;
      const { error } = await supabase.from("event_form_fields").insert({
        event_id: managingEventId!,
        label: newField.label.trim(),
        field_type: newField.field_type,
        is_required: newField.is_required,
        sort_order: maxOrder + 1,
        options: newField.field_type === "select"
          ? newField.options.split(",").map(s => s.trim()).filter(Boolean)
          : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Field added!");
      setNewField(EMPTY_FIELD);
      qc.invalidateQueries({ queryKey: ["event-form-fields", managingEventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from("event_form_fields").delete().eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-form-fields", managingEventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveRegistrationMutation = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase.from("event_registrations").update({ status: "approved" }).eq("id", regId);
      if (error) throw error;
      try {
        const reg = participants.find(p => p.id === regId);
        if (reg) {
          await supabase.from("notifications").insert({
            user_id: reg.user_id, actor_id: user!.id,
            type: "event_registration_approved",
            metadata: { event_id: managingEventId, event_title: managingEvent?.title ?? "" },
          });
        }
      } catch {}
    },
    onSuccess: () => {
      toast.success("Registration approved!");
      qc.invalidateQueries({ queryKey: ["event-participants", managingEventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectRegistrationMutation = useMutation({
    mutationFn: async ({ regId, reason }: { regId: string; reason: string }) => {
      const { error } = await supabase.from("event_registrations").update({ status: "rejected", rejection_reason: reason || null }).eq("id", regId);
      if (error) throw error;
      try {
        const reg = participants.find(p => p.id === regId);
        if (reg) {
          await supabase.from("notifications").insert({
            user_id: reg.user_id, actor_id: user!.id,
            type: "event_registration_rejected",
            metadata: { event_id: managingEventId, event_title: managingEvent?.title ?? "" },
          });
        }
      } catch {}
    },
    onSuccess: () => {
      toast.success("Registration rejected.");
      setRejectingId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["event-participants", managingEventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRegistrationMutation = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase.from("event_registrations").delete().eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Participant removed.");
      qc.invalidateQueries({ queryKey: ["event-participants", managingEventId] });
      qc.invalidateQueries({ queryKey: ["my-events-dash", user?.id] });
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

  // ── Management panel ─────────────────────────────────────────────────

  const renderManagePanel = () => {
    const ev = myEvents.find(e => e.id === managingEventId) as any;
    const tabs = [
      { key: "participants" as const, label: "Participants", Icon: ListChecks },
      { key: "form"         as const, label: "Form Builder",  Icon: FormInput  },
      { key: "edit"         as const, label: "Edit Event",    Icon: Edit3      },
    ];

    return (
      <div className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A] bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] p-5 flex items-center gap-3">
          <button
            onClick={() => setManagingEventId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-bold font-['Nunito'] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-[11px] font-bold font-['Nunito'] uppercase tracking-wider">Managing</p>
            <p className={`${DISPLAY} font-bold text-[16px] text-white truncate`}>{ev?.title ?? "Event"}</p>
          </div>
          {/* Delete button */}
          {confirmDeleteId === managingEventId ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/70 text-[12px] font-['Nunito'] font-bold hidden sm:block">Confirm delete?</span>
              <button
                onClick={() => deleteEventMutation.mutate(managingEventId!)}
                disabled={deleteEventMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 border-[2px] border-red-300 text-white text-[12px] font-bold font-['Nunito'] hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />{deleteEventMutation.isPending ? "Deleting…" : "Yes, Delete"}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-[12px] font-bold font-['Nunito'] hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteId(managingEventId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-200 text-[13px] font-bold font-['Nunito'] transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete Event</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b-[2px] border-[#0F172A]/10 bg-[#F8FAFF]">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setManageTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold font-['Nunito'] transition-all ${
                manageTab === key
                  ? "border-b-[2.5px] border-[#2F7CFF] text-[#2F7CFF] bg-white"
                  : "text-[#0F172A]/45 hover:text-[#0F172A]/70 hover:bg-white/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {manageTab === "participants" && (
            <ParticipantsTab
              participants={participants}
              formFields={formFields}
              loading={participantsLoading}
              rejectingId={rejectingId}
              rejectReason={rejectReason}
              setRejectingId={setRejectingId}
              setRejectReason={setRejectReason}
              onApprove={id => approveRegistrationMutation.mutate(id)}
              onReject={(id, reason) => rejectRegistrationMutation.mutate({ regId: id, reason })}
              onRemove={id => removeRegistrationMutation.mutate(id)}
              approvingPending={approveRegistrationMutation.isPending}
              rejectingPending={rejectRegistrationMutation.isPending}
              removingPending={removeRegistrationMutation.isPending}
            />
          )}

          {manageTab === "form" && (
            <FormBuilderTab
              fields={formFields}
              newField={newField}
              setNewField={setNewField}
              onAddField={() => addFieldMutation.mutate()}
              onDeleteField={id => deleteFieldMutation.mutate(id)}
              addPending={addFieldMutation.isPending}
            />
          )}

          {manageTab === "edit" && (
            <EditEventTab
              editForm={editForm}
              setEditForm={setEditForm}
              editBannerPreview={editBannerPreview}
              setEditBannerPreview={setEditBannerPreview}
              editBannerUploading={editBannerUploading}
              editPdfName={editPdfName}
              setEditPdfName={setEditPdfName}
              editPdfUploading={editPdfUploading}
              onBannerChange={handleEditBannerFile}
              onPdfChange={handleEditPdfFile}
              onSave={() => updateEventMutation.mutate()}
              saving={updateEventMutation.isPending}
            />
          )}
        </div>
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2F7CFF] border-b-[2.5px] border-[#0F172A] py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[#3BD6F5] font-bold font-['Nunito'] text-[13px] uppercase tracking-wider mb-1">Organiser Dashboard</p>
              <h1 className={`${DISPLAY} font-extrabold text-[36px] text-white`}>Publish Your Event 🚀</h1>
              <p className="text-white/60 font-['Nunito'] text-[14px] mt-1">Reach thousands of Malaysian students.</p>
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
          <div className="flex items-center gap-3">
            <Step n={1} label="Register Organisation" active={step === 1} done={step > 1} />
            <div className="flex-1 h-0.5 bg-white/20 rounded-full" />
            <Step n={2} label="Submit Events" active={step === 2} done={false} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Org section */}
        {orgLoading ? (
          <Skeleton className="h-28 w-full rounded-[20px]" />
        ) : myOrg ? (
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
                  <input className={INPUT} placeholder="e.g. UKM Computer Science Society" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORG_TYPES.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setOrgForm({ ...orgForm, type: value })}
                        className={`px-3 py-2.5 rounded-[12px] border-[2px] text-[13px] font-bold font-['Nunito'] text-left transition-all ${orgForm.type === value ? "border-[#2F7CFF] bg-[#DDF3FF] text-[#2F7CFF] shadow-[2px_2px_0_0_#2F7CFF]" : "border-[#0F172A]/15 bg-white text-[#0F172A]/60 hover:border-[#0F172A]/35"}`}>
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

        {/* Event submission form */}
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
              <div>
                <label className={LABEL}>Event Type *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TYPE_OPTS.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setEventForm({ ...eventForm, type: value })}
                      className={`px-2 py-2.5 rounded-[12px] border-[2px] text-[12px] font-bold font-['Nunito'] text-center transition-all ${eventForm.type === value ? "border-[#2F7CFF] bg-[#DDF3FF] text-[#2F7CFF] shadow-[2px_2px_0_0_#2F7CFF] -translate-y-0.5" : "border-[#0F172A]/15 bg-white text-[#0F172A]/55 hover:border-[#0F172A]/35"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL}>Event Title *</label>
                  <input className={INPUT} placeholder="e.g. National Hackathon 2026" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Location</label>
                  <input className={INPUT} placeholder="KLCC / Online" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>ACE Coins Reward</label>
                  <input type="number" min={0} max={10000} className={INPUT} value={eventForm.ace_coins_reward} onChange={e => setEventForm({ ...eventForm, ace_coins_reward: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={LABEL}>Start Date & Time</label>
                  <input type="datetime-local" className={INPUT} value={eventForm.start_date} onChange={e => setEventForm({ ...eventForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>End Date & Time</label>
                  <input type="datetime-local" className={INPUT} value={eventForm.end_date} onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Description</label>
                  <textarea className={INPUT + " resize-none h-28"} placeholder="Describe your event, prizes, eligibility, etc." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}><Globe className="inline w-3.5 h-3.5 mr-1 opacity-60" />Website URL</label>
                  <input className={INPUT} placeholder="https://yourwebsite.com" value={eventForm.website_url} onChange={e => setEventForm({ ...eventForm, website_url: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}><Link2 className="inline w-3.5 h-3.5 mr-1 opacity-60" />Social Media Link</label>
                  <input className={INPUT} placeholder="https://instagram.com/…" value={eventForm.socmed_url} onChange={e => setEventForm({ ...eventForm, socmed_url: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}><FileUp className="inline w-3.5 h-3.5 mr-1 opacity-60" />Event Brochure (PDF)</label>
                  {pdfName ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-[#059669] bg-[#D1FAE5]">
                      <span className="text-xl">📄</span>
                      <p className="flex-1 font-bold font-['Nunito'] text-[13px] text-[#059669] truncate">{pdfName}</p>
                      <button type="button" onClick={() => { setPdfName(null); setEventForm(f => ({ ...f, pdf_url: "" })); }} className="text-[#059669]/60 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer ${pdfUploading ? "opacity-60 pointer-events-none" : ""}`}>
                      {pdfUploading ? <Loader2 className="w-5 h-5 text-[#2F7CFF] animate-spin shrink-0" /> : <FileUp className="w-5 h-5 text-[#0F172A]/30 shrink-0" />}
                      <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">{pdfUploading ? "Uploading…" : "Click to upload PDF (max 10 MB)"}</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfFile} disabled={pdfUploading} />
                    </label>
                  )}
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
                        <button type="button" onClick={() => { setBannerPreview(null); setEventForm(f => ({ ...f, image_url: "" })); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 border-[2px] border-white text-white text-[12px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all">
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer ${bannerUploading ? "opacity-60 pointer-events-none" : ""}`}>
                      {bannerUploading ? <Loader2 className="w-6 h-6 text-[#2F7CFF] animate-spin" /> : <ImagePlus className="w-7 h-7 text-[#0F172A]/30" />}
                      <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">{bannerUploading ? "Uploading…" : "Click to upload PNG / JPG"}</span>
                      <span className="text-[11px] font-['Nunito'] text-[#0F172A]/30">Recommended: 1200 × 630 px (16:9)</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleBannerFile} disabled={bannerUploading} />
                    </label>
                  )}
                </div>
              </div>

              {/* Approval toggle */}
              <label className="flex items-center gap-3 p-4 rounded-[14px] border-[2.5px] border-[#0F172A]/15 bg-[#F3FAFF] cursor-pointer hover:border-[#2F7CFF]/40 transition-all">
                <input type="checkbox" checked={eventForm.requires_approval} onChange={e => setEventForm({ ...eventForm, requires_approval: e.target.checked })} className="w-4 h-4 accent-[#2F7CFF]" />
                <div>
                  <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A]">Require organiser approval</p>
                  <p className="text-[12px] font-['Nunito'] text-[#0F172A]/50">Registrations start as "pending" — you manually approve each one.</p>
                </div>
              </label>

              <div className="flex gap-3 pt-1">
                <button onClick={() => submitEventMutation.mutate()} disabled={submitEventMutation.isPending} className={BTN_PRIMARY}>
                  {submitEventMutation.isPending ? "Submitting…" : <><Rocket className="w-4 h-4" /> Submit for Review</>}
                </button>
                <button onClick={() => { setShowEventForm(false); setBannerPreview(null); setPdfName(null); setEventForm(EMPTY_EVENT); }} className={BTN_GHOST}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin shortcut */}
        {isAdmin && (
          <a href="https://admin.aceterus.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 border-[2.5px] border-[#2E2BE5] rounded-[20px] shadow-[4px_4px_0_0_#2E2BE5] bg-gradient-to-r from-[#2E2BE5]/5 to-[#7C3AED]/5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#2E2BE5] transition-all group">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#2E2BE5] to-[#7C3AED] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`${DISPLAY} font-bold text-[16px] text-[#0F172A]`}>Admin Tools</p>
              <p className="text-[13px] font-['Nunito'] text-[#0F172A]/50">Verify organisers &amp; review event submissions</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#2E2BE5] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}

        {/* My events list or management panel */}
        {managingEventId ? renderManagePanel() : (
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
                  const st = EVENT_STATUS[ev.status as keyof typeof EVENT_STATUS] ?? EVENT_STATUS.pending;
                  const StIcon = st.icon;
                  return (
                    <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[#F3FAFF] transition-colors">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                          <h4 className={`${DISPLAY} font-bold text-[16px] text-[#0F172A]`}>{ev.title}</h4>
                          {ev.requires_approval && (
                            <span className="px-2 py-0.5 rounded-[8px] bg-[#D6D4FF] border-[1.5px] border-[#2E2BE5]/20 text-[10px] font-extrabold text-[#2E2BE5] font-['Nunito']">
                              Approval Required
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[12px] font-['Nunito'] text-[#0F172A]/50 pl-4">
                          <span className="capitalize font-semibold">{ev.type}</span>
                          {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                          {ev.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(ev.start_date), "d MMM yyyy")}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.registration_count ?? 0} registered</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] text-[12px] font-extrabold font-['Nunito'] ${st.bg} ${st.color}`}>
                          <StIcon className="w-3.5 h-3.5" />{st.label}
                        </div>
                        <button
                          onClick={() => { setManagingEventId(ev.id); setManageTab("participants"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2.5px] border-[#0F172A] bg-white text-[#0F172A] text-[12px] font-bold font-['Nunito'] shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crop modals */}
      {cropSrc && <ImageCropper imageSrc={cropSrc} aspect={16 / 9} title="Crop Event Banner" onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}
      {editCropSrc && <ImageCropper imageSrc={editCropSrc} aspect={16 / 9} title="Crop Event Banner" onConfirm={handleEditCropConfirm} onCancel={() => setEditCropSrc(null)} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ParticipantsTab({
  participants, formFields, loading, rejectingId, rejectReason,
  setRejectingId, setRejectReason,
  onApprove, onReject, onRemove,
  approvingPending, rejectingPending, removingPending,
}: {
  participants: any[];
  formFields: any[];
  loading: boolean;
  rejectingId: string | null;
  rejectReason: string;
  setRejectingId: (id: string | null) => void;
  setRejectReason: (r: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRemove: (id: string) => void;
  approvingPending: boolean;
  rejectingPending: boolean;
  removingPending: boolean;
}) {
  const fieldMap = Object.fromEntries(formFields.map(f => [f.id, f.label]));
  const pending  = participants.filter(p => p.status === "pending");
  const approved = participants.filter(p => p.status === "approved");
  const rejected = participants.filter(p => p.status === "rejected");

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-[14px]" />)}
    </div>
  );

  if (!participants.length) return (
    <div className="py-12 text-center">
      <div className="text-4xl mb-3">👥</div>
      <p className="font-['Nunito'] font-bold text-[#0F172A]/40">No registrations yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending",  count: pending.length,  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
          { label: "Approved", count: approved.length, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Rejected", count: rejected.length, color: "text-red-700",     bg: "bg-red-50 border-red-200" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`p-3 rounded-[14px] border-[2px] text-center ${bg}`}>
            <p className={`font-['Baloo_2'] font-extrabold text-[22px] ${color}`}>{count}</p>
            <p className={`font-['Nunito'] text-[11px] font-bold ${color} opacity-70`}>{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {participants.map((reg: any) => {
          const S = REG_STATUS[reg.status as keyof typeof REG_STATUS] ?? REG_STATUS.pending;
          const SIcon = S.Icon;
          const initials = reg.profile?.username?.[0]?.toUpperCase() ?? "?";

          return (
            <div key={reg.id} className="border-[2px] border-[#0F172A]/10 rounded-[16px] overflow-hidden">
              <div className="flex items-center gap-3 p-3.5">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#2F7CFF] to-[#2E2BE5] border-[2px] border-[#0F172A]/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {reg.profile?.avatar_url
                    ? <img src={reg.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-white font-bold text-[13px]">{initials}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A] truncate">
                    {reg.profile?.username ?? reg.user_id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] font-['Nunito'] text-[#0F172A]/40">
                    {new Date(reg.submitted_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-[10px] border-[2px] text-[11px] font-extrabold font-['Nunito'] ${S.bg} ${S.color}`}>
                  <SIcon className="w-3 h-3" />{S.label}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {reg.status !== "approved" && (
                    <button onClick={() => onApprove(reg.id)} disabled={approvingPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-emerald-500 bg-emerald-50 text-emerald-700 text-[12px] font-bold font-['Nunito'] hover:-translate-y-0.5 hover:bg-emerald-100 transition-all disabled:opacity-60">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                  )}
                  {reg.status !== "rejected" && (
                    <button onClick={() => { setRejectingId(reg.id); setRejectReason(""); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-amber-400 bg-amber-50 text-amber-700 text-[12px] font-bold font-['Nunito'] hover:-translate-y-0.5 hover:bg-amber-100 transition-all">
                      <UserX className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reject</span>
                    </button>
                  )}
                  <button onClick={() => onRemove(reg.id)} disabled={removingPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-red-300 bg-red-50 text-red-600 text-[12px] font-bold font-['Nunito'] hover:-translate-y-0.5 hover:bg-red-100 transition-all disabled:opacity-60">
                    <UserMinus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>

              {/* Form responses */}
              {reg.event_registration_responses?.length > 0 && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-[#0F172A]/07 bg-[#F8FAFF]">
                  <div className="pt-2.5 grid grid-cols-2 gap-2">
                    {reg.event_registration_responses.map((r: any) => (
                      <div key={r.field_id} className="text-[12px] font-['Nunito']">
                        <span className="text-[#0F172A]/40 font-bold block text-[10px] uppercase tracking-wide">
                          {fieldMap[r.field_id] ?? r.field_id.slice(0, 8)}
                        </span>
                        <span className="text-[#0F172A]/80">
                          {r.file_url
                            ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-[#2F7CFF] hover:underline">📎 View file</a>
                            : (r.value ?? "—")
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection reason input */}
              {rejectingId === reg.id && (
                <div className="px-3.5 pb-3.5 border-t border-amber-100 bg-amber-50/50 space-y-2 pt-3">
                  <input
                    className="w-full px-3 py-2 border-[2px] border-amber-300 rounded-[10px] text-[13px] font-['Nunito'] outline-none focus:border-amber-500 bg-white placeholder:text-amber-300"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => onReject(reg.id, rejectReason)} disabled={rejectingPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-amber-500 bg-amber-500 text-white text-[12px] font-bold font-['Nunito'] hover:-translate-y-0.5 transition-all disabled:opacity-60">
                      <UserX className="w-3.5 h-3.5" />{rejectingPending ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button onClick={() => setRejectingId(null)}
                      className="px-3 py-1.5 rounded-[10px] border-[2px] border-[#0F172A]/15 bg-white text-[#0F172A]/60 text-[12px] font-bold font-['Nunito'] hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormBuilderTab({
  fields, newField, setNewField, onAddField, onDeleteField, addPending,
}: {
  fields: any[];
  newField: { label: string; field_type: string; is_required: boolean; options: string };
  setNewField: (f: any) => void;
  onAddField: () => void;
  onDeleteField: (id: string) => void;
  addPending: boolean;
}) {
  const LABEL_S = "block text-[13px] font-bold font-['Nunito'] text-[#0F172A]/65 mb-1";
  const INPUT_S = "w-full px-3 py-2.5 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2F7CFF] transition-all bg-white";

  return (
    <div className="space-y-4">
      <p className="font-['Nunito'] text-[13px] text-[#0F172A]/55">
        Define the questions students must answer when registering. Fields appear in the order shown.
      </p>

      {/* Existing fields */}
      {fields.length === 0 ? (
        <div className="py-8 text-center border-[2px] border-dashed border-[#0F172A]/15 rounded-[16px] bg-[#F8FAFF]">
          <div className="text-3xl mb-2">📝</div>
          <p className="font-['Nunito'] text-[13px] text-[#0F172A]/40 font-bold">No fields yet — add one below.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field: any, idx: number) => (
            <div key={field.id} className="flex items-center gap-3 p-3.5 border-[2px] border-[#0F172A]/10 rounded-[14px] bg-white hover:border-[#0F172A]/20 transition-colors group">
              <div className="w-6 h-6 rounded-[8px] bg-[#DDF3FF] border-[1.5px] border-[#2F7CFF]/25 flex items-center justify-center shrink-0 text-[11px] font-extrabold text-[#2F7CFF] font-['Nunito']">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A]">{field.label}</p>
                <p className="text-[11px] font-['Nunito'] text-[#0F172A]/40">
                  {FIELD_TYPES.find(t => t.value === field.field_type)?.label ?? field.field_type}
                  {field.is_required ? " · Required" : " · Optional"}
                  {field.options?.length ? ` · Options: ${field.options.join(", ")}` : ""}
                </p>
              </div>
              <button onClick={() => onDeleteField(field.id)}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] border-[2px] border-red-200 bg-red-50 text-red-500 text-[12px] font-bold font-['Nunito'] hover:bg-red-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add field form */}
      <div className="border-[2.5px] border-dashed border-[#2F7CFF]/40 rounded-[16px] p-4 bg-[#F3FAFF] space-y-3">
        <p className="text-[12px] font-bold font-['Nunito'] text-[#2F7CFF] uppercase tracking-wider">+ Add Field</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_S}>Label *</label>
            <input className={INPUT_S} placeholder="e.g. Matric Number" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
          </div>
          <div>
            <label className={LABEL_S}>Type</label>
            <select className={INPUT_S} value={newField.field_type} onChange={e => setNewField({ ...newField, field_type: e.target.value })}>
              {FIELD_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {newField.field_type === "select" && (
            <div className="sm:col-span-2">
              <label className={LABEL_S}>Options (comma-separated)</label>
              <input className={INPUT_S} placeholder="Option A, Option B, Option C" value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })} />
            </div>
          )}
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="field-required" checked={newField.is_required} onChange={e => setNewField({ ...newField, is_required: e.target.checked })} className="w-4 h-4 accent-[#2F7CFF]" />
            <label htmlFor="field-required" className="font-['Nunito'] text-[13px] font-bold text-[#0F172A]/70 cursor-pointer">Required field</label>
          </div>
        </div>
        <button onClick={onAddField} disabled={addPending || !newField.label.trim()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2.5px] border-[#2F7CFF] bg-[#2F7CFF] text-white font-bold font-['Nunito'] text-[13px] shadow-[2px_2px_0_0_#1D4ED8] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#1D4ED8] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
          <Plus className="w-4 h-4" />{addPending ? "Adding…" : "Add Field"}
        </button>
      </div>
    </div>
  );
}

function EditEventTab({
  editForm, setEditForm,
  editBannerPreview, setEditBannerPreview, editBannerUploading,
  editPdfName, setEditPdfName, editPdfUploading,
  onBannerChange, onPdfChange, onSave, saving,
}: {
  editForm: typeof EMPTY_EVENT;
  setEditForm: (f: typeof EMPTY_EVENT) => void;
  editBannerPreview: string | null;
  setEditBannerPreview: (v: string | null) => void;
  editBannerUploading: boolean;
  editPdfName: string | null;
  setEditPdfName: (v: string | null) => void;
  editPdfUploading: boolean;
  onBannerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPdfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const L = "block text-[13px] font-bold font-['Nunito'] text-[#0F172A]/65 mb-1.5";
  const I = "w-full px-4 py-3 border-[2.5px] border-[#0F172A]/20 rounded-[14px] font-['Nunito'] text-[14px] outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.12)] transition-all placeholder:text-[#0F172A]/25 bg-white";

  return (
    <div className="space-y-5">
      <div>
        <label className={L}>Event Type *</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {TYPE_OPTS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setEditForm({ ...editForm, type: value })}
              className={`px-2 py-2.5 rounded-[12px] border-[2px] text-[12px] font-bold font-['Nunito'] text-center transition-all ${editForm.type === value ? "border-[#2F7CFF] bg-[#DDF3FF] text-[#2F7CFF] shadow-[2px_2px_0_0_#2F7CFF] -translate-y-0.5" : "border-[#0F172A]/15 bg-white text-[#0F172A]/55 hover:border-[#0F172A]/35"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={L}>Event Title *</label>
          <input className={I} value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
        </div>
        <div>
          <label className={L}>Location</label>
          <input className={I} value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
        </div>
        <div>
          <label className={L}>ACE Coins Reward</label>
          <input type="number" min={0} max={10000} className={I} value={editForm.ace_coins_reward} onChange={e => setEditForm({ ...editForm, ace_coins_reward: Number(e.target.value) })} />
        </div>
        <div>
          <label className={L}>Start Date & Time</label>
          <input type="datetime-local" className={I} value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
        </div>
        <div>
          <label className={L}>End Date & Time</label>
          <input type="datetime-local" className={I} value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={L}>Description</label>
          <textarea className={I + " resize-none h-28"} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
        </div>
        <div>
          <label className={L}><Globe className="inline w-3.5 h-3.5 mr-1 opacity-60" />Website URL</label>
          <input className={I} placeholder="https://…" value={editForm.website_url} onChange={e => setEditForm({ ...editForm, website_url: e.target.value })} />
        </div>
        <div>
          <label className={L}><Link2 className="inline w-3.5 h-3.5 mr-1 opacity-60" />Social Media Link</label>
          <input className={I} placeholder="https://…" value={editForm.socmed_url} onChange={e => setEditForm({ ...editForm, socmed_url: e.target.value })} />
        </div>

        {/* Banner */}
        <div>
          <label className={L}>Event Banner</label>
          {editBannerPreview ? (
            <div className="relative rounded-[14px] overflow-hidden border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] group">
              <img src={editBannerPreview} alt="Banner" className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <label className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border-[2px] border-[#0F172A] text-[12px] font-bold font-['Nunito'] cursor-pointer shadow-[2px_2px_0_0_#0F172A]">
                  <ImagePlus className="w-3.5 h-3.5" /> Change
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBannerChange} />
                </label>
                <button type="button" onClick={() => { setEditBannerPreview(null); setEditForm({ ...editForm, image_url: "" }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 border-[2px] border-white text-white text-[12px] font-bold font-['Nunito']">
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-2 w-full h-32 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer ${editBannerUploading ? "opacity-60 pointer-events-none" : ""}`}>
              {editBannerUploading ? <Loader2 className="w-6 h-6 text-[#2F7CFF] animate-spin" /> : <ImagePlus className="w-6 h-6 text-[#0F172A]/30" />}
              <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">{editBannerUploading ? "Uploading…" : "Click to upload"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onBannerChange} disabled={editBannerUploading} />
            </label>
          )}
        </div>

        {/* PDF */}
        <div>
          <label className={L}><FileUp className="inline w-3.5 h-3.5 mr-1 opacity-60" />Event Brochure (PDF)</label>
          {editPdfName ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-[#059669] bg-[#D1FAE5]">
              <span className="text-xl">📄</span>
              <p className="flex-1 font-bold font-['Nunito'] text-[13px] text-[#059669] truncate">{editPdfName}</p>
              <button type="button" onClick={() => { setEditPdfName(null); setEditForm({ ...editForm, pdf_url: "" }); }} className="text-[#059669]/60 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className={`flex items-center gap-3 px-4 py-3 rounded-[14px] border-[2.5px] border-dashed border-[#0F172A]/25 bg-[#F3FAFF] hover:border-[#2F7CFF] hover:bg-[#DDF3FF]/50 transition-all cursor-pointer ${editPdfUploading ? "opacity-60 pointer-events-none" : ""}`}>
              {editPdfUploading ? <Loader2 className="w-5 h-5 text-[#2F7CFF] animate-spin shrink-0" /> : <FileUp className="w-5 h-5 text-[#0F172A]/30 shrink-0" />}
              <span className="text-[13px] font-bold font-['Nunito'] text-[#0F172A]/40">{editPdfUploading ? "Uploading…" : "Click to upload PDF (max 10 MB)"}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={onPdfChange} disabled={editPdfUploading} />
            </label>
          )}
        </div>
      </div>

      {/* Approval toggle */}
      <label className="flex items-center gap-3 p-4 rounded-[14px] border-[2.5px] border-[#0F172A]/15 bg-[#F3FAFF] cursor-pointer hover:border-[#2F7CFF]/40 transition-all">
        <input type="checkbox" checked={editForm.requires_approval} onChange={e => setEditForm({ ...editForm, requires_approval: e.target.checked })} className="w-4 h-4 accent-[#2F7CFF]" />
        <div>
          <p className="font-bold font-['Nunito'] text-[14px] text-[#0F172A]">Require organiser approval</p>
          <p className="text-[12px] font-['Nunito'] text-[#0F172A]/50">New registrations will be "pending" until you approve them.</p>
        </div>
      </label>

      <div className="flex gap-3">
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2F7CFF] text-white font-bold shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all font-['Nunito'] text-[14px] disabled:opacity-60 disabled:cursor-not-allowed">
          <CheckCircle2 className="w-4 h-4" />{saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
