import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, DollarSign } from 'lucide-react';

interface WeighableProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sellingPrice: number;
  };
  onConfirm: (quantity: number, price: number) => void;
}

export default function WeighableProductDialog({
  open,
  onOpenChange,
  product,
  onConfirm
}: WeighableProductDialogProps) {
  const [inputMode, setInputMode] = useState<'weight' | 'price'>('weight');
  const [weight, setWeight] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [calculatedQuantity, setCalculatedQuantity] = useState(0);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Calculate price when weight changes
  useEffect(() => {
    if (inputMode === 'weight' && weight) {
      const qty = parseFloat(weight);
      if (!isNaN(qty) && qty > 0) {
        const price = qty * product.sellingPrice;
        setCalculatedQuantity(qty);
        setCalculatedPrice(price);
      }
    }
  }, [weight, inputMode, product.sellingPrice]);

  // Calculate quantity when price changes
  useEffect(() => {
    if (inputMode === 'price' && priceAmount) {
      const price = parseFloat(priceAmount);
      if (!isNaN(price) && price > 0 && product.sellingPrice > 0) {
        const qty = price / product.sellingPrice;
        setCalculatedQuantity(qty);
        setCalculatedPrice(price);
      }
    }
  }, [priceAmount, inputMode, product.sellingPrice]);

  const handleConfirm = () => {
    if (calculatedQuantity > 0 && calculatedPrice > 0) {
      onConfirm(calculatedQuantity, calculatedPrice);
      handleClose();
    }
  };

  const handleClose = () => {
    setWeight('');
    setPriceAmount('');
    setCalculatedQuantity(0);
    setCalculatedPrice(0);
    onOpenChange(false);
  };

  const pricePerKg = product.sellingPrice.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {product.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Prix: {pricePerKg} DH/kg
          </p>
        </DialogHeader>

        <Tabs value={inputMode} onValueChange={(v: any) => setInputMode(v)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weight" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Par Poids (kg)
            </TabsTrigger>
            <TabsTrigger value="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Par Prix (DH)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Entrer le poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
                className="text-lg"
              />
            </div>

            {calculatedPrice > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Poids:</span>
                  <span className="font-semibold">{calculatedQuantity.toFixed(3)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prix total:</span>
                  <span className="font-bold text-lg">{calculatedPrice.toFixed(2)} DH</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="price">Entrer le montant (DH)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                autoFocus
                className="text-lg"
              />
            </div>

            {calculatedQuantity > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Poids:</span>
                  <span className="font-semibold">{calculatedQuantity.toFixed(3)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prix:</span>
                  <span className="font-bold text-lg">{calculatedPrice.toFixed(2)} DH</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={calculatedQuantity <= 0}
            className="flex-1"
          >
            Ajouter au panier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
