import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Search, LogOut, Compass, FileText, MessageCircle, ShieldCheck, ScanLine, ChevronLeft, ChevronRight, User, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "../assets/logo.webp";
import { useChatNotifications } from "@/context/ChatNotificationsContext";
import { NotificationsBell } from "@/components/NotificationsBell";

interface AppSidebarProps {
  collapsed: boolean;
  onCollapseToggle: (collapsed: boolean) => void;
}

export const AppSidebar = ({ collapsed, onCollapseToggle }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const { totalSenders } = useChatNotifications();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Fetch uploaded avatar from profiles table
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setProfileAvatar(data.avatar_url);
        if (data?.username) setProfileUsername(data.username);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({ title: "Signed out", description: "You have been successfully signed out." });
  };

  const navItems = [
    { href: "/feed",       label: "Feed",       icon: Compass },
    {
      href: "/chat",
      label: "Chat",
      icon: MessageCircle,
      badge: totalSenders > 0 ? Math.min(totalSenders, 99) : undefined,
    },
    { href: "/quiz",       label: "Quiz",       icon: BookOpen },
    { href: "/materials",  label: "Materials",  icon: FileText },
    { href: "/ar-scanner", label: "AR Scanner", icon: ScanLine },
  ];

  const avatarSrc = profileAvatar || user?.user_metadata?.avatar_url;
  const displayName = profileUsername || user?.email?.split("@")[0] || "User";
  const initials = displayName[0]?.toUpperCase() || "U";

  return (
    <aside
      className={`
        hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen border-r-2 border-[#0F172A]/10 bg-white z-50
        transition-all duration-300 font-['Nunito']
        ${collapsed ? "w-[70px]" : "w-64"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-center mb-4 mt-3">
        <Link to="/feed" className="group">
          <img
            src={Logo}
            alt="AceTerus Logo"
            className="w-[10vh] h-[10vh] object-contain rounded-xl border-2 border-[#0F172A]/15 shadow-[3px_3px_0_0_rgba(15,23,42,0.1)] group-hover:-translate-y-0.5 group-hover:shadow-[5px_5px_0_0_rgba(15,23,42,0.12)] transition-all duration-200"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1 flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => active ? navigate(0) : navigate(item.href)}
              className={`
                relative flex items-center rounded-xl transition-all duration-150 group cursor-pointer
                ${collapsed ? "justify-center px-0 py-4" : "px-5 py-4 space-x-4"}
                ${active
                  ? "bg-primary text-white font-bold shadow-[3px_3px_0_0_#0F172A] border-2 border-[#0F172A] -translate-y-0.5"
                  : "text-foreground/70 hover:bg-muted/60 hover:text-foreground hover:-translate-y-0.5"
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Icon className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none py-0.5">
                    {item.badge}
                  </span>
                )}
              </div>
              {!collapsed && <span className="text-[17px] flex-1">{item.label}</span>}
            </button>
          );
        })}

        {/* Events & Deals cross-link */}
        <button
          onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const base = "https://events.aceterus.com";
            if (session) {
              const hash = `#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=magiclink`;
              window.open(`${base}/${hash}`, "_blank");
            } else {
              window.open(base, "_blank");
            }
          }}
          title={collapsed ? "Events & Deals" : undefined}
          className={`relative flex items-center rounded-xl transition-all duration-150 group cursor-pointer text-foreground/70 hover:bg-muted/60 hover:text-foreground hover:-translate-y-0.5 ${collapsed ? "justify-center px-0 py-4" : "px-5 py-4 space-x-4"}`}
        >
          <div className="relative flex-shrink-0">
            <CalendarDays className="w-6 h-6 stroke-[1.8]" />
          </div>
          {!collapsed && <span className="text-[17px] flex-1">Events &amp; Deals</span>}
        </button>
      </nav>

      {/* Collapse toggle */}
      <div className={`px-3 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={() => onCollapseToggle(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Profile + actions ── */}
      {user && (
        <div className="border-t border-border pt-3 pb-3 px-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              {/* Profile avatar — links to profile */}
              <Link to="/profile" title={displayName}>
                <Avatar className={`h-9 w-9 border-2 border-[#0F172A]/20 transition-all hover:border-[#0F172A]/50 ${isActive("/profile") ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                  <AvatarImage src={avatarSrc} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <NotificationsBell />
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Profile card — merged nav + avatar */}
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
                  ${isActive("/profile")
                    ? "bg-primary text-white font-bold shadow-[3px_3px_0_0_#0F172A] border-2 border-[#0F172A] -translate-y-0.5"
                    : "hover:bg-muted/60 hover:-translate-y-0.5"
                  }`}
              >
                <Avatar className={`h-9 w-9 shrink-0 border-2 transition-all
                  ${isActive("/profile") ? "border-white/40" : "border-[#0F172A]/20 group-hover:border-[#0F172A]/40"}`}>
                  <AvatarImage src={avatarSrc} className="object-cover" />
                  <AvatarFallback className={`font-bold text-sm ${isActive("/profile") ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-semibold truncate leading-tight ${isActive("/profile") ? "text-white" : ""}`}>
                    {displayName}
                  </p>
                  <p className={`text-[11px] truncate mt-0.5 flex items-center gap-1 ${isActive("/profile") ? "text-white/70" : "text-muted-foreground"}`}>
                    <User className="w-3 h-3 shrink-0" /> View profile
                  </p>
                </div>
                <NotificationsBell />
              </Link>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-150 hover:-translate-y-0.5"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-[15px]">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
