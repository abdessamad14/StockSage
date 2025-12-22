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
  Search, 
  Plus, 
  Trash2, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  X,
  ArrowRightLeft,
  Calendar,
  User,
  FileText,
  TrendingDown,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

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
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  condition: 'good' | 'damaged';
  reason?: string;
}

interface ExchangeItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerReturn {
  id: number;
  returnNumber: string;
  customerId?: number;
  customerName?: string;
  totalAmount: number;
  refundMethod: string;
  status: string;
  notes?: string;
  createdAt: string;
  items?: ReturnItem[];
}

export default function CustomerReturns() {
  const { t } = useI18n();
  const { toast } = useToast();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);

  // Form states
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit' | 'exchange'>('cash');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [notes, setNotes] = useState('');

  // UI states
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<CustomerReturn | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

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

  // View return details
  const viewReturnDetails = async (returnId: number) => {
    try {
      const response = await fetch(`/api/offline/customer-returns/${returnId}`);
      const data = await response.json();
      setSelectedReturn(data);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error loading return details:', error);
      toast({
        title: t('error'),
        description: t('returns_load_details_error'),
        variant: 'destructive',
      });
    }
  };

  // Cancel return
  const cancelReturn = async (returnId: number) => {
    if (!confirm(t('returns_confirm_cancel'))) return;

    try {
      await fetch(`/api/offline/customer-returns/${returnId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: t('success'),
        description: t('returns_cancelled_successfully'),
      });
      
      loadReturns();
      loadProducts();
      setShowDetailsDialog(false);
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast({
        title: t('error'),
        description: t('returns_cancel_error'),
        variant: 'destructive',
      });
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

  // Filtered products for exchange search
  const filteredExchangeProducts = useMemo(() => {
    if (!exchangeSearchTerm) return [];
    const term = exchangeSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.barcode?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [products, exchangeSearchTerm]);

  // Add product to return
  const addProductToReturn = (product: Product) => {
    const existingItem = returnItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      setReturnItems(returnItems.map(item => 
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
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

  // Add product to exchange
  const addProductToExchange = (product: Product) => {
    const existingItem = exchangeItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      setExchangeItems(exchangeItems.map(item => 
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setExchangeItems([...exchangeItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice,
      }]);
    }
    
    setExchangeSearchTerm('');
  };

  // Update return item
  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(returnItems.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'quantity') {
        updated.totalPrice = updated.quantity * updated.unitPrice;
      }
      
      return updated;
    }));
  };

  // Update exchange item
  const updateExchangeItem = (index: number, field: keyof ExchangeItem, value: any) => {
    setExchangeItems(exchangeItems.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
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

  // Remove exchange item
  const removeExchangeItem = (index: number) => {
    setExchangeItems(exchangeItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const returnTotal = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [returnItems]);

  const exchangeTotal = useMemo(() => {
    return exchangeItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [exchangeItems]);

  const balanceDifference = returnTotal - exchangeTotal;

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

    if (refundMethod === 'exchange' && exchangeItems.length === 0) {
      toast({
        title: t('error'),
        description: t('returns_exchange_no_products'),
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
          exchangeItems: refundMethod === 'exchange' ? exchangeItems : [],
          refundMethod,
          balanceDifference: refundMethod === 'exchange' ? balanceDifference : 0,
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
      setExchangeItems([]);
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

  // Statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReturns = returns.filter(r => r.createdAt.split('T')[0] === today);
    
    return {
      total: returns.length,
      today: todayReturns.length,
      totalAmount: returns.reduce((sum, r) => sum + r.totalAmount, 0),
      todayAmount: todayReturns.reduce((sum, r) => sum + r.totalAmount, 0),
      cash: returns.filter(r => r.refundMethod === 'cash').length,
      credit: returns.filter(r => r.refundMethod === 'credit').length,
      exchange: returns.filter(r => r.refundMethod === 'exchange').length,
    };
  }, [returns]);

  // Filtered returns by tab
  const filteredReturns = useMemo(() => {
    if (activeTab === 'all') return returns;
    return returns.filter(r => r.refundMethod === activeTab);
  }, [returns, activeTab]);

  if (showNewReturn) {
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
                setExchangeItems([]);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <PackageX className="h-8 w-8 text-blue-600" />
                {t('returns_new_return')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{t('returns_new_return_description')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Return Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {t('returns_select_product')}
                </CardTitle>
                <CardDescription>{t('returns_scan_or_search')}</CardDescription>
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
                  
                  {filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addProductToReturn(product)}
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600 flex justify-between">
                            <span>{product.barcode}</span>
                            <span className="font-semibold text-blue-600">{product.sellingPrice.toFixed(2)} DH</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Return Items Table */}
            {returnItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t('returns_items')} ({returnItems.length})</span>
                    <span className="text-2xl font-bold text-blue-600">{returnTotal.toFixed(2)} DH</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="w-24">{t('quantity')}</TableHead>
                        <TableHead>{t('price')}</TableHead>
                        <TableHead>{t('total')}</TableHead>
                        <TableHead>{t('returns_condition')}</TableHead>
                        <TableHead>{t('returns_reason')}</TableHead>
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
                </CardContent>
              </Card>
            )}

            {/* Exchange Items (only if exchange method selected) */}
            {refundMethod === 'exchange' && (
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                    {t('returns_exchange_products')}
                  </CardTitle>
                  <CardDescription>{t('returns_exchange_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Exchange Product Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={t('returns_search_exchange_product')}
                      value={exchangeSearchTerm}
                      onChange={(e) => setExchangeSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    
                    {filteredExchangeProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {filteredExchangeProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => addProductToExchange(product)}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>{product.barcode}</span>
                              <span className="font-semibold text-purple-600">{product.sellingPrice.toFixed(2)} DH</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Exchange Items Table */}
                  {exchangeItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('product')}</TableHead>
                          <TableHead className="w-24">{t('quantity')}</TableHead>
                          <TableHead>{t('price')}</TableHead>
                          <TableHead>{t('total')}</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exchangeItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateExchangeItem(index, 'quantity', parseInt(e.target.value))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>{item.unitPrice.toFixed(2)} DH</TableCell>
                            <TableCell className="font-bold">{item.totalPrice.toFixed(2)} DH</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExchangeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Exchange Balance */}
                  {exchangeItems.length > 0 && (
                    <div className="bg-white p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('returns_return_total')}:</span>
                        <span className="font-semibold">{returnTotal.toFixed(2)} DH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('returns_exchange_total')}:</span>
                        <span className="font-semibold">{exchangeTotal.toFixed(2)} DH</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>{t('returns_balance')}:</span>
                        <span className={balanceDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {balanceDifference >= 0 ? '+' : ''}{balanceDifference.toFixed(2)} DH
                        </span>
                      </div>
                      {balanceDifference > 0 && (
                        <p className="text-xs text-green-700">{t('returns_customer_gets_refund')}</p>
                      )}
                      {balanceDifference < 0 && (
                        <p className="text-xs text-red-700">{t('returns_customer_pays_difference')}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Refund Method */}
            <Card>
              <CardHeader>
                <CardTitle>{t('returns_refund_method')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={refundMethod} onValueChange={(value: any) => {
                  setRefundMethod(value);
                  if (value !== 'exchange') {
                    setExchangeItems([]);
                  }
                }}>
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
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('returns_mettre_avoir')}
                      </div>
                    </SelectItem>
                    <SelectItem value="exchange">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        {t('returns_refund_exchange')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {refundMethod === 'cash' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <p className="text-blue-700">{t('returns_refund_cash_description')}</p>
                  </div>
                )}
                {refundMethod === 'credit' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm">
                    <p className="text-purple-700 font-medium">{t('returns_avoir_description')}</p>
                  </div>
                )}
                {refundMethod === 'exchange' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="text-green-700">{t('returns_refund_exchange_description')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Selection */}
            {(refundMethod === 'credit' || refundMethod === 'exchange') && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {refundMethod === 'credit' ? t('returns_avoir_customer') : t('customer')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('returns_select_customer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.name}</span>
                              {customer.phone && <span className="text-xs text-gray-500">({customer.phone})</span>}
                            </div>
                            {/* Show current balance */}
                            <span className={`text-xs ${customer.creditBalance > 0 ? 'text-blue-600' : customer.creditBalance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {t('balance')}: {customer.creditBalance.toFixed(2)} DH
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Show selected customer's current balance */}
                  {selectedCustomer && (() => {
                    const customer = customers.find(c => c.id === parseInt(selectedCustomer));
                    if (!customer) return null;
                    
                    return (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{t('returns_current_balance')}:</span>
                          <span className={`font-semibold ${customer.creditBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {customer.creditBalance.toFixed(2)} DH
                          </span>
                        </div>
                        {refundMethod === 'credit' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">{t('returns_return_amount')}:</span>
                              <span className="font-semibold text-green-600">+{returnTotal.toFixed(2)} DH</span>
                            </div>
                            <div className="border-t border-purple-300 pt-2 flex justify-between">
                              <span className="font-bold text-gray-800">{t('returns_new_balance')}:</span>
                              <span className="font-bold text-blue-600">
                                {(customer.creditBalance + returnTotal).toFixed(2)} DH
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder={t('returns_notes_placeholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle>{t('returns_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('returns_items_count')}:</span>
                  <span className="font-semibold">{returnItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('returns_return_total')}:</span>
                  <span className="font-bold text-xl text-blue-600">{returnTotal.toFixed(2)} DH</span>
                </div>
                {refundMethod === 'exchange' && exchangeItems.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>{t('returns_exchange_items')}:</span>
                      <span className="font-semibold">{exchangeItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('returns_exchange_total')}:</span>
                      <span className="font-semibold">{exchangeTotal.toFixed(2)} DH</span>
                    </div>
                  </>
                )}
                <Separator />
                <Button
                  onClick={handleSubmitReturn}
                  disabled={isSubmitting || returnItems.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                >
                  {isSubmitting ? t('saving') : t('returns_validate_return')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Returns List View
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PackageX className="h-8 w-8 text-blue-600" />
            {t('returns_customer_returns')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{t('returns_manage_description')}</p>
        </div>
        <Button
          onClick={() => setShowNewReturn(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('returns_new_return')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('returns_total_returns')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <PackageX className="h-10 w-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('returns_today')}</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <Calendar className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('returns_total_amount')}</p>
                <p className="text-2xl font-bold">{stats.totalAmount.toFixed(0)} DH</p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('returns_today_amount')}</p>
                <p className="text-2xl font-bold">{stats.todayAmount.toFixed(0)} DH</p>
              </div>
              <DollarSign className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            {t('all')} ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="cash">
            {t('returns_refund_cash')} ({stats.cash})
          </TabsTrigger>
          <TabsTrigger value="credit">
            {t('returns_refund_credit')} ({stats.credit})
          </TabsTrigger>
          <TabsTrigger value="exchange">
            {t('returns_refund_exchange')} ({stats.exchange})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {t('returns_no_returns_yet')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map(returnRecord => (
                  <TableRow key={returnRecord.id}>
                    <TableCell className="font-mono font-semibold">{returnRecord.returnNumber}</TableCell>
                    <TableCell>
                      {returnRecord.customerName ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {returnRecord.customerName}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{returnRecord.totalAmount.toFixed(2)} DH</TableCell>
                    <TableCell>
                      {returnRecord.refundMethod === 'cash' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {t('returns_refund_cash')}
                        </Badge>
                      )}
                      {returnRecord.refundMethod === 'credit' && (
                        <Badge variant="default" className="bg-purple-100 text-purple-800">
                          <FileText className="h-3 w-3 mr-1" />
                          {t('returns_refund_credit')}
                        </Badge>
                      )}
                      {returnRecord.refundMethod === 'exchange' && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          {t('returns_refund_exchange')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(returnRecord.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-gray-100 text-gray-800">
                        {returnRecord.status === 'completed' ? t('completed') : returnRecord.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewReturnDetails(returnRecord.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('view')}
                      </Button>
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
              {t('returns_details')} - {selectedReturn?.returnNumber}
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
                        <span className="text-gray-600">{t('customer')}:</span>
                        <span className="font-semibold">{selectedReturn.customerName || '-'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('returns_refund_method')}:</span>
                        <span className="font-semibold">{t(`returns_refund_${selectedReturn.refundMethod}`)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('status')}:</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {selectedReturn.status === 'completed' ? t('completed') : selectedReturn.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('returns_total_amount')}:</span>
                        <span className="font-bold text-xl text-blue-600">{selectedReturn.totalAmount.toFixed(2)} DH</span>
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
                  <h3 className="text-lg font-semibold mb-3">{t('returns_items')}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('quantity')}</TableHead>
                        <TableHead>{t('price')}</TableHead>
                        <TableHead>{t('total')}</TableHead>
                        <TableHead>{t('returns_condition')}</TableHead>
                        <TableHead>{t('returns_reason')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitPrice.toFixed(2)} DH</TableCell>
                          <TableCell className="font-bold">{item.totalPrice.toFixed(2)} DH</TableCell>
                          <TableCell>
                            {item.condition === 'good' ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('returns_condition_good')}
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {t('returns_condition_damaged')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{item.reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => selectedReturn && cancelReturn(selectedReturn.id)}
            >
              <X className="h-4 w-4 mr-2" />
              {t('returns_cancel_return')}
            </Button>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
