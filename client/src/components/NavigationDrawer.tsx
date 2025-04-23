import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Link, useLocation } from 'wouter';
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
  LogOut,
  UserCog
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
}

export default function NavigationDrawer({ isOpen }: NavigationDrawerProps) {
  const { user, logoutMutation } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Role-based permissions
  const isAdmin = user?.role === 'admin';
  const canManageProducts = isAdmin || user?.role === 'cashier';
  const canManageInventory = isAdmin || user?.role === 'cashier';
  const canManageCustomers = isAdmin || user?.role === 'cashier';
  const canManageSuppliers = isAdmin;
  const canViewReports = isAdmin;
  const canManageSettings = isAdmin;
  const canUsePOS = isAdmin || user?.role === 'cashier';

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
          <p className="text-white font-bold text-lg">{user?.businessName}</p>
          <p className="text-white text-sm opacity-80">{user?.name}</p>
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
          {isAdmin && (
            <Link href="/orders" className={`flex items-center px-4 py-3 ${isActive('/orders') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <ClipboardList className="w-6 h-6 mr-3" />
              <span>{t('orders')}</span>
            </Link>
          )}
          
          {/* Reports */}
          {canViewReports && (
            <Link href="/reports" className={`flex items-center px-4 py-3 ${isActive('/reports') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <BarChart2 className="w-6 h-6 mr-3" />
              <span>{t('reports')}</span>
            </Link>
          )}
          
          {/* Users */}
          {isAdmin && (
            <Link href="/users" className={`flex items-center px-4 py-3 ${isActive('/users') ? 'text-primary bg-blue-50 border-l-4 border-primary' : 'text-textPrimary hover:bg-gray-100'}`}>
              <UserCog className="w-6 h-6 mr-3" />
              <span>{t('users')}</span>
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
        <div className="flex items-center mb-4">
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
        <button 
          onClick={handleLogout}
          className="w-full bg-red-100 text-red-600 py-2 rounded-lg flex items-center justify-center"
        >
          <LogOut className="w-5 h-5 mr-2" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
