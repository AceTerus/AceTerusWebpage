import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ChatNotificationsProvider } from "./context/ChatNotificationsContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { MascotProvider } from "./context/MascotContext";
import { PomodoroProvider } from "./context/PomodoroContext";
import { useGoalReminders } from "./hooks/useGoalReminders";

const AppSidebar = lazy(() => import("./components/AppSidebar").then(m => ({ default: m.AppSidebar })));
const MobileNav = lazy(() => import("./components/MobileNav").then(m => ({ default: m.MobileNav })));
const MascotCompanion = lazy(() => import("./components/MascotCompanion"));
const MascotGreeter = lazy(() => import("./components/MascotGreeter"));
const MascotChat = lazy(() => import("./components/MascotChat"));
const PomodoroFloatingWidget = lazy(() => import("./components/PomodoroFloatingWidget").then(m => ({ default: m.PomodoroFloatingWidget })));

const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Discover = lazy(() => import("./pages/Discover").then(m => ({ default: m.Discover })));
const Feed = lazy(() => import("./pages/Feed").then(m => ({ default: m.Feed })));
const Materials = lazy(() => import("./pages/Materials").then(m => ({ default: m.Materials })));
const Quiz = lazy(() => import("./pages/Quiz"));
const OmrScanner = lazy(() => import("./pages/OmrScanner"));
const ArScanner = lazy(() => import("./pages/ArScanner"));
const AdminQuiz = lazy(() => import("./pages/AdminQuiz"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Chat = lazy(() => import("./pages/Chat").then(m => ({ default: m.Chat })));

const queryClient = new QueryClient();

const PageTransitionBar = () => {
  const location = useLocation();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(true);
    setProgress(30);

    const fastTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 20, 85));
    }, 100);

    const finishTimer = setTimeout(() => {
      clearInterval(fastTimer);
      setProgress(100);
      setTimeout(() => setVisible(false), 200);
    }, 400);

    return () => {
      clearInterval(fastTimer);
      clearTimeout(finishTimer);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none">
      <div 
        className="h-1 bg-blue-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
        style={{ width: `${progress}%` }} 
      />
    </div>
  );
};

const OnboardingGuard = () => {
  const { user, isNewUser, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (user && isNewUser && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <>
      <PageTransitionBar />
      <OnboardingGuard />
      <div key={location.pathname} className="page-enter">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/omr-scan" element={<OmrScanner />} />
            <Route path="/ar-scanner" element={<ArScanner />} />
            <Route path="/admin" element={<AdminQuiz />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  useGoalReminders();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  };

  return (
    <BrowserRouter>
      <div
        className="flex min-h-screen w-full [overflow-x:clip]"
        style={{
          backgroundImage: "url('/Test Background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        {user && (
          <Suspense fallback={null}>
            <AppSidebar collapsed={sidebarCollapsed} onCollapseToggle={handleSidebarCollapse} />
            <MobileNav />
            <MascotGreeter />
            <MascotCompanion />
            <MascotChat />
            <PomodoroFloatingWidget />
          </Suspense>
        )}
        <main className={`flex-1 transition-all duration-300 ${user ? (sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-64') : ''}`}>
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatNotificationsProvider>
        <NotificationsProvider>
          <MascotProvider>
            <PomodoroProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
            </PomodoroProvider>
          </MascotProvider>
        </NotificationsProvider>
      </ChatNotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
