import { Store, Package, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { useOfflineAuth } from '@/hooks/use-offline-auth';

export default function BottomBar() {
  const [location] = useLocation();
  const { t } = useI18n();
  const { canUsePOS, canManageProducts, canManageCustomers } = useOfflineAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-2 py-1 z-30 safe-area-inset-bottom">
      {canUsePOS && (
        <Link href="/pos" className="btn-bottom-nav">
          <Store className={`bottom-nav-icon ${isActive('/pos') ? 'text-primary' : 'text-textSecondary'}`} />
          <span className={`bottom-nav-text ${isActive('/pos') ? 'text-primary font-medium' : 'text-textSecondary'}`}>
            {t('pos')}
          </span>
        </Link>
      )}
      
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
