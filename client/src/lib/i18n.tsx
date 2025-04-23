import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './auth';

// Define available languages
type Language = 'fr' | 'ar';

// Define translation dictionaries
type TranslationDictionary = {
  [key: string]: string;
};

// French translations
const frTranslations: TranslationDictionary = {
  // App shell
  'dashboard': 'Tableau de bord',
  'pos': 'Caisse (POS)',
  'products': 'Articles',
  'inventory': 'Stock',
  'customers': 'Clients',
  'suppliers': 'Fournisseurs',
  'orders': 'Commandes',
  'reports': 'Rapports',
  'settings': 'Paramètres',
  'language_fr': 'Français',
  'language_ar': 'العربية',
  'logout': 'Déconnexion',
  
  // Auth
  'login': 'Connexion',
  'username': 'Nom d\'utilisateur',
  'password': 'Mot de passe',
  'login_button': 'Se connecter',
  'login_error': 'Nom d\'utilisateur ou mot de passe incorrect',
  
  // Dashboard
  'last_sync': 'Dernière synchronisation',
  'sync_now': 'Synchroniser',
  'daily_sales': 'Ventes du jour',
  'low_stock_alert': 'Alerte Stock',
  'products_count': 'produits',
  'view_details': 'Voir les détails',
  'vs_yesterday': 'vs. hier',
  'popular_products': 'Produits populaires',
  'sold_today': 'vendus aujourd\'hui',
  'in_stock': 'En stock',
  'low_stock': 'Stock bas',
  'out_of_stock': 'Rupture de stock',
  'recent_activities': 'Activités récentes',
  'sale': 'Vente',
  'order': 'Commande',
  'adjustment': 'Ajustement',
  'minutes_ago': 'il y a {0} minutes',
  'hours_ago': 'il y a {0} heures',
  'stock_added': 'Stock ajouté',
  'items': 'articles',
  'receipt_from_supplier': 'Réception du fournisseur',
  'stock_level_alert': 'Alerte niveau de stock',
  'products_below_threshold': 'produits en dessous du seuil minimum',
  
  // Products
  'add_product': 'Ajouter un article',
  'edit_product': 'Modifier l\'article',
  'delete_product': 'Supprimer l\'article',
  'product_name': 'Nom de l\'article',
  'barcode': 'Code-barres',
  'category': 'Catégorie',
  'cost_price': 'Prix d\'achat',
  'selling_price': 'Prix de vente',
  'quantity': 'Quantité',
  'min_stock_level': 'Niveau minimum',
  'unit': 'Unité',
  'save': 'Enregistrer',
  'cancel': 'Annuler',
  'search_products': 'Rechercher des articles',
  'scan_barcode': 'Scanner un code-barres',
  'filters': 'Filtres',
  'all_categories': 'Toutes les catégories',
  'price': 'Prix',
  
  // Barcode scanner
  'scan_code': 'Scanner un code-barres',
  'place_barcode': 'Placez le code-barres à l\'intérieur du cadre pour le scanner automatiquement.',
  'toggle_flash': 'Activer flash',
  'enter_manually': 'Saisir manuellement',
  
  // POS
  'point_of_sale': 'Point de vente',
  'cart': 'Panier',
  'add_item': 'Ajouter un article',
  'customer': 'Client',
  'select_customer': 'Sélectionner un client',
  'add_customer': 'Ajouter un client',
  'subtotal': 'Sous-total',
  'discount': 'Remise',
  'total': 'Total',
  'payment_method': 'Mode de paiement',
  'cash': 'Espèces',
  'credit': 'Crédit',
  'bank_transfer': 'Virement bancaire',
  'mobile_payment': 'Paiement mobile',
  'amount_paid': 'Montant payé',
  'change': 'Monnaie',
  'complete_sale': 'Terminer la vente',
  'print_receipt': 'Imprimer le reçu',
  'clear_cart': 'Vider le panier',
  
  // Common actions
  'search': 'Rechercher',
  'add': 'Ajouter',
  'edit': 'Modifier',
  'delete': 'Supprimer',
  'close': 'Fermer',
  'confirm': 'Confirmer',
  'loading': 'Chargement...',
  'no_results': 'Aucun résultat trouvé',
  'error': 'Erreur',
  'success': 'Succès',
  'required_field': 'Ce champ est obligatoire',
  'invalid_format': 'Format invalide',
  
  // Units
  'piece': 'pièce',
  'kg': 'kg',
  'liter': 'litre',
  'box': 'boîte',
  'pack': 'pack',
  
  // Currencies
  'currency': 'MAD',
};

