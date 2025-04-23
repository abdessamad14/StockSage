import { LayoutDashboard, Store, Package, Users, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';

interface BottomBarProps {
  onScanClick: () => void;
}

export default function BottomBar({ onScanClick }: BottomBarProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const { canUsePOS, canManageProducts, canManageCustomers } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-4 py-2 z-30">
      <Link href="/" className="btn-bottom-nav">
        <LayoutDashboard className={`bottom-nav-icon ${isActive('/') ? 'text-primary' : 'text-textSecondary'}`} />
        <span className={`bottom-nav-text ${isActive('/') ? 'text-primary font-medium' : 'text-textSecondary'}`}>
          {t('dashboard')}
        </span>
      </Link>
      
      {canUsePOS && (
        <Link href="/pos" className="btn-bottom-nav">
          <Store className={`bottom-nav-icon ${isActive('/pos') ? 'text-primary' : 'text-textSecondary'}`} />
          <span className={`bottom-nav-text ${isActive('/pos') ? 'text-primary font-medium' : 'text-textSecondary'}`}>
            {t('pos')}
          </span>
        </Link>
      )}
      
      <div className="relative">
        <button 
          onClick={onScanClick}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg -mt-5"
        >
          <ShoppingBag className="w-7 h-7 text-white" />
        </button>
      </div>
      
      {canManageProducts && (
        <Link href="/products" className="btn-bottom-nav">
          <Package className={`bottom-nav-icon ${isActive('/products') ? 'text-primary' : 'text-textSecondary'}`} />
          <span className={`bottom-nav-text ${isActive('/products') ? 'text-primary font-medium' : 'text-textSecondary'}`}>
            {t('products')}
          </span>
        </Link>
      )}
      
      {canManageCustomers && (
        <Link href="/customers" className="btn-bottom-nav">
          <Users className={`bottom-nav-icon ${isActive('/customers') ? 'text-primary' : 'text-textSecondary'}`} />
          <span className={`bottom-nav-text ${isActive('/customers') ? 'text-primary font-medium' : 'text-textSecondary'}`}>
            {t('customers')}
          </span>
        </Link>
      )}
    </div>
  );
}
