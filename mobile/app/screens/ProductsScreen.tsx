import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Searchbar, Chip, Card, Title, Paragraph, Text, Badge, Divider, useTheme } from 'react-native-paper';
import { Product, productsApi } from '../api/api';

const ProductsScreen = () => {
  const theme = useTheme();
  
  // State for data
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // State for loading and error
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all products
      const data = await productsApi.getProducts();
      setProducts(data);
      setFilteredProducts(data);
      
      // Extract categories
      const categorySet = new Set<string>();
      data.forEach(product => {
        if (product.category) {
          categorySet.add(product.category);
        }
      });
      
      setCategories(Array.from(categorySet));
    } catch (err) {
      console.error('Failed to fetch products', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Apply low stock filter
    if (showLowStock) {
      filtered = filtered.filter(product => product.lowStock);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, showLowStock, products]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setShowLowStock(false);
  };

  // Toggle category filter
  const toggleCategory = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  // Render product card
  const renderProductCard = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <Card.Content>
        <View style={styles.productHeader}>
          <Title style={styles.productName}>{item.name}</Title>
          {item.lowStock && (
            <Badge style={styles.lowStockBadge}>Low Stock</Badge>
          )}
        </View>
        
        {item.description && (
          <Paragraph style={styles.productDescription}>{item.description}</Paragraph>
        )}
        
        <Divider style={styles.divider} />
        
        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>${item.price.toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cost:</Text>
            <Text style={styles.detailValue}>${item.cost.toFixed(2)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>In Stock:</Text>
            <Text 
              style={[
                styles.detailValue, 
                item.lowStock ? styles.lowStockText : styles.inStockText
              ]}
            >
              {item.quantity} units
            </Text>
          </View>
          
          {item.minStockLevel !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Min Stock:</Text>
              <Text style={styles.detailValue}>{item.minStockLevel} units</Text>
            </View>
          )}
          
          {item.barcode && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Barcode:</Text>
              <Text style={styles.detailValue}>{item.barcode}</Text>
            </View>
          )}
          
          {item.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{item.category}</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>
      
      <View style={styles.filtersContainer}>
        <View style={styles.filterTitleRow}>
          <Text style={styles.filtersTitle}>Filters:</Text>
          {(selectedCategory || showLowStock) && (
            <Chip 
              mode="flat" 
              onPress={clearFilters} 
              style={{ backgroundColor: theme.colors.error + '20' }}
              textStyle={{ color: theme.colors.error }}
            >
              Clear All
            </Chip>
          )}
        </View>
        
        <View style={styles.chipContainer}>
          <Text style={styles.chipLabel}>Categories:</Text>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Chip
                mode="outlined"
                selected={selectedCategory === item}
                onPress={() => toggleCategory(item)}
                style={styles.categoryChip}
                selectedColor="#3366FF"
              >
                {item}
              </Chip>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}
          />
        </View>
        
        <View style={styles.chipContainer}>
          <Chip
            mode="outlined"
            selected={showLowStock}
            onPress={() => setShowLowStock(!showLowStock)}
            style={styles.stockChip}
            selectedColor="#DC3545"
          >
            Low Stock Only
          </Chip>
        </View>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>
            {searchQuery || selectedCategory || showLowStock
              ? 'Try changing your search or filters'
              : 'There are no products available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductCard}
          contentContainerStyle={styles.productList}
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
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
    backgroundColor: '#FFF',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  chipContainer: {
    marginBottom: 8,
  },
  chipLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  chipList: {
    paddingRight: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  stockChip: {
    alignSelf: 'flex-start',
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
  productList: {
    padding: 16,
  },
  productCard: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#DC3545',
    color: '#FFF',
  },
  productDescription: {
    color: '#6C757D',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  productDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  detailValue: {
    flex: 1,
    color: '#212529',
  },
  lowStockText: {
    color: '#DC3545',
  },
  inStockText: {
    color: '#28A745',
  },
});

export default ProductsScreen;