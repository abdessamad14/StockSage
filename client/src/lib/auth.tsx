import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { LoginCredentials, User, Role } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  canManageProducts: boolean;
  canManageInventory: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canUsePOS: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
  isAdmin: false,
  isCashier: false,
  canManageProducts: false,
  canManageInventory: false,
  canManageCustomers: false,
  canManageSuppliers: false,
  canViewReports: false,
  canManageSettings: false,
  canUsePOS: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      const data = await res.json();
      
      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Authentication failed. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  // Role-based permissions
  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';
  const isSupporter = user?.role === 'supporter';
  const isViewer = user?.role === 'viewer';
  const isMerchant = user?.role === 'merchant';

  // Permission checks
  const canManageProducts = isAdmin || isCashier;
  const canManageInventory = isAdmin;
  const canManageCustomers = isAdmin || isCashier;
  const canManageSuppliers = isAdmin;
  const canViewReports = isAdmin || isSupporter || isViewer;
  const canManageSettings = isAdmin;
  const canUsePOS = isAdmin || isCashier;

  const contextValue: AuthContextType = {
    isAuthenticated: !!user,
    user,
    login,
    logout,
    isLoading,
    isAdmin,
    isCashier,
    canManageProducts,
    canManageInventory,
    canManageCustomers,
    canManageSuppliers,
    canViewReports,
    canManageSettings,
    canUsePOS,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
