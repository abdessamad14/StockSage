import { useOfflineProducts } from '@/hooks/use-offline-products';
import { useOfflineCustomers } from '@/hooks/use-offline-customers';
import { useOfflineSales } from '@/hooks/use-offline-sales';
import { useOfflineSettings } from '@/hooks/use-offline-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';

export default function OfflineDashboard() {
  const { products, loading: productsLoading } = useOfflineProducts();
  const { customers, loading: customersLoading } = useOfflineCustomers();
  const { sales, loading: salesLoading } = useOfflineSales();
  const { settings } = useOfflineSettings();

  if (productsLoading || customersLoading || salesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = sales.length;
  const lowStockProducts = products.filter(p => 
    p.minStockLevel && p.quantity <= p.minStockLevel
  ).length;

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Offline Mode</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Completed transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.currency || '$'}{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total sales revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {lowStockProducts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              {lowStockProducts} product{lowStockProducts > 1 ? 's' : ''} running low on stock. 
              Check your inventory to reorder.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales recorded yet</p>
            ) : (
              <div className="space-y-3">
                {sales.slice(-5).reverse().map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{sale.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(sale.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {settings?.currency || '$'}{sale.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{sale.paymentMethod}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts === 0 ? (
              <p className="text-gray-500 text-center py-4">All products are well stocked</p>
            ) : (
              <div className="space-y-3">
                {products
                  .filter(p => p.minStockLevel && p.quantity <= p.minStockLevel)
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{product.quantity}</p>
                        <p className="text-sm text-gray-600">Min: {product.minStockLevel}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
