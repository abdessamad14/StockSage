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
      
      <Button type="submit" className="w-full">Create Count</Button>
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
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          {count.status === 'draft' && (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStart();
              }} 
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Count
            </Button>
          )}
          {count.status === 'in_progress' && (
            <button 
              onClick={() => onStart()} 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 bg-white text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Continue Count
            </button>
          )}
          {count.status === 'completed' && (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReopen();
              }} 
              variant="outline" 
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reopen Count
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryCountPage() {
  const [counts, setCounts] = useState<OfflineInventoryCount[]>([]);
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [locations, setLocations] = useState<OfflineStockLocation[]>([]);
  const [activeCount, setActiveCount] = useState<OfflineInventoryCount | null>(null);
  const [countItems, setCountItems] = useState<OfflineInventoryCountItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countToDelete, setCountToDelete] = useState<OfflineInventoryCount | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allCounts = offlineInventoryCountStorage.getAll();
    const allProducts = offlineProductStorage.getAll();
    const allLocations = offlineStockLocationStorage.getAll();
    
    setCounts(allCounts);
    setProducts(allProducts);
    setLocations(allLocations);
  };

  const loadCountItems = (countId: string) => {
    const items = offlineInventoryCountItemStorage.getByCountId(countId);
    console.log('Loading count items for count:', countId);
    console.log('Found items:', items.length);
    console.log('Items:', items);
    setCountItems(items);
  };

  // Reopen count function
  const reopenCount = (count: OfflineInventoryCount) => {
    const updatedCount = offlineInventoryCountStorage.update(count.id, {
      status: 'in_progress',
      completedAt: null
    });
    
    if (updatedCount) {
      setCounts(prev => prev.map(c => c.id === count.id ? updatedCount : c));
      toast.success('Count reopened successfully');
    }
  };

  const createNewCount = (formData: any) => {
    const newCount: Omit<OfflineInventoryCount, 'id'> = {
      name: formData.name,
      description: formData.description || '',
      locationId: formData.locationId,
      type: formData.type,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    const createdCount = offlineInventoryCountStorage.create(newCount);
    if (createdCount) {
      // Create count items for all active products at this location
      const activeProducts = products.filter(p => p.active);
      console.log('Creating count items for', activeProducts.length, 'active products at location', formData.locationId);

      activeProducts.forEach(product => {
        // Check if stock exists for this product at this location
        let stock = offlineProductStockStorage.getAll()
          .find(s => s.productId === product.id && s.locationId === formData.locationId);
        
        // If no stock exists for this location, create it with 0 quantity
        if (!stock) {
          stock = offlineProductStockStorage.upsert({
            productId: product.id,
            locationId: formData.locationId,
            quantity: 0,
            minStockLevel: 0
          });
          console.log('Created stock entry for product:', product.name, 'at location:', formData.locationId);
        }

        if (stock) {
          const createdItem = offlineInventoryCountItemStorage.create({
            countId: createdCount.id,
            productId: product.id,
            locationId: formData.locationId,
            systemQuantity: stock.quantity,
            countedQuantity: undefined,
            variance: undefined,
            status: 'pending',
            notes: ''
          });
          console.log('Created count item for product:', product.name, 'with stock quantity:', stock.quantity);
        }
      });

      setCounts(prev => [...prev, createdCount]);
      setShowCreateDialog(false);
      toast.success('Inventory count created successfully');
    }
  };

  const startCount = (count: OfflineInventoryCount) => {
    if (count.status === 'draft') {
      const updatedCount = offlineInventoryCountStorage.update(count.id, {
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

  const handleDeleteClick = (count: OfflineInventoryCount) => {
    if (count.status === 'completed') {
      toast.error('Cannot delete completed counts');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${count.name}"? This action cannot be undone.`)) {
      // Delete count items first
      const items = offlineInventoryCountItemStorage.getByCountId(count.id);
      items.forEach(item => {
        offlineInventoryCountItemStorage.delete(item.id);
      });

      // Delete the count
      offlineInventoryCountStorage.delete(count.id);
      setCounts(prev => prev.filter(c => c.id !== count.id));
      toast.success('Count deleted successfully');
    }
  };

  const confirmDeleteCount = () => {
    if (!countToDelete) return;

    // Delete count items first
    const items = offlineInventoryCountItemStorage.getByCountId(countToDelete.id);
    items.forEach(item => {
      offlineInventoryCountItemStorage.delete(item.id);
    });

    // Delete the count
    offlineInventoryCountStorage.delete(countToDelete.id);
    setCounts(prev => prev.filter(c => c.id !== countToDelete.id));
    
    setShowDeleteDialog(false);
    setCountToDelete(null);
    toast.success('Count deleted successfully');
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setCountToDelete(null);
  };

  const handleStartEdit = (itemId: string, currentQuantity: number | null) => {
    setEditingItemId(itemId);
    setTempQuantity(currentQuantity?.toString() || '');
  };

  const handleSaveCount = (itemId: string) => {
    const quantity = parseInt(tempQuantity) || 0;
    const countItem = countItems.find(item => item.id === itemId);
    
    if (countItem && activeCount) {
      const variance = quantity - countItem.systemQuantity;
      const updatedItem = offlineInventoryCountItemStorage.update(countItem.id, {
        countedQuantity: quantity,
        variance: variance,
        status: 'counted'
      });

      if (updatedItem) {
        setCountItems(prev => prev.map(item => 
          item.id === itemId ? updatedItem : item
        ));
        
        // Check if all items are counted
        const newCountItems = countItems.map(item => 
          item.id === itemId ? updatedItem : item
        );
        const allCounted = newCountItems.every(item => item.status === 'counted' || item.status === 'verified');
        
        if (allCounted && activeCount?.status === 'in_progress') {
          const completedCount = offlineInventoryCountStorage.update(activeCount.id, {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
          
          if (completedCount) {
            setActiveCount(completedCount);
            setCounts(prev => prev.map(count => 
              count.id === activeCount.id ? completedCount : count
            ));
            toast.success('Inventory count completed!');
          }
        }
      }
    }
    
    setEditingItemId(null);
    setTempQuantity('');
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
        handleStartEdit(countItem.id, countItem.countedQuantity);
      } else {
        toast.error('Product not found in this count');
      }
    } else {
      toast.error('Product not found');
    }
  };

  const getCountProgress = (count: OfflineInventoryCount) => {
    const items = offlineInventoryCountItemStorage.getByCountId(count.id);
    const countedItems = items.filter((item: OfflineInventoryCountItem) => 
      item.status === 'counted' || item.status === 'verified'
    );
    return items.length > 0 ? (countedItems.length / items.length) * 100 : 0;
  };

  const filteredCountItems = countItems.filter(item => {
    if (!searchQuery) return true;
    const product = products.find(p => p.id === item.productId);
    return product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product?.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const varianceItems = countItems.filter(item => 
    item.status === 'counted' && Math.abs(item.variance) > 0
  );

  if (!activeCount) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inventory Count</h1>
            <p className="text-muted-foreground">
              Manage physical inventory counts and reconcile stock levels
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Count
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Inventory Count</DialogTitle>
                <DialogDescription>
                  Start a new physical inventory count session
                </DialogDescription>
              </DialogHeader>
              <CreateCountForm onSubmit={createNewCount} locations={locations} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {counts.map(count => (
            <CountCard 
              key={count.id} 
              count={count} 
              locations={locations}
              progress={getCountProgress(count)}
              onStart={() => startCount(count)}
              onDelete={() => handleDeleteClick(count)}
              onReopen={() => reopenCount(count)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Active Count Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{activeCount.name}</span>
                <Badge className={getStatusColor(activeCount.status)}>
                  {getStatusIcon(activeCount.status)}
                  <span className="ml-1">{activeCount.status}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                Location: {locations.find(l => l.id === activeCount.locationId)?.name}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setActiveCount(null)}
            >
              <X className="w-4 h-4 mr-2" />
              Close Count
            </Button>
          </div>
          <Progress value={getCountProgress(activeCount)} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Barcode Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ScanLine className="w-5 h-5" />
            <span>Barcode Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              ref={barcodeInputRef}
              placeholder="Scan or enter barcode..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeSearch(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="flex-1"
            />
            <Button variant="outline">
              <Scan className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Count Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Count Items Table */}
          <div className="space-y-2">
            {filteredCountItems.map(item => {
              const product = products.find(p => p.id === item.productId);
              const isEditing = editingItemId === item.id;
              
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{product?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Expected: {item.systemQuantity}
                    </div>
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
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveCount(item.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-right min-w-[60px]">
                          {item.countedQuantity !== null ? (
                            <div>
                              <div className="font-medium">{item.countedQuantity}</div>
                              {item.variance !== 0 && (
                                <div className={`text-sm ${item.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.variance > 0 ? '+' : ''}{item.variance}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartEdit(item.id, item.countedQuantity)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Badge variant={item.status === 'counted' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variance Reconciliation */}
      {varianceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Variance Reconciliation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VarianceReconciliation
              countItems={varianceItems}
              products={products}
              locations={locations}
              onReconcile={() => {
                loadCountItems(activeCount.id);
                toast.success('Variances reconciled successfully');
              }}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
