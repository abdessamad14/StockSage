import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar,
  Download,
  Eye,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  offlineInventoryCountStorage,
  offlineInventoryCountItemStorage,
  offlineProductStorage,
  offlineStockLocationStorage
} from '@/lib/offline-storage';
import type { 
  OfflineInventoryCount,
  OfflineInventoryCountItem,
  OfflineProduct,
  OfflineStockLocation
} from '@/lib/offline-storage';

interface InventoryCountHistoryProps {
  onViewCount: (count: OfflineInventoryCount) => void;
}

export default function InventoryCountHistory({ onViewCount }: InventoryCountHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const counts = offlineInventoryCountStorage.getAll();
  const products = offlineProductStorage.getAll();
  const locations = offlineStockLocationStorage.getAll();

  // Filter counts based on search and filters
  const filteredCounts = useMemo(() => {
    return counts.filter(count => {
      // Search filter
      if (searchQuery && !count.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && count.status !== statusFilter) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && count.type !== typeFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange !== 'all') {
        const countDate = new Date(count.createdAt);
        const now = new Date();
        
        switch (dateRange) {
          case 'today':
            return countDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return countDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return countDate >= monthAgo;
          default:
            return true;
        }
      }
      
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [counts, searchQuery, statusFilter, typeFilter, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCounts = filteredCounts.length;
    const completedCounts = filteredCounts.filter(c => c.status === 'completed').length;
    const inProgressCounts = filteredCounts.filter(c => c.status === 'in_progress').length;
    const draftCounts = filteredCounts.filter(c => c.status === 'draft').length;
    
    // Calculate variance statistics for completed counts
    let totalVariances = 0;
    let positiveVariances = 0;
    let negativeVariances = 0;
    let totalVarianceValue = 0;
    
    filteredCounts
      .filter(c => c.status === 'completed')
      .forEach(count => {
        const items = offlineInventoryCountItemStorage.getByCountId(count.id);
        items.forEach(item => {
          if (item.variance && item.variance !== 0) {
            totalVariances++;
            if (item.variance > 0) positiveVariances++;
            if (item.variance < 0) negativeVariances++;
            
            const product = products.find(p => p.id === item.productId);
            if (product) {
              totalVarianceValue += item.variance * product.costPrice;
            }
          }
        });
      });
    
    return {
      totalCounts,
      completedCounts,
      inProgressCounts,
      draftCounts,
      totalVariances,
      positiveVariances,
      negativeVariances,
      totalVarianceValue,
      completionRate: totalCounts > 0 ? (completedCounts / totalCounts) * 100 : 0
    };
  }, [filteredCounts, products]);

  const getCountProgress = (count: OfflineInventoryCount) => {
    const items = offlineInventoryCountItemStorage.getByCountId(count.id);
    const countedItems = items.filter(item => item.status === 'counted' || item.status === 'verified');
    return items.length > 0 ? (countedItems.length / items.length) * 100 : 0;
  };

  const getCountVariances = (count: OfflineInventoryCount) => {
    const items = offlineInventoryCountItemStorage.getByCountId(count.id);
    return items.filter(item => item.variance && item.variance !== 0).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <BarChart3 className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const exportCountData = (count: OfflineInventoryCount) => {
    const items = offlineInventoryCountItemStorage.getByCountId(count.id);
    const data = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const location = locations.find(l => l.id === item.locationId);
      
      return {
        'Count Name': count.name,
        'Product': product?.name || 'Unknown',
        'Location': location?.name || 'Unknown',
        'System Quantity': item.systemQuantity,
        'Counted Quantity': item.countedQuantity || 0,
        'Variance': item.variance || 0,
        'Status': item.status,
        'Counted By': item.countedBy || '',
        'Counted At': item.countedAt || '',
        'Notes': item.notes || ''
      };
    });

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-count-${count.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Counts</p>
                <p className="text-2xl font-bold">{stats.totalCounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedCounts}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.completionRate.toFixed(1)}% completion rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Variances</p>
                <p className="text-2xl font-bold">{stats.totalVariances}</p>
                <div className="flex space-x-2 text-xs">
                  <span className="text-green-600">+{stats.positiveVariances}</span>
                  <span className="text-red-600">-{stats.negativeVariances}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {stats.totalVarianceValue >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Variance Impact</p>
                <p className={`text-2xl font-bold ${stats.totalVarianceValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(stats.totalVarianceValue).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalVarianceValue >= 0 ? 'Net Gain' : 'Net Loss'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Count History</CardTitle>
          <CardDescription>
            View and analyze past inventory counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search counts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full Count</SelectItem>
                <SelectItem value="partial">Partial Count</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count List */}
          <div className="space-y-4">
            {filteredCounts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No inventory counts found</p>
              </div>
            ) : (
              filteredCounts.map(count => {
                const progress = getCountProgress(count);
                const variances = getCountVariances(count);
                const location = locations.find(l => l.id === count.locationId);
                
                return (
                  <div key={count.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-lg">{count.name}</h3>
                          <Badge className={getStatusColor(count.status)}>
                            {getStatusIcon(count.status)}
                            <span className="ml-1 capitalize">{count.status.replace('_', ' ')}</span>
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {count.type}
                          </Badge>
                          {count.type === 'partial' && location && (
                            <Badge variant="outline">
                              {location.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {count.description}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewCount(count)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {count.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportCountData(count)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{new Date(count.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progress</p>
                        <p>{Math.round(progress)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variances</p>
                        <p className={variances > 0 ? 'text-orange-600 font-medium' : ''}>
                          {variances}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p>
                          {count.completedAt && count.startedAt ? (
                            `${Math.round((new Date(count.completedAt).getTime() - new Date(count.startedAt).getTime()) / (1000 * 60))} min`
                          ) : count.startedAt ? (
                            `${Math.round((new Date().getTime() - new Date(count.startedAt).getTime()) / (1000 * 60))} min`
                          ) : (
                            'Not started'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
