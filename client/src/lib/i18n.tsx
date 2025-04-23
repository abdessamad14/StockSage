import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

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
  
  // Users management
  'users': 'Utilisateurs',
  'user_management': 'Gestion des utilisateurs',
  'new_user': 'Nouvel utilisateur',
  'add_user': 'Ajouter un utilisateur',
  'edit_user': 'Modifier l\'utilisateur',
  'name': 'Nom',
  'email': 'Email',
  'phone': 'Téléphone',
  'role': 'Rôle',
  'status': 'Statut',
  'active': 'Actif',
  'inactive': 'Inactif',
  'admin': 'Administrateur',
  'cashier': 'Caissier',
  'merchant': 'Commerçant',
  'supporter': 'Support',
  'viewer': 'Observateur',
  'business_name': 'Nom de l\'entreprise',
  'search_users': 'Rechercher des utilisateurs',
  'no_users': 'Aucun utilisateur trouvé',
  'no_users_found': 'Aucun utilisateur ne correspond à votre recherche',
  'create_first_user': 'Créer le premier utilisateur',
  'select_role': 'Sélectionner un rôle',
  'role_description': 'Le rôle détermine les permissions de l\'utilisateur dans le système.',
  'active_description': 'Les utilisateurs inactifs ne peuvent pas se connecter au système.',
  'deactivate': 'Désactiver',
  'activate': 'Activer',
  'confirm_delete_user': 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
  'user_created': 'Utilisateur créé avec succès',
  'user_updated': 'Utilisateur mis à jour avec succès',
  'user_deleted': 'Utilisateur supprimé avec succès',
  'create_user_error': 'Erreur lors de la création de l\'utilisateur',
  'update_user_error': 'Erreur lors de la mise à jour de l\'utilisateur',
  'delete_user_error': 'Erreur lors de la suppression de l\'utilisateur',
  'creating': 'Création en cours...',
  'saving': 'Enregistrement...',
  'users_admin_only': 'Seuls les administrateurs peuvent gérer les utilisateurs',
  'users_load_error': 'Erreur lors du chargement des utilisateurs',
  'access_denied': 'Accès refusé',
  
  // Orders
  'all_statuses': 'Tous les statuts',
  'status_filter': 'Filtrer par statut',
  'supplier_filter': 'Filtrer par fournisseur',
  'all_suppliers': 'Tous les fournisseurs',
  'order_list': 'Liste des commandes',
  'order_number': 'Numéro de commande',
  'date': 'Date',
  'supplier': 'Fournisseur',
  'create_order': 'Créer une commande',
  'new_order': 'Nouvelle commande',
  'no_orders_found': 'Aucune commande trouvée',
  'create_first_order': 'Créer votre première commande',
  'orders_admin_only': 'Seuls les administrateurs peuvent gérer les commandes',
  'orders_load_error': 'Erreur lors du chargement des commandes',
  'unknown_supplier': 'Fournisseur inconnu',
  'unknown_product': 'Produit inconnu',
  'order_created': 'Commande créée avec succès',
  'order_updated': 'Commande mise à jour avec succès',
  'create_order_error': 'Erreur lors de la création de la commande',
  'update_order_error': 'Erreur lors de la mise à jour de la commande',
  'select_supplier': 'Sélectionner un fournisseur',
  'select_product': 'Sélectionner un produit',
  'pending': 'En attente',
  'in_transit': 'En transit',
  'received': 'Reçue',
  'cancelled': 'Annulée',
  'update_status': 'Mettre à jour',
  'notes': 'Notes',
  'order_items': 'Articles commandés',
  'retry': 'Réessayer',
  
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
  'create': 'Créer',
  
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
  const [language, setLanguageState] = useState<Language>('fr');

  // Load language preference from localStorage only
  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    
    if (storedLang && (storedLang === 'fr' || storedLang === 'ar')) {
      setLanguageState(storedLang);
    }
  }, []);

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
