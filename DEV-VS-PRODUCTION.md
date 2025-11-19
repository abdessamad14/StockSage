# 🔧 Development vs Production Mode

## 🛠️ Development Mode (Your Machine)

### **What happens:**
- ✅ License check is **BYPASSED**
- ✅ You can develop freely
- ✅ No activation screen
- ✅ Just PIN login

### **How to run:**
```bash
npm start
# or
npm run dev
```

**Console will show:**
```
🔓 Development mode: License check bypassed
```

---

## 📦 Production Mode (Customer Machine)

### **What happens:**
- ✅ License check is **ENFORCED**
- ✅ Shows activation screen if no license
- ✅ Requires valid license key
- ✅ Then shows PIN login

### **How to build:**
```bash
npm run build:package
```

This creates a production package where:
- License check is active
- Customer must activate with license key
- No bypass available

---

## 🎯 How It Works:

### **Development (npm start):**
```
1. App starts
2. License check → BYPASSED ✅
3. PIN login appears
4. You can work normally
```

### **Production (built package):**
```
1. App starts
2. License check → REQUIRED ⚠️
3. If no license → Activation screen
4. Customer enters license key
5. PIN login appears
6. App works
```

---

## 🔍 How to Test License System:

If you want to test the license activation screen in development:

### **Option 1: Temporarily disable bypass**

Comment out the bypass in `client/src/lib/offline-protected-route.tsx`:

```typescript
// Skip license check in development mode
// if (import.meta.env.DEV) {
//   console.log('🔓 Development mode: License check bypassed');
//   setLicensed(true);
//   setCheckingLicense(false);
//   return;
// }
```

### **Option 2: Build and test locally**

```bash
npm run build:package
cd packages/stocksage-*
npm start
```

This runs in production mode with license check active.

---

## ✅ Summary:

**Development (npm start):**
- License check bypassed
- Work freely
- No activation needed

**Production (npm run build:package):**
- License check enforced
- Customer must activate
- One license per PC

---

**You're all set for development! Just run `npm start` and the license check will be skipped automatically.** 🚀
