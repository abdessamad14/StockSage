# 🖨️ Guide d'Impression Silencieuse

## ❌ **Problème Rencontré**

Lors de l'utilisation du mode d'impression "Windows Driver (Default)":
- ✅ Le ticket s'affiche correctement
- ❌ **La boîte de dialogue d'impression Windows apparaît**
- ❌ Rien ne s'imprime même après avoir cliqué sur "Imprimer"

---

## 🔍 **Pourquoi Ce Problème?**

### **`window.print()` = TOUJOURS une boîte de dialogue**

La fonction JavaScript `window.print()` déclenche **TOUJOURS** la boîte de dialogue d'impression Windows. C'est un comportement de sécurité du navigateur qui **ne peut pas être contourné** en JavaScript standard.

**Pour une impression VRAIMENT silencieuse, il faut:**
1. ✅ Lancer Chrome avec des flags spéciaux
2. ✅ Utiliser le mode "Kiosk Printing"
3. ✅ Définir une imprimante par défaut

---

## ✅ **Solution: Mode Kiosk avec Impression Silencieuse**

### **Étape 1: Définir l'Imprimante par Défaut**

Avant de configurer l'impression silencieuse, vous devez définir votre imprimante thermique comme imprimante par défaut:

1. **Ouvrir les Paramètres Windows**
   - `Windows + I`
   - Ou: `Paramètres → Périphériques → Imprimantes et scanners`

2. **Sélectionner votre imprimante thermique**
   - Exemple: "BIXOLON SRP-350plusII"
   - Cliquez dessus

3. **Définir comme par défaut**
   - Cliquez sur "Gérer"
   - Cliquez sur "Définir par défaut"
   - ✅ Votre imprimante thermique est maintenant par défaut

---

### **Étape 2: Créer le Raccourci Kiosk**

#### **Option A: Script Automatique (Recommandé)**

