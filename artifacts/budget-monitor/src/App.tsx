import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import DashboardPage from "@/pages/DashboardPage";
import SectorsPage from "@/pages/SectorsPage";
import CatalogPage from "@/pages/CatalogPage";
import ProcurementPage from "@/pages/ProcurementPage";
import SectorDetailPage from "@/pages/SectorDetailPage";
import AllocationsPage from "@/pages/AllocationsPage";
import CyclesPage from "@/pages/CyclesPage";
import UsersPage from "@/pages/UsersPage";
import ReportsPage from "@/pages/ReportsPage";
import HierarchyDesignerPage from "@/pages/HierarchyDesignerPage";
import NotFound from "@/pages/not-found";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isLoginPage = location === "/login";
  // Only query /api/auth/me on protected pages (not on login)
  const { isLoading, isLoggedIn } = useAuth(!isLoginPage);
  // Monitor performance
  usePerformanceMonitoring();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!isLoggedIn && !isLoginPage) {
    return <Redirect to="/login" />;
  }

  if (isLoggedIn && isLoginPage) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ component: Component, roles, ...rest }: any) {
  const { user } = useAuth();

  if (roles && user && !roles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function Routes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute component={HomePage} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/sectors">
        <ProtectedRoute component={SectorsPage} />
      </Route>
      <Route path="/sectors/:id">
        {(params) => <ProtectedRoute component={SectorDetailPage} id={params.id} />}
      </Route>
      <Route path="/hierarchy-designer">
        <ProtectedRoute component={HierarchyDesignerPage} roles={['super_admin', 'ceo']} />
      </Route>
      <Route path="/allocations">
        <ProtectedRoute component={AllocationsPage} />
      </Route>
      <Route path="/cycles">
        <ProtectedRoute component={CyclesPage} roles={['super_admin']} />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UsersPage} roles={['super_admin', 'ceo']} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/catalog">
        <ProtectedRoute component={CatalogPage} />
      </Route>
      <Route path="/procurement">
        <ProtectedRoute component={ProcurementPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGuard>
          <Routes />
        </AuthGuard>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
