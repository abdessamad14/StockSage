import { useMemo, useState } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users,
  Package,
  Calendar,
  Download
} from "lucide-react";

export default function OfflineReports() {
  const { products, loading: productsLoading } = useOfflineProducts();
  const { sales, loading: salesLoading } = useOfflineSales();
  const { customers, loading: customersLoading } = useOfflineCustomers();
  const { t } = useI18n();

  const [reportType, setReportType] = useState("overview");
  const [dateRange, setDateRange] = useState("30days");

  const loading = productsLoading || salesLoading || customersLoading;

  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const reportTypeLabels = useMemo(() => ({
    overview: t('reports_type_overview'),
    sales: t('reports_type_sales'),
    inventory: t('reports_type_inventory'),
    customers: t('reports_type_customers'),
  }), [t]);

  const dateRangeLabels = useMemo(() => ({
    '7days': t('reports_range_7_days'),
    '30days': t('reports_range_30_days'),
    '90days': t('reports_range_90_days'),
    '1year': t('reports_range_year'),
  }), [t]);

  // Calculate basic metrics
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const lowStockItems = products.filter(p => p.quantity <= (p.minStockLevel || 10)).length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('reports_title')}</h1>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          {t('reports_export')}
        </Button>
      </div>

      {/* Report Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('reports_select_type_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">{reportTypeLabels.overview}</SelectItem>
            <SelectItem value="sales">{reportTypeLabels.sales}</SelectItem>
            <SelectItem value="inventory">{reportTypeLabels.inventory}</SelectItem>
            <SelectItem value="customers">{reportTypeLabels.customers}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('reports_select_range_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">{dateRangeLabels['7days']}</SelectItem>
            <SelectItem value="30days">{dateRangeLabels['30days']}</SelectItem>
            <SelectItem value="90days">{dateRangeLabels['90days']}</SelectItem>
            <SelectItem value="1year">{dateRangeLabels['1year']}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports_total_revenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports_total_revenue_desc', { count: formatNumber(totalTransactions) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports_avg_transaction')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports_avg_transaction_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports_total_customers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports_total_customers_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports_products_card')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalProducts)}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports_products_low_stock', { count: formatNumber(lowStockItems) })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Content */}
      {reportType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t('reports_sales_overview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_total_sales')}</span>
                  <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_transactions')}</span>
                  <span className="font-semibold">{formatNumber(totalTransactions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_average_sale')}</span>
                  <span className="font-semibold">{formatCurrency(averageTransaction)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t('reports_inventory_status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_total_products')}</span>
                  <span className="font-semibold">{formatNumber(totalProducts)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_low_stock_items')}</span>
                  <span className="font-semibold text-red-600">{formatNumber(lowStockItems)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('reports_stock_health')}</span>
                  <span className={`font-semibold ${lowStockItems === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {lowStockItems === 0 ? t('reports_stock_health_good') : t('reports_stock_health_attention')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">{t('reports_module_title')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('reports_module_desc')}
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>{t('reports_module_point_charts')}</li>
                <li>{t('reports_module_point_sales')}</li>
                <li>{t('reports_module_point_inventory')}</li>
                <li>{t('reports_module_point_profit')}</li>
                <li>{t('reports_module_point_export')}</li>
                <li>{t('reports_module_point_filters')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
