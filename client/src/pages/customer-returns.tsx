import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { 
  PackageX, 
  Search, 
  Plus, 
  Trash2, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';

interface Product {
  id: number;
  name: string;
  barcode?: string;
  sellingPrice: number;
  quantity: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  creditBalance: number;
}

interface ReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  condition: 'good' | 'damaged';
  reason?: string;
}

export default function CustomerReturns() {
  const { t } = useI18n();
  const { toast } = useToast();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [returns, setReturns] = useState<any[]>([]);

  // Form states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit' | 'exchange'>('cash');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [notes, setNotes] = useState('');

  // UI states
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadReturns();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/offline/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: t('error'),
        description: t('returns_load_products_error'),
        variant: 'destructive',
      });
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/offline/customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadReturns = async () => {
    try {
      const response = await fetch('/api/offline/customer-returns');
      const data = await response.json();
      setReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
    }
  };

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.barcode?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [products, searchTerm]);

  // Add product to return
  const addProductToReturn = (product: Product) => {
    const existingItem = returnItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Increase quantity
      setReturnItems(returnItems.map(item => 
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      // Add new item
      setReturnItems([...returnItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice,
        condition: 'good',
      }]);
    }
    
    setSearchTerm('');
  };

  // Update return item
  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(returnItems.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate total if quantity changes
      if (field === 'quantity') {
        updated.totalPrice = updated.quantity * updated.unitPrice;
      }
      
      return updated;
    }));
  };

  // Remove return item
  const removeReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  // Calculate total
  const totalAmount = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [returnItems]);

  // Submit return
  const handleSubmitReturn = async () => {
    if (returnItems.length === 0) {
      toast({
        title: t('error'),
        description: t('returns_no_items'),
        variant: 'destructive',
      });
      return;
    }

    if (refundMethod === 'credit' && !selectedCustomer) {
      toast({
        title: t('error'),
        description: t('returns_customer_required_for_credit'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/offline/customer-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer || null,
          customerName: customers.find(c => c.id === parseInt(selectedCustomer))?.name || null,
          items: returnItems,
          refundMethod,
          notes,
          createdBy: 1, // TODO: Get from auth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create return');
      }

      toast({
        title: t('success'),
        description: t('returns_created_successfully'),
      });

      // Reset form
      setReturnItems([]);
      setSelectedCustomer('');
      setRefundMethod('cash');
      setNotes('');
      setShowNewReturn(false);

      // Reload data
      loadReturns();
      loadProducts();
      if (selectedCustomer) loadCustomers();
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: t('error'),
        description: t('returns_create_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showNewReturn) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowNewReturn(false);
                setReturnItems([]);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PackageX className="h-8 w-8 text-blue-600" />
              {t('returns_new_return')}
            </h1>
          </div>
        </div>

        {/* Product Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('returns_select_product')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('returns_search_product_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
              
              {/* Search Results Dropdown */}
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => addProductToReturn(product)}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        {product.barcode} • {product.sellingPrice.toFixed(2)} DH
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Return Items */}
        {returnItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('returns_items')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('product')}</TableHead>
                    <TableHead>{t('quantity')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('total')}</TableHead>
                    <TableHead>{t('returns_condition')}</TableHead>
                    <TableHead>{t('returns_reason')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateReturnItem(index, 'quantity', parseInt(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{item.unitPrice.toFixed(2)} DH</TableCell>
                      <TableCell className="font-bold">{item.totalPrice.toFixed(2)} DH</TableCell>
                      <TableCell>
                        <Select
                          value={item.condition}
                          onValueChange={(value) => updateReturnItem(index, 'condition', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                {t('returns_condition_good')}
                              </div>
                            </SelectItem>
                            <SelectItem value="damaged">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                {t('returns_condition_damaged')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder={t('returns_reason_placeholder')}
                          value={item.reason || ''}
                          onChange={(e) => updateReturnItem(index, 'reason', e.target.value)}
                          className="w-40"
                        />
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

              <div className="mt-6 flex justify-end items-center gap-4">
                <span className="text-lg font-semibold">{t('total')}:</span>
                <span className="text-2xl font-bold text-blue-600">{totalAmount.toFixed(2)} DH</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refund Method & Customer */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('returns_refund_method')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('returns_refund_method')}</Label>
              <Select value={refundMethod} onValueChange={(value: any) => setRefundMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('returns_refund_cash')}
                    </div>
                  </SelectItem>
                  <SelectItem value="credit">
                    {t('returns_refund_credit')}
                  </SelectItem>
                  <SelectItem value="exchange">
                    {t('returns_refund_exchange')}
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {refundMethod === 'cash' && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('returns_refund_cash_description')}
                </p>
              )}
              {refundMethod === 'credit' && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('returns_refund_credit_description')}
                </p>
              )}
              {refundMethod === 'exchange' && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('returns_refund_exchange_description')}
                </p>
              )}
            </div>

            {refundMethod === 'credit' && (
              <div>
                <Label>{t('customer')}</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('returns_select_customer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t('notes')}</Label>
              <Input
                type="text"
                placeholder={t('returns_notes_placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowNewReturn(false);
              setReturnItems([]);
            }}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmitReturn}
            disabled={isSubmitting || returnItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? t('saving') : t('returns_validate_return')}
          </Button>
        </div>
      </div>
    );
  }

  // Returns List View
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PackageX className="h-8 w-8 text-blue-600" />
          {t('returns_customer_returns')}
        </h1>
        <Button
          onClick={() => setShowNewReturn(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('returns_new_return')}
        </Button>
      </div>

      {/* Returns List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('returns_return_number')}</TableHead>
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('returns_total_amount')}</TableHead>
                <TableHead>{t('returns_refund_method')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {t('returns_no_returns_yet')}
                  </TableCell>
                </TableRow>
              ) : (
                returns.map(returnRecord => (
                  <TableRow key={returnRecord.id}>
                    <TableCell className="font-mono">{returnRecord.returnNumber}</TableCell>
                    <TableCell>{returnRecord.customerName || '-'}</TableCell>
                    <TableCell className="font-bold">{returnRecord.totalAmount.toFixed(2)} DH</TableCell>
                    <TableCell>
                      {returnRecord.refundMethod === 'cash' && t('returns_refund_cash')}
                      {returnRecord.refundMethod === 'credit' && t('returns_refund_credit')}
                      {returnRecord.refundMethod === 'exchange' && t('returns_refund_exchange')}
                    </TableCell>
                    <TableCell>{new Date(returnRecord.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        returnRecord.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {returnRecord.status === 'completed' ? t('completed') : returnRecord.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

