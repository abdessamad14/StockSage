import { useState, useEffect } from 'react';
import { offlineProductStorage, OfflineProduct } from '@/lib/offline-storage';

export function useOfflineProducts() {
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = () => {
    setLoading(true);
    const allProducts = offlineProductStorage.getAll();
    setProducts(allProducts);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const createProduct = (product: Omit<OfflineProduct, 'id'>) => {
    const newProduct = offlineProductStorage.create(product);
    loadProducts();
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<OfflineProduct>) => {
    const updatedProduct = offlineProductStorage.update(id, updates);
    if (updatedProduct) {
      loadProducts();
    }
    return updatedProduct;
  };

  const deleteProduct = (id: string) => {
    const success = offlineProductStorage.delete(id);
    if (success) {
      loadProducts();
    }
    return success;
  };

  const searchProducts = (query: string) => {
    return offlineProductStorage.search(query);
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
