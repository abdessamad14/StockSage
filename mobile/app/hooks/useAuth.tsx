import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/api';

// Define user type based on your user schema
export interface User {
  id: number;
  username: string;
  role: string;
  tenantId: string;
  email?: string;
  businessName?: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the Auth Context
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// AuthProvider component to wrap the app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const userData = await SecureStore.getItemAsync('user');
        const token = await SecureStore.getItemAsync('token');
        
        if (userData && token) {
          setUser(JSON.parse(userData));
          // Set the authorization header for all future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('Failed to load user data', e);
      } finally {
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the login API
      const response = await api.post('/api/login', { username, password });
      
      // Get user data from response
      const userData = response.data;
      
      // Store user data and session token
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      // In a real app, the backend should return a token
      await SecureStore.setItemAsync('token', 'session-token');
      
      // Set the user data in state
      setUser(userData);
      
      // Set authorization header for future requests
      api.defaults.headers.common['Authorization'] = 'Bearer session-token';
    } catch (e: any) {
      setError(e.response?.data?.message || 'Login failed');
      console.error('Login failed', e);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call the logout API
      await api.post('/api/logout');
      
      // Remove user data and token from secure storage
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('token');
      
      // Remove authorization header
      delete api.defaults.headers.common['Authorization'];
      
      // Clear user data from state
      setUser(null);
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};