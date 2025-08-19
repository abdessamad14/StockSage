import { useOfflineAuth } from '@/hooks/use-offline-auth';
import { Menu, Bell } from 'lucide-react';
import { lowStockHelpers } from '@/lib/offline-storage';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  title: string;
  onMenuToggle: () => void;
  hasBackButton?: boolean;
}

export default function AppHeader({ title, onMenuToggle, hasBackButton = false }: AppHeaderProps) {
  const { user } = useOfflineAuth();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  
  // Update low stock notifications
  useEffect(() => {
    const updateLowStockNotifications = () => {
      if (lowStockHelpers.isLowStockAlertsEnabled()) {
        const products = lowStockHelpers.getLowStockProducts();
        setLowStockProducts(products);
        setLowStockCount(products.length);
      } else {
        setLowStockProducts([]);
        setLowStockCount(0);
      }
    };

    updateLowStockNotifications();
    
    // Update notifications every 30 seconds
    const interval = setInterval(updateLowStockNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-primary text-white shadow-md fixed top-0 left-0 w-full z-30 mobile-header">
      <div className="flex items-center justify-between h-14 px-4 safe-area-inset-top">
        <div className="flex items-center">
          <button 
            onClick={onMenuToggle}
            className="p-1 -ml-1 mr-2 rounded-full hover:bg-primary-dark focus:outline-none focus:bg-primary-dark active:scale-95 transition-transform duration-150"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium">{title}</h1>
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative mr-2 p-1 hover:bg-primary-dark active:scale-95 transition-transform duration-150">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-dark">
                  <Bell className="w-5 h-5" />
                </div>
                {lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {lowStockCount > 99 ? '99+' : lowStockCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 text-sm font-semibold border-b">
                Notifications
              </div>
              {lowStockCount === 0 ? (
                <DropdownMenuItem className="px-3 py-4 text-center text-gray-500">
                  No notifications
                </DropdownMenuItem>
              ) : (
                <>
                  <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50">
                    Low Stock Alerts ({lowStockCount})
                  </div>
                  {lowStockProducts.slice(0, 5).map((product) => (
                    <DropdownMenuItem key={product.id} className="px-3 py-2">
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm truncate">{product.name}</span>
                          <span className="text-xs text-red-600 ml-2">
                            {product.quantity} left
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Stock running low
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {lowStockCount > 5 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="px-3 py-2 text-center text-sm text-blue-600">
                        View all {lowStockCount} low stock items
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="w-8 h-8 bg-primary-dark rounded-full flex items-center justify-center active:scale-95 transition-transform duration-150 cursor-pointer">
            <span className="text-sm font-semibold">{getUserInitials()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
