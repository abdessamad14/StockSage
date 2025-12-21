# 🔑 Guide de Migration de Licence

## 📋 **Problème**

Après la mise à jour vers la version 1.0.2, l'application demande à nouveau la licence même si vous étiez déjà licencié.

### Cause

L'application cherche maintenant les données dans un nouvel emplacement sécurisé:

**Ancien emplacement (risqué):**
```
C:\Users\[Votre Nom]\AppData\Local\Igoodar\data\
```

**Nouvel emplacement (sécurisé):**
```
C:\Users\[Votre Nom]\AppData\Roaming\iGoodar\
```

---

## ✅ **Solution Rapide: Script Automatique**

### Étape 1: Télécharger le Script

Le script `fix-license-migration.bat` est inclus dans l'installation.

### Étape 2: Arrêter iGoodar

Avant d'exécuter le script:
1. Menu Démarrer → Igoodar → **Stop Igoodar**
2. Attendez 5 secondes

### Étape 3: Exécuter le Script

1. Allez dans: `C:\Users\[Votre Nom]\AppData\Local\Igoodar\`
2. Double-cliquez sur **`fix-license-migration.bat`**
3. Le script va:
   - ✅ Créer le nouveau dossier de données
   - ✅ Copier votre licence
   - ✅ Copier votre base de données
   - ✅ Copier tous vos fichiers critiques
   - ✅ Ouvrir le dossier de destination

### Étape 4: Vérifier

Le script affichera:
```
✓ license.key found
✓ stocksage.db found
✓ machine.id found
```

### Étape 5: Redémarrer iGoodar

1. Menu Démarrer → Igoodar → **Restart Igoodar**
2. L'application devrait reconnaître votre licence

---

## 🔧 **Solution Manuelle**

Si le script ne fonctionne pas, vous pouvez migrer manuellement:

### Étape 1: Ouvrir l'Ancien Dossier

1. Appuyez sur `Windows + R`
2. Tapez: `%LOCALAPPDATA%\Igoodar\data`
3. Appuyez sur Entrée

### Étape 2: Copier Les Fichiers

Copiez ces fichiers (Ctrl+C):
- ✅ `license.key` ⭐ **IMPORTANT**
- ✅ `stocksage.db` (votre base de données)
- ✅ `machine.id`
- ✅ `credit-transactions.json` (si existe)

### Étape 3: Ouvrir le Nouveau Dossier

1. Appuyez sur `Windows + R`
2. Tapez: `%APPDATA%\iGoodar`
3. Si le dossier n'existe pas, créez-le manuellement
4. Appuyez sur Entrée

### Étape 4: Coller Les Fichiers

Dans le nouveau dossier `%APPDATA%\iGoodar\`:
1. Collez les fichiers copiés (Ctrl+V)
2. Confirmez le remplacement si demandé

### Étape 5: Redémarrer

1. Menu Démarrer → Igoodar → **Restart Igoodar**
2. ✅ Votre licence est maintenant reconnue!

---

## 📂 **Où Sont Mes Données Maintenant?**

### Nouveau Emplacement (Sécurisé)

**Toutes vos données critiques sont dans:**
```
C:\Users\[Votre Nom]\AppData\Roaming\iGoodar\
```

**Contient:**
- `license.key` - Votre clé de licence
- `stocksage.db` - Base de données complète (produits, ventes, clients, etc.)
- `machine.id` - Identifiant unique de votre PC
- `credit-transactions.json` - Historique des transactions à crédit

### Ancien Emplacement (Obsolète)

```
C:\Users\[Votre Nom]\AppData\Local\Igoodar\
```

**Contient:**
- Application code (obfusqué)
- Scripts
- Node.js portable
- Fichiers de configuration

**⚠️ Ne supprimez PAS ce dossier!** C'est là que l'application est installée.

---

## 💡 **Pourquoi Ce Changement?**

### Avantages de la Nouvelle Architecture

1. **🛡️ Protection des données lors des mises à jour**
   - Les mises à jour peuvent écraser `AppData\Local\Igoodar\`
   - Mais `AppData\Roaming\iGoodar\` est préservé

2. **✅ Standard Windows**
   - `AppData\Roaming` est le dossier recommandé par Microsoft pour les données utilisateur
   - Synchronisé entre ordinateurs si vous avez un profil itinérant

3. **🔄 Mises à jour sans risque**
   - Plus besoin de sauvegarder manuellement avant les mises à jour
   - Les données sont automatiquement préservées

---

## 🔍 **Vérification Rapide**

Pour vérifier que tout est correct:

### Méthode 1: Via l'Explorateur

1. `Windows + R` → `%APPDATA%\iGoodar`
2. Vérifiez que ces fichiers existent:
   - `license.key`
   - `stocksage.db`
   - `machine.id`

### Méthode 2: Via le Script de Diagnostic

```batch
@echo off
echo Verification des donnees...
if exist "%APPDATA%\iGoodar\license.key" (
    echo ✓ Licence trouvee
) else (
    echo ✗ Licence MANQUANTE
)
if exist "%APPDATA%\iGoodar\stocksage.db" (
    echo ✓ Base de donnees trouvee
) else (
    echo ✗ Base de donnees MANQUANTE
)
pause
```

Copiez ce script dans un fichier `check-data.bat` et exécutez-le.

---

## ❌ **Problèmes Courants**

### Problème 1: "Dossier iGoodar n'existe pas"

**Solution:**
```batch
mkdir "%APPDATA%\iGoodar"
```

Puis relancez le script de migration.

### Problème 2: "License.key non trouvé"

**Solution:**
1. Cherchez manuellement le fichier:
   - `%LOCALAPPDATA%\Igoodar\data\license.key`
   - `C:\Users\[Votre Nom]\AppData\Local\Igoodar\data\license.key`
2. Si trouvé, copiez-le dans `%APPDATA%\iGoodar\`
3. Si pas trouvé, contactez votre fournisseur pour une nouvelle licence

### Problème 3: "Accès refusé"

**Solution:**
1. Clic droit sur `fix-license-migration.bat`
2. Sélectionnez **"Exécuter en tant qu'administrateur"**

---

## 📞 **Besoin d'Aide?**

Si la migration ne fonctionne pas:

1. **Envoyez votre Machine ID:**
   - Ouvrez: `%LOCALAPPDATA%\Igoodar\data\machine.id`
   - Copiez le contenu
   - Envoyez-le à votre fournisseur

2. **Informations à fournir:**
   - Version de Windows
   - Contenu de `%LOCALAPPDATA%\Igoodar\data\` (liste des fichiers)
   - Contenu de `%APPDATA%\iGoodar\` (liste des fichiers)
   - Message d'erreur exact (capture d'écran)

---

## ✅ **Récapitulatif**

**Pour migrer votre licence:**

1. ⏹️ Arrêtez iGoodar
2. ▶️ Exécutez `fix-license-migration.bat`
3. ✅ Vérifiez que les fichiers sont copiés
4. 🔄 Redémarrez iGoodar
5. 🎉 Terminé!

**Vos données sont maintenant protégées et survivront à toutes les mises à jour futures!**

---

**Dernière mise à jour:** 21 décembre 2024  
**Version:** 1.0.2

