// Offline Authentication System
export interface OfflineUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  businessName?: string;
  role: 'admin' | 'manager' | 'cashier';
}

const STORAGE_KEY = 'stocksage_offline_user';
const USERS_KEY = 'stocksage_offline_users';

// Default offline users
const defaultUsers: OfflineUser[] = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@stocksage.com',
    businessName: 'StockSage Demo Store',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Manager User',
    username: 'manager',
    email: 'manager@stocksage.com',
    businessName: 'StockSage Demo Store',
    role: 'manager'
  },
  {
    id: '3',
    name: 'Cashier User',
    username: 'cashier',
    email: 'cashier@stocksage.com',
    businessName: 'StockSage Demo Store',
    role: 'cashier'
  }
];

export const offlineAuthHelpers = {
  // Initialize offline users if not exists
  initializeUsers: () => {
    const existingUsers = localStorage.getItem(USERS_KEY);
    if (!existingUsers) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  },

  // Get all users
  getUsers: (): OfflineUser[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : defaultUsers;
  },

  // Get current logged in user
  getCurrentUser: (): OfflineUser | null => {
    const user = localStorage.getItem(STORAGE_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Login user (offline)
  login: (username: string, password?: string): OfflineUser | null => {
    const users = offlineAuthHelpers.getUsers();
    const user = users.find(u => u.username === username);
    
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  // Register new user (offline)
  register: (userData: Omit<OfflineUser, 'id'>): OfflineUser => {
    const users = offlineAuthHelpers.getUsers();
    const newUser: OfflineUser = {
      ...userData,
      id: Date.now().toString()
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    
    return newUser;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Check if user is logged in
  isLoggedIn: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  // Get user permissions
  canUsePOS: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && ['admin', 'manager', 'cashier'].includes(currentUser.role);
  },

  canManageProducts: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && ['admin', 'manager'].includes(currentUser.role);
  },

  canManageCustomers: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && ['admin', 'manager'].includes(currentUser.role);
  },

  canManageSuppliers: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && ['admin', 'manager'].includes(currentUser.role);
  },

  canViewReports: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && ['admin', 'manager'].includes(currentUser.role);
  },

  canManageUsers: (user?: OfflineUser | null): boolean => {
    const currentUser = user || offlineAuthHelpers.getCurrentUser();
    return !!currentUser && currentUser.role === 'admin';
  }
};

// Note: User initialization moved to database storage
