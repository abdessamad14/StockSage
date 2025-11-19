# 🔐 Igoodar License System Guide

## ✅ System Overview

**Type:** One-time use license (1 license = 1 PC only)
**Protection:** Hardware-locked to specific computer
**Activation:** Offline (no internet needed)
**Expiry:** Perpetual (or set expiration date)

---

## 📋 How It Works

### **Customer Side:**

1. **Install Igoodar** from ZIP package
2. **App shows activation screen** with Machine ID
3. **Customer sends you** the Machine ID (via email/phone)
4. **You generate license key** for that Machine ID
5. **You send license key** to customer
6. **Customer enters key** in activation screen
7. **App validates and activates** (works forever)

### **Your Side (Vendor):**

1. **Receive Machine ID** from customer
2. **Run command** to generate license
3. **Send license key** to customer
4. **Done!** Customer can activate

---

## 🛠️ Generating License Keys

### **Command:**

```bash
node scripts/generate-license.js "Customer Name" "Machine ID"
```

### **Example:**

```bash
node scripts/generate-license.js "Restaurant ABC" "a1b2c3d4e5f6g7h8"
```

### **Output:**

```
========================================
   License Key Generated Successfully
========================================

Customer:    Restaurant ABC
Machine ID:  a1b2c3d4e5f6g7h8
Issued:      2025-11-19
Expiry:      Perpetual (Never expires)

========================================
   LICENSE KEY
========================================

IGOODAR-eyJjdXN0b21lciI6IlJlc3RhdXJhbnQgQUJDIiwibWFjaGluZSI6ImExYjJjM2Q0ZTVmNmc3aDgiLCJpc3N1ZWQiOiIyMDI1LTExLTE5IiwiZXhwaXJ5IjoicGVycGV0dWFsIiwidmVyc2lvbiI6IjEuMCJ9-a1b2c3d4e5f6g7h8

========================================

Send this license key to your customer.
```

---

## 📅 License with Expiration Date

### **Command:**

```bash
node scripts/generate-license.js "Customer Name" "Machine ID" "2026-12-31"
```

### **Example:**

```bash
node scripts/generate-license.js "Restaurant ABC" "a1b2c3d4e5f6g7h8" "2026-12-31"
```

This creates a license that expires on December 31, 2026.

---

## 👥 Customer Workflow

### **Step 1: Installation**

Customer extracts ZIP and runs `start.bat` as Administrator.

### **Step 2: Activation Screen**

App shows:
```
╔════════════════════════════════════╗
║   IGOODAR ACTIVATION               ║
╠════════════════════════════════════╣
║                                    ║
║ Step 1: Your Machine ID            ║
║ ┌────────────────────────────────┐ ║
║ │ a1b2c3d4e5f6g7h8          [📋] │ ║
║ └────────────────────────────────┘ ║
║                                    ║
║ Send this to your vendor           ║
║                                    ║
║ Step 2: Enter License Key          ║
║ ┌────────────────────────────────┐ ║
║ │ IGOODAR-xxxxx-xxxx             │ ║
║ └────────────────────────────────┘ ║
║                                    ║
║      [  Activate License  ]        ║
║                                    ║
╚════════════════════════════════════╝
```

### **Step 3: Customer Actions**

1. Click **Copy** button next to Machine ID
2. Send Machine ID to you (email/phone/WhatsApp)
3. Wait for you to send license key
4. Paste license key in the field
5. Click "Activate License"
6. ✅ Done! App works forever

---

## 🔒 Security Features

### **1. Hardware Lock**
- License tied to specific computer
- Uses MAC address + hostname
- Cannot be used on different PC

### **2. Cryptographic Signature**
- Each license digitally signed
- Tampering detected automatically
- Cannot be forged or modified

### **3. One-Time Use**
- Each license works on ONE PC only
- Customer needs new license for second PC
- Prevents unauthorized sharing

### **4. Offline Validation**
- No internet required
- Validates locally
- Works forever once activated

---

## 💰 Business Model

### **Pricing Example:**

```
Single License:     $299 (1 PC)
3-PC Package:       $799 (3 PCs)
5-PC Package:       $1,199 (5 PCs)
Enterprise (10+):   Contact for quote
```

### **What Customer Gets:**

- ✅ Perpetual license (works forever)
- ✅ Offline operation
- ✅ All features included
- ✅ Database included
- ✅ Free bug fixes (optional)
- ⚠️ Paid upgrades (optional)
- ⚠️ Paid support (optional)

---

## 📧 Email Template for Customers

### **Subject: Your Igoodar License Key**

```
Dear [Customer Name],

Thank you for purchasing Igoodar!

Your license key:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IGOODAR-[license-key-here]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIVATION INSTRUCTIONS:
1. Install Igoodar from the ZIP file
2. Enter the license key above when prompted
3. Click "Activate License"

LICENSE DETAILS:
• Licensed to: [Customer Name]
• Machine ID: [machine-id]
• Issued: [date]
• Expiry: Perpetual (Never expires)
• PCs covered: 1

IMPORTANT:
⚠️ This license is for ONE computer only
⚠️ Keep this email safe for your records
⚠️ Contact us if you need additional licenses

SUPPORT:
Email: [your-email]
Phone: [your-phone]

Best regards,
[Your Company]
```

---

## 🆘 Troubleshooting

### **Problem: "Invalid license key"**

**Causes:**
- Typo in license key
- Wrong Machine ID used
- License for different PC

**Solution:**
- Double-check license key (copy-paste)
- Verify Machine ID matches
- Generate new license if needed

### **Problem: "License registered to another computer"**

**Cause:**
- License already used on different PC

**Solution:**
- Generate new license for this PC
- Each PC needs its own license

### **Problem: "License expired"**

**Cause:**
- Expiration date passed

**Solution:**
- Generate new license with new expiry
- Or use perpetual license (no expiry)

---

## 🔧 Advanced Configuration

### **Change Secret Key:**

Edit `server/license.js` and `scripts/generate-license.js`:

```javascript
const SECRET = 'YOUR-UNIQUE-SECRET-KEY-HERE';
```

⚠️ **IMPORTANT:** Use the same secret in both files!

### **Disable License System (Testing):**

Comment out in `client/src/main.tsx`:

```typescript
// <LicenseGuard>
  <OfflineApp />
// </LicenseGuard>
```

---

## 📊 License Management

### **Track Your Licenses:**

Create a spreadsheet:

| Customer | Machine ID | License Key | Issued | Expiry | Status |
|----------|------------|-------------|--------|--------|--------|
| Restaurant ABC | a1b2c3d4 | IGOODAR-xxx | 2025-11-19 | Perpetual | Active |
| Cafe XYZ | e5f6g7h8 | IGOODAR-yyy | 2025-11-20 | 2026-12-31 | Active |

---

## ✅ Summary

**For You (Vendor):**
1. Customer sends Machine ID
2. You run: `node scripts/generate-license.js "Name" "MachineID"`
3. You send license key to customer
4. Done!

**For Customer:**
1. Install app
2. Copy Machine ID
3. Send to you
4. Receive license key
5. Enter and activate
6. Use forever!

**Protection:**
- ✅ One license = One PC
- ✅ Hardware-locked
- ✅ Cryptographically signed
- ✅ Offline validation
- ✅ Cannot be shared

---

**Questions? Check LICENSE.txt for legal terms.**
