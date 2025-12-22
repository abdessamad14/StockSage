import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface OpenCashShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (startingCash: number) => Promise<void>;
  userId: string;
  userName: string;
}

export function OpenCashShiftDialog({
  open,
  onOpenChange,
  onConfirm,
}: OpenCashShiftDialogProps) {
  const [startingCash, setStartingCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleConfirm = async () => {
    const amount = parseFloat(startingCash);
    
    if (isNaN(amount) || amount < 0) {
      toast({
        title: t('error'),
        description: t('cash_shift_enter_valid_amount'),
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(amount);
      setStartingCash('');
      onOpenChange(false);
      toast({
        title: t('cash_shift_opened_successfully'),
        description: `${t('cash_shift_starting_amount')}: ${amount.toFixed(2)} DH`
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
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('cash_shift_dialog_open_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startingCash">{t('cash_shift_starting_cash')}</Label>
            <Input
              id="startingCash"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              {t('cash_shift_starting_cash_placeholder')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !startingCash}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('cash_shift_opening')}
              </>
            ) : (
              t('cash_shift_open')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

