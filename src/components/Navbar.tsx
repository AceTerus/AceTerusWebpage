import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Menu, X, LogOut, LogIn, Home, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Logo from "../assets/logo.webp";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const { toast } = useToast();

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/quiz", label: "Quiz", icon: BookOpen },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate("/");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-elegant" style={{ height: "80px" }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="group">
            <img
              src={Logo}
              alt="AceTerus Logo"
              className="w-20 h-20 object-contain rounded-xl group-hover:shadow-glow transition-all duration-300"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {user && navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    className={`
                      h-11 px-5 text-[15px] font-semibold flex items-center gap-2 rounded-xl transition-all
                      ${active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow scale-[1.03]"
                        : "hover:bg-muted hover:scale-[1.02]"
                      }
                    `}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            {!isLoading && (
              user ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="h-11 px-5 text-[15px] font-semibold flex items-center gap-2 rounded-xl hover:bg-muted hover:scale-[1.02] transition-all"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button
                    className="h-11 px-6 text-[15px] font-semibold flex items-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-all"
                  >
                    <LogIn className="w-[18px] h-[18px]" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            className="md:hidden h-11 w-11 rounded-xl"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 pt-2">
            {user && navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    className={`
                      w-full justify-start gap-3 h-12 text-[15px] font-semibold rounded-xl transition-all
                      ${active ? "bg-gradient-primary text-primary-foreground" : ""}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            {!isLoading && (
              user ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-3 h-12 text-[15px] font-semibold rounded-xl"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button className="w-full justify-start gap-3 h-12 text-[15px] font-semibold rounded-xl bg-gradient-primary text-primary-foreground">
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;