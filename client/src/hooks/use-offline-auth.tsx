import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { databaseUserStorage } from "@/lib/database-user-storage";
import { OfflineUser } from "@/lib/user-storage";
import { useToast } from "@/hooks/use-toast";

type OfflineAuthContextType = {
  user: OfflineUser | null;
  isLoading: boolean;
  login: (user: OfflineUser) => void;
  logout: () => void;
  canUsePOS: boolean;
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
};

export const OfflineAuthContext = createContext<OfflineAuthContextType | null>(null);

export function OfflineAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    console.log('Loading user session...');
    const session = databaseUserStorage.getCurrentSession();
    console.log('Current session:', session);
    if (session) {
      console.log('Setting user:', session.user);
      setUser(session.user);
    } else {
      console.log('No valid session found');
    }
    setIsLoading(false);
    console.log('Auth loading complete');
  }, []);

  const login = (loggedInUser: OfflineUser) => {
    setUser(loggedInUser);
    databaseUserStorage.createSession(loggedInUser);
  };

  const logout = () => {
    databaseUserStorage.clearSession();
    setUser(null);
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
  };

  // Permission helpers
  const canUsePOS = (user: OfflineUser | null): boolean => {
    return user !== null && user.active;
  };

  const canManageProducts = (user: OfflineUser | null): boolean => {
    return user !== null && user.active;
  };

  const canManageCustomers = (user: OfflineUser | null): boolean => {
    return user !== null && user.active;
  };

  const canManageSuppliers = (user: OfflineUser | null): boolean => {
    return user !== null && user.active;
  };

  const canViewReports = (user: OfflineUser | null): boolean => {
    return user !== null && user.active;
  };

  const canManageUsers = (user: OfflineUser | null): boolean => {
    return user !== null && user.active && user.role === 'admin';
  };

  return (
    <OfflineAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        canUsePOS: canUsePOS(user),
        canManageProducts: canManageProducts(user),
        canManageCustomers: canManageCustomers(user),
        canManageSuppliers: canManageSuppliers(user),
        canViewReports: canViewReports(user),
        canManageUsers: canManageUsers(user),
      }}
    >
      {children}
    </OfflineAuthContext.Provider>
  );
}

export function useOfflineAuth() {
  const context = useContext(OfflineAuthContext);
  if (!context) {
    throw new Error("useOfflineAuth must be used within an OfflineAuthProvider");
  }
  return context;
}
