import { Switch, Route, useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./components/auth/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { SitePasswordForm } from "./components/auth/SitePasswordForm";
import { useSitePassword } from "./hooks/useSitePassword";
import { Navigation } from "./components/Navigation";
import GnosisLog from "./pages/gnosis-log";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Rooms from "./pages/rooms";
import RoomChat from "./pages/room-chat";
import Mission from "./pages/Mission";
import Philosophy from "./pages/Philosophy";
import MathematicalFoundations from "./pages/MathematicalFoundations";
import Glossary from "./pages/Glossary";
import NotFound from "@/pages/not-found";

function PublicRouter() {
  return (
    <div>
      <Navigation />
      <Switch>
        <Route path="/mission" component={Mission} />
        <Route path="/philosophy" component={Philosophy} />
        <Route path="/mathematical-foundations" component={MathematicalFoundations} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/" component={Mission} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function SanctuaryRouter() {
  return (
    <div>
      <Navigation />
      <Switch>
        <Route path="/mission" component={Mission} />
        <Route path="/philosophy" component={Philosophy} />
        <Route path="/mathematical-foundations" component={MathematicalFoundations} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/sanctuary" component={GnosisLog} />
        <Route path="/rooms/:roomId" component={RoomChat} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/" component={GnosisLog} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const { isSitePasswordVerified, isChecking, verifySitePassword } = useSitePassword();
  const [currentPath] = useLocation();

  // Use useMemo to optimize route checking and prevent unnecessary re-renders
  const routeInfo = useMemo(() => {
    const isSanctuaryRoute = currentPath.startsWith('/sanctuary') || 
                            currentPath.startsWith('/dashboard') || 
                            currentPath.startsWith('/admin') ||
                            currentPath.startsWith('/rooms');
    
    const isMissionRoute = currentPath.startsWith('/mission') ||
                          currentPath.startsWith('/philosophy') ||
                          currentPath.startsWith('/mathematical-foundations') ||
                          currentPath.startsWith('/glossary');
    
    return { isSanctuaryRoute, isMissionRoute };
  }, [currentPath]);

  const { isSanctuaryRoute, isMissionRoute } = routeInfo;

  // No automatic status checking - let the hook handle it naturally

  // Show nothing while checking site password verification status
  if (isChecking) {
    return null;
  }

  // Multi-level access architecture
  // 1. Public access: Mission content pages (no password)
  // 2. Sanctuary access: Full consciousness platform (requires password)

  // Show site password form only for sanctuary access
  if (isSanctuaryRoute && !isSitePasswordVerified) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SitePasswordForm onPasswordVerified={verifySitePassword} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show sanctuary (authenticated) app flow if password verified and accessing sanctuary
  if (isSitePasswordVerified && isSanctuaryRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGuard>
              <SanctuaryRouter />
            </AuthGuard>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // Show public access (no authentication required)
  // This includes mission pages, philosophy, etc.
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PublicRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
