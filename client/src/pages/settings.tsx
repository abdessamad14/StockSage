import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, insertSettingsSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Building, Globe, Printer, Moon, Sun, Database, Clock } from "lucide-react";

// Settings form schema with client-side validation
const formSchema = insertSettingsSchema.extend({
  tenantId: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  currency: z.string().optional(),
  logo: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  language: z.string().optional(),
  printerType: z.string().optional(),
  printerAddress: z.string().optional(),
  theme: z.string().optional(),
  syncInterval: z.coerce.number().min(5).optional(),
});

type SettingsForm = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const { language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [darkMode, setDarkMode] = useState(false);

  // Fetch settings
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isAdmin, // Only admins can access settings
  });

  // Toggle dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Also update in form
    if (settings) {
      updateMutation.mutate({ 
        ...settings, 
        theme: newMode ? 'dark' : 'light' 
      });
    }
  };

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const res = await apiRequest('PUT', '/api/settings', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: t('success'),
        description: t('settings_updated'),
      });
      
      // Update language if it changed
      if (data.language && data.language !== language) {
        setLanguage(data.language as 'fr' | 'ar');
      }
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('update_settings_error'),
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<SettingsForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: '',
      address: '',
      phone: '',
      email: '',
      taxRate: 0,
      currency: 'MAD',
      receiptHeader: '',
      receiptFooter: '',
      language: 'fr',
      printerType: 'none',
      printerAddress: '',
      theme: 'light',
      syncInterval: 15,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName,
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        taxRate: settings.taxRate || 0,
        currency: settings.currency || 'MAD',
        receiptHeader: settings.receiptHeader || '',
        receiptFooter: settings.receiptFooter || '',
        language: settings.language || 'fr',
        printerType: settings.printerType || 'none',
        printerAddress: settings.printerAddress || '',
        theme: settings.theme || 'light',
        syncInterval: settings.syncInterval || 15,
      });
    }
  }, [settings, form]);

  // Handle form submission
  const onSubmit = (values: SettingsForm) => {
    updateMutation.mutate(values);
  };

  // If user doesn't have permission
  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('access_denied')}</h3>
          </div>
          <p className="mt-2 text-sm text-amber-700">{t('settings_admin_only')}</p>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-10 w-full" />
        </div>
        <Card className="mb-4">
          <CardHeader>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('error')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{t('settings_load_error')}</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('settings')}</h1>
      
      <Tabs defaultValue="general" className="mb-4" onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="general" className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">{t('general')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('appearance')}</span>
          </TabsTrigger>
          <TabsTrigger value="printing" className="flex items-center gap-1">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{t('printing')}</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sync')}</span>
          </TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>{t('business_information')}</CardTitle>
                  <CardDescription>{t('general_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('business_name')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('tax_rate')} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.01" {...field} />
                          </FormControl>
                          <FormDescription>{t('tax_rate_description')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('currency')}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('select_currency')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MAD">MAD ({t('moroccan_dirham')})</SelectItem>
                              <SelectItem value="EUR">EUR ({t('euro')})</SelectItem>
                              <SelectItem value="USD">USD ({t('us_dollar')})</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="ml-auto"
                  >
                    {updateMutation.isPending ? t('saving') : t('save')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>{t('appearance_settings')}</CardTitle>
                  <CardDescription>{t('appearance_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>{t('dark_mode')}</FormLabel>
                        <FormDescription>{t('dark_mode_description')}</FormDescription>
                      </div>
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Switch 
                          checked={darkMode} 
                          onCheckedChange={toggleTheme} 
                        />
                        <Moon className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('language')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_language')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fr">{t('language_fr')}</SelectItem>
                            <SelectItem value="ar">{t('language_ar')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('language_description')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="ml-auto"
                  >
                    {updateMutation.isPending ? t('saving') : t('save')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="printing">
              <Card>
                <CardHeader>
                  <CardTitle>{t('receipt_settings')}</CardTitle>
                  <CardDescription>{t('printing_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="receiptHeader"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('receipt_header')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>{t('receipt_header_description')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="receiptFooter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('receipt_footer')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>{t('receipt_footer_description')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="printerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('printer_type')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_printer_type')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">{t('no_printer')}</SelectItem>
                            <SelectItem value="thermal">{t('thermal_printer')}</SelectItem>
                            <SelectItem value="standard">{t('standard_printer')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('printerType') !== 'none' && (
                    <FormField
                      control={form.control}
                      name="printerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('printer_address')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="BT:00:11:22:33:44:55" />
                          </FormControl>
                          <FormDescription>
                            {form.watch('printerType') === 'thermal' 
                              ? t('bluetooth_printer_description') 
                              : t('network_printer_description')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="ml-auto"
                  >
                    {updateMutation.isPending ? t('saving') : t('save')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="sync">
              <Card>
                <CardHeader>
                  <CardTitle>{t('sync_settings')}</CardTitle>
                  <CardDescription>{t('sync_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="syncInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sync_interval')}</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input 
                              type="number" 
                              min="5" 
                              max="60" 
                              {...field} 
                              className="w-20"
                            />
                          </FormControl>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('minutes')}</span>
                        </div>
                        <FormDescription>{t('sync_interval_description')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-6 bg-muted/30 p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">{t('device_info')}</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">{t('device_id')}:</span>
                      <span className="font-mono text-xs truncate">dev-{Math.random().toString(36).substring(2, 10)}</span>
                      
                      <span className="text-muted-foreground">{t('last_sync')}:</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                      
                      <span className="text-muted-foreground">{t('sync_status')}:</span>
                      <span className="text-success flex items-center">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {t('up_to_date')}
                      </span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 w-full"
                      onClick={() => {
                        toast({
                          title: t('sync_started'),
                          description: t('sync_in_progress'),
                        });
                        
                        // Simulate sync completion
                        setTimeout(() => {
                          toast({
                            title: t('sync_complete'),
                            description: t('sync_success'),
                          });
                        }, 2000);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('sync_now')}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="ml-auto"
                  >
                    {updateMutation.isPending ? t('saving') : t('save')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
