import { useI18n } from '@/lib/i18n';
import { Link, useLocation } from 'wouter';
import { useOfflineSettings } from '@/hooks/use-offline-settings';
import { useOfflineAuth } from '@/hooks/use-offline-auth';
import { 
  Store, 
  Package, 
  Database, 
  Users, 
  Truck, 
  ClipboardList, 
  BarChart2, 
  Settings, 
  Receipt,
  Warehouse,
  ClipboardCheck,
  UserCog,
  LogOut,
  PackageX
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
}

export default function NavigationDrawer({ isOpen }: NavigationDrawerProps) {
  const { t, language, setLanguage } = useI18n();
  const { settings } = useOfflineSettings();
  const { 
    user, 
    logout, 
    canManageUsers, 
    canUsePOS, 
    canManageProducts, 
    canManageCustomers, 
    canManageSuppliers, 
    canManageOrders,
    canViewReports,
    canManageInventory,
    canManageSettings,
    canViewSalesHistory
  } = useOfflineAuth();
  const [location] = useLocation();
  const isRTL = language === 'ar';

  const isActive = (path: string) => {
    return location === path;
  };

  const sideBorderClass = isRTL ? 'border-r-4' : 'border-l-4';
  const drawerPositionClass = isRTL ? 'right-0 left-auto' : 'left-0 right-auto';

  const linkClasses = (path: string) => {
    const base = `flex items-center px-4 py-3 ${sideBorderClass} border-transparent`;
    const activeClasses = `text-primary bg-blue-50 border-primary`;
    const inactiveClasses = `text-textPrimary hover:bg-gray-100`;
    return `${base} ${isActive(path) ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className={`fixed top-0 ${drawerPositionClass} h-full w-72 bg-white shadow-lg z-50 drawer flex flex-col ${isOpen ? 'drawer-open' : 'drawer-closed'}`}>
      <div className="p-4 bg-primary flex items-center border-b border-gray-200 flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mr-3 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-primary">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{settings?.businessName || 'igoodar'}</p>
          <p className="text-white text-sm opacity-80">{t('offline_mode')}</p>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <div className="py-2">
          {/* POS */}
          {canUsePOS && (
            <Link href="/pos" className={linkClasses('/pos')}>
              <Store className="w-6 h-6 mr-3" />
              <span>{t('pos')}</span>
            </Link>
          )}
          
          {/* Products */}
          {canManageProducts && (
            <Link href="/products" className={linkClasses('/products')}>
              <Package className="w-6 h-6 mr-3" />
              <span>{t('products')}</span>
            </Link>
          )}
          
          {/* Inventory */}
          {canManageInventory && (
            <Link href="/inventory" className={linkClasses('/inventory')}>
              <Database className="w-6 h-6 mr-3" />
              <span>{t('inventory')}</span>
            </Link>
          )}
          
          {/* Inventory Count */}
          {canManageInventory && (
            <Link href="/inventory-count" className={linkClasses('/inventory-count')}>
              <ClipboardCheck className="w-6 h-6 mr-3" />
              <span>{t('inventory_count')}</span>
            </Link>
          )}
          
          
          {/* Customers */}
          {canManageCustomers && (
            <Link href="/customers" className={linkClasses('/customers')}>
              <Users className="w-6 h-6 mr-3" />
              <span>{t('customers')}</span>
            </Link>
          )}
          
          {/* Suppliers */}
          {canManageSuppliers && (
            <Link href="/suppliers" className={linkClasses('/suppliers')}>
              <Truck className="w-6 h-6 mr-3" />
              <span>{t('suppliers')}</span>
            </Link>
          )}
          
          {/* Orders */}
          {canManageOrders && (
            <Link href="/orders" className={linkClasses('/orders')}>
              <ClipboardList className="w-6 h-6 mr-3" />
              <span>{t('orders')}</span>
            </Link>
          )}
          
          {/* Customer Returns */}
          {canUsePOS && (
            <Link href="/returns" className={linkClasses('/returns')}>
              <PackageX className="w-6 h-6 mr-3" />
              <span>{t('returns_customer_returns')}</span>
            </Link>
          )}
          
          {/* Supplier Returns */}
          {canUsePOS && (
            <Link href="/supplier-returns" className={linkClasses('/supplier-returns')}>
              <PackageX className="w-6 h-6 mr-3 text-red-600" />
              <span>{t('supplier_returns_title')}</span>
            </Link>
          )}

          {/* Reports */}
          {canViewReports && (
            <Link href="/reports" className={linkClasses('/reports')}>
              <BarChart2 className="w-6 h-6 mr-3" />
              <span>{t('reports')}</span>
            </Link>
          )}
          
          {/* User Management */}
          {canManageUsers && (
            <Link href="/users" className={linkClasses('/users')}>
              <UserCog className="w-6 h-6 mr-3" />
              <span>{t('user_management')}</span>
            </Link>
          )}
          
          {/* Settings */}
          {canManageSettings && (
            <Link href="/settings" className={linkClasses('/settings')}>
              <Settings className="w-6 h-6 mr-3" />
              <span>{t('settings')}</span>
            </Link>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        {/* User Info and Logout */}
        {user && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4 mr-1" />
                {t('logout')}
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center">
          <button 
            onClick={() => setLanguage('fr')} 
            className={`px-3 py-1 rounded mr-2 text-sm ${language === 'fr' ? 'bg-primary text-white font-medium' : 'bg-gray-200 text-gray-700 font-medium'}`}
          >
            {t('language_fr')}
          </button>
          <button 
            onClick={() => setLanguage('ar')} 
            className={`px-3 py-1 rounded text-sm ${language === 'ar' ? 'bg-primary text-white font-medium' : 'bg-gray-200 text-gray-700 font-medium'}`}
          >
            {t('language_ar')}
          </button>
        </div>
      </div>
    </div>
  );
}