1. **Arrêtez iGoodar** (si en cours d'exécution)
   - Menu Démarrer → Igoodar → Stop Igoodar

2. **Exécutez le script de création de raccourci**
   - Dans le dossier d'installation: `C:\Users\[Nom]\AppData\Local\Igoodar\`
   - Double-cliquez sur: **`create-kiosk-shortcut.bat`**
   - Le script va:
     - ✅ Détecter Chrome automatiquement
     - ✅ Créer un raccourci sur le Bureau
     - ✅ Configurer les bons flags

3. **Vérifiez sur le Bureau**
   - Nouveau raccourci: **"Igoodar (Silent Print)"**

#### **Option B: Création Manuelle**

Si le script automatique ne fonctionne pas:

1. **Clic droit sur le Bureau → Nouveau → Raccourci**

2. **Entrez ce chemin** (ajustez le chemin de Chrome si nécessaire):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5003/pos --kiosk-printing --silent-launch --disable-popup-blocking --disable-infobars
   ```

3. **Nom du raccourci:**
   ```
   Igoodar (Silent Print)
   ```

4. **Cliquez sur "Terminer"**

---

### **Étape 3: Utiliser le Mode Kiosk**

1. **Lancez iGoodar via le nouveau raccourci**
   - Double-cliquez sur "Igoodar (Silent Print)" (Bureau)
   - **NE PAS** utiliser le raccourci normal

2. **Connectez-vous**
   - PIN Admin: 1234
   - PIN Caissier: 5678

3. **Testez l'impression**
   - Créez une vente
   - Cliquez sur "Finaliser"
   - ✅ **L'impression se fait SILENCIEUSEMENT**
   - ✅ **Pas de boîte de dialogue**
   - ✅ **Ticket imprimé directement**

---

## 🔧 **Explication des Flags Chrome**

| Flag | Description |
|------|-------------|
| `--app=http://localhost:5003/pos` | Lance l'URL comme une application (sans barre d'outils) |
| `--kiosk-printing` | **CRITIQUE** - Active l'impression silencieuse sans dialogue |
| `--silent-launch` | Lance sans écran de démarrage |
| `--disable-popup-blocking` | Désactive le blocage des popups |
| `--disable-infobars` | Masque les barres d'information |

**Le flag le plus important:** `--kiosk-printing` 🎯

---

## ⚙️ **Configuration de l'Imprimante Thermique**

### **Paramètres Recommandés dans Windows**

1. **Taille du papier:**
   - 80mm x continu (pour tickets thermiques)
   - Ou: 80mm x 297mm (A4 en largeur)

2. **Orientation:**
   - Portrait

3. **Marges:**
   - Toutes à 0mm

4. **Qualité:**
   - Brouillon ou Standard (pour économiser l'encre thermique)

---

## 🎯 **Modes d'Impression: Comparaison**

| Mode | Dialogue? | Silencieux? | Configuration |
|------|-----------|-------------|---------------|
| **Direct USB (WebUSB)** | ❌ Non | ✅ Oui | Driver Zadig requis |
| **Network / IP** | ❌ Non | ✅ Oui | IP de l'imprimante |
| **Windows Driver (Normal)** | ✅ Oui | ❌ Non | Facile mais popup |
| **Windows Driver (Kiosk)** | ❌ Non | ✅ Oui | **RECOMMANDÉ** |

---

## ✅ **Avantages du Mode Kiosk**

1. ✅ **Impression 100% silencieuse** (pas de popup)
2. ✅ **Pas de driver spécial** (utilise le driver Windows standard)
3. ✅ **Pas de configuration IP** (fonctionne localement)
4. ✅ **Compatible avec toutes les imprimantes** (USB, réseau, Bluetooth)
5. ✅ **Fiable** (utilise le système d'impression Windows)

---

## 🆘 **Dépannage**

### **Problème 1: Chrome ne se trouve pas**

**Erreur:** "Chrome not found!"

**Solution:**
1. Installez Google Chrome: https://www.google.com/chrome/
2. Réessayez le script

**Ou:** Modifiez manuellement le raccourci avec le bon chemin:
```
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
```
Ou:
```
"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
```

---

### **Problème 2: Rien ne s'imprime en mode Kiosk**

**Causes possibles:**
1. **Imprimante pas définie par défaut**
   - Solution: Paramètres Windows → Imprimantes → Définir par défaut

2. **Imprimante éteinte ou déconnectée**
   - Solution: Vérifiez que l'imprimante est allumée et connectée

3. **Pilote d'imprimante non installé**
   - Solution: Installez le driver officiel de votre imprimante

4. **Papier épuisé**
   - Solution: Rechargez le papier thermique

---

### **Problème 3: Le raccourci ne fonctionne pas**

**Solution:** Créez le raccourci manuellement (Option B ci-dessus)

---

### **Problème 4: L'application se ferme immédiatement**

**Cause:** Le serveur iGoodar n'est pas démarré

**Solution:**
1. Démarrez le serveur d'abord:
   - Menu Démarrer → Igoodar → Restart Igoodar
2. Attendez 10 secondes
3. Lancez le raccourci Kiosk

---

## 🔄 **Workflow Recommandé**

### **Pour une caisse en production:**

1. **Au démarrage du PC:**
   - ✅ Le serveur iGoodar démarre automatiquement (service en arrière-plan)
   - ✅ Pas de console visible

2. **Pour ouvrir la caisse:**
   - ✅ Double-clic sur "Igoodar (Silent Print)" (Bureau)
   - ✅ Connexion avec PIN
   - ✅ Interface POS plein écran (sans barre Chrome)

3. **Lors des ventes:**
   - ✅ Impression silencieuse automatique
   - ✅ Pas de popup
   - ✅ Tickets imprimés instantanément

4. **À la fermeture:**
   - ✅ Fermez la fenêtre Chrome
   - ✅ Le serveur reste en arrière-plan

---

## 📝 **Raccourcis Clavier Utiles**

En mode Kiosk:

| Touche | Action |
|--------|--------|
| `F11` | Plein écran / Sortir du plein écran |
| `Ctrl + P` | Ouvre la boîte de dialogue d'impression (test) |
| `Alt + F4` | Ferme la fenêtre |
| `Ctrl + W` | Ferme l'onglet |

---

## ✅ **Résumé**

**Pour une impression 100% silencieuse:**

1. ⚙️ **Définissez votre imprimante thermique comme par défaut**
2. 🖥️ **Exécutez `create-kiosk-shortcut.bat`**
3. 🚀 **Lancez iGoodar via le raccourci "Silent Print"**
4. 🖨️ **Imprimez sans popup!**

**Fini les boîtes de dialogue d'impression!** 🎉

---

**Dernière mise à jour:** 21 décembre 2024  
**Version:** 1.0.3

