// User management and authentication storage

export interface OfflineUser {
  id: string;
  username: string;
  name: string;
  pin?: string;
  role: 'admin' | 'cashier';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: OfflineUser;
  loginTime: string;
  expiresAt: string;
}

class UserStorage {
  private storageKey = 'stocksage_users';
  private sessionKey = 'stocksage_session';

  // Get all users
  getAll(): OfflineUser[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Get user by ID
  getById(id: string): OfflineUser | null {
    const users = this.getAll();
    return users.find(user => user.id === id) || null;
  }

  // Get user by username
  getByUsername(username: string): OfflineUser | null {
    const users = this.getAll();
    return users.find(user => user.username === username) || null;
  }

  // Authenticate user with PIN
  authenticateWithPin(pin: string): OfflineUser | null {
    const users = this.getAll();
    return users.find(user => user.pin === pin && user.active) || null;
  }

  // Create new user
  create(userData: Omit<OfflineUser, 'id' | 'createdAt' | 'updatedAt'>): OfflineUser {
    const users = this.getAll();
    const newUser: OfflineUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    localStorage.setItem(this.storageKey, JSON.stringify(users));
    return newUser;
  }

  // Update user
  update(id: string, updates: Partial<OfflineUser>): OfflineUser | null {
    const users = this.getAll();
    const index = users.findIndex(user => user.id === id);
    
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(users));
    return users[index];
  }

  // Delete user
  delete(id: string): boolean {
    const users = this.getAll();
    const filteredUsers = users.filter(user => user.id !== id);
    
    if (filteredUsers.length === users.length) return false;
    
    localStorage.setItem(this.storageKey, JSON.stringify(filteredUsers));
    return true;
  }

  // Session management
  createSession(user: OfflineUser): AuthSession {
    const session: AuthSession = {
      user,
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
    };
    
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    return session;
  }

  // Get current session
  getCurrentSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(this.sessionKey);
      if (!data) return null;
      
      const session: AuthSession = JSON.parse(data);
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  // Clear session (logout)
  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }

  // Initialize with default admin user if no users exist
  initializeDefaultUsers(): void {
    const users = this.getAll();
    
    if (users.length === 0) {
      // Create default admin user
      this.create({
        username: 'admin',
        name: 'Administrateur',
        pin: '1234',
        role: 'admin',
        active: true,
      });
      
      // Create sample cashier
      this.create({
        username: 'cashier1',
        name: 'Caissier 1',
        pin: '5678',
        role: 'cashier',
        active: true,
      });
    }
  }
}

export const userStorage = new UserStorage();
