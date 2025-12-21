# 🔄 Comment Mettre à Jour iGoodar

## ⚠️ **Problème Résolu**

L'erreur que vous avez rencontrée :
```
Error opening file for writing:
C:\Users\Nutzer\AppData\Local\Igoodar\node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

**Cause:** L'application iGoodar était encore en cours d'exécution, verrouillant les fichiers.

---

## ✅ **Solution: 3 Méthodes**

### Méthode 1: Arrêt Automatique (RECOMMANDÉ)

Le **nouveau installateur** arrête automatiquement iGoodar avant l'installation.

**Étapes:**
1. Double-cliquez sur `igoodar-setup.exe`
2. L'installateur détecte si iGoodar est en cours d'exécution
3. Message: "Igoodar semble être en cours d'exécution. Voulez-vous que l'installateur le ferme automatiquement?"
4. Cliquez **"Oui"**
5. L'installateur ferme iGoodar et continue l'installation
6. ✅ Terminé!

---

### Méthode 2: Arrêt Manuel avec Script

**Avant d'installer:**

1. **Exécutez le script d'arrêt:**
   - Double-cliquez sur `STOP-BEFORE-UPDATE.bat`
   - Attendez le message "Igoodar arrêté avec succès!"

2. **Installez la nouvelle version:**
   - Double-cliquez sur `igoodar-setup.exe`
   - L'installation se déroule sans erreur

---

### Méthode 3: Arrêt Manuel via Menu Démarrer

**Avant d'installer:**

1. **Ouvrez le Menu Démarrer**
2. **Cherchez "Igoodar"**
3. **Cliquez sur "Stop Igoodar"**
4. **Attendez quelques secondes**
5. **Installez la nouvelle version**

---

## 🎯 **Processus Complet de Mise à Jour**

### Étape 1: Arrêter iGoodar

**Option A - Via Menu Démarrer:**
```
Menu Démarrer → Igoodar → Stop Igoodar
```

**Option B - Via Script:**
```
Double-clic sur: STOP-BEFORE-UPDATE.bat
```

**Option C - Via Gestionnaire des Tâches:**
1. Ouvrez le Gestionnaire des Tâches (Ctrl+Shift+Esc)
2. Cherchez "node.exe"
3. Clic droit → Fin de tâche

### Étape 2: Installer la Nouvelle Version

1. Double-cliquez sur `igoodar-setup.exe`
2. Suivez les instructions
3. L'installateur:
   - ✅ Supprime l'ancienne version
   - ✅ Installe la nouvelle version
   - ✅ **PRÉSERVE VOS DONNÉES** (dans %APPDATA%)
   - ✅ Redémarre automatiquement

### Étape 3: Vérification

1. L'application se lance automatiquement
2. Vos données sont intactes
3. ✅ Mise à jour terminée!

---

## 🛡️ **Sécurité des Données**

### Vos Données Sont Protégées!

Grâce à la **Safe Update Architecture**, vos données sont stockées dans:
```
C:\Users\[VotreNom]\AppData\Roaming\iGoodar\
```

**Ce dossier N'EST PAS supprimé lors de la mise à jour!**

Contient:
- ✅ Base de données (stocksage.db)
- ✅ Clé de licence (license.key)
- ✅ Configuration
- ✅ Historique des transactions

---

## ❌ **Erreurs Courantes et Solutions**

### Erreur 1: "Error opening file for writing"

**Cause:** iGoodar est encore en cours d'exécution

**Solution:**
1. Fermez complètement iGoodar
2. Attendez 10 secondes
3. Relancez l'installateur

**Vérification:**
- Ouvrez le Gestionnaire des Tâches
- Vérifiez qu'il n'y a pas de processus "node.exe"

---

### Erreur 2: "Installation failed"

**Cause:** Permissions insuffisantes

**Solution:**
1. Clic droit sur `igoodar-setup.exe`
2. Sélectionnez "Exécuter en tant qu'administrateur"
3. Acceptez l'invite UAC

---

### Erreur 3: "Cannot find old installation"

**Cause:** Première installation ou chemin modifié

**Solution:**
- C'est normal! L'installateur va créer une nouvelle installation
- Vos données seront migrées automatiquement si elles existent

---

## 🔄 **Mise à Jour Automatique (Nouveau!)**

### Notification Automatique

L'application vérifie automatiquement les nouvelles versions toutes les 30 minutes.

**Quand une mise à jour est disponible:**

1. **Popup apparaît:**
```
┌────────────────────────────────────┐
│ 🔄 Nouvelle Version Disponible !  │
│    Version 1.1.0                   │
├────────────────────────────────────┤
│  Nouveautés :                      │
│  ✓ Nouvelles fonctionnalités      │
│  ✓ Corrections de bugs             │
│                                    │
│  [ Plus tard ]  [ Télécharger ]   │
└────────────────────────────────────┘
```

2. **Cliquez "Télécharger"**
3. **Le navigateur télécharge le nouvel installateur**
4. **Fermez iGoodar** (Menu Démarrer → Stop Igoodar)
5. **Exécutez l'installateur téléchargé**
6. **✅ Terminé!**

---

## 📋 **Checklist de Mise à Jour**

Avant de mettre à jour:

- [ ] Fermez iGoodar complètement
- [ ] Vérifiez qu'aucun processus "node.exe" ne tourne
- [ ] Attendez 10 secondes après la fermeture
- [ ] Lancez le nouvel installateur
- [ ] Suivez les instructions
- [ ] Vérifiez que vos données sont intactes

---

## 💡 **Conseils**

### Pour Éviter les Problèmes

1. **Toujours fermer iGoodar avant de mettre à jour**
2. **Utiliser le script STOP-BEFORE-UPDATE.bat**
3. **Attendre quelques secondes après la fermeture**
4. **Ne pas interrompre l'installation**

### Sauvegarde (Optionnel)

Bien que vos données soient protégées, vous pouvez faire une sauvegarde:

**Dossier à sauvegarder:**
```
C:\Users\[VotreNom]\AppData\Roaming\iGoodar\
```

**Copiez ce dossier** sur une clé USB ou un autre emplacement.

---

## 🆘 **Besoin d'Aide?**

### Si la mise à jour échoue:

1. **Fermez complètement iGoodar**
2. **Redémarrez Windows**
3. **Réessayez l'installation**

### Si vos données semblent perdues:

**Ne paniquez pas!** Vos données sont dans:
```
C:\Users\[VotreNom]\AppData\Roaming\iGoodar\
```

Vérifiez que ce dossier existe et contient `stocksage.db`.

---

## ✅ **Résumé**

**Pour mettre à jour iGoodar sans erreur:**

1. ✅ **Fermez iGoodar** (Menu Démarrer → Stop Igoodar)
2. ✅ **Attendez 10 secondes**
3. ✅ **Lancez igoodar-setup.exe**
4. ✅ **Suivez les instructions**
5. ✅ **Vos données sont préservées automatiquement!**

---

**Dernière mise à jour:** 21 décembre 2024  
**Version:** 1.0.0

