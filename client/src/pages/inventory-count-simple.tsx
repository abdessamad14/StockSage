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
  Scan
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
              onClick={onDelete}
              className="text-red-500 hover:text-red-700"
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
            <Button onClick={onStart} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Count
            </Button>
          )}
          {count.status === 'in_progress' && (
            <Button onClick={onStart} variant="outline" className="flex-1">
              Continue Count
            </Button>
          )}
          {count.status === 'completed' && (
            <Button onClick={onReopen} variant="outline" className="flex-1">
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeCount) {
      loadCountItems();
    }
  }, [activeCount]);

  const loadData = () => {
    setCounts(offlineInventoryCountStorage.getAll());
    setProducts(offlineProductStorage.getAll().filter(p => p.active));
    setLocations(offlineStockLocationStorage.getAll().filter(l => l.active));
  };

  const loadCountItems = () => {
    if (activeCount) {
      const items = offlineInventoryCountItemStorage.getByCountId(activeCount.id);
      setCountItems(items);
      
      // Check if count should be auto-completed
      const countedItems = items.filter(item => item.status === 'counted' || item.status === 'verified');
      if (items.length > 0 && countedItems.length === items.length && activeCount.status === 'in_progress') {
        const updatedCount = offlineInventoryCountStorage.update(activeCount.id, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        if (updatedCount) {
          setActiveCount(updatedCount);
          loadData();
        }
      }
    }
  };

  const createNewCount = (data: {
    name: string;
    description?: string;
    type: 'full' | 'partial';
    locationId?: string;
  }) => {
    if (!data.locationId) {
      toast.error('Please select a specific location for the inventory count');
      return;
    }

    const newCount = offlineInventoryCountStorage.create({
      ...data,
      status: 'draft',
      totalProducts: 0,
      createdBy: 'current_user',
      notes: '',
      locationId: data.locationId
    });

    const allProducts = offlineProductStorage.getAll().filter(p => p.active);
    
    allProducts.forEach(product => {
      const stock = offlineProductStockStorage.getByProductAndLocation(product.id, data.locationId!);
      offlineInventoryCountItemStorage.create({
        countId: newCount.id,
        productId: product.id,
        locationId: data.locationId!,
        systemQuantity: stock?.quantity || 0,
        status: 'pending'
      });
    });

    loadData();
    toast.success(`Inventory count created for ${locations.find(l => l.id === data.locationId)?.name}`);
    setShowCreateDialog(false);
  };

  const startCount = (count: OfflineInventoryCount) => {
    const updatedCount = offlineInventoryCountStorage.update(count.id, {
      status: 'in_progress',
      startedAt: new Date().toISOString()
    });
    
    if (updatedCount) {
      setCounts(prev => prev.map(c => c.id === count.id ? updatedCount : c));
      setActiveCount(updatedCount);
      loadCountItems();
    }
  };

  const reopenCount = (count: OfflineInventoryCount) => {
    const updatedCount = offlineInventoryCountStorage.update(count.id, {
      status: 'in_progress'
    });
    
    if (updatedCount) {
      setCounts(prev => prev.map(c => c.id === count.id ? updatedCount : c));
      setActiveCount(updatedCount);
      loadCountItems();
      toast.success('Count reopened for editing');
    }
  };

  const deleteCount = (count: OfflineInventoryCount) => {
    if (count.status === 'completed') {
      toast.error('Cannot delete completed inventory counts');
      return;
    }

    const warningMessage = count.status === 'in_progress' 
      ? `Are you sure you want to delete "${count.name}"? This will lose all counting progress. This action cannot be undone.`
      : `Are you sure you want to delete "${count.name}"? This action cannot be undone.`;

    if (confirm(warningMessage)) {
      offlineInventoryCountItemStorage.deleteByCountId(count.id);
      offlineInventoryCountStorage.delete(count.id);
      
      if (activeCount?.id === count.id) {
        setActiveCount(null);
        setCountItems([]);
      }
      
      loadData();
      toast.success('Count deleted successfully');
    }
  };

  const getCountProgress = (count: OfflineInventoryCount) => {
    const items = offlineInventoryCountItemStorage.getByCountId(count.id);
    const countedItems = items.filter(item => item.status === 'counted' || item.status === 'verified');
    return items.length > 0 ? Math.round((countedItems.length / items.length) * 100) : 0;
  };

  const handleStartEdit = (itemId: string) => {
    setEditingItemId(itemId);
    setTempQuantity('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempQuantity('');
  };

  const handleSaveCount = (itemId: string, productId: string) => {
    const quantity = parseInt(tempQuantity);
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const countItem = countItems.find((item: OfflineInventoryCountItem) => item.id === itemId);
    if (!countItem) return;

    const updatedItem = offlineInventoryCountItemStorage.update(itemId, {
      countedQuantity: quantity,
      countedAt: new Date().toISOString(),
      countedBy: 'current_user',
      status: 'counted',
      variance: quantity - countItem.systemQuantity
    });

    if (updatedItem) {
      loadCountItems();
      
      const product = products.find((p: OfflineProduct) => p.id === productId);
      const location = locations.find((l: OfflineStockLocation) => l.id === activeCount!.locationId);
      
      toast.success(`Counted ${product?.name || 'Product'} in ${location?.name || 'location'}: ${quantity} units`);
    }

    setEditingItemId(null);
    setTempQuantity('');
  };

  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;
    
    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      const item = countItems.find(item => item.productId === product.id);
      if (item) {
        handleStartEdit(item.id);
      }
    } else {
      toast.error('Product not found');
    }
    setBarcodeInput('');
  };

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

      {!activeCount ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {counts.map(count => (
            <CountCard 
              key={count.id} 
              count={count} 
              locations={locations}
              progress={getCountProgress(count)}
              onStart={() => startCount(count)}
              onDelete={() => deleteCount(count)}
              onReopen={() => reopenCount(count)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Count Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
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
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setActiveCount(null);
                      setCountItems([]);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close Count
                  </Button>
                  {activeCount.status === 'completed' && (
                    <Button 
                      variant="outline"
                      onClick={() => reopenCount(activeCount)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reopen Count
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress: {countItems.filter(item => item.status === 'counted' || item.status === 'verified').length} of {countItems.length} items</span>
                  <span>{getCountProgress(activeCount)}%</span>
                </div>
                <Progress value={getCountProgress(activeCount)} className="h-2" />
              </div>
            </CardHeader>
          </Card>

          {/* Barcode Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scan className="w-5 h-5" />
                <span>Barcode Scanner</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeSearch();
                    }
                  }}
                />
                <Button onClick={handleBarcodeSearch}>
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Inventory Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="text-lg md:text-base h-12 md:h-10"
                />
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {countItems
                    .filter((item: OfflineInventoryCountItem) => {
                      const product = products.find((p: OfflineProduct) => p.id === item.productId);
                      return product && (
                        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                    })
                    .map((item: OfflineInventoryCountItem) => {
                      const product = products.find((p: OfflineProduct) => p.id === item.productId);
                      if (!product) return null;
                      
                      const isCounted = item.status === 'counted' || item.status === 'verified';
                      const isEditing = editingItemId === item.id;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center justify-between p-4 border rounded-lg ${isCounted ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-lg md:text-base">{product.name}</p>
                            <p className="text-sm text-gray-600">Barcode: {product.barcode}</p>
                            <p className="text-sm text-gray-500">System: {item.systemQuantity}</p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  value={tempQuantity}
                                  onChange={(e) => setTempQuantity(e.target.value)}
                                  placeholder="Counted qty"
                                  className="w-24 text-center"
                                  autoFocus
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveCount(item.id, item.productId);
                                    }
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSaveCount(item.id, item.productId)}
                                  disabled={!tempQuantity}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleCancelEdit()}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                {isCounted ? (
                                  <div className="text-center">
                                    <Badge className="bg-green-500 mb-1">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {item.countedQuantity}
                                    </Badge>
                                    <p className="text-xs text-gray-500">
                                      Variance: {(item.countedQuantity || 0) - item.systemQuantity}
                                    </p>
                                  </div>
                                ) : (
                                  <Button 
                                    onClick={() => handleStartEdit(item.id)}
                                    className="text-lg md:text-sm px-4 py-2"
                                  >
                                    Count
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variances - Only show if there are variances */}
          {countItems.some(item => item.status === 'counted' && item.countedQuantity !== item.systemQuantity) && (
            <VarianceReconciliation
              countItems={countItems}
              products={products}
              locations={locations}
              onReconcile={() => {
                loadCountItems();
                loadData();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
