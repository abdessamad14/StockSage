import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Title, 
  Divider,
  IconButton, 
  HelperText,
  ActivityIndicator,
  Appbar,
  Menu,
  Searchbar
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Supplier, Product, ordersApi, suppliersApi, productsApi } from '../api/api';

interface OrderItem {
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
}

const CreateOrderScreen = () => {
  const navigation = useNavigation();
  
  // State for form data
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // State for data fetching
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for UI/UX
  const [supplierMenuVisible, setSupplierMenuVisible] = useState(false);
  const [productSearchVisible, setProductSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Fetch suppliers and products
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch suppliers
      const supplierData = await suppliersApi.getSuppliers();
      setSuppliers(supplierData);
      
      // Fetch products
      const productData = await productsApi.getProducts();
      setProducts(productData);
      setFilteredProducts(productData);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate total amount when order items change
  useEffect(() => {
    const newTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setTotalAmount(newTotal);
  }, [orderItems]);

  // Filter products when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(products);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(query) || 
      (product.barcode && product.barcode.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
    
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Add product to order
  const addProductToOrder = (product: Product) => {
    // Check if product already exists in order
    const existingIndex = orderItems.findIndex(item => item.productId === product.id);
    
    if (existingIndex !== -1) {
      // Update quantity of existing item
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: product.price
        }
      ]);
    }
    
    // Close product search
    setProductSearchVisible(false);
    setSearchQuery('');
  };

  // Update order item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      // Show delete confirmation if quantity is set to 0 or negative
      Alert.alert(
        'Remove Item',
        'Do you want to remove this item from the order?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => {
              const newItems = [...orderItems];
              newItems.splice(index, 1);
              setOrderItems(newItems);
            }
          }
        ]
      );
      return;
    }
    
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    setOrderItems(newItems);
  };

  // Update item price
  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...orderItems];
    newItems[index].unitPrice = price;
    setOrderItems(newItems);
  };

  // Remove item from order
  const removeItem = (index: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from the order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const newItems = [...orderItems];
            newItems.splice(index, 1);
            setOrderItems(newItems);
          }
        }
      ]
    );
  };

  // Submit order
  const submitOrder = async () => {
    // Validate form
    if (!selectedSupplier) {
      Alert.alert('Missing Information', 'Please select a supplier');
      return;
    }
    
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one product to the order');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare order data
      const orderData = {
        order: {
          supplierId: selectedSupplier.id,
          notes: notes.trim(),
          totalAmount,
          status: 'pending',
          orderNumber: `PO-${Date.now().toString().slice(-8)}`
        },
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        }))
      };
      
      // Submit order
      const createdOrder = await ordersApi.createOrder(orderData);
      
      // Show success message
      Alert.alert(
        'Order Created',
        `Order #${createdOrder.orderNumber} has been created successfully`,
        [
          { 
            text: 'View Orders', 
            onPress: () => navigation.navigate('Orders' as never) 
          },
          { 
            text: 'Create Another', 
            onPress: () => {
              setSelectedSupplier(null);
              setNotes('');
              setOrderItems([]);
            } 
          }
        ]
      );
    } catch (err) {
      console.error('Failed to create order', err);
      setError('Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Create Order" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Error message */}
        {error && (
          <HelperText type="error" visible={!!error} style={styles.errorText}>
            {error}
          </HelperText>
        )}
        
        {/* Supplier selection */}
        <View style={styles.formGroup}>
          <Title style={styles.sectionTitle}>Supplier Information</Title>
          <Menu
            visible={supplierMenuVisible}
            onDismiss={() => setSupplierMenuVisible(false)}
            anchor={
              <TouchableOpacity 
                style={styles.supplierSelector} 
                onPress={() => setSupplierMenuVisible(true)}
              >
                <Text style={selectedSupplier ? styles.selectedText : styles.placeholderText}>
                  {selectedSupplier ? selectedSupplier.name : 'Select a supplier'}
                </Text>
                <IconButton icon="chevron-down" size={20} />
              </TouchableOpacity>
            }
          >
            {suppliers.map(supplier => (
              <Menu.Item
                key={supplier.id}
                title={supplier.name}
                onPress={() => {
                  setSelectedSupplier(supplier);
                  setSupplierMenuVisible(false);
                }}
              />
            ))}
          </Menu>
          
          {selectedSupplier && (
            <View style={styles.supplierInfo}>
              {selectedSupplier.email && (
                <Text style={styles.supplierDetail}>
                  <Text style={styles.detailLabel}>Email: </Text>
                  {selectedSupplier.email}
                </Text>
              )}
              {selectedSupplier.phone && (
                <Text style={styles.supplierDetail}>
                  <Text style={styles.detailLabel}>Phone: </Text>
                  {selectedSupplier.phone}
                </Text>
              )}
            </View>
          )}
          
          <TextInput
            label="Order Notes"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Products section */}
        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Order Items</Title>
            <Button 
              mode="contained" 
              onPress={() => setProductSearchVisible(true)}
              icon="plus"
              style={styles.addButton}
            >
              Add Product
            </Button>
          </View>
          
          {/* Product search modal */}
          {productSearchVisible && (
            <View style={styles.productSearch}>
              <View style={styles.searchHeader}>
                <Searchbar
                  placeholder="Search products..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchbar}
                  autoFocus
                />
                <IconButton 
                  icon="close" 
                  size={24} 
                  onPress={() => {
                    setProductSearchVisible(false);
                    setSearchQuery('');
                  }} 
                />
              </View>
              
              <ScrollView style={styles.productList}>
                {filteredProducts.length === 0 ? (
                  <Text style={styles.noProductsText}>
                    No products found. Try a different search.
                  </Text>
                ) : (
                  filteredProducts.map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productItem}
                      onPress={() => addProductToOrder(product)}
                    >
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.name}</Text>
                        {product.description && (
                          <Text style={styles.productDescription} numberOfLines={1}>
                            {product.description}
                          </Text>
                        )}
                        <Text style={styles.productStock}>
                          In stock: {product.quantity} units
                        </Text>
                      </View>
                      <Text style={styles.productPrice}>
                        ${product.price.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
          
          {/* Order items list */}
          {orderItems.length === 0 ? (
            <Text style={styles.emptyOrderText}>
              No items added to this order yet. Click "Add Product" to start.
            </Text>
          ) : (
            orderItems.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.orderItem}>
                <View style={styles.orderItemHeader}>
                  <Text style={styles.orderItemName}>{item.product.name}</Text>
                  <IconButton 
                    icon="trash-can-outline" 
                    size={20} 
                    color="#DC3545"
                    onPress={() => removeItem(index)}
                  />
                </View>
                
                <View style={styles.orderItemDetails}>
                  <View style={styles.quantityContainer}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <View style={styles.quantityControls}>
                      <IconButton 
                        icon="minus" 
                        size={16} 
                        onPress={() => updateItemQuantity(index, item.quantity - 1)}
                        style={styles.quantityButton}
                      />
                      <TextInput
                        value={item.quantity.toString()}
                        onChangeText={(text) => {
                          const quantity = parseInt(text) || 0;
                          updateItemQuantity(index, quantity);
                        }}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.quantityInput}
                      />
                      <IconButton 
                        icon="plus" 
                        size={16} 
                        onPress={() => updateItemQuantity(index, item.quantity + 1)}
                        style={styles.quantityButton}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.priceContainer}>
                    <Text style={styles.detailLabel}>Unit Price ($):</Text>
                    <TextInput
                      value={item.unitPrice.toString()}
                      onChangeText={(text) => {
                        const price = parseFloat(text) || 0;
                        updateItemPrice(index, price);
                      }}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.priceInput}
                    />
                  </View>
                </View>
                
                <View style={styles.orderItemFooter}>
                  <Text style={styles.orderItemTotal}>
                    Total: ${(item.quantity * item.unitPrice).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        
        {/* Order summary */}
        {orderItems.length > 0 && (
          <>
            <Divider style={styles.divider} />
            
            <View style={styles.summaryContainer}>
              <Title style={styles.sectionTitle}>Order Summary</Title>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items:</Text>
                <Text style={styles.summaryValue}>{orderItems.length}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quantity:</Text>
                <Text style={styles.summaryValue}>
                  {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Order Total:</Text>
                <Text style={styles.summaryTotalValue}>
                  ${totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Submit button */}
      <View style={styles.submitContainer}>
        <Button
          mode="contained"
          onPress={submitOrder}
          loading={submitting}
          disabled={submitting || orderItems.length === 0 || !selectedSupplier}
          icon="check"
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Submit Order
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  appbar: {
    backgroundColor: '#3366FF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Extra padding for submit button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#FFF',
  },
  placeholderText: {
    color: '#6C757D',
  },
  selectedText: {
    color: '#212529',
  },
  supplierInfo: {
    backgroundColor: '#F1F3F5',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  supplierDetail: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  addButton: {
    backgroundColor: '#28A745',
  },
  productSearch: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 0,
  },
  productList: {
    maxHeight: 300,
    padding: 8,
  },
  noProductsText: {
    textAlign: 'center',
    padding: 16,
    color: '#6C757D',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  productDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#28A745',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3366FF',
    marginLeft: 12,
  },
  emptyOrderText: {
    textAlign: 'center',
    padding: 16,
    color: '#6C757D',
    fontStyle: 'italic',
    backgroundColor: '#F1F3F5',
    borderRadius: 4,
  },
  orderItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  orderItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityContainer: {
    flex: 1,
    marginRight: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityButton: {
    margin: 0,
  },
  quantityInput: {
    height: 40,
    width: 60,
    marginHorizontal: 4,
  },
  priceContainer: {
    flex: 1,
    marginLeft: 8,
  },
  priceInput: {
    height: 40,
    marginTop: 4,
  },
  orderItemFooter: {
    alignItems: 'flex-end',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3366FF',
  },
  summaryContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  summaryValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: 'bold',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3366FF',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButton: {
    backgroundColor: '#3366FF',
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
});

export default CreateOrderScreen;