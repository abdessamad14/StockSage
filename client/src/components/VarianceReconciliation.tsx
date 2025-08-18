import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { 
  offlineInventoryCountItemStorage,
  offlineProductStockStorage,
  offlineProductStorage,
  offlineStockLocationStorage
} from '@/lib/offline-storage';
import type { 
  OfflineInventoryCountItem, 
  OfflineProduct, 
  OfflineStockLocation 
} from '@/lib/offline-storage';

interface VarianceReconciliationProps {
  countItems: OfflineInventoryCountItem[];
  products: OfflineProduct[];
  locations: OfflineStockLocation[];
  onReconcile: () => void;
}

const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

export default function VarianceReconciliation({ 
  countItems, 
  products, 
  locations, 
  onReconcile 
}: VarianceReconciliationProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [reconcileAction, setReconcileAction] = useState<'accept_count' | 'keep_system' | 'manual_adjust'>('accept_count');
  const [manualQuantity, setManualQuantity] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [selectedVarianceItem, setSelectedVarianceItem] = useState<OfflineInventoryCountItem | null>(null);

  // Filter items with variances (counted items only, exclude already verified)
  const varianceItems = countItems.filter(item => 
    item.status === 'counted' && 
    item.countedQuantity !== null && 
    item.countedQuantity !== item.systemQuantity
  );

  // Group variances by type
  const positiveVariances = varianceItems.filter(item => (item.variance || 0) > 0);
  const negativeVariances = varianceItems.filter(item => (item.variance || 0) < 0);

  const getVarianceImpact = (item: OfflineInventoryCountItem) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return 0;
    
    const variance = item.variance || 0;
    return variance * product.costPrice;
  };

  const getTotalVarianceImpact = () => {
    return varianceItems.reduce((total, item) => total + getVarianceImpact(item), 0);
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(varianceItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkReconcile = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to reconcile');
      return;
    }
    setShowReconcileDialog(true);
  };

  const handleSingleReconcile = (item: OfflineInventoryCountItem) => {
    setSelectedVarianceItem(item);
    setSelectedItems([item.id]);
    setShowReconcileDialog(true);
  };

  const executeReconciliation = () => {
    const itemsToReconcile = selectedVarianceItem 
      ? [selectedVarianceItem] 
      : varianceItems.filter(item => selectedItems.includes(item.id));

    let updatedStockCount = 0;
    let skippedCount = 0;

    itemsToReconcile.forEach(item => {
      console.log(`Processing reconciliation for item:`, item);
      
      // Check if this item has already been reconciled
      if (item.status === 'verified') {
        console.log(`Item already verified: ${item.id}, ensuring product quantity is updated`);
        
        // For already verified items, ensure the product quantity reflects the reconciled amount
        const product = offlineProductStorage.getById(item.productId);
        if (product && item.countedQuantity !== undefined) {
          const updateProductResult = offlineProductStorage.update(item.productId, {
            quantity: item.countedQuantity
          });
          console.log(`Updated verified item product ${item.productId} quantity to ${item.countedQuantity}:`, updateProductResult);
        }
        
        skippedCount++;
        return; // Skip already reconciled items
      }
      let finalQuantity = item.systemQuantity;
      let shouldUpdateStock = false;
      
      switch (reconcileAction) {
        case 'accept_count':
          finalQuantity = item.countedQuantity || item.systemQuantity;
          shouldUpdateStock = true;
          break;
        case 'keep_system':
          finalQuantity = item.systemQuantity;
          shouldUpdateStock = false;
          break;
        case 'manual_adjust':
          finalQuantity = parseInt(manualQuantity) || item.systemQuantity;
          shouldUpdateStock = true;
          break;
      }
      
      console.log(`Item ${item.id}: action=${reconcileAction}, finalQuantity=${finalQuantity}, shouldUpdateStock=${shouldUpdateStock}, systemQuantity=${item.systemQuantity}`);

      // Update the count item status with final reconciled information
      offlineInventoryCountItemStorage.update(item.id, {
        status: 'verified',
        countedQuantity: reconcileAction === 'manual_adjust' ? finalQuantity : item.countedQuantity,
        variance: finalQuantity - item.systemQuantity,
        notes: reconcileNotes || item.notes
      });

      // Apply corrections to actual stock quantities
      if (shouldUpdateStock && finalQuantity !== item.systemQuantity) {
        console.log(`Updating stock for product ${item.productId} from ${item.systemQuantity} to ${finalQuantity}`);
        
        const updateResult = offlineProductStockStorage.updateQuantity(
          item.productId,
          item.locationId,
          finalQuantity,
          `Inventory count reconciliation - ${reconcileAction}`,
          item.countId
        );
        
        if (updateResult) {
          updatedStockCount++;
          console.log(`Successfully updated product stock for ${item.productId}`);
          
          // Always update the base product quantity for inventory reconciliation
          // This ensures the product overview shows the reconciled quantity
          const product = offlineProductStorage.getById(item.productId);
          
          if (product) {
            const updateProductResult = offlineProductStorage.update(item.productId, {
              quantity: finalQuantity
            });
            console.log(`Updated base product ${item.productId} quantity to ${finalQuantity}:`, updateProductResult);
          } else {
            console.error(`Product not found: ${item.productId}`);
          }
        } else {
          console.error(`Failed to update product stock for ${item.productId}`);
        }
      } else {
        console.log(`No stock update needed for item ${item.id}: shouldUpdateStock=${shouldUpdateStock}, finalQuantity=${finalQuantity}, systemQuantity=${item.systemQuantity}`);
      }
    });

    const processedCount = itemsToReconcile.length - skippedCount;
    let message = '';
    
    if (skippedCount > 0) {
      message = `Skipped ${skippedCount} already reconciled item(s). `;
    }
    
    if (processedCount > 0) {
      message += updatedStockCount > 0 
        ? `Reconciled ${processedCount} variance(s) and updated ${updatedStockCount} stock quantities`
        : `Reconciled ${processedCount} variance(s) - no stock changes applied`;
    } else if (skippedCount > 0) {
      message += 'Updated product quantities for verified items.';
    } else {
      message += 'No items to reconcile.';
    }
      
    toast.success(message);
    setShowReconcileDialog(false);
    setSelectedItems([]);
    setSelectedVarianceItem(null);
    setReconcileAction('accept_count');
    setManualQuantity('');
    setReconcileNotes('');
    onReconcile();
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600 bg-green-50';
    if (variance < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Variance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overages</p>
                <p className="text-2xl font-bold text-green-600">{positiveVariances.length}</p>
                <p className="text-xs text-muted-foreground">
                  Impact: +${positiveVariances.reduce((sum, item) => sum + getVarianceImpact(item), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Shortages</p>
                <p className="text-2xl font-bold text-red-600">{negativeVariances.length}</p>
                <p className="text-xs text-muted-foreground">
                  Impact: ${negativeVariances.reduce((sum, item) => sum + getVarianceImpact(item), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Net Impact</p>
                <p className={`text-2xl font-bold ${getTotalVarianceImpact() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(getTotalVarianceImpact()).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getTotalVarianceImpact() >= 0 ? 'Gain' : 'Loss'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {varianceItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Variance Reconciliation</CardTitle>
                <CardDescription>
                  Review and reconcile inventory variances
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSelectAll(selectedItems.length !== varianceItems.length)}
                >
                  {selectedItems.length === varianceItems.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button 
                  size="sm"
                  onClick={handleBulkReconcile}
                  disabled={selectedItems.length === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconcile Selected ({selectedItems.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {varianceItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                const location = locations.find(l => l.id === item.locationId);
                const variance = item.variance || 0;
                const impact = getVarianceImpact(item);
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{product?.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {location?.name}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span>System: {item.systemQuantity}</span>
                          <span>Counted: {item.countedQuantity}</span>
                          <span className={`font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Variance: {variance >= 0 ? '+' : ''}{variance}
                          </span>
                          <span className={`font-medium ${impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Impact: ${impact.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getVarianceColor(variance)}>
                        {getVarianceIcon(variance)}
                        <span className="ml-1">
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      </Badge>
                      {item.status === 'verified' ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Reconciled
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedVarianceItem(item);
                            setShowReconcileDialog(true);
                          }}
                          className="ml-2"
                        >
                          Reconcile
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Variances */}
      {varianceItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Variances Found</h3>
            <p className="text-muted-foreground">
              All counted items match the system quantities. No reconciliation needed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reconcile Variance</DialogTitle>
            <DialogDescription>
              Choose how to resolve the inventory variance
              {selectedItems.length > 1 && ` for ${selectedItems.length} items`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Reconciliation Options */}
            <div className="space-y-4">
              <Label>Reconciliation Action</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="accept_count"
                    name="reconcile_action"
                    value="accept_count"
                    checked={reconcileAction === 'accept_count'}
                    onChange={(e) => setReconcileAction(e.target.value as any)}
                  />
                  <Label htmlFor="accept_count" className="flex-1">
                    <div>
                      <p className="font-medium">Accept Physical Count</p>
                      <p className="text-sm text-muted-foreground">
                        Update system quantity to match the physical count
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="keep_system"
                    name="reconcile_action"
                    value="keep_system"
                    checked={reconcileAction === 'keep_system'}
                    onChange={(e) => setReconcileAction(e.target.value as any)}
                  />
                  <Label htmlFor="keep_system" className="flex-1">
                    <div>
                      <p className="font-medium">Keep System Quantity</p>
                      <p className="text-sm text-muted-foreground">
                        Mark variance as reviewed but keep original quantity
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="manual_adjust"
                    name="reconcile_action"
                    value="manual_adjust"
                    checked={reconcileAction === 'manual_adjust'}
                    onChange={(e) => setReconcileAction(e.target.value as any)}
                  />
                  <Label htmlFor="manual_adjust" className="flex-1">
                    <div>
                      <p className="font-medium">Manual Adjustment</p>
                      <p className="text-sm text-muted-foreground">
                        Set a custom quantity different from both system and count
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            {/* Manual Quantity Input */}
            {reconcileAction === 'manual_adjust' && (
              <div className="space-y-2">
                <Label htmlFor="manual-quantity">Manual Quantity</Label>
                <Input
                  id="manual-quantity"
                  type="number"
                  min="0"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                  placeholder="Enter correct quantity"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="reconcile-notes">Reconciliation Notes</Label>
              <Textarea
                id="reconcile-notes"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="Add notes about this reconciliation..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowReconcileDialog(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={executeReconciliation}>
                <Save className="w-4 h-4 mr-2" />
                Apply Reconciliation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
