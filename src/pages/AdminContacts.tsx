import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  Loader2,
  Mail,
  Inbox,
  RefreshCw,
  ExternalLink,
  Copy,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Submission = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string | null;
  user_agent: string | null;
  created_at: string;
};

const AdminContacts = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = "Contact Submissions – AceTerus Admin";
    return () => {
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  const {
    data: submissions = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-contact-submissions"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_submissions")
        .select("id, name, email, message, source, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = query.trim()
    ? submissions.filter((s) => {
        const q = query.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.message.toLowerCase().includes(q) ||
          (s.source ?? "").toLowerCase().includes(q)
        );
      })
    : submissions;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Button>
        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
          <Inbox className="w-6 h-6 text-[#2F7CFF]" />
          Contact Submissions
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin-contact-submissions"] });
              refetch();
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, message, source…"
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="p-6 border-[2px] border-red-300 bg-red-50 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-bold text-red-700">Failed to load submissions</p>
            <p className="text-red-600 mt-1">{(error as Error).message}</p>
            <p className="text-red-600 mt-2 text-[13px]">
              If the error mentions <code className="font-mono bg-white/60 px-1 rounded">relation "contact_submissions"
              does not exist</code>, run <code className="font-mono bg-white/60 px-1 rounded">supabase db push</code>{" "}
              to apply the migration.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center border-[2.5px] border-dashed border-slate-300 rounded-2xl bg-white">
          <Inbox className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-500">
            {submissions.length === 0
              ? "No submissions yet."
              : "Nothing matches your search."}
          </p>
          <p className="text-[13px] text-slate-400 mt-1">
            {submissions.length === 0
              ? "New messages from /contacts and /contacts/ceo will show up here."
              : "Try a different keyword."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-muted-foreground">
            {filtered.length} of {submissions.length} submissions
          </p>
          {filtered.map((s) => (
            <SubmissionCard key={s.id} submission={s} onCopy={copy} />
          ))}
        </div>
      )}
    </div>
  );
};

const SubmissionCard = ({
  submission,
  onCopy,
}: {
  submission: Submission;
  onCopy: (text: string, label: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const preview =
    submission.message.length > 180
      ? submission.message.slice(0, 180) + "…"
      : submission.message;
  const sourceColor =
    submission.source === "qr-contacts-ceo"
      ? "bg-indigo-100 text-indigo-700 border-indigo-300"
      : submission.source === "web-contacts-general"
      ? "bg-cyan-100 text-cyan-800 border-cyan-300"
      : "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <div className="border-[2px] border-slate-200 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-[16px]">{submission.name}</p>
            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${sourceColor}`}>
              {submission.source ?? "unknown"}
            </Badge>
          </div>
          <a
            href={`mailto:${submission.email}?subject=Re:%20Your%20message%20to%20AceTerus`}
            className="inline-flex items-center gap-1 text-[13px] text-[#2F7CFF] font-semibold hover:underline mt-0.5"
          >
            {submission.email}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="text-right text-[12px] text-muted-foreground">
          <div>{format(new Date(submission.created_at), "d MMM yyyy")}</div>
          <div>{format(new Date(submission.created_at), "h:mm a")}</div>
        </div>
      </div>

      <p
        className={`mt-3 text-[14px] leading-relaxed whitespace-pre-wrap text-[#0F172A]/85 ${
          open ? "" : "line-clamp-none"
        }`}
      >
        {open ? submission.message : preview}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {submission.message.length > 180 && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} className="h-8 text-[12px]">
            {open ? "Show less" : "Show full message"}
          </Button>
        )}
        <a
          href={`mailto:${submission.email}?subject=Re:%20Your%20message%20to%20AceTerus&body=Hi%20${encodeURIComponent(
            submission.name
          )}%2C%0A%0A`}
          className="inline-flex"
        >
          <Button size="sm" className="gap-1.5 h-8 text-[12px] bg-[#2F7CFF] hover:bg-[#2A6FE6]">
            <Mail className="w-3.5 h-3.5" /> Reply
          </Button>
        </a>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(submission.email, "Email")}
          className="gap-1.5 h-8 text-[12px]"
        >
          <Copy className="w-3.5 h-3.5" /> Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(submission.message, "Message")}
          className="gap-1.5 h-8 text-[12px]"
        >
          <Copy className="w-3.5 h-3.5" /> Message
        </Button>
      </div>
    </div>
  );
};

export default AdminContacts;
