import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import { offlineProductStorage, offlineSaleStorage } from "@/lib/offline-storage";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, DollarSign, Package, AlertTriangle, 
  RefreshCw, Check, ShoppingCart, TrendingUp, Clock 
} from "lucide-react";

export default function Dashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useOfflineAuth();
  const { lastSyncTime, setLastSyncTime } = useStore();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Load offline dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const products = offlineProductStorage.getAll();
        const sales = offlineSaleStorage.getAll();
        
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const todaySales = sales.filter(sale => 
          new Date(sale.createdAt) >= todayStart
        );
        
        const dashboardData = {
          dailySales: todaySales.reduce((sum, sale) => sum + sale.total, 0),
          totalProducts: products.length,
          lowStockItems: products.filter(p => p.quantity <= (p.lowStockThreshold || 10)).length,
          totalCustomers: 0, // Will be updated when customer storage is available
        };
        
        setData(dashboardData);
        setIsLoading(false);
      } catch (error) {
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // Handle sync button click (offline mode)
  const handleSync = async () => {
    try {
      setLastSyncTime(new Date());
      toast({
        title: t('success'),
        description: 'Data refreshed successfully (offline mode)',
      });
      // Reload dashboard data
      window.location.reload();
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to refresh data',
        variant: "destructive",
      });
    }
  };

  // Format sync time
  const formatSyncTime = () => {
    if (!lastSyncTime) return t('never');
    return format(lastSyncTime, 'HH:mm');
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-64 w-full mb-6" />
        
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h2 className="font-semibold flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {t('error')}
          </h2>
          <p className="mt-2 text-sm">{t('dashboard_load_error')}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 mobile-scroll-container">
      {/* Sync Status */}
      <div className="mb-4 flex justify-between items-center p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex items-center text-xs sm:text-sm text-gray-500">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            {t('last_sync')}: {formatSyncTime()}
          </div>
          <Button 
            onClick={handleSync} 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2 w-full sm:w-auto mobile-button-secondary"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('sync')}</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Daily Sales */}
        <Card className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {t('welcome_back')}, {user?.name || 'User'}!
              </p>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-bold">{data.dailySales.toFixed(2)} {t('currency')}</h3>
          <div className="flex items-center mt-1">
            <span className="text-success flex items-center text-xs">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12.5%
            </span>
            <span className="text-xs text-muted-foreground ml-2">{t('vs_yesterday')}</span>
          </div>
        </Card>
        
        {/* Low Stock Alert */}
        <Card className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{t('low_stock_alert')}</p>
            <span className="flex h-6 w-6 rounded-full bg-red-100 items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-error" />
            </span>
          </div>
          <h3 className="text-xl font-bold">{data.lowStockCount} {t('products_count')}</h3>
          <div className="mt-1">
            <a href="/inventory" className="text-primary text-xs font-medium">{t('view_details')}</a>
          </div>
        </Card>
      </div>

      {/* Products & Sales Section */}
      <h2 className="text-lg font-semibold mb-3">{t('popular_products')}</h2>
      <Card className="bg-white rounded-lg shadow-sm mb-6">
        {data.popularProducts.map((product, index) => (
          <div 
            key={product.id} 
            className={`${index < data.popularProducts.length - 1 ? 'border-b border-gray-100' : ''} p-4 flex justify-between items-center`}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-3">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.floor(Math.random() * 50) + 10} {t('sold_today')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">{product.sellingPrice.toFixed(2)} {t('currency')}</p>
              <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1
                ${product.stockStatus === 'in_stock' ? 'bg-green-100 text-success' : 
                  product.stockStatus === 'low_stock' ? 'bg-orange-100 text-orange-600' : 
                  'bg-red-100 text-error'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1
                  ${product.stockStatus === 'in_stock' ? 'bg-success' : 
                    product.stockStatus === 'low_stock' ? 'bg-orange-600' : 
                    'bg-error'}`}
                ></span>
                {t(product.stockStatus)}
              </div>
            </div>
          </div>
        ))}
      </Card>
      
      {/* Recent Activities Section */}
      <h2 className="text-lg font-semibold mb-3">{t('recent_activities')}</h2>
      <Card className="bg-white rounded-lg shadow-sm mb-6">
        {data.recentActivities.map((activity, index) => (
          <div 
            key={index} 
            className={`${index < data.recentActivities.length - 1 ? 'border-b border-gray-100' : ''} p-4`}
          >
            <div className="flex">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0
                ${activity.type === 'sale' ? 'bg-blue-100' : 
                  activity.type === 'order' ? 'bg-green-100' : 
                  'bg-red-100'}`}
              >
                {activity.type === 'sale' ? (
                  <ShoppingCart className="w-4 h-4 text-primary" />
                ) : activity.type === 'order' ? (
                  <Package className="w-4 h-4 text-success" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-error" />
                )}
              </div>
              <div>
                <p className="font-medium">{activity.description} {activity.amount && `- ${activity.amount.toFixed(2)} ${t('currency')}`}</p>
                {activity.type === 'sale' && (
                  <p className="text-sm text-muted-foreground">
                    6 {t('items')} {t('sale')} {activity.customer ? `${t('to')} ${activity.customer}` : ''}
                  </p>
                )}
                {activity.type === 'order' && (
                  <p className="text-sm text-muted-foreground">
                    {t('receipt_from_supplier')} {activity.supplier || ''}
                  </p>
                )}
                {activity.type === 'adjustment' && (
                  <p className="text-sm text-muted-foreground">
                    {t('products_below_threshold')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  <Clock className="inline-block w-3 h-3 mr-1" />
                  {Math.floor(Math.random() * 60) < 30 ? 
                    t('minutes_ago', { 0: Math.floor(Math.random() * 30) + 1 }) : 
                    t('hours_ago', { 0: Math.floor(Math.random() * 5) + 1 })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
