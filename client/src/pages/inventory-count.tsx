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
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Package, 
  X,
  Play,
  Trash2,
  Search,
  Eye,
  BarChart3,
  ScanLine
} from 'lucide-react';

import {
  offlineInventoryCountStorage,
  offlineInventoryCountItemStorage,
  offlineProductStorage,
  offlineStockLocationStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage
} from '@/lib/offline-storage';
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

type Translator = (key: string, params?: { [key: string]: string | number }) => string;

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  completed: 'inventory_count_status_completed',
  in_progress: 'inventory_count_status_in_progress',
  draft: 'inventory_count_status_draft'
};

const getStatusLabel = (status: string, t: Translator) => {
  const key = STATUS_TRANSLATION_KEYS[status];
  return key ? t(key) : status;
};

// Create Count Form Component
function CreateCountForm({ onSubmit, locations }: { onSubmit: (data: any) => void; locations: OfflineStockLocation[] }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId) {
      toast({
        title: t('error'),
        description: t('inventory_count_required_fields'),
        variant: 'destructive'
      });
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
        <Label htmlFor="name">{t('inventory_count_name_label')}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t('inventory_count_name_placeholder')}
        />
      </div>
      
      <div>
        <Label htmlFor="location">{t('inventory_count_location_label')}</Label>
        <Select value={formData.locationId} onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder={t('inventory_count_location_placeholder')} />
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
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('inventory_count_description_placeholder')}
        />
      </div>

      <Button type="submit" className="w-full">
        {t('inventory_count_create_button')}
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
  const { t } = useI18n();
  const location = locations.find(l => l.id === count.locationId);
  const locationName = location?.name || t('inventory_count_unknown_location');
  const statusLabel = getStatusLabel(count.status, t);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{count.name}</span>
              <Badge className={getStatusColor(count.status)}>
                {getStatusIcon(count.status)}
                <span className="ml-1">{statusLabel}</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('inventory_count_card_description', { location: locationName, progress: progress.toString() })}
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
                {t('inventory_count_start_button')}
              </Button>
            )}
            
            {count.status === 'in_progress' && (
              <Button onClick={onReopen} size="sm" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                {t('inventory_count_continue_button')}
              </Button>
            )}
            
            {count.status === 'completed' && (
              <Button onClick={onReopen} variant="outline" size="sm" className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('inventory_count_view_results')}
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
  const { t } = useI18n();
  const { toast } = useToast();
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

  const handleCompleteCount = async () => {
    if (!activeCount) return;

    try {
      // Get all count items for this count
      const items = await offlineInventoryCountItemStorage.getByCountId(activeCount.id);
      
      // For uncounted items, automatically use the expected quantity
      const unCountedItems = items.filter(item => 
        item.actualQuantity === undefined || item.actualQuantity === null
      );
      
      if (unCountedItems.length > 0) {
        // Auto-fill uncounted items with their expected quantity
        for (const unCountedItem of unCountedItems) {
          await offlineInventoryCountItemStorage.update(unCountedItem.id, {
            actualQuantity: unCountedItem.expectedQuantity
          });
        }
        
        toast({
          title: t('info'),
          description: `${unCountedItems.length} produit(s) non compté(s) gardent leur quantité attendue`,
          duration: 3000
        });
      }
      
      // Reload items after auto-fill
      const allItems = await offlineInventoryCountItemStorage.getByCountId(activeCount.id);
      
      // Process each item (now all have actualQuantity)
      for (const item of allItems) {
        if (item.actualQuantity !== undefined && item.actualQuantity !== null) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          // Update warehouse-specific stock quantity
          const stockRecord = await offlineProductStockStorage.getByProductAndLocation(item.productId, activeCount.locationId);
          
          if (stockRecord) {
            const oldQuantity = stockRecord.quantity;
            const newQuantity = item.actualQuantity;
            const difference = newQuantity - oldQuantity;

            // Update warehouse-specific stock quantity
            await offlineProductStockStorage.updateQuantity(item.productId, activeCount.locationId, newQuantity);

            // ALWAYS update main product quantity during inventory count
            // This ensures the "Gestion des Stocks" page shows the correct quantity
            const updatedProduct = {
              ...product,
              quantity: newQuantity,
              updatedAt: new Date().toISOString()
            };
            await offlineProductStorage.update(product.id, updatedProduct);

            // Create stock transaction for audit trail
            if (difference !== 0) {
              await offlineStockTransactionStorage.create({
                productId: item.productId,
                warehouseId: activeCount.locationId,
                type: 'adjustment',
                quantity: difference, // Use actual difference (can be negative)
                previousQuantity: oldQuantity,
                newQuantity: newQuantity,
                reason: `Inventory count adjustment: ${activeCount.name}`,
                reference: `COUNT-${activeCount.id}`
              });
            }
          }
        }
      }

      // Mark count as completed
      const updatedCount = {
        ...activeCount,
        status: 'completed' as const,
        endDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await offlineInventoryCountStorage.update(activeCount.id, updatedCount);
      
      // Update local state
      setCounts(prev => prev.map(c => c.id === activeCount.id ? updatedCount : c));
      setActiveCount(updatedCount);
      
      toast({
        title: t('success'),
        description: t('inventory_count_complete_success')
      });
    } catch (error) {
      console.error('Error completing count:', error);
      toast({
        title: t('error'),
        description: t('inventory_count_complete_error'),
        variant: 'destructive'
      });
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
        const activeProducts = products.filter(p => p.active);
        
        // Create count items for each active product with warehouse-specific expected quantities
        for (const product of activeProducts) {
          // Get warehouse-specific stock quantity for expected quantity
          let expectedQuantity = 0;
          try {
            const stockRecord = await offlineProductStockStorage.getByProductAndLocation(product.id, formData.locationId);
            expectedQuantity = stockRecord?.quantity || 0;
          } catch (error) {
            console.warn(`Could not get stock for product ${product.id} in location ${formData.locationId}, using 0`);
            expectedQuantity = 0;
          }

          const countItem = {
            countId: createdCount.id,
            productId: product.id,
            expectedQuantity: expectedQuantity, // Use warehouse-specific quantity
            actualQuantity: undefined,
            variance: undefined,
            notes: '',
            tenantId: 'offline'
          };
          
          await offlineInventoryCountItemStorage.create(countItem);
        }

        setCounts(prev => [...prev, createdCount]);
        setShowCreateDialog(false);
        toast({
          title: t('success'),
          description: t('inventory_count_create_success')
        });
      }
    } catch (error) {
      console.error('Error creating inventory count:', error);
      toast({
        title: t('error'),
        description: t('inventory_count_create_error'),
        variant: 'destructive'
      });
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
      toast({
        title: t('success'),
        description: t('inventory_count_delete_success')
      });
    } catch (error) {
      console.error('Error deleting count:', error);
      toast({
        title: t('error'),
        description: t('inventory_count_delete_error'),
        variant: 'destructive'
      });
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
      toast({
        title: t('error'),
        description: t('inventory_count_update_error'),
        variant: 'destructive'
      });
    }
  };

  // Remove the old completeCount function - it's replaced by handleCompleteCount

  const handleSaveCount = async (itemId: string) => {
    const quantity = parseInt(tempQuantity) || 0;
    await updateCountItem(itemId, quantity);
    
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
        toast({
          title: t('error'),
          description: t('inventory_count_product_missing'),
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: t('error'),
        description: t('inventory_count_product_barcode_missing'),
        variant: 'destructive'
      });
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
          <h1 className="text-3xl font-bold">{t('inventory_counts_title')}</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('inventory_count_create_new')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('inventory_count_dialog_title')}</DialogTitle>
                <DialogDescription>
                  {t('inventory_count_dialog_description')}
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
              <DialogTitle>{t('inventory_count_delete_title')}</DialogTitle>
              <DialogDescription>
                {t('inventory_count_delete_description', { name: countToDelete?.name ?? '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={() => {
                if (countToDelete) {
                  deleteCount(countToDelete);
                  setShowDeleteDialog(false);
                  setCountToDelete(null);
                }
              }}>
                {t('delete')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Active count view
  const activeLocationName = locations.find(l => l.id === activeCount.locationId)?.name || t('inventory_count_unknown_location');
  const activeStatusLabel = getStatusLabel(activeCount.status, t);
  const activeProgress = getCountProgress(activeCount.id);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="ghost" onClick={() => setActiveCount(null)} className="mb-2">
            {t('inventory_count_back')}
          </Button>
          <h1 className="text-3xl font-bold">{activeCount.name}</h1>
          <p className="text-gray-600">
            {t('inventory_count_location_display', { location: activeLocationName })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(activeCount.status)}>
            {getStatusIcon(activeCount.status)}
            <span className="ml-1">{activeStatusLabel}</span>
          </Badge>
          {activeCount.status === 'in_progress' && (
            <Button 
              onClick={handleCompleteCount}
              className="bg-green-600 hover:bg-green-700"
              disabled={activeProgress < 100}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('inventory_count_complete_button', { progress: activeProgress.toString() })}
            </Button>
          )}
        </div>
      </div>

      {/* Search and Barcode Scanner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('inventory_count_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <ScanLine className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={barcodeInputRef}
            placeholder={t('inventory_count_barcode_placeholder')}
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
          const isCounted = item.actualQuantity !== undefined && item.actualQuantity !== null;
          const actualDisplay = isCounted ? item.actualQuantity : t('inventory_count_not_counted');

          return (
            <Card key={item.id} className={hasVariance ? 'border-orange-200 bg-orange-50' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {t('inventory_count_expected')}: {item.expectedQuantity} |
                      {' '}{t('inventory_count_actual')}: {actualDisplay}
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
                        {isCounted ? t('edit') : t('inventory_count_count_action')}
                      </Button>
                    )}
                    
                    <Badge variant={isCounted ? 'default' : 'secondary'}>
                      {isCounted ? t('inventory_count_counted') : t('inventory_count_not_counted')}
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
