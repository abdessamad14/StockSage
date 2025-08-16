import { useState } from "react";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineCustomer, creditHelpers, OfflineCreditTransaction } from "@/lib/offline-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, CreditCard, DollarSign, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  creditBalance: z.number().optional(),
  notes: z.string().optional()
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function OfflineCustomers() {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useOfflineCustomers();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OfflineCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<OfflineCustomer | null>(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditNote, setCreditNote] = useState("");

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      creditBalance: 0,
      notes: ""
    }
  });

  const filteredCustomers = customers.filter(customer => 
    !searchQuery || 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: CustomerFormData) => {
    try {
      if (editingCustomer) {
        updateCustomer(editingCustomer.id, {
          ...data,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          creditBalance: data.creditBalance || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: "Customer updated successfully"
        });
      } else {
        createCustomer({
          ...data,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          creditBalance: data.creditBalance || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: "Customer created successfully"
        });
      }
      
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to save customer",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (customer: OfflineCustomer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      creditBalance: customer.creditBalance || 0,
      notes: customer.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (customer: OfflineCustomer) => {
    if (confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      deleteCustomer(customer.id);
      toast({
        title: t('success'),
        description: "Customer deleted successfully"
      });
    }
  };

  const handleCreditAction = () => {
    if (!selectedCustomer || creditAmount <= 0) return;

    try {
      creditHelpers.addCreditPayment(
        selectedCustomer.id,
        creditAmount,
        creditNote || `Credit payment - ${format(new Date(), 'MMM dd, yyyy')}`
      );
      toast({
        title: "Success",
        description: `Payment of $${creditAmount.toFixed(2)} recorded successfully`
      });

      setIsCreditDialogOpen(false);
      setCreditAmount(0);
      setCreditNote("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process credit payment",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('customers')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  {(() => {
                    const creditInfo = creditHelpers.getCustomerCreditInfo(customer.id);
                    return creditInfo.currentBalance > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        ${creditInfo.currentBalance.toFixed(2)} owed
                      </Badge>
                    ) : null;
                  })()}
                </div>
                {customer.phone && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {customer.address}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsCreditDialogOpen(true);
                  }}
                  title="Manage Credit"
                >
                  <CreditCard className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(customer)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(customer)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {(() => {
              const creditInfo = creditHelpers.getCustomerCreditInfo(customer.id);
              return creditInfo.currentBalance > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Credit Balance:</span>
                    <span className="text-red-600 font-medium">
                      ${creditInfo.currentBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {customer.notes && (
              <p className="text-sm text-gray-600 mt-2">{customer.notes}</p>
            )}
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600">
            {searchQuery ? "Try adjusting your search" : "Add your first customer to get started"}
          </p>
        </div>
      )}

      {/* Customer Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update customer information' : 'Enter the details for the new customer'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Credit Management - {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Manage customer credit balance, payments, and view transaction history
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payment">Record Payment</TabsTrigger>
                <TabsTrigger value="history">Transaction History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold">Current Balance</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      ${creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance.toFixed(2)}
                    </p>
                  </Card>
                  
                </div>
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    
                    <div>
                      <label className="text-sm font-medium">Payment Amount</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Note</label>
                      <Input
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder="Optional note..."
                        className="mt-1"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCreditAction}
                      disabled={creditAmount <= 0}
                      className="w-full"
                    >
                      Record Payment
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Current Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Current Balance:</span>
                        <span className="font-medium text-red-600">
                          ${creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance.toFixed(2)}
                        </span>
                      </div>
                      {creditAmount > 0 && (
                        <div className="flex justify-between">
                          <span>After Payment:</span>
                          <span className="font-medium text-green-600">
                            ${Math.max(0, creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance - creditAmount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5" />
                  <h3 className="font-semibold">Credit Transaction History</h3>
                </div>
                
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditHelpers.getCustomerCreditInfo(selectedCustomer.id).transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transaction.type === 'credit_sale' ? 'destructive' : 
                                transaction.type === 'payment' ? 'default' : 
                                'secondary'
                              }
                            >
                              {transaction.type === 'credit_sale' ? 'sale' : transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={
                              transaction.type === 'credit_sale' ? 'text-red-600' : 'text-green-600'
                            }>
                              {transaction.type === 'credit_sale' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            -
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {creditHelpers.getCustomerCreditInfo(selectedCustomer.id).transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No credit transactions found
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
