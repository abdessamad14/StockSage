import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './app/hooks/useAuth';
import { ProtectedScreen } from './app/components/ProtectedScreen';

// Import screens
import LoginScreen from './app/screens/LoginScreen';
import HomeScreen from './app/screens/HomeScreen';
import OrdersScreen from './app/screens/OrdersScreen';
import CreateOrderScreen from './app/screens/CreateOrderScreen';
import ProductsScreen from './app/screens/ProductsScreen';
import SuppliersScreen from './app/screens/SuppliersScreen';

// Define theme colors
const theme = {
  colors: {
    primary: '#3366FF',
    accent: '#FF6633',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#212529',
    error: '#DC3545',
    success: '#28A745',
    info: '#17A2B8',
    warning: '#FFC107',
  },
};

// Define the stack navigator type
const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator initialRouteName="Login">
            {/* Public screens */}
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            
            {/* Protected screens */}
            <Stack.Screen 
              name="Home" 
              options={{ title: 'iGoodar Merchant' }}
            >
              {(props) => (
                <ProtectedScreen>
                  <HomeScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
            
            <Stack.Screen 
              name="Orders" 
              options={{ title: 'My Orders' }}
            >
              {(props) => (
                <ProtectedScreen>
                  <OrdersScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
            
            <Stack.Screen 
              name="CreateOrder" 
              options={{ title: 'New Order' }}
            >
              {(props) => (
                <ProtectedScreen>
                  <CreateOrderScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
            
            <Stack.Screen 
              name="Products" 
              options={{ title: 'Products' }}
            >
              {(props) => (
                <ProtectedScreen>
                  <ProductsScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
            
            <Stack.Screen 
              name="Suppliers" 
              options={{ title: 'Suppliers' }}
            >
              {(props) => (
                <ProtectedScreen>
                  <SuppliersScreen {...props} />
                </ProtectedScreen>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}