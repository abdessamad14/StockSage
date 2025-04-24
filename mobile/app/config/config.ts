import Constants from 'expo-constants';

interface Config {
  API_URL: string;
  ENV: 'development' | 'production' | 'staging';
}

// Default configuration
const defaultConfig: Config = {
  API_URL: 'http://localhost:5000',
  ENV: 'development',
};

// Environment specific configurations
const envConfigs: Record<string, Partial<Config>> = {
  // Development environment - typically when running locally
  development: {
    API_URL: 'http://localhost:5000',
  },
  
  // Replit environment - accessed via Replit's URL or IP
  replit: {
    // This will be overridden by the dynamic IP detection
    API_URL: 'https://your-repl-name.replit.app',
  },
  
  // Production environment
  production: {
    API_URL: 'https://api.igoodar.com',
    ENV: 'production',
  },
  
  // Staging environment
  staging: {
    API_URL: 'https://staging-api.igoodar.com',
    ENV: 'staging',
  },
};

// Get environment from Expo constants or use 'development' as default
const getEnv = (): string => {
  return Constants.expoConfig?.extra?.env || 'development';
};

// Try to determine if running in Replit environment
const isReplitEnvironment = (): boolean => {
  // Check if URL contains replit.app or repl.co domains
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  return (
    !!releaseChannel &&
    (releaseChannel.includes('replit') || 
     releaseChannel.includes('repl.co'))
  );
};

// Function to get specific IP for the server
const getServerIP = (): string => {
  // Check if custom server IP is set in Expo constants
  const customServerIP = Constants.expoConfig?.extra?.serverIP;
  
  if (customServerIP) {
    return `http://${customServerIP}:5000`;
  }
  
  // Default local IP
  return 'http://192.168.1.100:5000'; // Fallback to a common local IP
};

// Build the final configuration
const getConfig = (): Config => {
  let environment = getEnv();
  
  // Override environment if in Replit
  if (isReplitEnvironment()) {
    environment = 'replit';
  }
  
  // Merge the default config with the environment-specific one
  const config = {
    ...defaultConfig,
    ...envConfigs[environment],
  };
  
  // Override API_URL with an IP address if in development or replit
  if (environment === 'development' || environment === 'replit') {
    config.API_URL = getServerIP();
  }
  
  return config as Config;
};

// Export the configuration
export const config = getConfig();

// Helper function to set the server IP dynamically (can be called from settings)
export const setServerIP = (ip: string): void => {
  if (config.ENV !== 'production') {
    config.API_URL = `http://${ip}:5000`;
  }
};

export default config;