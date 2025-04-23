import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart2, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Calendar, 
  Download, 
  RefreshCw,
  PieChart
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function Reports() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  // State for report filters
  const [reportType, setReportType] = useState<"sales" | "inventory" | "customers">("sales");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("week");
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  // Get formatted date range for API request
  const getDateRangeParams = () => {
    switch (dateRange) {
      case "today":
        return {
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd")
        };
      case "week":
        return {
          startDate: format(startOfWeek(new Date()), "yyyy-MM-dd"),
          endDate: format(endOfWeek(new Date()), "yyyy-MM-dd")
        };
      case "month":
        return {
          startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
          endDate: format(endOfMonth(new Date()), "yyyy-MM-dd")
        };
      case "custom":
        return {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd")
        };
      default:
        return {
          startDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd")
        };
    }
  };

  // Fetch report data
  const { data: reportData, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/${reportType}`, getDateRangeParams()],
    enabled: isAdmin, // Only admins can access reports
  });

  // Handle download report
  const handleDownloadReport = () => {
    // In a real app, this would trigger a download of the report
    toast({
      title: t('report_download'),
      description: t('report_download_not_implemented'),
    });
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
          <p className="mt-2 text-sm text-amber-700">{t('reports_admin_only')}</p>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
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
          <p className="mt-2 text-sm text-red-700">{t('reports_load_error')}</p>
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
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('reports')}</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleDownloadReport}
        >
          <Download className="h-4 w-4 mr-1" />
          {t('download')}
        </Button>
      </div>
      
      {/* Report Type Tabs */}
      <Tabs
        defaultValue="sales"
        className="mb-4"
        onValueChange={(value) => setReportType(value as "sales" | "inventory" | "customers")}
      >
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="sales" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sales')}</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">{t('inventory')}</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('customers')}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Date Range Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('date_range')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as any)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('select_date_range')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t('today')}</SelectItem>
              <SelectItem value="week">{t('this_week')}</SelectItem>
              <SelectItem value="month">{t('this_month')}</SelectItem>
              <SelectItem value="custom">{t('custom_range')}</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === "custom" && (
            <div className="flex gap-2 w-full mt-2">
              <div className="flex-1">
                <input
                  type="date"
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1">
                {reportType === "sales" ? t('total_sales') : 
                 reportType === "inventory" ? t('stock_value') : 
                 t('customer_count')}
              </span>
              <span className="text-xl font-bold">
                {reportType === "sales" ? "12,485.00 " + t('currency') : 
                 reportType === "inventory" ? "34,256.00 " + t('currency') : 
                 "28"}
              </span>
              {reportType === "sales" && (
                <div className="flex items-center mt-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>+15.3% {t('vs_previous')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground mb-1">
                {reportType === "sales" ? t('transactions') : 
                 reportType === "inventory" ? t('low_stock') : 
                 t('average_purchase')}
              </span>
              <span className="text-xl font-bold">
                {reportType === "sales" ? "156" : 
                 reportType === "inventory" ? "8 " + t('products') : 
                 "425.00 " + t('currency')}
              </span>
              {reportType === "sales" && (
                <div className="flex items-center mt-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>+8.2% {t('vs_previous')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Report Content */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {reportType === "sales" ? t('sales_over_time') : 
             reportType === "inventory" ? t('inventory_status') : 
             t('customer_analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* This would be a chart in a real app */}
          <div className="h-64 bg-muted/20 rounded flex items-center justify-center">
            <div className="text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('chart_placeholder')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Secondary Report Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {reportType === "sales" ? t('top_selling_products') : 
             reportType === "inventory" ? t('stock_movement') : 
             t('customer_demographics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* This would be a table in a real app */}
          <div className="h-64 bg-muted/20 rounded flex items-center justify-center">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('table_placeholder')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
