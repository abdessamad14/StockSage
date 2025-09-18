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
  'sales_history': 'Historique des ventes',
  'settings': 'Paramètres',
  'language_fr': 'Français',
  'language_ar': 'العربية',
  'logout': 'Déconnexion',
  'offline_mode': 'Mode hors ligne',
  
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
  'download_receipt': 'Télécharger le reçu',
  'clear_cart': 'Vider le panier',
  'clear': 'Vider',
  'sale_completed': 'Vente complétée',
  'thank_you': 'Merci',
  'sale_success_message': 'La vente a été complétée avec succès',
  'invoice': 'Facture',
  'continue': 'Continuer',
  'payment': 'Paiement',
  'processing': 'Traitement en cours...',
  'complete_sale_error': 'Erreur lors de la finalisation de la vente',
  'cart_is_empty': 'Le panier est vide',
  'credit_payment_info': 'Le montant sera enregistré comme crédit pour ce client',
  'cart_empty': 'Panier vide',
  'view_sales': 'Voir les ventes',
  
  // POS specific
  'pos_data_load_error': 'Impossible de charger les données du POS',
  'credit_info_load_error': 'Erreur lors du chargement des informations de crédit',
  'credit_payment_recorded': 'Paiement de {amount} DH enregistré',
  'credit_payment_error': 'Erreur lors de l\'enregistrement du paiement',
  'order_loaded': 'Commande chargée',
  'order_loaded_description': 'Commande #{id} chargée dans le panier avec {count} articles',
  'order_load_error': 'Impossible de charger la commande',
  'product_added': 'Produit ajouté',
  'product_added_to_cart': '{name} ajouté au panier',
  'product_added_short': '{name} ajouté',
  'product_not_found': 'Produit non trouvé',
  'barcode_not_found': 'Aucun produit trouvé avec le code-barres: {barcode}',
  'last_item_voided': 'Dernier article annulé',
  'inventory_count': 'Comptage d\'inventaire',
  'overview': 'Aperçu',
  'record_payment': 'Enregistrer Paiement',
  'history': 'Historique',
  'current_balance': 'Solde actuel',
  'insufficient_amount': 'Montant insuffisant',
  'insufficient_amount_desc': '{amount} DH < {required} DH requis',
  'invalid_amount': 'Montant invalide',
  'minimum_required': 'Minimum {amount} DH requis',
  'pos_order_number': 'N° Commande',
  'time': 'Heure',
  'amount': 'Montant',
  'credit_management': 'Gestion de Crédit',
  'credit_management_desc': 'Gérer le solde de crédit, les paiements et voir l\'historique des transactions',
  'loading_credit_info': 'Chargement des informations de crédit...',
  'payment_amount': 'Montant du Paiement',
  'current_status': 'Statut Actuel',
  
  // Dashboard
  'total_products': 'Total Produits',
  'active_inventory_items': 'Articles d\'inventaire actifs',
  'registered_customers': 'Clients enregistrés',
  'total_sales': 'Total Ventes',
  'completed_transactions': 'Transactions complétées',
  'revenue': 'Chiffre d\'affaires',
  'total_sales_revenue': 'Chiffre d\'affaires total',
  'dashboard_low_stock_alert': 'Alerte Stock Bas',
  'low_stock_message': '{count} produit{count > 1 ? "s" : ""} en rupture de stock.',
  'check_inventory_reorder': 'Vérifiez votre inventaire pour recommander.',
  'recent_sales': 'Ventes Récentes',
  'no_sales_recorded': 'Aucune vente enregistrée pour le moment',
  'low_stock_products': 'Produits en Stock Bas',
  'all_products_well_stocked': 'Tous les produits sont bien approvisionnés',
  'categorized': 'Catégorisé',
  'uncategorized': 'Non catégorisé',
  'min': 'Min',
  
  // Products
  'product_created_successfully': 'Produit créé avec succès',
  'failed_to_create_product': 'Échec de la création du produit',
  'unknown_category': 'Catégorie inconnue',
  'image_size_limit': 'La taille de l\'image doit être inférieure à 5 Mo',
  'select_valid_image': 'Veuillez sélectionner un fichier image valide',
  'product_updated_successfully': 'Produit mis à jour avec succès',
  'failed_to_update_product': 'Échec de la mise à jour du produit',
  'product_deleted_successfully': 'Produit supprimé avec succès',
  'failed_to_delete_product': 'Échec de la suppression du produit',
  'category_deleted_successfully': 'Catégorie supprimée avec succès',
  'failed_to_delete_category': 'Échec de la suppression de la catégorie',
  'category_updated_successfully': 'Catégorie mise à jour avec succès',
  'failed_to_update_category': 'Échec de la mise à jour de la catégorie',
  'category_created_successfully': 'Catégorie créée avec succès',
  'failed_to_create_category': 'Échec de la création de la catégorie',
  'products_and_categories': 'Produits et Catégories',
  'manage_categories': 'Gérer les Catégories',
  'filter_by_category': 'Filtrer par catégorie',
  'add_category': 'Ajouter une Catégorie',
  'search_products': 'Rechercher des produits...',
  'price': 'Prix',
  'stock': 'Stock',
  'barcode': 'Code-barres',
  'product_name': 'Nom du produit',
  'description': 'Description',
  'category': 'Catégorie',
  'select_category': 'Sélectionner une catégorie',
  'no_category': 'Aucune catégorie',
  'cost_price': 'Prix de revient',
  'selling_price': 'Prix de vente',
  'semi_wholesale_price_optional': 'Prix semi-gros (Optionnel)',
  'wholesale_price_optional': 'Prix de gros (Optionnel)',
  'quantity': 'Quantité',
  'min_stock_level': 'Niveau de stock minimum',
  'unit': 'Unité',
  'product_image': 'Image du produit',
  'upload_product_image': 'Télécharger l\'image du produit',
  'choose_image': 'Choisir une image',
  'cancel': 'Annuler',
  'create': 'Créer',
  'update': 'Mettre à jour',
  'upload_category_image': 'Télécharger l\'image de la catégorie',
  'edit_category': 'Modifier la Catégorie',
  'category_name': 'Nom de la catégorie',
  'category_image': 'Image de la catégorie',
  
  // Inventory
  'location_name_required': 'Le nom de l\'emplacement est requis',
  'stock_location_updated': 'Emplacement de stock mis à jour avec succès',
  'stock_location_created': 'Emplacement de stock créé avec succès',
  'failed_to_save_location': 'Échec de l\'enregistrement de l\'emplacement de stock',
  
  // Sales History
  'sales_list': 'Liste des ventes',
  'invoice_number': 'Numéro de facture',
  'customer_filter': 'Filtrer par client',
  'date_filter': 'Filtrer par date',
  'all_customers': 'Tous les clients',
  'cash_customer': 'Client en espèces',
  'no_sales_found': 'Aucune vente trouvée',
  'sale_details': 'Détails de la vente',
  'product': 'Produit',
  'view_invoice': 'Voir la facture',
  'download_invoice': 'Télécharger la facture',
  'all_time': 'Tout',
  'today': 'Aujourd\'hui',
  'yesterday': 'Hier',
  'this_week': 'Cette semaine',
  'last_7_days': 'Les 7 derniers jours',
  'this_month': 'Ce mois-ci',
  'last_30_days': 'Les 30 derniers jours',
  'actions': 'Actions',
  
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
  'sales_history': 'سجل المبيعات',
  'settings': 'الإعدادات',
  'language_fr': 'Français',
  'language_ar': 'العربية',
  'logout': 'تسجيل الخروج',
  'offline_mode': 'وضع عدم الاتصال',
  
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
  'download_receipt': 'تحميل الإيصال',
  'clear_cart': 'تفريغ السلة',
  'clear': 'مسح',
  'sale_completed': 'تمت عملية البيع',
  'thank_you': 'شكراً لك',
  'sale_success_message': 'تمت عملية البيع بنجاح',
  'invoice': 'فاتورة',
  'continue': 'متابعة',
  'payment': 'الدفع',
  'processing': 'جاري المعالجة...',
  'complete_sale_error': 'خطأ في إتمام البيع',
  'cart_is_empty': 'سلة المشتريات فارغة',
  'credit_payment_info': 'سيتم تسجيل المبلغ كدين لهذا العميل',
  'cart_empty': 'السلة فارغة',
  'view_sales': 'عرض المبيعات',
  
  // POS specific
  'pos_data_load_error': 'تعذر تحميل بيانات نقطة البيع',
  'credit_info_load_error': 'خطأ في تحميل معلومات الائتمان',
  'credit_payment_recorded': 'تم تسجيل دفعة {amount} درهم',
  'credit_payment_error': 'خطأ في تسجيل الدفعة',
  'order_loaded': 'تم تحميل الطلب',
  'order_loaded_description': 'تم تحميل الطلب #{id} في السلة مع {count} عنصر',
  'order_load_error': 'تعذر تحميل الطلب',
  'product_added': 'تمت إضافة المنتج',
  'product_added_to_cart': 'تمت إضافة {name} إلى السلة',
  'product_added_short': 'تمت إضافة {name}',
  'product_not_found': 'المنتج غير موجود',
  'barcode_not_found': 'لم يتم العثور على منتج بالباركود: {barcode}',
  'last_item_voided': 'تم إلغاء العنصر الأخير',
  'inventory_count': 'جرد المخزون',
  'overview': 'نظرة عامة',
  'record_payment': 'تسجيل الدفعة',
  'history': 'التاريخ',
  'current_balance': 'الرصيد الحالي',
  'insufficient_amount': 'مبلغ غير كافي',
  'insufficient_amount_desc': '{amount} درهم < {required} درهم مطلوب',
  'invalid_amount': 'مبلغ غير صحيح',
  'minimum_required': 'الحد الأدنى {amount} درهم',
  'pos_order_number': 'رقم الطلب',
  'time': 'الوقت',
  'amount': 'المبلغ',
  'credit_management': 'إدارة الائتمان',
  'credit_management_desc': 'إدارة رصيد الائتمان والمدفوعات وعرض تاريخ المعاملات',
  'loading_credit_info': 'تحميل معلومات الائتمان...',
  'payment_amount': 'مبلغ الدفعة',
  'current_status': 'الحالة الحالية',
  
  // Dashboard
  'total_products': 'إجمالي المنتجات',
  'active_inventory_items': 'عناصر المخزون النشطة',
  'registered_customers': 'العملاء المسجلين',
  'total_sales': 'إجمالي المبيعات',
  'completed_transactions': 'المعاملات المكتملة',
  'revenue': 'الإيرادات',
  'total_sales_revenue': 'إجمالي إيرادات المبيعات',
  'dashboard_low_stock_alert': 'تنبيه المخزون المنخفض',
  'low_stock_message': '{count} منتج في نفاد المخزون.',
  'check_inventory_reorder': 'تحقق من مخزونك لإعادة الطلب.',
  'recent_sales': 'المبيعات الأخيرة',
  'no_sales_recorded': 'لم يتم تسجيل مبيعات حتى الآن',
  'low_stock_products': 'المنتجات ذات المخزون المنخفض',
  'all_products_well_stocked': 'جميع المنتجات متوفرة بشكل جيد',
  'categorized': 'مصنف',
  'uncategorized': 'غير مصنف',
  'min': 'الحد الأدنى',
  
  // Products
  'product_created_successfully': 'تم إنشاء المنتج بنجاح',
  'failed_to_create_product': 'فشل في إنشاء المنتج',
  'unknown_category': 'فئة غير معروفة',
  'image_size_limit': 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت',
  'select_valid_image': 'يرجى اختيار ملف صورة صالح',
  'product_updated_successfully': 'تم تحديث المنتج بنجاح',
  'failed_to_update_product': 'فشل في تحديث المنتج',
  'product_deleted_successfully': 'تم حذف المنتج بنجاح',
  'failed_to_delete_product': 'فشل في حذف المنتج',
  'category_deleted_successfully': 'تم حذف الفئة بنجاح',
  'failed_to_delete_category': 'فشل في حذف الفئة',
  'category_updated_successfully': 'تم تحديث الفئة بنجاح',
  'failed_to_update_category': 'فشل في تحديث الفئة',
  'category_created_successfully': 'تم إنشاء الفئة بنجاح',
  'failed_to_create_category': 'فشل في إنشاء الفئة',
  'products_and_categories': 'المنتجات والفئات',
  'manage_categories': 'إدارة الفئات',
  'filter_by_category': 'تصفية حسب الفئة',
  'add_category': 'إضافة فئة',
  'search_products': 'بحث عن المنتجات...',
  'price': 'السعر',
  'stock': 'المخزون',
  'barcode': 'الباركود',
  'product_name': 'اسم المنتج',
  'description': 'الوصف',
  'category': 'الفئة',
  'select_category': 'اختر فئة',
  'no_category': 'لا توجد فئة',
  'cost_price': 'سعر التكلفة',
  'selling_price': 'سعر البيع',
  'semi_wholesale_price_optional': 'سعر نصف جملة (اختياري)',
  'wholesale_price_optional': 'سعر الجملة (اختياري)',
  'quantity': 'الكمية',
  'min_stock_level': 'الحد الأدنى للمخزون',
  'unit': 'الوحدة',
  'product_image': 'صورة المنتج',
  'upload_product_image': 'رفع صورة المنتج',
  'choose_image': 'اختر صورة',
  'cancel': 'إلغاء',
  'create': 'إنشاء',
  'update': 'تحديث',
  'upload_category_image': 'رفع صورة الفئة',
  'edit_category': 'تعديل الفئة',
  'category_name': 'اسم الفئة',
  'category_image': 'صورة الفئة',
  
  // Inventory
  'location_name_required': 'اسم الموقع مطلوب',
  'stock_location_updated': 'تم تحديث موقع المخزون بنجاح',
  'stock_location_created': 'تم إنشاء موقع المخزون بنجاح',
  'failed_to_save_location': 'فشل في حفظ موقع المخزون',
  
  // Sales History
  'sales_list': 'قائمة المبيعات',
  'invoice_number': 'رقم الفاتورة',
  'customer_filter': 'تصفية حسب العميل',
  'date_filter': 'تصفية حسب التاريخ',
  'all_customers': 'جميع العملاء',
  'cash_customer': 'عميل نقدي',
  'no_sales_found': 'لم يتم العثور على مبيعات',
  'sale_details': 'تفاصيل البيع',
  'product': 'المنتج',
  'view_invoice': 'عرض الفاتورة',
  'download_invoice': 'تحميل الفاتورة',
  'all_time': 'كل الأوقات',
  'today': 'اليوم',
  'yesterday': 'أمس',
  'this_week': 'هذا الأسبوع',
  'last_7_days': 'آخر 7 أيام',
  'this_month': 'هذا الشهر',
  'last_30_days': 'آخر 30 يوم',
  'actions': 'إجراءات',
  
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
