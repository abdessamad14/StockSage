import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { OfflineCashShift } from '@/lib/database-storage';

interface CloseCashShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (actualTotal: number, notes?: string) => Promise<void>;
  currentShift: OfflineCashShift;
  todaysCashSales: number;
}

export function CloseCashShiftDialog({
  open,
  onOpenChange,
  onConfirm,
  currentShift,
  todaysCashSales
}: CloseCashShiftDialogProps) {
  const [actualTotal, setActualTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const expectedTotal = currentShift.startingCash + todaysCashSales;
  const actualAmount = parseFloat(actualTotal) || 0;
  const difference = actualAmount - expectedTotal;
  const hasDifference = actualTotal && Math.abs(difference) > 0.01;

  const handleConfirm = async () => {
    const amount = parseFloat(actualTotal);
    
    if (isNaN(amount) || amount < 0) {
      toast({
        title: t('error'),
        description: 'Veuillez entrer un montant valide',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(amount, notes || undefined);
      setActualTotal('');
      setNotes('');
      onOpenChange(false);
      
      const diffMsg = hasDifference 
        ? difference > 0 
          ? `Excédent: +${difference.toFixed(2)} DH` 
          : `Manquant: ${Math.abs(difference).toFixed(2)} DH`
        : 'Montant exact';
      
      toast({
        title: 'Caisse clôturée',
        description: diffMsg
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Clôturer la Caisse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-slate-100 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fond de caisse:</span>
              <span className="font-semibold">{currentShift.startingCash.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ventes cash aujourd'hui:</span>
              <span className="font-semibold text-green-600">+{todaysCashSales.toFixed(2)} DH</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Attendu:</span>
              <span className="font-bold text-lg">{expectedTotal.toFixed(2)} DH</span>
            </div>
          </div>

          {/* Actual Total Input */}
          <div className="space-y-2">
            <Label htmlFor="actualTotal">Montant Réel Compté (DH)</Label>
            <Input
              id="actualTotal"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={actualTotal}
              onChange={(e) => setActualTotal(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Comptez l'argent dans la caisse et entrez le total
            </p>
          </div>

          {/* Difference Alert */}
          {hasDifference && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              difference > 0 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {difference > 0 ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Excédent: +{difference.toFixed(2)} DH</p>
                    <p className="text-sm">Il y a plus d'argent que prévu</p>
                  </div>
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Manquant: {Math.abs(difference).toFixed(2)} DH</p>
                    <p className="text-sm">Il manque de l'argent</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Commentaires sur la clôture..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !actualTotal}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clôture...
              </>
            ) : (
              'Clôturer la Caisse'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

