import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Supplier, insertSupplierSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Truck, AlertTriangle, Phone, Mail, User, Building, Edit, Plus } from "lucide-react";

type Translator = (key: string, params?: { [key: string]: string | number }) => string;

type SupplierForm = z.infer<
  ReturnType<typeof buildSupplierFormSchema>
>;

function buildSupplierFormSchema(t: Translator) {
  return insertSupplierSchema.extend({
    tenantId: z.string().optional(),
    name: z.string().min(1, t('supplier_name_required')),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(t('invalid_email')).optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
  });
}

export default function Suppliers() {
  const { t } = useI18n();
  const { toast } = useToast();

  const formSchema = useMemo(() => buildSupplierFormSchema(t), [t]);

  // State for UI controls
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  // Fetch suppliers
  const { data: suppliers, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/suppliers', search],
  });

  // Create supplier mutation
  const createMutation = useMutation({
    mutationFn: async (supplier: SupplierForm) => {
      const res = await apiRequest('POST', '/api/suppliers', supplier);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: t('success'),
        description: t('supplier_created_successfully'),
      });
      setOpenDialog(false);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('create_supplier_error'),
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateMutation = useMutation({
    mutationFn: async (supplier: SupplierForm & { id: number }) => {
      const { id, ...data } = supplier;
      const res = await apiRequest('PUT', `/api/suppliers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: t('success'),
        description: t('supplier_updated_successfully'),
      });
      setOpenDialog(false);
      setEditSupplier(null);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('update_supplier_error'),
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<SupplierForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
  });

  // Handle dialog open/close
  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditSupplier(supplier);
      form.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditSupplier(null);
      form.reset({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  // Handle form submission
  const onSubmit = (values: SupplierForm) => {
    if (editSupplier) {
      updateMutation.mutate({ ...values, id: editSupplier.id });
    } else {
      createMutation.mutate(values);
    }
  };

  // Filter suppliers by search
  const filteredSuppliers = () => {
    if (!suppliers) return [];
    
    if (!search) return suppliers;
    
    const searchLower = search.toLowerCase();
    return suppliers.filter(
      s => s.name.toLowerCase().includes(searchLower) || 
           (s.contactPerson && s.contactPerson.toLowerCase().includes(searchLower)) ||
           (s.phone && s.phone.toLowerCase().includes(searchLower)) ||
           (s.email && s.email.toLowerCase().includes(searchLower))
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
          <p className="mt-2 text-sm text-red-700">{t('suppliers_load_error')}</p>
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

  const supplierList = filteredSuppliers();

  return (
    <>
      <div className="p-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{t('suppliers')}</h1>
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
            placeholder={t('search_suppliers')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-3">
          {t('suppliers_results', { count: supplierList.length.toString() })}
        </div>
        
        {/* Suppliers List */}
        {supplierList.length === 0 ? (
          <div className="text-center p-8">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <h3 className="font-medium text-muted-foreground">{t('no_suppliers_found')}</h3>
          </div>
        ) : (
          supplierList.map(supplier => (
            <Card key={supplier.id} className="mb-3 card">
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                      <Building className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium">{supplier.name}</h3>
                      {supplier.contactPerson && (
                        <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <User className="h-3 w-3 mr-1" />
                          {supplier.contactPerson}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenDialog(supplier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                {(supplier.phone || supplier.email) && (
                  <div className="mt-3 border-t pt-3 grid grid-cols-1 gap-2">
                    {supplier.phone && (
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">{supplier.phone}</span>
                      </div>
                    )}
                    
                    {supplier.email && (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Supplier Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSupplier ? t('edit_supplier') : t('add_supplier')}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('supplier_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact_person')}</FormLabel>
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
                    t('loading') : (editSupplier ? t('update') : t('save'))}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
