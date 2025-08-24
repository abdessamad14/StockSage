import { useState, useEffect } from 'react';
import { offlineProductStorage } from '@/lib/hybrid-storage';
import { OfflineProduct } from '@/lib/offline-storage';

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
    const foundProduct = offlineProductStorage.getById(id);
    setProduct(foundProduct || null);
    setLoading(false);
  }, [id]);

  return { product, loading };
}
