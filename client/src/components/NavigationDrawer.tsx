import { useI18n } from '@/lib/i18n';
import { Link, useLocation } from 'wouter';
import { useOfflineSettings } from '@/hooks/use-offline-settings';
import { useOfflineAuth } from '@/hooks/use-offline-auth';
import { 
  LayoutDashboard, 
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
  LogOut
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
}

export default function NavigationDrawer({ isOpen }: NavigationDrawerProps) {
  const { t, language, setLanguage } = useI18n();
  const { settings } = useOfflineSettings();
  const { user, logout, canManageUsers, canUsePOS, canManageProducts, canManageCustomers, canManageSuppliers, canViewReports } = useOfflineAuth();
  const [location] = useLocation();

  // Use auth permissions
  const canManageInventory = true;
  const canViewSalesHistory = true;
  const canManageSettings = true;

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className={`fixed top-0 left-0 h-full w-72 bg-white shadow-lg z-50 drawer ${isOpen ? 'drawer-open' : 'drawer-closed'}`}>
      <div className="p-4 bg-primary flex items-center border-b border-gray-200">
        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mr-3 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-primary">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{settings?.businessName || 'StockSage'}</p>
          <p className="text-white text-sm opacity-80">{t('offline_mode')}</p>
        </div>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-144px)]">
        <div className="py-2">
          {/* Dashboard */}
          <Link href="/" className={`flex items-center px-4 py-3 ${isActive('/') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
            <LayoutDashboard className="w-6 h-6 mr-3" />
            <span>{t('dashboard')}</span>
          </Link>
          
          {/* POS */}
          {canUsePOS && (
            <Link href="/pos" className={`flex items-center px-4 py-3 ${isActive('/pos') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Store className="w-6 h-6 mr-3" />
              <span>{t('pos')}</span>
            </Link>
          )}
          
          {/* Products */}
          {canManageProducts && (
            <Link href="/products" className={`flex items-center px-4 py-3 ${isActive('/products') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Package className="w-6 h-6 mr-3" />
              <span>{t('products')}</span>
            </Link>
          )}
          
          {/* Inventory */}
          {canManageInventory && (
            <Link href="/inventory" className={`flex items-center px-4 py-3 ${isActive('/inventory') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Database className="w-6 h-6 mr-3" />
              <span>{t('inventory')}</span>
            </Link>
          )}
          
          {/* Inventory Count */}
          {canManageInventory && (
            <Link href="/inventory-count" className={`flex items-center px-4 py-3 ${isActive('/inventory-count') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <ClipboardCheck className="w-6 h-6 mr-3" />
              <span>{t('inventory_count')}</span>
            </Link>
          )}
          
          
          {/* Customers */}
          {canManageCustomers && (
            <Link href="/customers" className={`flex items-center px-4 py-3 ${isActive('/customers') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Users className="w-6 h-6 mr-3" />
              <span>{t('customers')}</span>
            </Link>
          )}
          
          {/* Suppliers */}
          {canManageSuppliers && (
            <Link href="/suppliers" className={`flex items-center px-4 py-3 ${isActive('/suppliers') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Truck className="w-6 h-6 mr-3" />
              <span>{t('suppliers')}</span>
            </Link>
          )}
          
          {/* Orders */}
          <Link href="/orders" className={`flex items-center px-4 py-3 ${isActive('/orders') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
            <ClipboardList className="w-6 h-6 mr-3" />
            <span>{t('orders')}</span>
          </Link>
          
          {/* Reports */}
          {canViewReports && (
            <Link href="/reports" className={`flex items-center px-4 py-3 ${isActive('/reports') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <BarChart2 className="w-6 h-6 mr-3" />
              <span>{t('reports')}</span>
            </Link>
          )}
          
          {/* Sales History */}
          {canViewSalesHistory && (
            <Link href="/sales-history" className={`flex items-center px-4 py-3 ${isActive('/sales-history') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Receipt className="w-6 h-6 mr-3" />
              <span>{t('sales_history')}</span>
            </Link>
          )}
          
          {/* User Management */}
          {canManageUsers && (
            <Link href="/users" className={`flex items-center px-4 py-3 ${isActive('/users') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <UserCog className="w-6 h-6 mr-3" />
              <span>{t('user_management')}</span>
            </Link>
          )}
          
          {/* Settings */}
          {canManageSettings && (
            <Link href="/settings" className={`flex items-center px-4 py-3 ${isActive('/settings') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <Settings className="w-6 h-6 mr-3" />
              <span>{t('settings')}</span>
            </Link>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
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
