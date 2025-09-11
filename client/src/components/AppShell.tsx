import { useState, useEffect, ReactNode } from 'react';
import NavigationDrawer from '@/components/NavigationDrawer';
import AppHeader from '@/components/AppHeader';
import BottomBar from '@/components/BottomBar';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { useI18n } from '@/lib/i18n';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { drawerOpen, setDrawerOpen, scannerOpen, setScannerOpen } = useStore();
  const [title, setTitle] = useState('');
  const [location] = useLocation();
  const { t } = useI18n();

  // Update title based on current route
  useEffect(() => {
    switch (location) {
      case '/':
        setTitle(t('dashboard'));
        break;
      case '/products':
        setTitle(t('products'));
        break;
      case '/pos':
        setTitle(t('pos'));
        break;
      case '/inventory':
        setTitle(t('inventory'));
        break;
      case '/customers':
        setTitle(t('customers'));
        break;
      case '/suppliers':
        setTitle(t('suppliers'));
        break;
      case '/orders':
        setTitle(t('orders'));
        break;
      case '/reports':
        setTitle(t('reports'));
        break;
      case '/sales-history':
        setTitle(t('sales_history'));
        break;
      case '/settings':
        setTitle(t('settings'));
        break;
      case '/users':
        setTitle('Gestion des Utilisateurs');
        break;
      default:
        setTitle('iGoodar Stock');
    }
  }, [location, t]);

  // Close drawer when clicking outside
  const handleOverlayClick = () => {
    setDrawerOpen(false);
  };

  // Close scanner when modal is closed
  const handleCloseScanner = () => {
    setScannerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 overlay ${drawerOpen ? '' : 'hidden'}`}
        onClick={handleOverlayClick}
      />
      
      {/* Navigation Drawer */}
      <NavigationDrawer isOpen={drawerOpen} />
      
      {/* App Header */}
      <AppHeader title={title} onMenuToggle={() => setDrawerOpen(!drawerOpen)} />
      
      {/* Main Content Area */}
      <main className="flex-1 pt-14 pb-16">
        {children}
      </main>
      
      {/* Bottom Action Bar */}
      <BottomBar onScanClick={() => setScannerOpen(true)} />
      
      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal isOpen={scannerOpen} onClose={handleCloseScanner} />
    </div>
  );
}
