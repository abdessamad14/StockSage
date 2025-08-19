import { Switch, Route } from "wouter";
import { offlineQueryClient } from "./lib/offline-query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/AppShell";
import OfflineDashboard from "@/pages/offline-dashboard";
import OfflineProducts from "@/pages/offline-products";
import OfflinePOS from "@/pages/offline-pos";
import OfflineInventory from "@/pages/offline-inventory";
import InventoryCountPage from "@/pages/inventory-count";
import OfflineCustomers from "@/pages/offline-customers";
import OfflineSuppliers from "@/pages/offline-suppliers";
import OfflineOrders from "@/pages/offline-orders";
import OfflineReports from "@/pages/offline-reports";
import OfflineSettings from "@/pages/offline-settings";
import OfflineSalesHistory from "@/pages/offline-sales-history";
import { I18nProvider } from "@/lib/i18n";
import { initializeSampleData } from "@/lib/offline-storage";
import { OfflineAuthProvider } from "@/hooks/use-offline-auth";
import { OfflineProtectedRoute } from "@/lib/offline-protected-route";
import { useEffect } from "react";

function Router() {
  return (
    <OfflineProtectedRoute>
      <AppShell>
        <Switch>
          <Route path="/" component={OfflineDashboard} />
          <Route path="/products" component={OfflineProducts} />
          <Route path="/pos" component={OfflinePOS} />
          <Route path="/inventory" component={OfflineInventory} />
          <Route path="/inventory-count" component={InventoryCountPage} />
          <Route path="/customers" component={OfflineCustomers} />
          <Route path="/suppliers" component={OfflineSuppliers} />
          <Route path="/orders" component={OfflineOrders} />
          <Route path="/reports" component={OfflineReports} />
          <Route path="/sales-history" component={OfflineSalesHistory} />
          <Route path="/settings" component={OfflineSettings} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </OfflineProtectedRoute>
  );
}

function OfflineApp() {
  useEffect(() => {
    // Initialize sample data on first load
    initializeSampleData();
  }, []);

  return (
    <QueryClientProvider client={offlineQueryClient}>
      <OfflineAuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </OfflineAuthProvider>
    </QueryClientProvider>
  );
}

export default OfflineApp;
