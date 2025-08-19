import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { offlineAuthHelpers, OfflineUser } from "@/lib/offline-auth";
import { useToast } from "@/hooks/use-toast";

type OfflineAuthContextType = {
  user: OfflineUser | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Omit<OfflineUser, 'id'>) => Promise<OfflineUser>;
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
    const currentUser = offlineAuthHelpers.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    try {
      const loggedInUser = offlineAuthHelpers.login(username, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        toast({
          title: "Login successful",
          description: `Welcome back, ${loggedInUser.name}!`,
        });
        return true;
      } else {
        toast({
          title: "Login failed",
          description: "Invalid username. Try: admin, manager, or cashier",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    offlineAuthHelpers.logout();
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const register = async (userData: Omit<OfflineUser, 'id'>): Promise<OfflineUser> => {
    try {
      const newUser = offlineAuthHelpers.register(userData);
      setUser(newUser);
      toast({
        title: "Registration successful",
        description: `Welcome, ${newUser.name}!`,
      });
      return newUser;
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An error occurred during registration",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <OfflineAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        canUsePOS: offlineAuthHelpers.canUsePOS(user),
        canManageProducts: offlineAuthHelpers.canManageProducts(user),
        canManageCustomers: offlineAuthHelpers.canManageCustomers(user),
        canManageSuppliers: offlineAuthHelpers.canManageSuppliers(user),
        canViewReports: offlineAuthHelpers.canViewReports(user),
        canManageUsers: offlineAuthHelpers.canManageUsers(user),
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
