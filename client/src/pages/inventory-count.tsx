import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Package, 
  X,
  Play,
  RefreshCw,
  Trash2,
  Scan,
  Search,
  Eye,
  BarChart3,
  AlertTriangle,
  ScanLine
} from 'lucide-react';

const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

import { 
  offlineInventoryCountStorage, 
  offlineInventoryCountItemStorage,
  offlineProductStorage,
  offlineStockLocationStorage,
  offlineProductStockStorage
} from '@/lib/offline-storage';
import VarianceReconciliation from '@/components/VarianceReconciliation';
import type { 
  OfflineInventoryCount, 
  OfflineInventoryCountItem, 
  OfflineProduct, 
  OfflineStockLocation 
} from '@/lib/offline-storage';

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'draft': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'in_progress': return <Clock className="w-4 h-4" />;
    case 'draft': return <Package className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

// Create Count Form Component
function CreateCountForm({ onSubmit, locations }: { onSubmit: (data: any) => void; locations: OfflineStockLocation[] }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSubmit({
      ...formData,
      type: 'partial'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Count Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Monthly Count - Main Store"
        />
      </div>
      
      <div>
        <Label htmlFor="location">Location *</Label>
        <Select value={formData.locationId} onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(location => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
        />
      </div>

      <Button type="submit" className="w-full">
        Create Count
      </Button>
    </form>
  );
}

// Count Card Component
function CountCard({ 
  count, 
  locations, 
  progress, 
  onStart, 
  onDelete, 
  onReopen 
}: { 
  count: OfflineInventoryCount; 
  locations: OfflineStockLocation[]; 
  progress: number; 
  onStart: () => void; 
  onDelete: () => void; 
  onReopen: () => void; 
}) {
  const location = locations.find(l => l.id === count.locationId);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{count.name}</span>
              <Badge className={getStatusColor(count.status)}>
                {getStatusIcon(count.status)}
                <span className="ml-1">{count.status}</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Location: {location?.name} • Progress: {progress}%
            </CardDescription>
          </div>
          {count.status !== 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-500 hover:text-red-700 z-10 relative"
              style={{ pointerEvents: 'auto' }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={progress} className="w-full" />
          
          <div className="flex space-x-2">
            {count.status === 'draft' && (
              <Button onClick={onStart} size="sm" className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Start Count
              </Button>
            )}
            
            {count.status === 'in_progress' && (
              <Button onClick={onReopen} size="sm" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Continue Count
              </Button>
            )}
            
            {count.status === 'completed' && (
              <Button onClick={onReopen} variant="outline" size="sm" className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Results
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function InventoryCountPage() {
  const [counts, setCounts] = useState<OfflineInventoryCount[]>([]);
  const [countItems, setCountItems] = useState<OfflineInventoryCountItem[]>([]);
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [locations, setLocations] = useState<OfflineStockLocation[]>([]);
  const [activeCount, setActiveCount] = useState<OfflineInventoryCount | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countToDelete, setCountToDelete] = useState<OfflineInventoryCount | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [countsData, productsData, locationsData] = await Promise.all([
        offlineInventoryCountStorage.getAll(),
        offlineProductStorage.getAll(),
        offlineStockLocationStorage.getAll()
      ]);
      
      setCounts(countsData || []);
      setProducts(productsData || []);
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setCounts([]);
      setProducts([]);
      setLocations([]);
    }
  };

  const loadCountItems = async (countId: string) => {
    try {
      const items = await offlineInventoryCountItemStorage.getByCountId(countId);
      console.log('Found items:', items.length);
      console.log('Items:', items);
      setCountItems(items || []);
    } catch (error) {
      console.error('Error loading count items:', error);
      setCountItems([]);
    }
  };

  const createNewCount = async (formData: any) => {
    try {
      const newCount: Omit<OfflineInventoryCount, 'id'> = {
        name: formData.name,
        locationId: formData.locationId,
        status: 'draft',
        startDate: new Date().toISOString(),
        description: formData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const createdCount = await offlineInventoryCountStorage.create(newCount);
      
      if (createdCount) {
        // Get all active products with stock in the selected location
        const allProductStock = await offlineProductStockStorage.getAll();
        const activeProducts = products.filter(p => p.active);
        
        // Create count items for each active product
        for (const product of activeProducts) {
          const productStock = allProductStock.find(ps => 
            ps.productId === product.id && ps.locationId === formData.locationId
          );
          
          if (productStock) {
            const countItem = {
              countId: createdCount.id,
              productId: product.id,
              expectedQuantity: productStock.quantity,
              actualQuantity: undefined,
              variance: undefined,
              notes: '',
              tenantId: 'offline'
            };
            
            await offlineInventoryCountItemStorage.create(countItem);
          }
        }

        setCounts(prev => [...prev, createdCount]);
        setShowCreateDialog(false);
        toast.success('Inventory count created successfully');
      }
    } catch (error) {
      console.error('Error creating inventory count:', error);
      toast.error('Failed to create inventory count');
    }
  };

  const startCount = async (count: OfflineInventoryCount) => {
    if (count.status === 'draft') {
      const updatedCount = await offlineInventoryCountStorage.update(count.id, {
        status: 'in_progress'
      });
      if (updatedCount) {
        setActiveCount(updatedCount);
        setCounts(prev => prev.map(c => c.id === count.id ? updatedCount : c));
      }
    } else {
      setActiveCount(count);
    }
    loadCountItems(count.id);
  };

  const deleteCount = async (count: OfflineInventoryCount) => {
    try {
      // Delete the count (server will handle cascade deletion of count items)
      await offlineInventoryCountStorage.delete(count.id);
      setCounts(prev => prev.filter(c => c.id !== count.id));
      
      if (activeCount?.id === count.id) {
        setActiveCount(null);
      }
      toast.success('Count deleted successfully');
    } catch (error) {
      console.error('Error deleting count:', error);
      toast.error('Failed to delete inventory count');
    }
  };

  const updateCountItem = async (itemId: string, actualQuantity: number) => {
    try {
      const currentItem = countItems.find(item => item.id === itemId);
      const expectedQuantity = currentItem?.expectedQuantity || 0;
      
      const updatedItem = await offlineInventoryCountItemStorage.update(itemId, {
        actualQuantity,
        variance: actualQuantity - expectedQuantity,
        updatedAt: new Date().toISOString()
      });
      
      if (updatedItem) {
        setCountItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
      }
    } catch (error) {
      console.error('Error updating count item:', error);
      toast.error('Failed to update count item');
    }
  };

  const completeCount = async (count: OfflineInventoryCount) => {
    try {
      const updatedCount = await offlineInventoryCountStorage.update(count.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      if (updatedCount) {
        setActiveCount(updatedCount);
        setCounts(prev => prev.map(c => c.id === count.id ? updatedCount : c));
        toast.success('Inventory count completed!');
      }
    } catch (error) {
      console.error('Error completing count:', error);
      toast.error('Failed to complete inventory count');
    }
  };

  const handleSaveCount = async (itemId: string) => {
    const quantity = parseInt(tempQuantity) || 0;
    await updateCountItem(itemId, quantity);
    
    // Check if all items are counted
    const updatedItems = await offlineInventoryCountItemStorage.getByCountId(activeCount?.id || '');
    const allCounted = updatedItems.every(item => item.actualQuantity !== undefined && item.actualQuantity !== null);
    
    if (allCounted && activeCount?.status === 'in_progress') {
      await completeCount(activeCount);
    }
    
    setEditingItemId(null);
    setTempQuantity('');
    loadCountItems(activeCount?.id || '');
  };

  const handleStartEdit = (itemId: string, currentQuantity?: number) => {
    setEditingItemId(itemId);
    setTempQuantity(currentQuantity?.toString() || '');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempQuantity('');
  };

  const handleBarcodeSearch = (barcode: string) => {
    if (!barcode.trim()) return;
    
    const product = products.find(p => p.barcode === barcode.trim());
    if (product) {
      const countItem = countItems.find(item => item.productId === product.id);
      if (countItem) {
        handleStartEdit(countItem.id, countItem.actualQuantity);
      } else {
        toast.error('Product not found in this count');
      }
    } else {
      toast.error('Product with this barcode not found');
    }
    setBarcodeInput('');
  };

  // Calculate progress for each count
  const getCountProgress = (countId: string) => {
    const items = countItems.filter(item => item.countId === countId);
    if (items.length === 0) return 0;
    const countedItems = items.filter(item => item.actualQuantity !== undefined && item.actualQuantity !== null);
    return Math.round((countedItems.length / items.length) * 100);
  };

  // Filter count items based on search
  const filteredCountItems = countItems.filter(item => {
    if (!searchQuery) return true;
    const product = products.find(p => p.id === item.productId);
    return product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product?.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!activeCount) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inventory Counts</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Count
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Inventory Count</DialogTitle>
                <DialogDescription>
                  Set up a new inventory count for accurate stock tracking.
                </DialogDescription>
              </DialogHeader>
              <CreateCountForm onSubmit={createNewCount} locations={locations} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {counts.map(count => (
            <CountCard
              key={count.id}
              count={count}
              locations={locations}
              progress={getCountProgress(count.id)}
              onStart={() => startCount(count)}
              onDelete={() => {
                setCountToDelete(count);
                setShowDeleteDialog(true);
              }}
              onReopen={() => startCount(count)}
            />
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory Count</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{countToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => {
                if (countToDelete) {
                  deleteCount(countToDelete);
                  setShowDeleteDialog(false);
                  setCountToDelete(null);
                }
              }}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Active count view
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="ghost" onClick={() => setActiveCount(null)} className="mb-2">
            ← Back to Counts
          </Button>
          <h1 className="text-3xl font-bold">{activeCount.name}</h1>
          <p className="text-gray-600">
            Location: {locations.find(l => l.id === activeCount.locationId)?.name}
          </p>
        </div>
        <Badge className={getStatusColor(activeCount.status)}>
          {getStatusIcon(activeCount.status)}
          <span className="ml-1">{activeCount.status}</span>
        </Badge>
      </div>

      {/* Search and Barcode Scanner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <ScanLine className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={barcodeInputRef}
            placeholder="Scan or enter barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleBarcodeSearch(barcodeInput);
              }
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Count Items */}
      <div className="space-y-4">
        {filteredCountItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return null;

          const isEditing = editingItemId === item.id;
          const variance = item.variance || 0;
          const hasVariance = Math.abs(variance) > 0;

          return (
            <Card key={item.id} className={hasVariance ? 'border-orange-200 bg-orange-50' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Expected: {item.expectedQuantity} | 
                      Counted: {item.actualQuantity ?? 'Not counted'}
                      {hasVariance && (
                        <span className={`ml-2 font-medium ${variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({variance > 0 ? '+' : ''}{variance})
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(e.target.value)}
                          className="w-20"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSaveCount(item.id)}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStartEdit(item.id, item.actualQuantity)}
                      >
                        {item.actualQuantity !== undefined ? 'Edit' : 'Count'}
                      </Button>
                    )}
                    
                    <Badge variant={item.actualQuantity !== undefined ? 'default' : 'secondary'}>
                      {item.actualQuantity !== undefined ? 'counted' : 'pending'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
