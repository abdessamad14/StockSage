import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'http://192.168.1.100:5000', // Default IP, user will need to change this to their server IP
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication functions
export const loginUser = async (username: string, password: string) => {
  try {
    const response = await apiClient.post('/api/login', { username, password });
    
    if (response.data) {
      // Save auth data to secure storage
      await SecureStore.setItemAsync('auth_token', response.data.token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(response.data));
      return response.data;
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await apiClient.post('/api/logout');
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getUserData = async () => {
  try {
    const userData = await SecureStore.getItemAsync('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Get user data error:', error);
    return null;
  }
};

// Order functions
export const getProducts = async () => {
  try {
    const response = await apiClient.get('/api/products');
    return response.data;
  } catch (error) {
    console.error('Get products error:', error);
    throw error;
  }
};

export const getCustomers = async () => {
  try {
    const response = await apiClient.get('/api/customers');
    return response.data;
  } catch (error) {
    console.error('Get customers error:', error);
    throw error;
  }
};

export const createOrder = async (orderData: any) => {
  try {
    const response = await apiClient.post('/api/sales', orderData);
    return response.data;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

// Helper function to update server URL
export const updateServerUrl = (newUrl: string) => {
  apiClient.defaults.baseURL = newUrl.startsWith('http') 
    ? newUrl 
    : `http://${newUrl}:5000`;
};

export default apiClient;