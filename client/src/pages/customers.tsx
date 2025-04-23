import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Customer, insertCustomerSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, AlertTriangle, Phone, Mail, User, Edit, Plus, CreditCard } from "lucide-react";

// Customer form schema with client-side validation
const formSchema = insertCustomerSchema.extend({
  tenantId: z.string().optional(),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  creditBalance: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type CustomerForm = z.infer<typeof formSchema>;

export default function Customers() {
  const { t } = useI18n();
  const { toast } = useToast();

  // State for UI controls
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  // Fetch customers
  const { data: customers, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/customers', search],
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (customer: CustomerForm) => {
      const res = await apiRequest('POST', '/api/customers', customer);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('success'),
        description: t('customer_created_successfully'),
      });
      setOpenDialog(false);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('create_customer_error'),
        variant: "destructive",
      });
    },
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async (customer: CustomerForm & { id: number }) => {
      const { id, ...data } = customer;
      const res = await apiRequest('PUT', `/api/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('success'),
        description: t('customer_updated_successfully'),
      });
      setOpenDialog(false);
      setEditCustomer(null);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('update_customer_error'),
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<CustomerForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 0,
      creditBalance: 0,
      notes: '',
    },
  });

  // Handle dialog open/close
  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditCustomer(customer);
      form.reset({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        creditLimit: customer.creditLimit || 0,
        creditBalance: customer.creditBalance || 0,
        notes: customer.notes || '',
      });
    } else {
      setEditCustomer(null);
      form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 0,
        creditBalance: 0,
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  // Handle form submission
  const onSubmit = (values: CustomerForm) => {
    if (editCustomer) {
      updateMutation.mutate({ ...values, id: editCustomer.id });
    } else {
      createMutation.mutate(values);
    }
  };

  // Filter customers by search
  const filteredCustomers = () => {
    if (!customers) return [];
    
    if (!search) return customers;
    
    const searchLower = search.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(searchLower) || 
           (c.phone && c.phone.toLowerCase().includes(searchLower)) ||
           (c.email && c.email.toLowerCase().includes(searchLower))
    );
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-10 w-full" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="mb-3">
            <div className="p-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('error')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{t('customers_load_error')}</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            {t('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{t('customers')}</h1>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            {t('add')}
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            placeholder={t('search_customers')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-3">
          {filteredCustomers().length} {t('results')}
        </div>
        
        {/* Customers List */}
        {filteredCustomers().length === 0 ? (
          <div className="text-center p-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <h3 className="font-medium text-muted-foreground">{t('no_customers_found')}</h3>
          </div>
        ) : (
          filteredCustomers().map(customer => (
            <Card key={customer.id} className="mb-3 card">
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">{customer.name}</h3>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                {(customer.email || customer.creditBalance !== undefined) && (
                  <div className="mt-3 border-t pt-3 grid grid-cols-2 gap-2">
                    {customer.email && (
                      <div className="flex items-center col-span-2">
                        <Mail className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.creditLimit !== undefined && (
                      <div className="flex items-center">
                        <CreditCard className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">
                          {t('credit_limit')}: {customer.creditLimit.toFixed(2)} {t('currency')}
                        </span>
                      </div>
                    )}
                    
                    {customer.creditBalance !== undefined && customer.creditBalance > 0 && (
                      <div className="flex items-center">
                        <span className="text-xs text-rose-500 font-medium">
                          {t('owes')}: {customer.creditBalance.toFixed(2)} {t('currency')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Customer Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? t('edit_customer') : t('add_customer')}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('customer_name')}</FormLabel>
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
                    <FormLabel>{t('phone')}</FormLabel>
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
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('credit_limit')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {editCustomer && (
                <FormField
                  control={form.control}
                  name="creditBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('credit_balance')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenDialog(false)}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 
                    t('loading') : (editCustomer ? t('update') : t('save'))}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
