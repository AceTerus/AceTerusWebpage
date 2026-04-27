import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Calendar, Tag, LayoutDashboard, ArrowLeft, LogIn, LogOut } from "lucide-react";
import Logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const EventsNavbar = () => {
  const { user, aceCoins, signOut } = useAuth();
  const location = useLocation();
  const [avatar, setAvatar] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data?.avatar_url) setAvatar(data.avatar_url); });
  }, [user]);

  const navItems = [
    { href: "/", label: "Discover", icon: Calendar },
    { href: "/deals", label: "Deals", icon: Tag },
    { href: "/organiser", label: "For Organisers", icon: LayoutDashboard },
  ];

  const avatarSrc = avatar || user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white border-b-[2.5px] border-[#0F172A]/12 shadow-[0_2px_0_0_rgba(15,23,42,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <img
            src={Logo}
            alt="AceTerus"
            className="w-9 h-9 object-contain rounded-xl border-2 border-[#0F172A]/15 shadow-[2px_2px_0_0_rgba(15,23,42,0.10)] group-hover:-translate-y-0.5 transition-transform duration-150"
          />
          <div className="hidden sm:block">
            <p className="font-['Baloo_2'] font-extrabold text-[16px] text-[#0F172A] leading-none">AceTerus</p>
            <p className="font-['Baloo_2'] font-bold text-[10px] text-[#2F7CFF] leading-none tracking-[0.15em] uppercase">Events</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold font-['Nunito'] transition-all duration-150 ${
                isActive(href)
                  ? "bg-[#2F7CFF] text-white border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] -translate-y-0.5"
                  : "text-[#0F172A]/70 hover:bg-[#F3FAFF] hover:text-[#0F172A] hover:-translate-y-0.5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ACE Coins badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/15 bg-[#FFFBEB] shadow-[2px_2px_0_0_rgba(15,23,42,0.07)]">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-['Baloo_2'] font-bold text-[14px] text-amber-700">{aceCoins.toLocaleString()}</span>
            </div>
          )}

          {/* Back to main app */}
          <a
            href="https://aceterus.com"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2.5px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all duration-150 text-[13px] font-bold font-['Nunito'] text-[#0F172A]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to AceTerus</span>
          </a>

          {/* Auth */}
          {user ? (
            <>
              <Link to="/profile" title="Your profile">
                <Avatar className="h-9 w-9 border-[2.5px] border-[#0F172A]/20 hover:border-[#2F7CFF] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer shadow-[2px_2px_0_0_rgba(15,23,42,0.08)]">
                  <AvatarImage src={avatarSrc} className="object-cover" />
                  <AvatarFallback className="bg-[#2F7CFF]/10 text-[#2F7CFF] font-bold text-sm">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-red-200 text-red-500 hover:bg-red-50 transition-all duration-150 text-[13px] font-bold font-['Nunito']"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <a
              href="https://aceterus.com/auth"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2.5px] border-[#2F7CFF] bg-[#2F7CFF] text-white shadow-[2px_2px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all duration-150 text-[13px] font-bold font-['Nunito']"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold font-['Nunito'] transition-all duration-150 ${
              isActive(href)
                ? "bg-[#2F7CFF] text-white border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
                : "text-[#0F172A]/60 hover:bg-[#F3FAFF]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
};
