import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, User, UserCog, UserMinus } from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';

// User form schema
const userFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['admin', 'merchant', 'cashier']),
  active: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);

  // Role display mapping
  const roleDisplay = {
    admin: { label: 'Admin', color: 'bg-blue-500 hover:bg-blue-600' },
    merchant: { label: 'Merchant', color: 'bg-green-500 hover:bg-green-600' },
    cashier: { label: 'Cashier', color: 'bg-amber-500 hover:bg-amber-600' },
    supporter: { label: 'Support', color: 'bg-purple-500 hover:bg-purple-600' },
    viewer: { label: 'Viewer', color: 'bg-gray-500 hover:bg-gray-600' },
  };

  // Fetch users
  const { 
    data: users = [], 
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/users');
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch users');
        }
        
        return await res.json();
      } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
      }
    },
    // Refresh every 5 seconds to ensure we have the latest data
    refetchInterval: 5000,
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const res = await apiRequest('POST', '/api/users', values);
      
      if (!res.ok) {
        // Attempt to parse error message from response
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add user');
      }
      
      return await res.json();
    },
    onSuccess: (newUser) => {
      // Force refresh the users list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // Manually update the cache with the new user to ensure it shows immediately
      const currentUsers = queryClient.getQueryData<any[]>(['/api/users']) || [];
      queryClient.setQueryData(['/api/users'], [...currentUsers, newUser]);
      
      setIsAddUserOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'User added successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (values: UserFormValues & { id: number }) => {
      const { id, ...userData } = values;
      const res = await apiRequest('PATCH', `/api/users/${id}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/users/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeletingUser(null);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  // Form definition
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      role: 'cashier',
      active: true,
    },
  });

  // Open edit user dialog
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      // Don't set password as we don't want to change it necessarily
      password: '',
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      active: user.active,
    });
  };

  // Submit handler
  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ ...values, id: editingUser.id });
    } else {
      addUserMutation.mutate(values);
    }
  };

  // Render page
  return (
    <AppShell>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          {user?.role === 'admin' && (
            <Button onClick={() => setIsAddUserOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage users for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>List of all users in your business</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge className={roleDisplay[user.role as keyof typeof roleDisplay]?.color || 'bg-gray-500'}>
                          {roleDisplay[user.role as keyof typeof roleDisplay]?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'outline'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setDeletingUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeletingUser(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (deletingUser) {
                                      deleteUserMutation.mutate(deletingUser.id);
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit User Dialog */}
        <Dialog 
          open={isAddUserOpen || editingUser !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setIsAddUserOpen(false);
              setEditingUser(null);
              form.reset();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Update user information and permissions.'
                  : 'Create a new user for your business.'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!!editingUser} />
                      </FormControl>
                      {!editingUser && (
                        <p className="text-xs text-muted-foreground">
                          Choose a unique username for this user to log in with
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
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
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="merchant">Merchant</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Inactive users cannot log in to the system.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddUserOpen(false);
                      setEditingUser(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={addUserMutation.isPending || updateUserMutation.isPending}
                  >
                    {(addUserMutation.isPending || updateUserMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingUser ? 'Update User' : 'Add User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}