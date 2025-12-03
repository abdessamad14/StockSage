# Add Delete Functionality to Sales and Purchase Orders 🗑️

## Overview

This guide shows how to add delete buttons to both:
1. Sales POS (`/pos`) - Delete sales orders
2. Purchase POS (`/orders`) - Delete purchase orders

---

## ✅ What's Needed

### Sales POS (`client/src/pages/offline-pos.tsx`)

**1. Add Imports:**
```typescript
// Add to existing imports
import { Alert DialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOfflineSales } from '@/hooks/use-offline-sales';
```

**2. Add State Variables:**
```typescript
// Add after existing state variables around line 125
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [orderToDelete, setOrderToDelete] = useState<OfflineSale | null>(null);
```

**3. Get Delete Function:**
```typescript
// Add after line 86 where useOfflineAuth is called
const { deleteSale } = useOfflineSales();
```

**4. Add Delete Handler:**
```typescript
// Add after handleQuickAdd function around line 798
const handleDeleteSaleOrder = async () => {
  if (!orderToDelete) return;

  try {
    await deleteSale(orderToDelete.id);
    await loadTodaysOrders();
    
    toast({
      title: t('success'),
      description: t('order_deleted_successfully')
    });
    
    setDeleteConfirmOpen(false);
    setOrderToDelete(null);
  } catch (error) {
    console.error('Error deleting order:', error);
    toast({
      title: t('error'),
      description: t('failed_to_delete_order'),
      variant: 'destructive'
    });
  }
};
```

**5. Update Table Header (line 2371):**
```typescript
// Change from grid-cols-6 to grid-cols-7
<div className="grid grid-cols-7 gap-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">
  <div>{t('pos_order_number')}</div>
  <div>{t('time')}</div>
  <div>{t('items')}</div>
  <div>{t('total')}</div>
  <div>{t('payment_method')}</div>
  <div>{t('status')}</div>
  <div>{t('actions')}</div>  {/* NEW */}
</div>
```

**6. Update Table Rows (line 2357-2396):**
```typescript
// Change from grid-cols-6 to grid-cols-7 and split onClick
<div
  key={order.id}
  className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-[#fff4e3] transition-colors"
>
  <div 
    className="text-sm font-bold text-[#0f866c] cursor-pointer"
    onClick={() => loadOrderIntoCart(order)}
  >
    #{order.id}
  </div>
  {/* ... other columns (keep onClick on order number) ... */}
  
  {/* NEW: Add Actions column at the end */}
  <div className="flex items-center gap-2">
    {canDeleteSales && (
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOrderToDelete(order);
          setDeleteConfirmOpen(true);
        }}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```

**7. Add Confirmation Dialog (add before closing </div> at end of component):**
```typescript
{/* Delete Confirmation Dialog */}
<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('confirm_delete_order_message')}
        {orderToDelete && ` #${orderToDelete.id}`}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteSaleOrder} className="bg-red-600 hover:bg-red-700">
        {t('delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Purchase POS (`client/src/pages/offline-purchase-pos.tsx`)

**Same steps as above, but:**

1. Use `OfflinePurchaseOrder` type instead of `OfflineSale`
2. Use `useOfflinePurchaseOrders` hook
3. Use `deleteOrder` function instead of `deleteSale`
4. Call `loadOrders()` or `window.location.reload()` after delete
5. Find table at line ~1120
6. Change grid-cols-6 to grid-cols-7
7. Add delete button column

---

## 🌍 Translations Needed

Add to `client/src/lib/i18n.tsx`:

**French:**
```typescript
'actions': 'Actions',
'confirm_delete': 'Confirmer la suppression',
'confirm_delete_order_message': 'Êtes-vous sûr de vouloir supprimer cette commande?',
'order_deleted_successfully': 'Commande supprimée avec succès',
'failed_to_delete_order': 'Échec de la suppression de la commande',
```

**Arabic:**
```typescript
'actions': 'إجراءات',
'confirm_delete': 'تأكيد الحذف',
'confirm_delete_order_message': 'هل أنت متأكد أنك تريد حذف هذا الطلب؟',
'order_deleted_successfully': 'تم حذف الطلب بنجاح',
'failed_to_delete_order': 'فشل حذف الطلب',
```

---

##  Permissions

Delete buttons only show if user has `canDeleteSales` permission (Admin only).

Check is already in `useOfflineAuth`:
```typescript
canDeleteSales: user.role === 'admin'
```

---

## 🎯 Result

**Before:**
- Orders table with 6 columns
- No way to delete orders
- Have to manually edit database

**After:**
- Orders table with 7 columns
- Delete button (trash icon) for each order
- Confirmation dialog before delete
- Toast notification on success/error
- Only visible for admins

---

## 🧪 Testing

1. Login as admin
2. Go to `/pos` → Orders tab
3. See trash icon on each order
4. Click trash → Confirmation dialog
5. Click "Delete" → Order removed
6. Check: Order count updates, list refreshes

Same for `/orders` page.

---

**This approach is safer than multiple edits. You can implement step by step!** ✅
