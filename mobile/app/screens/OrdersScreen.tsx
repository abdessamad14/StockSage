import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Chip, Button, Searchbar, Text, Divider, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Order, ordersApi } from '../api/api';

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const navigation = useNavigation();

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrders();
      setOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Handle search
  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    if (!query && !statusFilter) {
      setFilteredOrders(orders);
      return;
    }
    
    filterOrders(query, statusFilter);
  };

  // Handle status filter
  const toggleStatusFilter = (status: string) => {
    const newFilter = statusFilter === status ? null : status;
    setStatusFilter(newFilter);
    filterOrders(searchQuery, newFilter);
  };

  // Apply filters
  const filterOrders = (query: string, status: string | null) => {
    let filtered = [...orders];
    
    // Apply search query
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(lowercaseQuery) ||
        (order.supplier?.name && order.supplier.name.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // Apply status filter
    if (status) {
      filtered = filtered.filter(order => order.status === status);
    }
    
    setFilteredOrders(filtered);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'in_transit': return '#3366FF';
      case 'received': return '#28A745';
      case 'cancelled': return '#DC3545';
      default: return '#6C757D';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render an order card
  const renderOrderCard = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard} onPress={() => navigation.navigate('OrderDetails' as never, { orderId: item.id } as never)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Title style={styles.orderNumber}>{item.orderNumber}</Title>
          <Chip 
            style={{ backgroundColor: getStatusColor(item.status) + '20' }} 
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Supplier:</Text>
            <Text style={styles.infoValue}>{item.supplier?.name || 'Unknown supplier'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items:</Text>
            <Text style={styles.infoValue}>{item.items?.length || 0} items</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total:</Text>
            <Text style={styles.infoValue}>${item.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchOrders} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersLabel}>Filter by status:</Text>
        <View style={styles.chipContainer}>
          <Chip 
            selected={statusFilter === 'pending'} 
            onPress={() => toggleStatusFilter('pending')} 
            style={styles.filterChip}
            selectedColor="#FFC107"
          >
            Pending
          </Chip>
          <Chip 
            selected={statusFilter === 'in_transit'} 
            onPress={() => toggleStatusFilter('in_transit')} 
            style={styles.filterChip}
            selectedColor="#3366FF"
          >
            In Transit
          </Chip>
          <Chip 
            selected={statusFilter === 'received'} 
            onPress={() => toggleStatusFilter('received')} 
            style={styles.filterChip}
            selectedColor="#28A745"
          >
            Received
          </Chip>
          <Chip 
            selected={statusFilter === 'cancelled'} 
            onPress={() => toggleStatusFilter('cancelled')} 
            style={styles.filterChip}
            selectedColor="#DC3545"
          >
            Cancelled
          </Chip>
        </View>
      </View>
      
      {filteredOrders.length === 0 ? (
        <View style={styles.noOrdersContainer}>
          <Text style={styles.noOrdersText}>No orders found</Text>
          <Paragraph style={styles.noOrdersSubText}>
            {searchQuery || statusFilter 
              ? 'Try changing your search or filters' 
              : 'Create your first order to get started'}
          </Paragraph>
          {!searchQuery && !statusFilter && (
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('CreateOrder' as never)} 
              style={styles.createButton}
            >
              Create Order
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3366FF']} />
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateOrder' as never)}
        color="#FFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3366FF',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
    backgroundColor: '#FFF',
  },
  filtersContainer: {
    padding: 16,
    paddingTop: 0,
  },
  filtersLabel: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  orderCard: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
  },
  orderInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  infoLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  infoValue: {
    flex: 1,
    color: '#212529',
  },
  noOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noOrdersText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  noOrdersSubText: {
    textAlign: 'center',
    color: '#6C757D',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#3366FF',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3366FF',
  },
});

export default OrdersScreen;