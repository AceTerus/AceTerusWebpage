import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AdminQuiz from "./pages/AdminQuiz";
import Logo from "./assets/logo.png";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
});

const DISPLAY = "font-['Baloo_2'] tracking-tight";

function AdminNavbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b-[2.5px] border-[#0F172A] bg-white shadow-[0_2px_0_0_#0F172A]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="AceTerus" className="w-8 h-8 rounded-xl" />
          <span className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>
            AceTerus <span className="text-[#2E2BE5]">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> AceTerus
          </a>
          <a
            href="https://events.aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Events
          </a>
          {user && (
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl border-[2px] border-red-200 text-[13px] font-bold font-['Nunito'] text-red-500 hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminSignIn() {
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

  const INPUT = "w-full px-4 py-3 border-[2px] border-[#0F172A]/20 rounded-[12px] font-['Nunito'] text-[14px] outline-none focus:border-[#2E2BE5] transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Admin Access</h2>
          <p className="font-['Nunito'] text-[#0F172A]/50 text-[13px]">AceTerus admin tools</p>
        </div>

        {/* Google */}
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] text-[14px] text-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#0F172A]/10" />
          <span className="text-[12px] font-['Nunito'] text-[#0F172A]/40 font-semibold">or</span>
          <div className="flex-1 h-px bg-[#0F172A]/10" />
        </div>

        {/* Email / password */}
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            required
          />
          {error && <p className="text-[13px] font-['Nunito'] text-red-500 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] text-[14px] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all disabled:opacity-60 disabled:translate-y-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminGuard() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2E2BE5]" />
      </div>
    );
  }

  if (!user) return <AdminSignIn />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-5xl">🚫</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Access Denied</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[14px]">You don't have admin privileges.</p>
          <a
            href="https://aceterus.com"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            Back to AceTerus
          </a>
        </div>
      </div>
    );
  }

  return <AdminQuiz />;
}

const AdminApp = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={window.location.pathname.startsWith("/admin.html") ? "/admin.html" : "/"}>
          <div className="min-h-screen bg-[#F8F9FF]">
            <AdminNavbar />
            <Routes>
              <Route path="/" element={<AdminGuard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AdminApp;
