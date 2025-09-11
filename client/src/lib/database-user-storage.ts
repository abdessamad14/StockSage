import { OfflineUser, AuthSession } from './user-storage';

const API_BASE_URL = 'http://localhost:5003/api/offline';

export class DatabaseUserStorage {
  private sessionKey = 'stocksage_auth_session';

  // Get all users from database
  async getAll(): Promise<OfflineUser[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      return users.map(this.mapDatabaseUserToOfflineUser);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Get user by ID
  async getById(id: string): Promise<OfflineUser | null> {
    try {
      const users = await this.getAll();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  // Create new user
  async create(userData: Omit<OfflineUser, 'id'>): Promise<OfflineUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          name: userData.name,
          pin: userData.pin,
          role: userData.role,
          active: userData.active,
          password: 'default', // Required by schema but not used for PIN auth
          businessName: userData.name, // Use name as business name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await response.json();
      return this.mapDatabaseUserToOfflineUser(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(id: string, updates: Partial<OfflineUser>): Promise<OfflineUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: updates.username,
          name: updates.name,
          pin: updates.pin,
          role: updates.role,
          active: updates.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      return this.mapDatabaseUserToOfflineUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Authenticate user with PIN
  async authenticateWithPin(pin: string): Promise<OfflineUser | null> {
    try {
      const users = await this.getAll();
      return users.find(user => user.pin === pin && user.active) || null;
    } catch (error) {
      console.error('Error authenticating with PIN:', error);
      return null;
    }
  }

  // Session management (still uses localStorage for session data)
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
  async initializeDefaultUsers(): Promise<void> {
    try {
      const users = await this.getAll();
      
      if (users.length === 0) {
        // Create default admin user
        await this.create({
          username: 'admin',
          name: 'Administrateur',
          pin: '1234',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        // Create sample cashier
        await this.create({
          username: 'cashier1',
          name: 'Caissier 1',
          pin: '5678',
          role: 'cashier',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  }

  // Map database user to OfflineUser format
  private mapDatabaseUserToOfflineUser(dbUser: any): OfflineUser {
    return {
      id: dbUser.id.toString(),
      username: dbUser.username,
      name: dbUser.name,
      pin: dbUser.pin,
      role: dbUser.role,
      active: dbUser.active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const databaseUserStorage = new DatabaseUserStorage();
