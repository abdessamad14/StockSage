import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ProductWithStockStatus } from '@shared/schema';
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned?: (product: ProductWithStockStatus) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onProductScanned }: BarcodeScannerModalProps) {
  const { t } = useI18n();
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const { addToCart } = useStore();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery({
    queryKey: barcode ? [`/api/products/barcode/${barcode}`] : [''],
    enabled: !!barcode,
    retry: false
  });

  // Handle scan result
  if (product && barcode) {
    // Reset barcode to enable new scans
    setBarcode(null);
    
    // Add to cart and close scanner
    if (onProductScanned) {
      onProductScanned(product);
    } else {
      addToCart(product, 1);
      toast({
        title: product.name,
        description: t('added_to_cart'),
      });
    }
    onClose();
  }

  // In a real app, this would use a camera API like Expo Camera
  const handleManualEntry = () => {
    const input = prompt(t('enter_barcode_manually'));
    if (input && input.trim()) {
      setBarcode(input.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-75"></div>
      <div className="bg-white w-full mx-4 rounded-lg overflow-hidden relative z-10 max-w-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('scan_code')}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="aspect-[4/3] bg-black relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* In a real app, this would be a camera view */}
            <div className="p-8 text-white text-center">
              <Camera className="w-12 h-12 mx-auto mb-4" />
              <p>{t('scan_code')}</p>
              <p className="text-sm opacity-80 mt-1">(Camera view would appear here)</p>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-textSecondary mb-4">{t('place_barcode')}</p>
          <div className="flex space-x-2">
            <button 
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg"
              onClick={() => setFlashlightOn(!flashlightOn)}
            >
              {flashlightOn ? t('turn_off_flash') : t('toggle_flash')}
            </button>
            <button 
              className="flex-1 py-2 bg-primary text-white rounded-lg"
              onClick={handleManualEntry}
            >
              {t('enter_manually')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