// Arabic translations
const arTranslations: TranslationDictionary = {
  // App shell
  'dashboard': 'لوحة التحكم',
  'pos': 'نقطة البيع',
  'products': 'المنتجات',
  'inventory': 'المخزون',
  'customers': 'العملاء',
  'suppliers': 'الموردين',
  'orders': 'الطلبات',
  'reports': 'التقارير',
  'settings': 'الإعدادات',
  'language_fr': 'Français',
  'language_ar': 'العربية',
  'logout': 'تسجيل الخروج',
  
  // Auth
  'login': 'تسجيل الدخول',
  'username': 'اسم المستخدم',
  'password': 'كلمة المرور',
  'login_button': 'دخول',
  'login_error': 'اسم المستخدم أو كلمة المرور غير صحيحة',
  
  // Dashboard
  'last_sync': 'آخر مزامنة',
  'sync_now': 'مزامنة الآن',
  'daily_sales': 'مبيعات اليوم',
  'low_stock_alert': 'تنبيه المخزون',
  'products_count': 'منتج',
  'view_details': 'عرض التفاصيل',
  'vs_yesterday': 'مقارنة بالأمس',
  'popular_products': 'المنتجات الشائعة',
  'sold_today': 'مباع اليوم',
  'in_stock': 'متوفر',
  'low_stock': 'مخزون منخفض',
  'out_of_stock': 'نفذ من المخزون',
  'recent_activities': 'النشاطات الحديثة',
  'sale': 'بيع',
  'order': 'طلب',
  'adjustment': 'تعديل',
  'minutes_ago': 'منذ {0} دقائق',
  'hours_ago': 'منذ {0} ساعات',
  'stock_added': 'تمت إضافة مخزون',
  'items': 'عناصر',
  'receipt_from_supplier': 'استلام من المورد',
  'stock_level_alert': 'تنبيه مستوى المخزون',
  'products_below_threshold': 'منتجات أقل من الحد الأدنى',
  
  // Products
  'add_product': 'إضافة منتج',
  'edit_product': 'تعديل المنتج',
  'delete_product': 'حذف المنتج',
  'product_name': 'اسم المنتج',
  'barcode': 'الباركود',
  'category': 'الفئة',
  'cost_price': 'سعر التكلفة',
  'selling_price': 'سعر البيع',
  'quantity': 'الكمية',
  'min_stock_level': 'الحد الأدنى للمخزون',
  'unit': 'الوحدة',
  'save': 'حفظ',
  'cancel': 'إلغاء',
  'search_products': 'البحث عن منتجات',
  'scan_barcode': 'مسح الباركود',
  'filters': 'تصفية',
  'all_categories': 'جميع الفئات',
  'price': 'السعر',
  
  // Barcode scanner
  'scan_code': 'مسح الباركود',
  'place_barcode': 'ضع الباركود داخل الإطار للمسح التلقائي.',
  'toggle_flash': 'تشغيل الفلاش',
  'enter_manually': 'إدخال يدوي',
  
  // POS
  'point_of_sale': 'نقطة البيع',
  'cart': 'سلة التسوق',
  'add_item': 'إضافة عنصر',
  'customer': 'العميل',
  'select_customer': 'اختر العميل',
  'add_customer': 'إضافة عميل',
  'subtotal': 'المجموع الفرعي',
  'discount': 'خصم',
  'total': 'المجموع',
  'payment_method': 'طريقة الدفع',
  'cash': 'نقدا',
  'credit': 'دين',
  'bank_transfer': 'تحويل بنكي',
  'mobile_payment': 'دفع عبر الموبايل',
  'amount_paid': 'المبلغ المدفوع',
  'change': 'الباقي',
  'complete_sale': 'إتمام البيع',
  'print_receipt': 'طباعة الإيصال',
  'clear_cart': 'تفريغ السلة',
  
  // Common actions
  'search': 'بحث',
  'add': 'إضافة',
  'edit': 'تعديل',
  'delete': 'حذف',
  'close': 'إغلاق',
  'confirm': 'تأكيد',
  'loading': 'جاري التحميل...',
  'no_results': 'لا توجد نتائج',
  'error': 'خطأ',
  'success': 'نجاح',
  'required_field': 'هذا الحقل مطلوب',
  'invalid_format': 'صيغة غير صالحة',
  
  // Units
  'piece': 'قطعة',
  'kg': 'كيلو',
  'liter': 'لتر',
  'box': 'علبة',
  'pack': 'عبوة',
  
  // Currencies
  'currency': 'درهم',
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key) => key,
  dir: 'ltr',
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('fr');

  // Load language preference from localStorage or user settings
  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    
    if (storedLang && (storedLang === 'fr' || storedLang === 'ar')) {
      setLanguageState(storedLang);
    } else if (user?.language && (user.language === 'fr' || user.language === 'ar')) {
      setLanguageState(user.language);
    }
  }, [user]);

  // Set language with side effects
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Translation function
  const t = (key: string, params?: { [key: string]: string | number }): string => {
    const translations = language === 'fr' ? frTranslations : arTranslations;
    let text = translations[key] || key;
    
    // Replace parameters in the format {0}, {1}, etc. or {name}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), value.toString());
      });
    }
    
    return text;
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    dir: language === 'ar' ? 'rtl' : 'ltr'
  };
  
  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
