import { useState, useEffect } from 'react';
import { 
  offlineProductStorage, 
  OfflineProduct, 
  offlineStockLocationStorage, 
  offlineProductStockStorage 
} from '../lib/database-storage';

export function useOfflineProducts() {
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await offlineProductStorage.getAll();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Enhanced product creation with automatic stock tracking
  const createProduct = async (product: Omit<OfflineProduct, 'id'>) => {
    try {
      const newProduct = await offlineProductStorage.create(product);
      
      // Automatically create stock records and initial transaction if product has quantity
      if (newProduct.quantity > 0) {
        await ensureStockRecordExists(newProduct);
      }
      
      // Optimized: Add new product to state instead of reloading all products
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<OfflineProduct>) => {
    try {
      // Get the current product from loaded products state
      const currentProduct = products.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Product not found in loaded products');
      }

      const updatedProduct = await offlineProductStorage.update(id, updates);
      if (updatedProduct) {
        // Check if quantity was changed and create stock history entry
        if (updates.quantity !== undefined && updates.quantity !== currentProduct.quantity) {
          await createStockHistoryForQuantityChange(
            currentProduct,
            currentProduct.quantity,
            updates.quantity
          );

          // Sync primary warehouse stock to match product quantity
          const locations = await offlineStockLocationStorage.getAll();
          const primaryLocation = locations.find((loc: any) => loc.isPrimary) || locations[0];
          
          if (primaryLocation) {
            await offlineProductStockStorage.upsert({
              productId: id,
              locationId: primaryLocation.id,
              quantity: updates.quantity,
              minStockLevel: 0
            });
          }
        }
        
        // Optimized: Update product in state instead of reloading all products
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      }
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const success = await offlineProductStorage.delete(id);
      if (success) {
        // Optimized: Remove product from state instead of reloading all products
        setProducts(prev => prev.filter(p => p.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const searchProducts = async (query: string) => {
    try {
      return await offlineProductStorage.search(query);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  };

  const createStockHistoryForQuantityChange = async (
    product: OfflineProduct,
    previousQuantity: number,
    newQuantity: number
  ) => {
    try {
      const locations = await offlineStockLocationStorage.getAll();
      const primaryLocation = locations.find((loc: any) => loc.isPrimary) || locations[0];
      
      if (!primaryLocation) {
        console.warn('No primary location found for stock history creation');
        return;
      }

      // Import stock transaction storage dynamically
      const { offlineStockTransactionStorage } = await import('../lib/database-storage');
      
      const quantityDifference = newQuantity - previousQuantity;
      const transactionType = quantityDifference > 0 ? 'adjustment' : 'adjustment';
      
      await offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: primaryLocation.id,
        type: transactionType,
        quantity: quantityDifference,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        reason: 'Product quantity updated via edit',
        reference: `EDIT-${product.id}-${Date.now()}`
      });
      
      console.log(`Created stock history entry for ${product.name}: ${previousQuantity} → ${newQuantity}`);
    } catch (error) {
      console.error('Error creating stock history for quantity change:', error);
    }
  };

  const ensureStockRecordExists = async (product: OfflineProduct) => {
    try {
      const locations = await offlineStockLocationStorage.getAll();
      const primaryLocation = locations.find((loc: any) => loc.isPrimary) || locations[0];
      
      if (!primaryLocation) {
        console.warn('No primary location found for stock record creation');
        return;
      }

      // Check if stock record already exists
      const existingStock = await offlineProductStockStorage.getByProductAndLocation(product.id, primaryLocation.id);
      
      if (!existingStock && product.quantity > 0) {
        // Create stock record in primary location
        await offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: primaryLocation.id,
          quantity: product.quantity,
          minStockLevel: product.minStockLevel || 0
        });

        // Create initial stock transaction for history tracking
        try {
          const { offlineStockTransactionStorage } = await import('../lib/database-storage');
          await offlineStockTransactionStorage.create({
            productId: product.id,
            warehouseId: primaryLocation.id,
            type: 'entry',
            quantity: product.quantity,
            previousQuantity: 0,
            newQuantity: product.quantity,
            reason: 'Initial stock entry',
            reference: `INIT-${product.id}`
          });
          console.log(`Created stock record and transaction for ${product.name}`);
        } catch (transactionError) {
          console.warn(`Could not create initial stock transaction for ${product.name}:`, transactionError);
        }
      }
    } catch (error) {
      console.error('Error ensuring stock record exists:', error);
    }
  };

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    refetch: loadProducts,
    ensureStockRecordExists
  };
}

export function useOfflineProduct(id: string) {
  const [product, setProduct] = useState<OfflineProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const foundProduct = await offlineProductStorage.getById(id);
        setProduct(foundProduct || null);
      } catch (error) {
        console.error('Error loading product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [id]);

  return { product, loading };
}
