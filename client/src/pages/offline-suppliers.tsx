import { useState } from "react";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineSupplier } from "@/lib/offline-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, User } from "lucide-react";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional()
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function OfflineSuppliers() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useOfflineSuppliers();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<OfflineSupplier | null>(null);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: ""
    }
  });

  const filteredSuppliers = suppliers.filter(supplier => 
    !searchQuery || 
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        updateSupplier(editingSupplier.id, {
          ...data,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: "Supplier updated successfully"
        });
      } else {
        createSupplier({
          ...data,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: "Supplier created successfully"
        });
      }
      
      setIsDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to save supplier",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (supplier: OfflineSupplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: OfflineSupplier) => {
    if (confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      deleteSupplier(supplier.id);
      toast({
        title: t('success'),
        description: "Supplier deleted successfully"
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
        <h1 className="text-3xl font-bold">{t('suppliers')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  {supplier.name}
                </h3>
                {supplier.contactPerson && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <User className="w-3 h-3 mr-1" />
                    {supplier.contactPerson}
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {supplier.address}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(supplier)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(supplier)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {supplier.notes && (
              <p className="text-sm text-gray-600 mt-2 pt-2 border-t">{supplier.notes}</p>
            )}
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-600">
            {searchQuery ? "Try adjusting your search" : "Add your first supplier to get started"}
          </p>
        </div>
      )}

      {/* Supplier Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier information' : 'Enter the details for the new supplier'}
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
                      <FormLabel>Supplier Name</FormLabel>
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
                      <FormLabel>Contact Person</FormLabel>
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
                  {editingSupplier ? 'Update' : 'Create'} Supplier
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
