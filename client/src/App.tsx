import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import PerplexityAttribution from "@/components/PerplexityAttribution";
import LoginPage from "@/pages/LoginPage";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientVehicles from "@/pages/ClientVehicles";
import ClientOrders from "@/pages/ClientOrders";
import MechanicDashboard from "@/pages/MechanicDashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import OrderDetail from "@/pages/OrderDetail";
import VehicleHistory from "@/pages/VehicleHistory";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <MotoLogo />
          <p className="text-muted-foreground text-sm">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={
          user.role === "owner" ? OwnerDashboard :
          user.role === "mechanic" ? MechanicDashboard :
          ClientDashboard
        } />
        {/* Klient — podstrony */}
        <Route path="/pojazdy" component={ClientVehicles} />
        <Route path="/zlecenia" component={ClientOrders} />
        {/* Wspólne */}
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/vehicles/:id/history" component={VehicleHistory} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function MotoLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="MotoSerwis" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke="hsl(24,95%,50%)" strokeWidth="2.5"/>
      <circle cx="24" cy="24" r="6" fill="hsl(24,95%,50%)"/>
      <path d="M24 6 L24 14M24 34 L24 42M6 24 L14 24M34 24 L42 24" stroke="hsl(24,95%,50%)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12 L18 18M30 30 L36 36M36 12 L30 18M18 30 L12 36" stroke="hsl(24,95%,50%)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
        <PerplexityAttribution />
      </AuthProvider>
    </QueryClientProvider>
  );
}
