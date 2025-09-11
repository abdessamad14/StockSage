import { ReactNode } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import PinLogin from "@/components/PinLogin";

interface OfflineProtectedRouteProps {
  children: ReactNode;
}

export function OfflineProtectedRoute({ children }: OfflineProtectedRouteProps) {
  const { user, isLoading, login } = useOfflineAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PinLogin onLogin={login} />;
  }

  return <>{children}</>;
}
