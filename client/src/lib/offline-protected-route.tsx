import { ReactNode, useState, useEffect } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import PinLogin from "@/components/PinLogin";
import LicenseActivation from "@/pages/license-activation";

interface OfflineProtectedRouteProps {
  children: ReactNode;
}

export function OfflineProtectedRoute({ children }: OfflineProtectedRouteProps) {
  const { user, isLoading, login } = useOfflineAuth();
  const [licensed, setLicensed] = useState<boolean | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(true);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      // Skip license check in development mode
      if (import.meta.env.DEV) {
        console.log('🔓 Development mode: License check bypassed');
        setLicensed(true);
        setCheckingLicense(false);
        return;
      }

      const response = await fetch('/api/license/status');
      const data = await response.json();
      setLicensed(data.licensed);
    } catch (error) {
      console.error('Failed to check license:', error);
      setLicensed(false);
    } finally {
      setCheckingLicense(false);
    }
  };

  // Check license first
  if (checkingLicense) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show activation screen if not licensed
  if (!licensed) {
    return <LicenseActivation />;
  }

  // Then check authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PinLogin onLogin={login} />;
  }

  return <>{children}</>;
}
