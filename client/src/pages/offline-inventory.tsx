import { useState } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineProduct } from "@/lib/offline-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  Edit,
  Plus,
  Minus
} from "lucide-react";

export default function OfflineInventory() {
  const { products, loading, updateProduct } = useOfflineProducts();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<OfflineProduct | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const filteredProducts = products.filter(product => 
    !searchQuery || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(product => 
    product.quantity <= (product.minStockLevel || 10)
  );

  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.quantity * product.costPrice), 0);
  const lowStockCount = lowStockProducts.length;

  const handleStockAdjustment = (product: OfflineProduct) => {
    setSelectedProduct(product);
    setAdjustmentQuantity(0);
    setAdjustmentReason("");
    setIsAdjustmentOpen(true);
  };

  const applyStockAdjustment = () => {
    if (!selectedProduct) return;

    const newQuantity = selectedProduct.quantity + adjustmentQuantity;
    if (newQuantity < 0) {
      toast({
        title: "Error",
        description: "Stock quantity cannot be negative",
        variant: "destructive"
      });
      return;
    }

    updateProduct(selectedProduct.id, { quantity: newQuantity });
    
    toast({
      title: "Success",
      description: `Stock adjusted for ${selectedProduct.name}`
    });

    setIsAdjustmentOpen(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total cost value of stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Items below minimum level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="destructive">
                    {product.quantity} left
                  </Badge>
                </div>
              ))}
              {lowStockCount > 5 && (
                <p className="text-sm text-red-600">
                  And {lowStockCount - 5} more items...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Min Level</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isLowStock = product.quantity <= (product.minStockLevel || 10);
                const stockValue = product.quantity * product.costPrice;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      {product.category && (
                        <Badge variant="outline">{product.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.barcode || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isLowStock ? "text-red-600 font-bold" : ""}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {product.minStockLevel || 10}
                    </TableCell>
                    <TableCell className="text-right">
                      ${product.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${stockValue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={isLowStock ? "destructive" : "default"}
                        className="flex items-center gap-1"
                      >
                        {isLowStock && <TrendingDown className="w-3 h-3" />}
                        {isLowStock ? "Low Stock" : "In Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStockAdjustment(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchQuery ? "Try adjusting your search" : "No products in inventory"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">
                  Current stock: {selectedProduct.quantity} units
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Adjustment Quantity</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentQuantity(Math.max(-selectedProduct.quantity, adjustmentQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentQuantity(adjustmentQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  New stock level: {selectedProduct.quantity + adjustmentQuantity} units
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Stock count correction, Damaged goods, etc."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyStockAdjustment}
              disabled={adjustmentQuantity === 0}
            >
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
