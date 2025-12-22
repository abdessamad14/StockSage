import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { 
  PackageX, 
  Plus, 
  Trash2, 
  AlertTriangle,
  ArrowLeft,
  Eye,
  Send,
  CheckCircle2,
  FileText,
  Printer,
  TrendingDown,
  Box,
  Search
} from 'lucide-react';

interface DefectiveProduct {
  id: number;
  name: string;
  barcode?: string;
  defectiveStock: number;
  costPrice: number;
  totalCost: number;
}

interface DefectiveStockGroup {
  supplierId: number | string;
  supplierName: string;
  products: DefectiveProduct[];
  totalDefectiveItems: number;
  totalCost: number;
}

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface ReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
}

interface SupplierReturn {
  id: number;
  returnNumber: string;
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  items?: ReturnItem[];
}

export default function SupplierReturns() {
  const { t } = useI18n();
  const { toast } = useToast();

  // Data states
  const [defectiveStock, setDefectiveStock] = useState<DefectiveStockGroup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allDefectiveProducts, setAllDefectiveProducts] = useState<DefectiveProduct[]>([]);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  // Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // UI states
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SupplierReturn | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Load data
  useEffect(() => {
    loadDefectiveStock();
    loadSuppliers();
    loadSupplierReturns();
  }, []);

  const loadDefectiveStock = async () => {
    try {
      const response = await fetch('/api/offline/defective-stock');
      const data = await response.json();
      setDefectiveStock(data);
      
      // Flatten all products for easy access
      const allProducts: DefectiveProduct[] = [];
      data.forEach((group: DefectiveStockGroup) => {
        allProducts.push(...group.products);
      });
      setAllDefectiveProducts(allProducts);
    } catch (error) {
      console.error('Error loading defective stock:', error);
      toast({
        title: t('error'),
        description: t('supplier_returns_load_error'),
        variant: 'destructive',
      });
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await fetch('/api/offline/suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadSupplierReturns = async () => {
    try {
      const response = await fetch('/api/offline/supplier-returns');
      const data = await response.json();
      setSupplierReturns(data);
    } catch (error) {
      console.error('Error loading supplier returns:', error);
    }
  };

  // View return details
  const viewReturnDetails = async (returnId: number) => {
    try {
      const response = await fetch(`/api/offline/supplier-returns/${returnId}`);
      const data = await response.json();
      setSelectedReturn(data);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error loading return details:', error);
      toast({
        title: t('error'),
        description: t('supplier_returns_load_details_error'),
        variant: 'destructive',
      });
    }
  };

  // Update return status
  const updateReturnStatus = async (returnId: number, status: string) => {
    try {
      await fetch(`/api/offline/supplier-returns/${returnId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      toast({
        title: t('success'),
        description: t('supplier_returns_status_updated'),
      });
      
      loadSupplierReturns();
      if (selectedReturn && selectedReturn.id === returnId) {
        viewReturnDetails(returnId);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: t('error'),
        description: t('supplier_returns_update_error'),
        variant: 'destructive',
      });
    }
  };

  // Print return document
  const printReturnDocument = (returnData: SupplierReturn) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bon de Retour Fournisseur - ${returnData.returnNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .info { margin-bottom: 20px; }
          .info-row { display: flex; justify-between; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
          .notes { margin-top: 30px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BON DE RETOUR FOURNISSEUR</h1>
          <h2>${returnData.returnNumber}</h2>
        </div>
        
        <div class="info">
          <div class="info-row"><strong>Fournisseur:</strong> <span>${returnData.supplierName}</span></div>
          <div class="info-row"><strong>Date:</strong> <span>${new Date(returnData.createdAt).toLocaleDateString()}</span></div>
          <div class="info-row"><strong>Statut:</strong> <span>${returnData.status}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité</th>
              <th>Prix Unitaire</th>
              <th>Total</th>
              <th>Raison</th>
            </tr>
          </thead>
          <tbody>
            ${returnData.items?.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${item.unitCost.toFixed(2)} DH</td>
                <td>${item.totalCost.toFixed(2)} DH</td>
                <td>${item.reason}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          Total: ${returnData.totalAmount.toFixed(2)} DH
        </div>
        
        ${returnData.notes ? `
          <div class="notes">
            <strong>Notes:</strong><br/>
            ${returnData.notes}
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Ce document doit être signé par le fournisseur lors de la réception des articles retournés.</p>
          <p>Signature du fournisseur: ______________________________ Date: ______________</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Start creating return - directly open form
  const startNewReturn = () => {
    setSelectedSupplierId('');
    setReturnItems([]);
    setShowNewReturn(true);
  };

  // Add product to return
  const addProductToReturn = (product: DefectiveProduct) => {
    const existingItem = returnItems.find(item => item.productId === product.id);
    if (existingItem) {
      toast({
        title: t('info'),
        description: t('supplier_returns_product_already_added'),
        variant: 'default',
      });
      return;
    }
    
    setReturnItems([...returnItems, {
      productId: product.id,
      productName: product.name,
      quantity: product.defectiveStock || 1,
      unitCost: product.costPrice,
      totalCost: product.costPrice * (product.defectiveStock || 1),
      reason: 'defective',
    }]);
    
    // Clear search
    setProductSearchTerm('');
  };

  // Filter products by search term
  const filteredDefectiveProducts = useMemo(() => {
    if (!productSearchTerm) return [];
    
    const term = productSearchTerm.toLowerCase();
    return allDefectiveProducts
      .filter(p => !returnItems.some(item => item.productId === p.id))
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.barcode?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [productSearchTerm, allDefectiveProducts, returnItems]);

  // Update return item
  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(returnItems.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'quantity') {
        updated.totalCost = updated.quantity * updated.unitCost;
      }
      
      return updated;
    }));
  };

  // Remove return item
  const removeReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  // Calculate total
  const returnTotal = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + item.totalCost, 0);
  }, [returnItems]);

  // Submit return
  const handleSubmitReturn = async () => {
    if (!selectedSupplierId) return;
    
    const supplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));
    if (!supplier) return;
    
    if (returnItems.length === 0) {
      toast({
        title: t('error'),
        description: t('supplier_returns_no_items'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/offline/supplier-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: returnItems,
          notes,
          createdBy: 1, // TODO: Get from auth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create supplier return');
      }

      const createdReturn = await response.json();

      toast({
        title: t('success'),
        description: t('supplier_returns_created_successfully'),
      });

      // Reset form
      setReturnItems([]);
      setSelectedSupplierId('');
      setNotes('');
      setShowNewReturn(false);

      // Reload data
      loadDefectiveStock();
      loadSupplierReturns();

      // Offer to print
      if (confirm(t('supplier_returns_print_confirm'))) {
        printReturnDocument(createdReturn);
      }
    } catch (error) {
      console.error('Error creating supplier return:', error);
      toast({
        title: t('error'),
        description: t('supplier_returns_create_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalDefectiveItems = defectiveStock.reduce((sum, g) => sum + g.totalDefectiveItems, 0);
    const totalDefectiveCost = defectiveStock.reduce((sum, g) => sum + g.totalCost, 0);
    
    return {
      totalDefectiveItems,
      totalDefectiveCost,
      totalReturns: supplierReturns.length,
      pending: supplierReturns.filter(r => r.status === 'pending').length,
      sent: supplierReturns.filter(r => r.status === 'sent').length,
      completed: supplierReturns.filter(r => r.status === 'completed').length,
    };
  }, [defectiveStock, supplierReturns]);

  // Filtered returns by tab
  const filteredReturns = useMemo(() => {
    if (activeTab === 'all') return supplierReturns;
    return supplierReturns.filter(r => r.status === activeTab);
  }, [supplierReturns, activeTab]);

  if (showNewReturn) {
    const selectedSupplier = selectedSupplierId ? suppliers.find(s => s.id === parseInt(selectedSupplierId)) : null;
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowNewReturn(false);
                setReturnItems([]);
                setSelectedSupplierId('');
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <PackageX className="h-8 w-8 text-red-600" />
                {t('supplier_returns_new_return')}
              </h1>
              {selectedSupplier && (
                <p className="text-sm text-gray-600 mt-1">
                  {t('supplier_returns_for')}: <span className="font-semibold">{selectedSupplier.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Return Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  {t('supplier_returns_search_product')}
                </CardTitle>
                <CardDescription>{t('supplier_returns_search_by_barcode')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('supplier_returns_search_placeholder')}
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                  
                  {filteredDefectiveProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                      {filteredDefectiveProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addProductToReturn(product)}
                          className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-lg">{product.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {product.barcode && (
                                  <span className="mr-3">📦 {product.barcode}</span>
                                )}
                                <Badge variant="destructive" className="mr-2">
                                  {product.defectiveStock} {t('supplier_returns_defective_qty')}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-blue-600">
                                {product.costPrice.toFixed(2)} DH
                              </div>
                              <div className="text-xs text-gray-500">
                                {t('total')}: {product.totalCost.toFixed(2)} DH
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {productSearchTerm && filteredDefectiveProducts.length === 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
                      {t('supplier_returns_no_products_found')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Selected Return Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('supplier_returns_items')} ({returnItems.length})</span>
                  <span className="text-2xl font-bold text-red-600">{returnTotal.toFixed(2)} DH</span>
                </CardTitle>
                <CardDescription>{t('supplier_returns_adjust_quantities')}</CardDescription>
              </CardHeader>
              <CardContent>
                {returnItems.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">{t('supplier_returns_no_items')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="w-24">{t('quantity')}</TableHead>
                        <TableHead>{t('cost_price')}</TableHead>
                        <TableHead>{t('total')}</TableHead>
                        <TableHead>{t('supplier_returns_reason')}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateReturnItem(index, 'quantity', parseInt(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{item.unitCost.toFixed(2)} DH</TableCell>
                          <TableCell className="font-bold">{item.totalCost.toFixed(2)} DH</TableCell>
                          <TableCell>
                            <Select
                              value={item.reason}
                              onValueChange={(value) => updateReturnItem(index, 'reason', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="defective">{t('supplier_returns_reason_defective')}</SelectItem>
                                <SelectItem value="expired">{t('supplier_returns_reason_expired')}</SelectItem>
                                <SelectItem value="damaged">{t('supplier_returns_reason_damaged')}</SelectItem>
                                <SelectItem value="wrong_item">{t('supplier_returns_reason_wrong')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReturnItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Supplier Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('supplier_returns_select_supplier')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('supplier_returns_select_supplier_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.name}</span>
                          {(supplier.phone || supplier.email) && (
                            <span className="text-xs text-gray-500">
                              {supplier.phone && `📞 ${supplier.phone}`}
                              {supplier.phone && supplier.email && ' • '}
                              {supplier.email && `✉️ ${supplier.email}`}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedSupplier && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="font-semibold">{selectedSupplier.name}</p>
                    {selectedSupplier.phone && <p className="text-gray-600">📞 {selectedSupplier.phone}</p>}
                    {selectedSupplier.email && <p className="text-gray-600">✉️ {selectedSupplier.email}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder={t('supplier_returns_notes_placeholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
              <CardHeader>
                <CardTitle>{t('supplier_returns_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('supplier_returns_items_count')}:</span>
                  <span className="font-semibold">{returnItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('supplier_returns_total_quantity')}:</span>
                  <span className="font-semibold">{returnItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('supplier_returns_total_cost')}:</span>
                  <span className="font-bold text-xl text-red-600">{returnTotal.toFixed(2)} DH</span>
                </div>
                <Separator />
                <Button
                  onClick={handleSubmitReturn}
                  disabled={isSubmitting || returnItems.length === 0 || !selectedSupplierId}
                  className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg"
                >
                  {isSubmitting ? t('saving') : t('supplier_returns_create_return')}
                </Button>
                {(!selectedSupplierId || returnItems.length === 0) && (
                  <p className="text-xs text-center text-gray-600">
                    {!selectedSupplierId && t('supplier_returns_select_supplier_first')}
                    {selectedSupplierId && returnItems.length === 0 && t('supplier_returns_add_products_first')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageX className="h-8 w-8 text-red-600" />
            {t('supplier_returns_title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{t('supplier_returns_description')}</p>
        </div>
        <Button
          onClick={startNewReturn}
          className="bg-red-600 hover:bg-red-700"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('supplier_returns_create_return')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('supplier_returns_defective_items')}</p>
                <p className="text-2xl font-bold">{stats.totalDefectiveItems}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('supplier_returns_defective_cost')}</p>
                <p className="text-2xl font-bold">{stats.totalDefectiveCost.toFixed(0)} DH</p>
              </div>
              <TrendingDown className="h-10 w-10 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('supplier_returns_total')}</p>
                <p className="text-2xl font-bold">{stats.totalReturns}</p>
              </div>
              <Box className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('supplier_returns_pending')}</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <FileText className="h-10 w-10 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Defective Products Summary */}
      {allDefectiveProducts.length > 0 && (
        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-6 w-6" />
              {t('supplier_returns_all_defective')}
            </CardTitle>
            <CardDescription>{t('supplier_returns_all_defective_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('barcode')}</TableHead>
                  <TableHead className="text-right">{t('defective_quantity')}</TableHead>
                  <TableHead className="text-right">{t('cost_price')}</TableHead>
                  <TableHead className="text-right">{t('total_cost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDefectiveProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-gray-600">{product.barcode || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{product.defectiveStock}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{product.costPrice.toFixed(2)} DH</TableCell>
                    <TableCell className="text-right font-bold">{product.totalCost.toFixed(2)} DH</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabs for filtering returns */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            {t('all')} ({stats.totalReturns})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('supplier_returns_status_pending')} ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="sent">
            {t('supplier_returns_status_sent')} ({stats.sent})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('supplier_returns_status_completed')} ({stats.completed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Returns History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('supplier_returns_history')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('supplier_returns_return_number')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('supplier_returns_total_amount')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {t('supplier_returns_no_returns_yet')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map(returnRecord => (
                  <TableRow key={returnRecord.id}>
                    <TableCell className="font-mono font-semibold">{returnRecord.returnNumber}</TableCell>
                    <TableCell>{returnRecord.supplierName}</TableCell>
                    <TableCell className="font-bold">{returnRecord.totalAmount.toFixed(2)} DH</TableCell>
                    <TableCell>
                      {returnRecord.status === 'pending' && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                          <FileText className="h-3 w-3 mr-1" />
                          {t('supplier_returns_status_pending')}
                        </Badge>
                      )}
                      {returnRecord.status === 'sent' && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          <Send className="h-3 w-3 mr-1" />
                          {t('supplier_returns_status_sent')}
                        </Badge>
                      )}
                      {returnRecord.status === 'completed' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('supplier_returns_status_completed')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(returnRecord.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewReturnDetails(returnRecord.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('view')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Return Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {t('supplier_returns_details')} - {selectedReturn?.returnNumber}
            </DialogTitle>
            <DialogDescription>
              {new Date(selectedReturn?.createdAt || '').toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              {/* Return Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('supplier')}:</span>
                        <span className="font-semibold">{selectedReturn.supplierName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('status')}:</span>
                        <Badge>
                          {selectedReturn.status === 'pending' && t('supplier_returns_status_pending')}
                          {selectedReturn.status === 'sent' && t('supplier_returns_status_sent')}
                          {selectedReturn.status === 'completed' && t('supplier_returns_status_completed')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('supplier_returns_total_amount')}:</span>
                        <span className="font-bold text-xl text-red-600">{selectedReturn.totalAmount.toFixed(2)} DH</span>
                      </div>
                      {selectedReturn.notes && (
                        <div className="text-sm">
                          <span className="text-gray-600">{t('notes')}:</span>
                          <p className="mt-1 text-gray-800">{selectedReturn.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Return Items */}
              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('supplier_returns_items')}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('quantity')}</TableHead>
                        <TableHead>{t('cost_price')}</TableHead>
                        <TableHead>{t('total')}</TableHead>
                        <TableHead>{t('supplier_returns_reason')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitCost.toFixed(2)} DH</TableCell>
                          <TableCell className="font-bold">{item.totalCost.toFixed(2)} DH</TableCell>
                          <TableCell>{t(`supplier_returns_reason_${item.reason}`)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => printReturnDocument(selectedReturn)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {t('supplier_returns_print')}
                </Button>
                
                {selectedReturn.status === 'pending' && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateReturnStatus(selectedReturn.id, 'sent')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t('supplier_returns_mark_sent')}
                  </Button>
                )}
                
                {selectedReturn.status === 'sent' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => updateReturnStatus(selectedReturn.id, 'completed')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('supplier_returns_mark_completed')}
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

