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

  const createProduct = async (product: Omit<OfflineProduct, 'id'>) => {
    try {
      const newProduct = await offlineProductStorage.create(product);
      
      // If product has initial quantity, create stock record in primary location
      if (newProduct.quantity > 0) {
        const locations = await offlineStockLocationStorage.getAll();
        const primaryLocation = locations.find((loc: any) => loc.isPrimary) || locations[0];
        
        if (primaryLocation) {
          await offlineProductStockStorage.upsert({
            productId: newProduct.id,
            locationId: primaryLocation.id,
            quantity: newProduct.quantity,
            minStockLevel: newProduct.minStockLevel || 0
          });
          
          console.log(`Created stock record for product ${newProduct.name} with ${newProduct.quantity} units in ${primaryLocation.name}`);
        }
      }
      
      await loadProducts();
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<OfflineProduct>) => {
    try {
      const updatedProduct = await offlineProductStorage.update(id, updates);
      if (updatedProduct) {
        await loadProducts();
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
        await loadProducts();
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

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    refetch: loadProducts
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
