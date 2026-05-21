import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Logo from "./assets/logo.webp";
import { ClassPulseNavbar } from "./classpulse/components/ClassPulseNavbar";
import RoleSetup from "./classpulse/pages/RoleSetup";
import TeacherDashboard from "./classpulse/pages/TeacherDashboard";
import LiveSession from "./classpulse/pages/LiveSession";
import ConclusionReport from "./classpulse/pages/ConclusionReport";
import SchoolDashboard from "./classpulse/pages/SchoolDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
});

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const INPUT = "w-full px-4 py-3 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2E2BE5] transition-all";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F9FF]">
      <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src={Logo} alt="ClassPulse" className="w-12 h-12 rounded-xl mx-auto" />
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>
            Class<span className="text-[#2F7CFF]">Pulse</span>
          </h2>
          <p className="font-['Nunito'] text-[#0F172A]/50 text-[13px]">Sign in to continue</p>
        </div>

        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#0F172A]/10" />
          <span className="text-[12px] font-['Nunito'] text-[#0F172A]/40 font-semibold">or</span>
          <div className="flex-1 h-px bg-[#0F172A]/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} required />
          {error && <p className="text-[13px] font-['Nunito'] text-red-500 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

type CPRole = "teacher" | "school_authority";

function ClassPulseContent() {
  const { user, isLoading } = useAuth();
  const [role, setRole] = useState<CPRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoleLoading(false); return; }
    supabase
      .from("classpulse_users")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role) setRole(data.role as CPRole);
        setRoleLoading(false);
      });
  }, [user]);

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2E2BE5]" />
      </div>
    );
  }

  if (!user) return <SignIn />;

  if (!role) {
    return (
      <>
        <ClassPulseNavbar role={null} />
        <RoleSetup onComplete={() => window.location.reload()} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <ClassPulseNavbar role={role} />
      <Routes>
        {role === "teacher" ? (
          <>
            <Route path="/" element={<TeacherDashboard />} />
            <Route path="/session/:id" element={<LiveSession />} />
            <Route path="/report/:id" element={<ConclusionReport />} />
          </>
        ) : (
          <Route path="/" element={<SchoolDashboard />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

const ClassPulseApp = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={window.location.pathname.startsWith("/classpulse.html") ? "/classpulse.html" : "/"}>
          <ClassPulseContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default ClassPulseApp;
