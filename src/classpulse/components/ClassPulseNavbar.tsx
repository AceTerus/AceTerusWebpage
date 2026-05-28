import { ExternalLink, LogOut, LayoutDashboard, BarChart3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "../../assets/logo.webp";

const DISPLAY = "font-['Baloo_2'] tracking-tight";

interface ClassPulseNavbarProps {
  role: "teacher" | "school_authority" | null;
}

export function ClassPulseNavbar({ role }: ClassPulseNavbarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleBackToAceTerus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const base = "https://aceterus.com";
    if (session) {
      const hash = `#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=magiclink`;
      window.open(`${base}/${hash}`, "_blank");
    } else {
      window.open(base, "_blank");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b-[2.5px] border-[#0F172A] bg-white shadow-[0_2px_0_0_#0F172A]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src={Logo} alt="AceTerus" className="w-8 h-8 rounded-xl" />
          <div className="flex items-center gap-1.5">
            <span className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>
              Class<span className="text-[#2F7CFF]">Pulse</span>
            </span>
            <span className="text-[10px] font-bold font-['Nunito'] text-[#0F172A]/40 border border-[#0F172A]/20 rounded-full px-2 py-0.5">
              by AceTerus
            </span>
          </div>
        </div>

        {/* Role-based nav */}
        {role && (
          <nav className="hidden md:flex items-center gap-1">
            {role === "teacher" && (
              <>
                <Link to="/"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold font-['Nunito'] transition-all border-[2px] ${isActive("/") ? "bg-[#2E2BE5] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]" : "text-[#0F172A]/60 border-transparent hover:border-[#0F172A]/20 hover:text-[#0F172A]"}`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> My Sessions
                </Link>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold font-['Nunito'] transition-all border-[2px] text-[#0F172A]/40 border-transparent cursor-not-allowed"
                  title="Reports — coming soon"
                >
                  Reports
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold font-['Nunito'] transition-all border-[2px] text-[#0F172A]/40 border-transparent cursor-not-allowed"
                  title="Coaching — coming soon"
                >
                  Coaching
                </button>
              </>
            )}
            {role === "school_authority" && (
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold font-['Nunito'] transition-all border-[2px] ${
                  isActive("/")
                    ? "bg-[#2E2BE5] text-white border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
                    : "text-[#0F172A]/60 border-transparent hover:border-[#0F172A]/20 hover:text-[#0F172A]"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </Link>
            )}
          </nav>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackToAceTerus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> AceTerus
          </button>
          {user && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-red-200 text-[13px] font-bold font-['Nunito'] text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
