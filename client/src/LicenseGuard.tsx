import { useState, useEffect } from 'react';
import LicenseActivation from './pages/license-activation';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  const [licensed, setLicensed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const response = await fetch('/api/license/status');
      const data = await response.json();
      setLicensed(data.licensed);
    } catch (error) {
      console.error('Failed to check license:', error);
      setLicensed(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!licensed) {
    return <LicenseActivation />;
  }

  return <>{children}</>;
}
