import { useMemo, useState } from "react";
import { useOfflineSettings } from "@/hooks/use-offline-settings";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, DollarSign, Bell, Palette, Building2, Printer } from "lucide-react";
import USBThermalPrinterConfig from '@/components/USBThermalPrinterConfig';

type Translator = (key: string, params?: { [key: string]: string | number }) => string;

const buildSettingsSchema = (t: Translator) => z.object({
  businessName: z.string().min(1, t('offline_settings_business_name_required')),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  currency: z.string().min(1, t('offline_settings_currency_required')),
  taxRate: z
    .number()
    .min(0, t('offline_settings_tax_rate_range'))
    .max(100, t('offline_settings_tax_rate_range')),
  lowStockThreshold: z.number().min(0, t('offline_settings_low_stock_positive')),
  enableNotifications: z.boolean(),
  enableLowStockAlerts: z.boolean(),
  enableAutoBackup: z.boolean(),
  language: z.string().min(1, t('offline_settings_language_required')),
  theme: z.string().min(1, t('offline_settings_theme_required'))
});

type SettingsFormData = z.infer<ReturnType<typeof buildSettingsSchema>>;

export default function OfflineSettings() {
  const { settings, loading, updateSettings } = useOfflineSettings();
  const { t } = useI18n();
  const { toast } = useToast();
  const settingsSchema = useMemo(() => buildSettingsSchema(t), [t]);
  
  const [activeTab, setActiveTab] = useState("business");
  const tabs = useMemo(
    () => [
      { id: "business", label: t('offline_settings_tab_business'), icon: Building2 },
      { id: "financial", label: t('offline_settings_tab_financial'), icon: DollarSign },
      { id: "notifications", label: t('offline_settings_tab_notifications'), icon: Bell },
      { id: "appearance", label: t('offline_settings_tab_appearance'), icon: Palette },
      { id: "printing", label: t('offline_settings_tab_printing'), icon: Printer }
    ],
    [t]
  );

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: {
      businessName: settings?.businessName || "",
      address: settings?.address || "",
      phone: settings?.phone || "",
      email: settings?.email || "",
      currency: settings?.currency || "USD",
      taxRate: settings?.taxRate || 0,
      lowStockThreshold: settings?.lowStockThreshold || 10,
      enableNotifications: settings?.enableNotifications || false,
      enableLowStockAlerts: settings?.enableLowStockAlerts || true,
      enableAutoBackup: settings?.enableAutoBackup || false,
      language: settings?.language || "en",
      theme: settings?.theme || "light"
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    try {
      updateSettings({
        ...data,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null
      });
      toast({
        title: t('success'),
        description: t('offline_settings_updated')
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('offline_settings_update_error'),
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('settings')}</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Info Tab */}
          {activeTab === "business" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {t('offline_settings_business_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('offline_settings_business_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_business_name')}</FormLabel>
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
                        <FormLabel>{t('offline_settings_address')}</FormLabel>
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
                        <FormLabel>{t('offline_settings_phone')}</FormLabel>
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
                        <FormLabel>{t('offline_settings_email')}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === "financial" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {t('offline_settings_financial_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('offline_settings_financial_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_currency_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('offline_settings_currency_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">{t('offline_settings_currency_usd')}</SelectItem>
                            <SelectItem value="EUR">{t('offline_settings_currency_eur')}</SelectItem>
                            <SelectItem value="GBP">{t('offline_settings_currency_gbp')}</SelectItem>
                            <SelectItem value="CAD">{t('offline_settings_currency_cad')}</SelectItem>
                            <SelectItem value="AUD">{t('offline_settings_currency_aud')}</SelectItem>
                            <SelectItem value="JPY">{t('offline_settings_currency_jpy')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_tax_rate')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_low_stock_threshold')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    {t('offline_settings_notifications_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('offline_settings_notifications_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="enableNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('offline_settings_enable_notifications')}
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            {t('offline_settings_enable_notifications_desc')}
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enableLowStockAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('offline_settings_low_stock_alerts')}
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            {t('offline_settings_low_stock_alerts_desc')}
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enableAutoBackup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t('offline_settings_auto_backup')}
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            {t('offline_settings_auto_backup_desc')}
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    {t('offline_settings_appearance_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('offline_settings_appearance_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_theme_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('offline_settings_theme_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">{t('offline_settings_theme_light')}</SelectItem>
                            <SelectItem value="dark">{t('offline_settings_theme_dark')}</SelectItem>
                            <SelectItem value="system">{t('offline_settings_theme_system')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('offline_settings_language_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('offline_settings_language_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">{t('offline_settings_language_en')}</SelectItem>
                            <SelectItem value="es">{t('offline_settings_language_es')}</SelectItem>
                            <SelectItem value="fr">{t('offline_settings_language_fr')}</SelectItem>
                            <SelectItem value="de">{t('offline_settings_language_de')}</SelectItem>
                            <SelectItem value="it">{t('offline_settings_language_it')}</SelectItem>
                            <SelectItem value="pt">{t('offline_settings_language_pt')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Printing Tab */}
          {activeTab === "printing" && (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    {t('offline_settings_printing_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('offline_settings_printing_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <USBThermalPrinterConfig />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" size="lg">
              {t('offline_settings_save_button')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
