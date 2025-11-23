#!/bin/bash

# Build Windows Installer using Inno Setup
# This creates a professional .exe installer

echo "🎁 Building Windows Installer for Igoodar..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Step 1: Download Node.js portable if not exists
if [ ! -d "nodejs" ]; then
    echo "📥 Downloading Node.js portable..."
    ./scripts/download-nodejs-portable.sh
fi

# Step 2: Build the package
echo "📦 Building application package..."
npm run build:package

# Step 3: Get the latest package
LATEST_PACKAGE=$(ls -t packages/stocksage-*.zip | head -1)
PACKAGE_NAME=$(basename "$LATEST_PACKAGE" .zip)

echo "📂 Using package: $PACKAGE_NAME"

# Step 4: Extract package for installer
echo "📦 Extracting package for installer..."
TEMP_DIR="packages/installer-temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

unzip -q "$LATEST_PACKAGE" -d "$TEMP_DIR"

# Step 5: Update Inno Setup script with correct source path
echo "📝 Updating installer script..."
sed -i.bak "s|Source: \"packages\\\\stocksage-\*\\\\\*\"|Source: \"$TEMP_DIR\\\\$PACKAGE_NAME\\\\*\"|g" installer.iss

# Step 6: Build installer (requires Inno Setup on Windows)
echo ""
echo "=========================================="
echo "  Ready to Build Installer"
echo "=========================================="
echo ""
echo "Next steps (on Windows PC with Inno Setup):"
echo ""
echo "1. Copy the entire project to Windows PC"
echo "2. Install Inno Setup from: https://jrsoftware.org/isdl.php"
echo "3. Right-click installer.iss → Compile"
echo "4. Find installer: packages/igoodar-setup-1.0.0.exe"
echo ""
echo "Or use command line:"
echo '  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss'
echo ""
echo "=========================================="
echo ""

# Restore original installer.iss
mv installer.iss.bak installer.iss 2>/dev/null || true

echo "✅ Package ready for installer creation!"
echo "📂 Extracted to: $TEMP_DIR/$PACKAGE_NAME"
