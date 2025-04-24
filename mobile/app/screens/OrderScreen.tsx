import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { getProducts, getCustomers, createOrder } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Define types for our data
type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  description?: string;
};

type Customer = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
};

type OrderItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  name: string;
};

const OrderScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [productsData, customersData] = await Promise.all([
        getProducts(),
        getCustomers()
      ]);
      
      setProducts(productsData);
      setCustomers(customersData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToOrder = (product: Product) => {
    // Check if we already have this product in the order
    const existingItemIndex = orderItems.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price
        }
      ]);
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = quantity;
    setOrderItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one product to the order');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderData = {
        sale: {
          customerId: selectedCustomer.id,
          date: new Date().toISOString(),
          totalAmount: calculateTotal(),
          status: 'completed'
        },
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        }))
      };

      await createOrder(orderData);
      
      Alert.alert(
        'Success', 
        'Order has been created successfully',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Reset order state
              setOrderItems([]);
              setSelectedCustomer(null);
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error submitting order:', err);
      setError('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchText))
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Order</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.customerSection}>
        <Text style={styles.sectionTitle}>Customer</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerList}>
          {customers.map(customer => (
            <TouchableOpacity
              key={customer.id}
              style={[
                styles.customerItem,
                selectedCustomer?.id === customer.id && styles.selectedCustomer
              ]}
              onPress={() => setSelectedCustomer(customer)}
            >
              <Text style={styles.customerName}>{customer.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Products</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name or barcode"
          value={searchText}
          onChangeText={setSearchText}
        />

        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.productItem}
              onPress={() => handleAddToOrder(item)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          )}
          style={styles.productList}
        />
      </View>

      <View style={styles.orderSection}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        {orderItems.length === 0 ? (
          <Text style={styles.emptyOrder}>No items added to this order yet</Text>
        ) : (
          <ScrollView style={styles.orderList}>
            {orderItems.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemPrice}>${item.unitPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleUpdateQuantity(index, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </ScrollView>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, (!selectedCustomer || orderItems.length === 0) && styles.disabledButton]}
          onPress={handleSubmitOrder}
          disabled={!selectedCustomer || orderItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3366FF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  customerSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  customerList: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  customerItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCustomer: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  customerName: {
    fontSize: 14,
  },
  productsSection: {
    padding: 16,
    flex: 0.5,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productList: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  addText: {
    color: '#3366FF',
    fontWeight: 'bold',
  },
  orderSection: {
    padding: 16,
    flex: 0.5,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  emptyOrder: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  orderList: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  orderItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderItemName: {
    fontSize: 16,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    backgroundColor: '#e0e0e0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  removeButton: {
    padding: 5,
    alignItems: 'flex-end',
  },
  removeButtonText: {
    color: '#f44336',
    fontSize: 14,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3366FF',
  },
  submitButton: {
    backgroundColor: '#3366FF',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default OrderScreen;