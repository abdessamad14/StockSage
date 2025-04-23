import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/AppShell";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import POS from "@/pages/pos";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Orders from "@/pages/orders";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/pos" component={POS} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/orders" component={Orders} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/users" component={Users} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
