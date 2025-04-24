import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Text, Divider, Searchbar, IconButton } from 'react-native-paper';
import { Supplier, suppliersApi } from '../api/api';

const SuppliersScreen = () => {
  // State for data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await suppliersApi.getSuppliers();
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
      setError('Failed to load suppliers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  // Handle search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSuppliers(suppliers);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(query) ||
      (supplier.email && supplier.email.toLowerCase().includes(query)) ||
      (supplier.phone && supplier.phone.toLowerCase().includes(query)) ||
      (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(query))
    );
    
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);

  // Render supplier card
  const renderSupplierCard = ({ item }: { item: Supplier }) => (
    <Card style={styles.supplierCard}>
      <Card.Content>
        <Title style={styles.supplierName}>{item.name}</Title>
        
        {item.contactPerson && (
          <Text style={styles.contactPerson}>Contact: {item.contactPerson}</Text>
        )}
        
        <Divider style={styles.divider} />
        
        <View style={styles.contactInfo}>
          {item.email && (
            <View style={styles.contactRow}>
              <IconButton icon="email" size={16} style={styles.contactIcon} />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
          )}
          
          {item.phone && (
            <View style={styles.contactRow}>
              <IconButton icon="phone" size={16} style={styles.contactIcon} />
              <Text style={styles.contactText}>{item.phone}</Text>
            </View>
          )}
          
          {item.address && (
            <View style={styles.contactRow}>
              <IconButton icon="map-marker" size={16} style={styles.contactIcon} />
              <Text style={styles.contactText}>{item.address}</Text>
            </View>
          )}
        </View>
        
        {item.notes && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Paragraph style={styles.notesText}>{item.notes}</Paragraph>
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Loading suppliers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search suppliers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredSuppliers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No suppliers found</Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Try changing your search query'
              : 'There are no suppliers available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSupplierCard}
          contentContainerStyle={styles.supplierList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3366FF']} />
          }
        />
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  searchContainer: {
    padding: 16,
  },
  searchbar: {
    elevation: 2,
    backgroundColor: '#FFF',
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
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C757D',
    marginBottom: 8,
  },
  emptyText: {
    color: '#ADB5BD',
    textAlign: 'center',
  },
  supplierList: {
    padding: 16,
  },
  supplierCard: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  contactPerson: {
    color: '#495057',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  contactInfo: {
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    margin: 0,
    marginRight: 4,
  },
  contactText: {
    color: '#495057',
    flex: 1,
  },
  notesContainer: {
    marginTop: 4,
  },
  notesLabel: {
    fontWeight: 'bold',
    color: '#6C757D',
    marginBottom: 4,
  },
  notesText: {
    color: '#6C757D',
    fontStyle: 'italic',
  },
});

export default SuppliersScreen;