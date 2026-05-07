import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { EventsNavbar } from "./events/components/EventsNavbar";
import DiscoveryFeed from "./events/pages/DiscoveryFeed";
import EventDetail from "./events/pages/EventDetail";
import DealsPage from "./events/pages/DealsPage";
import OrganiserDashboard from "./events/pages/OrganiserDashboard";
import ProfilePage from "./events/pages/ProfilePage";
import EventRegister from "./events/pages/EventRegister";
import MyEvents from "./events/pages/MyEvents";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
});

const EventsApp = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={window.location.pathname.startsWith("/events.html") ? "/events.html" : "/"}>
          <div className="min-h-screen" style={{ background: "#F3FAFF" }}>
            <EventsNavbar />
            <Routes>
              <Route path="/"              element={<DiscoveryFeed />} />
              <Route path="/event/:id"     element={<EventDetail />} />
              <Route path="/register/:id"  element={<EventRegister />} />
              <Route path="/my-events"     element={<MyEvents />} />
              <Route path="/deals"         element={<DealsPage />} />
              <Route path="/organiser"     element={<OrganiserDashboard />} />
              <Route path="/profile"       element={<ProfilePage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default EventsApp;
